import httpx
import os
import secrets
from typing import Optional
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth import (
    verify_password, create_access_token, create_refresh_token, decode_token,
    get_current_user, get_current_user_from_query_or_header, hash_password,
    _get_client_ip,
    check_login_rate_limit, record_login_failure, validate_password_complexity,
    check_rate_limit, record_rate_limit_failure,
    create_email_verification_token, create_password_reset_token, decode_email_token,
    generate_captcha, verify_captcha, is_captcha_required, get_login_attempts_remaining,
)
from ..models import User, LoginAuditLog, Project, AICallLog, UserRole, CreditTransaction
from ..schemas import (
    LoginRequest, LoginResponse, ChangePasswordRequest, BaseResponse,
    PreferredModelUpdate, PetConfigUpdate, ThemePreferenceUpdate,
    TokenPairResponse, RefreshTokenRequest, OAuthUnbindRequest,
    RegisterRequest, ForgotPasswordRequest, ResetPasswordRequest, VerifyEmailResponse,
)
from ..models import AIProvider
from ..config import get_settings
from ..encryption import get_encryption_manager
from ..email import send_verification_email, send_password_reset_email
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
    client_ip = _get_client_ip(req)
    return generate_captcha(client_ip)


@router.post("/login", response_model=TokenPairResponse)
def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
    req: Request = None,
):
    """用户登录（返回 Access Token + Refresh Token）"""
    client_ip = _get_client_ip(req) if req else "unknown"
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

    return TokenPairResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=TokenPairResponse)
def refresh_token(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    """使用 Refresh Token 换取新的 Token Pair（Refresh Token Rotation）"""
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

    # 校验 refresh token 的 version
    token_ver = payload.get("ver", 0)
    if token_ver != user.token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
        )

    # Refresh Token Rotation：递增 token_version，使旧 refresh token 失效
    user.token_version += 1
    db.commit()

    token_data = {"sub": user.username, "role": user.role.value}
    new_access_token = create_access_token(data=token_data, token_version=user.token_version)
    new_refresh_token = create_refresh_token(data=token_data, token_version=user.token_version)

    return TokenPairResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
    )


@router.post("/logout", response_model=BaseResponse)
def logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    req: Request = None,
):
    """用户登出（记录审计日志）"""
    client_ip = _get_client_ip(req) if req else "unknown"
    user_agent = req.headers.get("user-agent", "") if req else ""

    current_user.token_version += 1  # 使所有旧 token 失效
    db.commit()

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
    client_ip = _get_client_ip(req) if req else "unknown"
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


def _get_user_quota(user: User, db: Session):
    """计算用户当前配额使用情况（新额度制）"""
    settings = get_settings()

    # 项目数量（排除软删除）
    project_used = db.query(func.count(Project.id)).filter(
        Project.user_id == user.id,
        Project.deleted_at.is_(None)
    ).scalar() or 0

    return {
        "ai_credits": user.ai_credits,
        "ai_credits_total_consumed": user.ai_credits_total_consumed,
        "projects_used": project_used,
        "projects_limit": None,  # 项目无限
    }


@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取当前用户信息（含配额）"""
    settings = get_settings()
    quota = _get_user_quota(current_user, db)
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "email_verified": current_user.email_verified,
        "avatar_url": current_user.avatar_url,
        "role": current_user.role.value,
        "preferred_model": current_user.preferred_model.value if current_user.preferred_model else None,
        "subscription_status": current_user.subscription_status or "inactive",
        "current_tier_id": current_user.current_tier_id,
        "pet_config": current_user.pet_config,
        "theme_preference": current_user.theme_preference or "dark",
        "require_password_change": current_user.require_password_change,
        "oauth_provider": current_user.oauth_provider,
        "oauth_id": current_user.oauth_id,
        "enable_payments": settings.enable_payments,
        "quota": quota,
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


# ========== 注册 / 邮箱验证 / 密码重置 ==========

@router.post("/register", response_model=TokenPairResponse)
def register(
    request: RegisterRequest,
    db: Session = Depends(get_db),
    req: Request = None,
):
    """用户注册（邮箱 + 用户名 + 密码）"""
    check_rate_limit(req, "注册")

    # Honeypot + 时间校验 反机器人
    if request.honeypot:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请求异常，请重试",
        )
    # 表单提交时间校验：小于 2 秒视为机器人，大于 5 分钟视为篡改
    if not request.form_start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请求异常，请重试",
        )
    elapsed = datetime.now(timezone.utc).timestamp() - request.form_start_time
    if elapsed < 2.0 or elapsed > 300.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请求异常，请重试",
        )

    # 检查用户名唯一性
    if db.query(User).filter(User.username == request.username).first():
        record_rate_limit_failure(req, "注册")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已被使用"
        )

    # 检查邮箱唯一性
    if db.query(User).filter(User.email == request.email).first():
        record_rate_limit_failure(req, "注册")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邮箱已被注册"
        )

    # 密码复杂度校验
    is_valid, error_msg = validate_password_complexity(request.password)
    if not is_valid:
        record_rate_limit_failure(req, "注册")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )

    # 创建用户
    settings = get_settings()
    new_user = User(
        username=request.username,
        email=request.email,
        email_verified=False,
        password_hash=hash_password(request.password),
        role=UserRole.USER,
        require_password_change=False,
        ai_credits=settings.credits_grant_on_register,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 写入注册赠送额度流水
    if settings.credits_grant_on_register > 0:
        tx = CreditTransaction(
            user_id=new_user.id,
            type="grant",
            amount=settings.credits_grant_on_register,
            balance_after=settings.credits_grant_on_register,
            description="注册赠送",
        )
        db.add(tx)
        db.commit()

    # 发送验证邮件（失败不阻断注册，但记录错误）
    settings = get_settings()
    try:
        token = create_email_verification_token(str(new_user.id), new_user.email)
        verify_url = f"{settings.frontend_url}/verify-email?token={token}"
        success, error = send_verification_email(new_user.email, new_user.username, verify_url)
        if not success:
            print(f"[EMAIL ERROR] 验证邮件发送失败: {error}")
    except Exception as e:
        print(f"[EMAIL ERROR] 验证邮件发送异常: {e}")

    # 自动登录
    token_data = {"sub": new_user.username, "role": new_user.role.value}
    access_token = create_access_token(data=token_data, token_version=new_user.token_version)
    refresh_token = create_refresh_token(data=token_data, token_version=new_user.token_version)

    return TokenPairResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.get("/verify-email", response_model=VerifyEmailResponse)
def verify_email(token: str, db: Session = Depends(get_db)):
    """邮箱验证回调"""
    payload = decode_email_token(token, "email_verify")
    if not payload:
        return VerifyEmailResponse(success=False, message="验证链接无效或已过期")

    user_id = payload.get("sub")
    email = payload.get("email")

    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.email != email:
        return VerifyEmailResponse(success=False, message="用户不存在")

    user.email_verified = True
    db.commit()

    return VerifyEmailResponse(success=True, message="邮箱验证成功")


@router.post("/forgot-password", response_model=BaseResponse)
def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """忘记密码：发送重置邮件"""
    user = db.query(User).filter(User.email == request.email).first()

    # 用户不存在时返回模糊成功消息，防止邮箱枚举攻击
    if not user or not user.password_hash:
        return BaseResponse(message="如果该邮箱已注册，重置邮件已发送")

    # 用户存在，尝试发送邮件
    settings = get_settings()
    try:
        token = create_password_reset_token(str(user.id), user.email)
        reset_url = f"{settings.frontend_url}/reset-password?token={token}"
        success, error = send_password_reset_email(user.email, user.username or user.email, reset_url)
        if not success:
            # 邮件发送失败，返回错误让前端提示用户重试
            return BaseResponse(success=False, message=f"邮件发送失败：{error}")
    except Exception as e:
        return BaseResponse(success=False, message=f"邮件发送失败：{str(e)}")

    return BaseResponse(message="如果该邮箱已注册，重置邮件已发送")


@router.post("/reset-password", response_model=BaseResponse)
def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """重置密码（通过邮件 token）"""
    payload = decode_email_token(request.token, "password_reset")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="重置链接无效或已过期"
        )

    user_id = payload.get("sub")
    email = payload.get("email")

    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.email != email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户不存在"
        )

    is_valid, error_msg = validate_password_complexity(request.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )

    user.password_hash = hash_password(request.new_password)
    user.token_version += 1  # 使所有旧 token 失效
    db.commit()

    return BaseResponse(message="密码重置成功")


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


def _close_http_client() -> None:
    """关闭全局 HTTP Client，防止连接泄漏"""
    global _http_client
    if _http_client is not None:
        _http_client.close()
        _http_client = None


# ========== OAuth 2.0（Google / GitHub）==========

def _get_oauth_redirect_url(provider: str) -> str:
    """构建 OAuth 回调地址（供 Google/GitHub 重定向回后端）"""
    import os
    settings = get_settings()
    api_url = os.environ.get("API_URL", f"http://127.0.0.1:{settings.api_port}")
    return f"{api_url}/auth/oauth/{provider}/callback"


def _get_oauth_connect_redirect_url() -> str:
    """构建 GitHub 增量授权（仓库导入）回调地址"""
    import os
    settings = get_settings()
    api_url = os.environ.get("API_URL", f"http://127.0.0.1:{settings.api_port}")
    return f"{api_url}/auth/oauth/github/connect/callback"


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


def _create_bind_state(user_id: str) -> str:
    """生成 OAuth 绑定 state 参数（包含 user_id，10分钟有效）"""
    return create_access_token(
        data={"oauth": "bind", "user_id": user_id},
        expires_delta=timedelta(minutes=10)
    )


def _verify_bind_state(state: str) -> Optional[dict]:
    """验证 OAuth 绑定 state 参数，返回 payload"""
    payload = decode_token(state, expected_type="access")
    if payload and payload.get("oauth") == "bind":
        return payload
    return None


def _get_oauth_bind_redirect_url(provider: str) -> str:
    """构建 OAuth 绑定回调地址"""
    settings = get_settings()
    return f"{settings.frontend_url}/auth/oauth/{provider}/bind/callback"


def _generate_username_from_email(email: str, db: Session) -> str:
    """从邮箱生成唯一用户名"""
    base = email.split("@")[0].lower().replace(".", "_")[:40]
    username = base
    suffix = 1
    while db.query(User).filter(User.username == username).first():
        username = f"{base}_{suffix}"
        suffix += 1
    return username


def _oauth_success_redirect(access_token: str, refresh_token: str) -> RedirectResponse:
    """OAuth 成功后跳回前端并带上 token（使用 fragment 避免进入历史/Referer）"""
    settings = get_settings()
    fragment = urlencode({
        "oauth_success": "1",
        "access_token": access_token,
        "refresh_token": refresh_token,
    })
    return RedirectResponse(url=f"{settings.frontend_url}#{fragment}")


@router.get("/oauth/google")
def oauth_google_redirect():
    """跳转 Google OAuth 授权页"""
    settings = get_settings()
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth 未配置"
        )

    state = _create_oauth_state()
    params = urlencode({
        "client_id": settings.google_client_id,
        "redirect_uri": _get_oauth_redirect_url("google"),
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
    })
    return RedirectResponse(url=f"https://accounts.google.com/o/oauth2/v2/auth?{params}")


@router.get("/oauth/google/callback")
def oauth_google_callback(
    code: str,
    state: str,
    db: Session = Depends(get_db),
):
    """Google OAuth 回调"""
    if not _verify_oauth_state(state):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OAuth state"
        )

    settings = get_settings()

    # 交换 code 获取 access_token
    token_resp = _get_http_client().post(
        "https://oauth2.googleapis.com/token",
        data={
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": _get_oauth_redirect_url("google"),
        },
        timeout=10.0,
    )
    if token_resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google token exchange failed"
        )

    token_data = token_resp.json()
    google_access_token = token_data.get("access_token")

    # 获取用户信息
    user_resp = _get_http_client().get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {google_access_token}"},
    )
    if user_resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to fetch Google user info"
        )

    user_info = user_resp.json()
    google_id = user_info.get("id")
    email = user_info.get("email")
    name = user_info.get("name", email)
    picture = user_info.get("picture")

    if not email or not google_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incomplete Google user info"
        )

    # 查找或创建用户
    user = db.query(User).filter(
        User.oauth_provider == "google",
        User.oauth_id == google_id
    ).first()

    if not user:
        # 检查邮箱是否已注册
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            # 如果已有账号绑定了其他 OAuth 提供商，禁止自动覆盖
            if existing.oauth_provider and existing.oauth_provider != "google":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="该邮箱已注册。请先登录现有账号，再在设置中绑定 Google。"
                )
            # 自动绑定到现有账号（无论是有密码还是完全空白）
            existing.oauth_provider = "google"
            existing.oauth_id = google_id
            existing.avatar_url = picture or existing.avatar_url
            if not existing.email_verified:
                existing.email_verified = True
            db.commit()
            user = existing
        else:
            username = _generate_username_from_email(email, db)
            user = User(
                username=username,
                email=email,
                email_verified=True,
                oauth_provider="google",
                oauth_id=google_id,
                avatar_url=picture,
                role=UserRole.USER,
                require_password_change=False,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

    # 生成 JWT 并跳转回前端
    token_data = {"sub": user.username, "role": user.role.value}
    access_token = create_access_token(data=token_data, token_version=user.token_version)
    refresh_token = create_refresh_token(data=token_data, token_version=user.token_version)
    return _oauth_success_redirect(access_token, refresh_token)


@router.get("/oauth/github")
def oauth_github_redirect():
    """跳转 GitHub OAuth 授权页"""
    settings = get_settings()
    if not settings.github_client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GitHub OAuth 未配置"
        )

    state = _create_oauth_state()
    params = urlencode({
        "client_id": settings.github_client_id,
        "redirect_uri": _get_oauth_redirect_url("github"),
        "scope": "user:email",
        "state": state,
    })
    return RedirectResponse(url=f"https://github.com/login/oauth/authorize?{params}")


@router.get("/oauth/github/callback")
def oauth_github_callback(
    code: str,
    state: str,
    db: Session = Depends(get_db),
):
    """GitHub OAuth 回调"""
    if not _verify_oauth_state(state):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OAuth state"
        )

    settings = get_settings()

    # 交换 code 获取 access_token
    token_resp = _get_http_client().post(
        "https://github.com/login/oauth/access_token",
        data={
            "client_id": settings.github_client_id,
            "client_secret": settings.github_client_secret,
            "code": code,
            "redirect_uri": _get_oauth_redirect_url("github"),
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

    if not github_access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub token exchange failed"
        )

    # 获取用户信息
    user_resp = _get_http_client().get(
        "https://api.github.com/user",
        headers={
            "Authorization": f"Bearer {github_access_token}",
            "Accept": "application/json",
        },
    )
    if user_resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to fetch GitHub user info"
        )

    user_info = user_resp.json()
    github_id = str(user_info.get("id"))
    login = user_info.get("login")
    avatar_url = user_info.get("avatar_url")

    # 获取主邮箱
    emails_resp = _get_http_client().get(
        "https://api.github.com/user/emails",
        headers={
            "Authorization": f"Bearer {github_access_token}",
            "Accept": "application/json",
        },
    )
    email = None
    if emails_resp.status_code == 200:
        emails = emails_resp.json()
        primary = next((e for e in emails if e.get("primary")), None)
        if primary:
            email = primary.get("email")
        elif emails:
            email = emails[0].get("email")

    if not github_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incomplete GitHub user info"
        )

    # 查找或创建用户
    user = db.query(User).filter(
        User.oauth_provider == "github",
        User.oauth_id == github_id
    ).first()

    if not user:
        if email:
            existing = db.query(User).filter(User.email == email).first()
            if existing:
                # 如果已有账号绑定了其他 OAuth 提供商，禁止自动覆盖
                if existing.oauth_provider and existing.oauth_provider != "github":
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="该邮箱已注册。请先登录现有账号，再在设置中绑定 GitHub。"
                    )
                # 安全策略：如果现有账号邮箱未验证，禁止 OAuth 自动绑定（防止账号劫持）
                if not existing.email_verified:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="该邮箱已注册但未验证。请先验证邮箱后再绑定 GitHub 账号。"
                    )
                # 自动绑定到现有账号（无论是有密码还是完全空白）
                existing.oauth_provider = "github"
                existing.oauth_id = github_id
                existing.avatar_url = avatar_url or existing.avatar_url
                if not existing.email_verified:
                    existing.email_verified = True
                db.commit()
                user = existing
            else:
                username = login or _generate_username_from_email(email, db)
                # 确保用户名唯一
                if db.query(User).filter(User.username == username).first():
                    username = _generate_username_from_email(email, db)
                user = User(
                    username=username,
                    email=email,
                    email_verified=True,
                    oauth_provider="github",
                    oauth_id=github_id,
                    avatar_url=avatar_url,
                    role=UserRole.USER,
                    require_password_change=False,
                )
                db.add(user)
                db.commit()
                db.refresh(user)
        else:
            # 无邮箱，用 GitHub login 作为用户名
            username = login or f"github_{github_id}"
            if db.query(User).filter(User.username == username).first():
                username = f"github_{github_id}_{secrets.token_hex(4)}"
            user = User(
                username=username,
                email=None,
                email_verified=False,
                oauth_provider="github",
                oauth_id=github_id,
                avatar_url=avatar_url,
                role=UserRole.USER,
                require_password_change=False,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

    token_data = {"sub": user.username, "role": user.role.value}
    access_token = create_access_token(data=token_data, token_version=user.token_version)
    refresh_token = create_refresh_token(data=token_data, token_version=user.token_version)
    return _oauth_success_redirect(access_token, refresh_token)


# ========== GitHub 增量授权（用于仓库导入）==========

@router.get("/oauth/github/connect")
def oauth_github_connect_redirect(
    request: Request,
    current_user: User = Depends(get_current_user_from_query_or_header),
):
    """跳转 GitHub OAuth 增量授权页（申请 public_repo 权限）"""
    settings = get_settings()
    if not settings.github_client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GitHub OAuth not configured"
        )

    state = _create_connect_state(str(current_user.id))
    redirect_uri = _get_oauth_connect_redirect_url()  # 使用 API 域名 + connect 专用回调路径
    params = urlencode({
        "client_id": settings.github_client_id,
        "redirect_uri": redirect_uri,
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

    # 交换 code 获取 access_token（redirect_uri 必须与授权请求时完全一致）
    token_resp = _get_http_client().post(
        "https://github.com/login/oauth/access_token",
        data={
            "client_id": settings.github_client_id,
            "client_secret": settings.github_client_secret,
            "code": code,
            "redirect_uri": _get_oauth_connect_redirect_url(),
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

    # 重定向回前端，通过 URL hash 标记成功（前端从 fragment 读取）
    return RedirectResponse(url=f"{settings.frontend_url}/#github_connect=success")


# ========== OAuth 绑定 / 解绑（已登录用户）==========

@router.get("/oauth/{provider}/bind")
def oauth_bind_redirect(
    provider: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """跳转 OAuth 绑定授权页（已登录用户）"""
    settings = get_settings()

    if provider not in ("google", "github"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不支持的 OAuth 提供商"
        )

    if provider == "google" and not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth 未配置"
        )
    if provider == "github" and not settings.github_client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GitHub OAuth 未配置"
        )

    state = _create_bind_state(str(current_user.id))
    redirect_uri = _get_oauth_bind_redirect_url(provider)

    if provider == "google":
        params = urlencode({
            "client_id": settings.google_client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "access_type": "online",
        })
        return RedirectResponse(url=f"https://accounts.google.com/o/oauth2/v2/auth?{params}")
    else:  # github
        params = urlencode({
            "client_id": settings.github_client_id,
            "redirect_uri": redirect_uri,
            "scope": "user:email",
            "state": state,
        })
        return RedirectResponse(url=f"https://github.com/login/oauth/authorize?{params}")


@router.get("/oauth/{provider}/bind/callback")
def oauth_bind_callback(
    provider: str,
    code: str,
    state: str,
    db: Session = Depends(get_db),
):
    """OAuth 绑定回调——将第三方账号绑定到当前登录用户"""
    payload = _verify_bind_state(state)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired bind state"
        )

    user_id_str = payload.get("user_id")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing user_id in bind state"
        )

    try:
        user_uuid = UuidType(user_id_str)
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
    redirect_uri = _get_oauth_bind_redirect_url(provider)

    if provider == "google":
        # 交换 code 获取 access_token
        token_resp = _get_http_client().post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            },
            timeout=10.0,
        )
        if token_resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google token exchange failed"
            )

        token_data = token_resp.json()
        google_access_token = token_data.get("access_token")

        # 获取用户信息
        user_resp = _get_http_client().get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {google_access_token}"},
        )
        if user_resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to fetch Google user info"
            )

        user_info = user_resp.json()
        google_id = user_info.get("id")
        email = user_info.get("email")
        picture = user_info.get("picture")

        if not google_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incomplete Google user info"
            )

        # 检查是否已被其他用户绑定
        existing = db.query(User).filter(
            User.oauth_provider == "google",
            User.oauth_id == google_id,
            User.id != user.id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="该 Google 账号已被其他用户绑定"
            )

        user.oauth_provider = "google"
        user.oauth_id = google_id
        if picture:
            user.avatar_url = picture
        if email and not user.email_verified:
            user.email_verified = True
        db.commit()

    elif provider == "github":
        # 交换 code 获取 access_token
        token_resp = _get_http_client().post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
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

        if not github_access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="GitHub token exchange failed"
            )

        # 获取用户信息
        user_resp = _get_http_client().get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {github_access_token}",
                "Accept": "application/json",
            },
        )
        if user_resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to fetch GitHub user info"
            )

        user_info = user_resp.json()
        github_id = str(user_info.get("id"))
        avatar_url = user_info.get("avatar_url")

        # 获取主邮箱
        emails_resp = _get_http_client().get(
            "https://api.github.com/user/emails",
            headers={
                "Authorization": f"Bearer {github_access_token}",
                "Accept": "application/json",
            },
        )
        email = None
        if emails_resp.status_code == 200:
            emails = emails_resp.json()
            primary = next((e for e in emails if e.get("primary")), None)
            if primary:
                email = primary.get("email")
            elif emails:
                email = emails[0].get("email")

        if not github_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incomplete GitHub user info"
            )

        # 检查是否已被其他用户绑定
        existing = db.query(User).filter(
            User.oauth_provider == "github",
            User.oauth_id == github_id,
            User.id != user.id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="该 GitHub 账号已被其他用户绑定"
            )

        user.oauth_provider = "github"
        user.oauth_id = github_id
        if avatar_url:
            user.avatar_url = avatar_url
        if email and not user.email_verified:
            user.email_verified = True
        db.commit()

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不支持的 OAuth 提供商"
        )

    return RedirectResponse(url=f"{settings.frontend_url}/#oauth_bind_success=1")


@router.post("/oauth/unbind", response_model=BaseResponse)
def oauth_unbind(
    request: OAuthUnbindRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """解绑 OAuth 账号（至少保留一种登录方式）"""
    if current_user.oauth_provider != request.provider:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"当前未绑定 {request.provider} 账号"
        )

    # 禁止解绑后没有任何登录方式
    if not current_user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="至少保留一种登录方式，请先设置密码后再解绑"
        )

    current_user.oauth_provider = None
    current_user.oauth_id = None
    db.commit()

    return BaseResponse(message=f"{request.provider} 账号已解绑")

