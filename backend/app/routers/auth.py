from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth import (
    verify_password, create_access_token, create_refresh_token, decode_token,
    get_current_user, hash_password,
    check_login_rate_limit, record_login_failure, validate_password_complexity,
)
from ..models import User, LoginAuditLog, Project, AICallLog
from ..schemas import (
    LoginRequest, LoginResponse, ChangePasswordRequest, BaseResponse,
    PreferredModelUpdate, PetConfigUpdate, ThemePreferenceUpdate,
    TokenPairResponse, RefreshTokenRequest,
)
from ..models import AIProvider
from ..config import get_settings
from sqlalchemy import func
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["auth"])


def _record_audit_log(
    db: Session,
    username: str,
    action: str,
    ip_address: str = "unknown",
    user_agent: str = "",
    user_id: str | None = None,
    detail: str = "",
):
    """记录登录审计日志"""
    log = LoginAuditLog(
        username=username,
        user_id=user_id,
        ip_address=ip_address,
        user_agent=user_agent,
        action=action,
        detail=detail,
    )
    db.add(log)
    db.commit()


@router.post("/login", response_model=TokenPairResponse)
def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
    req: Request = None,
):
    """用户登录（返回 Access Token + Refresh Token）"""
    client_ip = req.client.host if req and req.client else "unknown"
    user_agent = req.headers.get("user-agent", "") if req else ""

    if req:
        check_login_rate_limit(req)

    user = db.query(User).filter(User.username == request.username).first()

    if not user or not verify_password(request.password, user.password_hash):
        # 记录失败审计日志
        _record_audit_log(
            db, username=request.username, action="login_failure",
            ip_address=client_ip, user_agent=user_agent,
            detail="用户名或密码错误",
        )
        if req:
            record_login_failure(req)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误"
        )

    token_data = {"sub": user.username, "role": user.role.value}
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)

    # 记录成功审计日志
    _record_audit_log(
        db, username=user.username, action="login_success",
        ip_address=client_ip, user_agent=user_agent,
        user_id=str(user.id),
    )

    return TokenPairResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=LoginResponse)
def refresh_token(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    """使用 Refresh Token 换取新的 Access Token"""
    payload = decode_token(request.refresh_token, expected_type="refresh")

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token 无效或已过期",
        )

    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token 无效",
        )

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户不存在",
        )

    new_access_token = create_access_token(
        data={"sub": user.username, "role": user.role.value}
    )
    return LoginResponse(access_token=new_access_token)


@router.post("/logout", response_model=BaseResponse)
def logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    req: Request = None,
):
    """用户登出（记录审计日志）"""
    client_ip = req.client.host if req and req.client else "unknown"
    user_agent = req.headers.get("user-agent", "") if req else ""

    _record_audit_log(
        db, username=current_user.username, action="logout",
        ip_address=client_ip, user_agent=user_agent,
        user_id=str(current_user.id),
    )
    return BaseResponse(message="已登出")


@router.post("/change-password", response_model=BaseResponse)
def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    req: Request = None,
):
    """修改密码（含复杂度校验）"""
    client_ip = req.client.host if req and req.client else "unknown"
    user_agent = req.headers.get("user-agent", "") if req else ""

    # 校验原密码
    if not verify_password(request.old_password, current_user.password_hash):
        _record_audit_log(
            db, username=current_user.username, action="password_change",
            ip_address=client_ip, user_agent=user_agent,
            user_id=str(current_user.id),
            detail="失败：原密码错误",
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="原密码错误"
        )

    # 校验新密码复杂度
    is_valid, error_msg = validate_password_complexity(request.new_password)
    if not is_valid:
        _record_audit_log(
            db, username=current_user.username, action="password_change",
            ip_address=client_ip, user_agent=user_agent,
            user_id=str(current_user.id),
            detail=f"失败：{error_msg}",
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )

    current_user.password_hash = hash_password(request.new_password)
    current_user.require_password_change = False
    db.commit()

    _record_audit_log(
        db, username=current_user.username, action="password_change",
        ip_address=client_ip, user_agent=user_agent,
        user_id=str(current_user.id),
        detail="成功",
    )

    return BaseResponse(message="密码修改成功")


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    """获取当前用户信息"""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "role": current_user.role.value,
        "preferred_model": current_user.preferred_model.value if current_user.preferred_model else None,
        "subscription_status": current_user.subscription_status or "inactive",
        "stripe_customer_id": current_user.stripe_customer_id,
        "stripe_subscription_id": current_user.stripe_subscription_id,
        "current_tier_id": current_user.current_tier_id,
        "pet_config": current_user.pet_config,
        "theme_preference": current_user.theme_preference or "dark",
        "require_password_change": current_user.require_password_change,
        "created_at": current_user.created_at
    }


@router.get("/preferred-model")
def get_preferred_model(current_user: User = Depends(get_current_user)):
    """获取用户首选 AI 模型"""
    return {
        "provider": current_user.preferred_model.value if current_user.preferred_model else None
    }


@router.put("/preferred-model", response_model=BaseResponse)
def update_preferred_model(
    request: PreferredModelUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新用户首选 AI 模型"""
    current_user.preferred_model = request.provider
    db.commit()

    provider_name = request.provider.value if request.provider else "None"
    return BaseResponse(message=f"首选模型已更新为: {provider_name}")


@router.put("/me/pet-config", response_model=BaseResponse)
def update_pet_config(
    request: PetConfigUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新 AI 宠物配置"""
    new_config = dict(current_user.pet_config) if current_user.pet_config else {
        "type": "cat",
        "name": "",
        "personality": "gentle",
        "verbosity": "moderate"
    }

    if request.type is not None:
        new_config["type"] = request.type
    if request.name is not None:
        new_config["name"] = request.name
    if request.personality is not None:
        new_config["personality"] = request.personality
    if request.verbosity is not None:
        new_config["verbosity"] = request.verbosity

    current_user.pet_config = new_config
    db.commit()
    return BaseResponse(message="宠物配置已更新")


@router.get("/theme")
def get_theme_preference(current_user: User = Depends(get_current_user)):
    """获取用户主题偏好"""
    return {
        "theme": current_user.theme_preference or "dark"
    }


@router.put("/theme", response_model=BaseResponse)
def update_theme_preference(
    request: ThemePreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新主题偏好"""
    current_user.theme_preference = request.theme
    db.commit()
    return BaseResponse(message=f"主题偏好已更新为: {request.theme}")
