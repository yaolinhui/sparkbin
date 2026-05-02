import httpx
import os
import secrets
from typing import Optional
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse, JSONResponse
from starlette.responses import Response
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth import (
    verify_password, create_access_token, create_refresh_token, decode_token,
    get_current_user, hash_password,
    check_login_rate_limit, record_login_failure,
    generate_captcha, verify_captcha, is_captcha_required, get_login_attempts_remaining,
)
from ..models import User, LoginAuditLog, UserRole
from ..schemas import (
    LoginRequest, LoginResponse, ChangePasswordRequest, BaseResponse,
    PreferredModelUpdate, PetConfigUpdate, ThemePreferenceUpdate,
    RefreshTokenRequest,
)
from ..models import AIProvider
from ..config import get_settings
from ..encryption import get_encryption_manager
from sqlalchemy import func
from datetime import datetime, timedelta
from uuid import UUID as UuidType

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
    parsed_user_id = UuidType(user_id) if user_id else None
    log = LoginAuditLog(
        username=username,
        user_id=parsed_user_id,
        ip_address=ip_address,
        user_agent=user_agent,
        action=action,
        detail=detail,
    )
    db.add(log)
    db.commit()


@router.get("/captcha")
def get_captcha(req: Request):
    """获取数学验证码"""
    client_ip = req.client.host if req and req.client else "unknown"
    return generate_captcha(client_ip)


def _set_refresh_cookie(response: JSONResponse, token: str) -> None:
    """设置 httpOnly refresh token cookie"""
    settings = get_settings()
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,
        secure=not settings.debug,
        samesite="lax",
        max_age=60 * 60 * 24 * 7,
    )


@router.post("/login", response_model=LoginResponse)
def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
    req: Request = None,
):
    """用户登录（返回 Access Token，Refresh Token 通过 httpOnly cookie 设置）"""
    client_ip = req.client.host if req and req.client else "unknown"
    user_agent = req.headers.get("user-agent", "") if req else ""

    if req:
        check_login_rate_limit(req)

    # 验证码校验：当同一 IP 近期失败次数 >= 2 时强制要求
    if req and is_captcha_required(req):
        if not request.captcha_answer:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="需要验证码",
                headers={"X-Require-Captcha": "1"},
            )
        if not verify_captcha(client_ip, request.captcha_answer):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="验证码错误",
                headers={"X-Require-Captcha": "1"},
            )

    user = db.query(User).filter(User.username == request.username).first()

    if not user or not user.password_hash or not verify_password(request.password, user.password_hash):
        # 记录失败审计日志
        _record_audit_log(
            db, username=request.username, action="login_failure",
            ip_address=client_ip, user_agent=user_agent,
            detail="用户名或密码错误",
        )
        if req:
            record_login_failure(req)
        remaining = get_login_attempts_remaining(req) if req else _MAX_LOGIN_ATTEMPTS
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"X-Login-Attempts-Remaining": str(remaining)},
        )

    token_data = {"sub": user.username, "role": user.role.value}
    access_token = create_access_token(data=token_data, token_version=user.token_version)
    refresh_token = create_refresh_token(data=token_data, token_version=user.token_version)

    # 记录成功审计日志
    _record_audit_log(
        db, username=user.username, action="login_success",
        ip_address=client_ip, user_agent=user_agent,
        user_id=str(user.id),
    )

    response = JSONResponse(
        content={"access_token": access_token, "token_type": "bearer"}
    )
    _set_refresh_cookie(response, refresh_token)
    return response


@router.post("/refresh", response_model=LoginResponse)
def refresh_token(
    request: RefreshTokenRequest,
    req: Request,
    db: Session = Depends(get_db),
):
    """使用 Refresh Token 换取新的 Access Token（Refresh Token 通过 httpOnly cookie 传递，支持 body 回退兼容）"""
    # 优先从 cookie 读取，兼容旧客户端从 body 读取
    refresh_token_str = req.cookies.get("refresh_token") or request.refresh_token
    if not refresh_token_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )

    payload = decode_token(refresh_token_str, expected_type="refresh")

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

    # 校验 refresh token 的 version
    token_ver = payload.get("ver", 0)
    if token_ver != user.token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
        )

    token_data = {"sub": user.username, "role": user.role.value}
    new_access_token = create_access_token(data=token_data, token_version=user.token_version)
    new_refresh_token = create_refresh_token(data=token_data, token_version=user.token_version)

    response = JSONResponse(
        content={"access_token": new_access_token, "token_type": "bearer"}
    )
    _set_refresh_cookie(response, new_refresh_token)
    return response


@router.post("/logout", response_model=BaseResponse)
def logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    req: Request = None,
):
    """用户登出（使所有旧 token 失效，清除 httpOnly cookie）"""
    client_ip = req.client.host if req and req.client else "unknown"
    user_agent = req.headers.get("user-agent", "") if req else ""

    current_user.token_version += 1  # 使所有旧 token 失效
    db.commit()

    _record_audit_log(
        db, username=current_user.username, action="logout",
        ip_address=client_ip, user_agent=user_agent,
        user_id=str(current_user.id),
    )

    response = JSONResponse(content={"success": True, "message": "已登出"})
    response.delete_cookie(key="refresh_token")
    return response


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
    current_user.token_version += 1  # 使所有旧 token 失效
    db.commit()

    _record_audit_log(
        db, username=current_user.username, action="password_change",
        ip_address=client_ip, user_agent=user_agent,
        user_id=str(current_user.id),
        detail="成功",
    )

    return BaseResponse(message="密码修改成功")


@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取当前用户信息"""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role.value,
        "preferred_model": current_user.preferred_model.value if current_user.preferred_model else None,
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


# ========== HTTP Client（支持代理）==========
# 2026-04-29: 新增代理支持，从 .env 读取 HTTP_PROXY/HTTPS_PROXY
_http_client: httpx.Client | None = None


def _get_http_client() -> httpx.Client:
    """获取带代理配置的 httpx Client（优先从环境变量读取，其次从 .env 读取）"""
    global _http_client
    if _http_client is None:
        proxies: dict[str, str] = {}
        # 1. 优先从环境变量读取
        http_proxy = os.environ.get("HTTP_PROXY") or os.environ.get("http_proxy")
        https_proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
        # 2. 其次从 Settings（.env）读取
        if not http_proxy or not https_proxy:
            settings = get_settings()
            if not http_proxy and settings.http_proxy:
                http_proxy = settings.http_proxy
            if not https_proxy and settings.https_proxy:
                https_proxy = settings.https_proxy
        if http_proxy:
            proxies["http://"] = http_proxy
        if https_proxy:
            proxies["https://"] = https_proxy
        import logging
        logging.info(f"[httpx] init client with proxies: {proxies}")
        _http_client = httpx.Client(
            proxies=proxies if proxies else None,
            timeout=10.0,
        )
    return _http_client


# ========== GitHub 增量授权（用于仓库导入）==========

def _get_oauth_redirect_url(provider: str) -> str:
    """构建 OAuth 回调地址（供 GitHub 重定向回后端）"""
    settings = get_settings()
    return f"http://127.0.0.1:{settings.api_port}/auth/oauth/{provider}/callback"


def _create_oauth_state() -> str:
    """生成 OAuth state 参数（JWT，10分钟有效）"""
    return create_access_token(
        data={"oauth": True},
        expires_delta=timedelta(minutes=10)
    )


def _verify_oauth_state(state: str) -> bool:
    """验证 OAuth state 参数（校验签名和过期时间即可防止 CSRF）"""
    payload = decode_token(state, expected_type="access")
    return payload is not None and payload.get("oauth") is True


def _create_connect_state(user_id: str) -> str:
    """生成 GitHub 增量授权 state 参数（包含 user_id，10分钟有效）"""
    return create_access_token(
        data={"oauth": "connect", "user_id": user_id},
        expires_delta=timedelta(minutes=10)
    )


def _verify_connect_state(state: str) -> Optional[dict]:
    """验证 GitHub 增量授权 state 参数，返回 payload"""
    payload = decode_token(state, expected_type="access")
    if payload and payload.get("oauth") == "connect":
        return payload
    return None


@router.get("/oauth/github/connect")
def oauth_github_connect_redirect(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """跳转 GitHub OAuth 增量授权页（申请 public_repo 权限）"""
    settings = get_settings()
    if not settings.github_client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GitHub OAuth not configured"
        )

    state = _create_connect_state(str(current_user.id))
    params = urlencode({
        "client_id": settings.github_client_id,
        "redirect_uri": f"{settings.frontend_url}/auth/oauth/github/connect/callback",
        "scope": "user:email public_repo",
        "state": state,
    })
    return RedirectResponse(url=f"https://github.com/login/oauth/authorize?{params}")


@router.get("/oauth/github/connect/callback")
def oauth_github_connect_callback(
    code: str,
    state: str,
    db: Session = Depends(get_db),
):
    """GitHub 增量授权回调——保存更高权限的 access token"""
    payload = _verify_connect_state(state)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired connect state"
        )

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing user_id in connect state"
        )

    # 查找用户
    from uuid import UUID
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user_id"
        )

    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    settings = get_settings()

    # 交换 code 获取 access_token
    token_resp = _get_http_client().post(
        "https://github.com/login/oauth/access_token",
        data={
            "client_id": settings.github_client_id,
            "client_secret": settings.github_client_secret,
            "code": code,
            "redirect_uri": f"{settings.frontend_url}/auth/oauth/github/connect/callback",
        },
        headers={"Accept": "application/json"},
        timeout=10.0,
    )
    if token_resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub token exchange failed"
        )

    token_data = token_resp.json()
    github_access_token = token_data.get("access_token")
    scope = token_data.get("scope", "")

    if not github_access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub token exchange failed"
        )

    # 加密存储 token
    try:
        encrypted_token = get_encryption_manager().encrypt(github_access_token)
        user.github_access_token_encrypted = encrypted_token
        user.github_token_scope = scope
        user.github_token_updated_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save token: {str(e)}"
        )

    # 重定向回前端，标记成功
    return RedirectResponse(url=f"{settings.frontend_url}/?github_connect=success")
