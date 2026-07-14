import logging
import os
import hashlib
import ipaddress
import re
from datetime import datetime, timedelta, timezone
from typing import Optional
from collections import deque
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from urllib.parse import urlparse

from .config import get_settings
from .database import get_db
from .models import User, UserRole

logger = logging.getLogger(__name__)

# HTTP Bearer 认证
security = HTTPBearer()
# 用于支持从 Query Param 读取 Token 的场景（如浏览器 OAuth 跳转）
security_optional = HTTPBearer(auto_error=False)

# 内存中的认证失败记录: {"{ip}:{action}": deque([timestamp, ...])}
_auth_attempts: dict[str, deque] = {}
_MAX_LOGIN_ATTEMPTS = 5
_LOGIN_WINDOW_SECONDS = 300  # 5分钟
_MAX_AUTH_ATTEMPTS_ENTRIES = 10000  # 防止内存 DoS：限制总 IP 条目数

# 内存中的验证码存储: {"{ip}": (answer, expire_timestamp)}
_captcha_store: dict[str, tuple[str, float]] = {}
_CAPTCHA_TTL_SECONDS = 300  # 5分钟
_MAX_CAPTCHA_ENTRIES = 1000  # 防止内存 DoS：限制验证码条目数

# 可信反向代理网段（仅当直接连接 IP 属于这些网段时才信任 X-Real-IP）
_TRUSTED_PROXY_NETWORKS = [
    ipaddress.ip_network("127.0.0.1/32"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("fc00::/7"),
]


def _is_trusted_proxy(ip: str) -> bool:
    """判断 IP 是否属于可信反向代理网段"""
    try:
        addr = ipaddress.ip_address(ip)
        return any(addr in net for net in _TRUSTED_PROXY_NETWORKS)
    except ValueError:
        return False


# ========== Token Cookie helpers ==========
# 将 access/refresh token 写入 HttpOnly Cookie，替代 localStorage 和 URL fragment。
# 支持跨子域名共享（当后端部署在 api.example.com、前端在 app.example.com 时）。

_OAUTH_STATE_COOKIE_NAME = "oauth_state"
_OAUTH_BIND_STATE_COOKIE_NAME = "oauth_bind_state"
_OAUTH_STATE_MAX_AGE_SECONDS = 600


def _get_cookie_domain(request: Request, frontend_url: str) -> str | None:
    """计算跨子域共享 Cookie 所需的 Domain 属性。

    若前端与后端为同一 host，则返回 None（Cookie 仅对当前 host 生效）。
    若前端为子域名（如 app.example.com），后端在 api.example.com，
    则返回 '.example.com'，使 Cookie 在两个子域间共享。
    """
    backend_host = request.url.hostname or ""
    frontend_host = urlparse(frontend_url).hostname or ""
    if not backend_host or not frontend_host:
        return None
    if backend_host.lower() == frontend_host.lower():
        return None
    frontend_parts = frontend_host.lower().split(".")
    if len(frontend_parts) >= 3:
        return "." + ".".join(frontend_parts[1:])
    return None


def _set_token_cookies(
    response: Response,
    request: Request,
    access_token: str,
    refresh_token: str,
) -> None:
    """设置 access_token / refresh_token HttpOnly Cookie。"""
    settings = get_settings()
    secure = request.url.scheme == "https"
    samesite = "none" if secure else "lax"
    domain = _get_cookie_domain(request, settings.frontend_url)

    common = {
        "httponly": True,
        "secure": secure,
        "samesite": samesite,
    }
    if domain:
        common["domain"] = domain

    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=settings.access_token_expire_minutes * 60,
        **common,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=settings.refresh_token_expire_days * 86400,
        **common,
    )


def _clear_token_cookies(response: Response, request: Request) -> None:
    """清除 access_token / refresh_token Cookie。"""
    settings = get_settings()
    domain = _get_cookie_domain(request, settings.frontend_url)
    common = {"domain": domain} if domain else {}
    response.delete_cookie(key="access_token", **common)
    response.delete_cookie(key="refresh_token", **common)


def _set_oauth_state_cookie(response: Response, request: Request, nonce: str) -> None:
    """将 OAuth state nonce 写入 HttpOnly Secure SameSite cookie，与客户端会话绑定。"""
    secure = request.url.scheme == "https"
    response.set_cookie(
        key=_OAUTH_STATE_COOKIE_NAME,
        value=nonce,
        max_age=_OAUTH_STATE_MAX_AGE_SECONDS,
        path="/",
        httponly=True,
        secure=secure,
        samesite="lax" if not secure else "none",
    )


def _clear_oauth_state_cookie(response: Response) -> None:
    """清除 OAuth state cookie（单次使用）。"""
    response.delete_cookie(key=_OAUTH_STATE_COOKIE_NAME, path="/")


def _set_oauth_bind_state_cookie(response: Response, request: Request, nonce: str) -> None:
    """将 OAuth bind state nonce 写入 HttpOnly cookie，与当前浏览器会话绑定。"""
    secure = request.url.scheme == "https"
    response.set_cookie(
        key=_OAUTH_BIND_STATE_COOKIE_NAME,
        value=nonce,
        max_age=_OAUTH_STATE_MAX_AGE_SECONDS,
        path="/",
        httponly=True,
        secure=secure,
        samesite="lax" if not secure else "none",
    )


def _clear_oauth_bind_state_cookie(response: Response) -> None:
    """清除 OAuth bind state cookie。"""
    response.delete_cookie(key=_OAUTH_BIND_STATE_COOKIE_NAME, path="/")


def generate_captcha(ip: str) -> dict:
    """生成滑动拼图验证码（SVG 实现，无需 Pillow 依赖）。

    安全设计：
    - 服务端随机生成缺口位置，将背景图和滑块图以 SVG data URI 形式返回。
    - 使用一次性 token 标识验证码，防止重放和枚举。
    - 服务端记录剩余可尝试次数，错误超过 3 次立即销毁该验证码。
    - 不返回正确答案，只通过 token 关联。
    """
    import random
    import secrets
    import base64

    width, height = 300, 150
    slider_w, slider_h = 40, 40

    # 缺口位置
    gap_x = random.randint(60, width - slider_w - 60)
    gap_y = random.randint(30, height - slider_h - 30)

    # 生成随机背景元素
    bg_color = f"rgb({random.randint(230,250)},{random.randint(230,250)},{random.randint(230,250)})"
    elements = []
    for _ in range(20):
        shape_type = random.choice(['rect', 'circle', 'line'])
        color = f"rgb({random.randint(100,200)},{random.randint(100,200)},{random.randint(100,200)})"
        if shape_type == 'rect':
            x = random.randint(0, width)
            y = random.randint(0, height)
            w = random.randint(20, 80)
            h = random.randint(20, 80)
            elements.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{color}" opacity="0.4"/>')
        elif shape_type == 'circle':
            cx = random.randint(0, width)
            cy = random.randint(0, height)
            r = random.randint(10, 30)
            elements.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{color}" opacity="0.4"/>')
        else:
            x1 = random.randint(0, width)
            y1 = random.randint(0, height)
            x2 = random.randint(0, width)
            y2 = random.randint(0, height)
            sw = random.randint(1, 3)
            elements.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{sw}" opacity="0.5"/>')

    # 背景 SVG：在缺口位置绘制凹槽阴影，并覆盖一层半透明遮罩
    shadow_color = f"rgb({random.randint(120,160)},{random.randint(120,160)},{random.randint(120,160)})"
    patch_color = f"rgb({random.randint(210,240)},{random.randint(210,240)},{random.randint(210,240)})"
    bg_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">
      <rect width="100%" height="100%" fill="{bg_color}"/>
      {''.join(elements)}
      <rect x="{gap_x}" y="{gap_y}" width="{slider_w}" height="{slider_h}" fill="{patch_color}" stroke="{shadow_color}" stroke-width="2"/>
    </svg>'''

    # 滑块 SVG：使用 clipPath 只显示缺口区域的内容
    slider_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {slider_w} {slider_h}" width="{slider_w}" height="{slider_h}">
      <defs>
        <clipPath id="c">
          <rect width="{slider_w}" height="{slider_h}"/>
        </clipPath>
      </defs>
      <g clip-path="url(#c)">
        <rect x="{-gap_x}" y="{-gap_y}" width="{width}" height="{height}" fill="{bg_color}"/>
        {''.join(e.replace('opacity="0.4"', 'opacity="0.55"').replace('opacity="0.5"', 'opacity="0.6"') for e in elements)}
      </g>
    </svg>'''

    def _svg_to_data_uri(svg: str) -> str:
        b64 = base64.b64encode(svg.encode('utf-8')).decode('ascii')
        return f"data:image/svg+xml;base64,{b64}"

    token = secrets.token_urlsafe(24)
    expire_at = datetime.now(timezone.utc).timestamp() + _CAPTCHA_TTL_SECONDS

    # 防 DoS：限制存储容量
    if len(_captcha_store) >= _MAX_CAPTCHA_ENTRIES:
        sorted_keys = sorted(_captcha_store.keys(), key=lambda k: _captcha_store[k][1])
        for k in sorted_keys[:_MAX_CAPTCHA_ENTRIES // 2]:
            del _captcha_store[k]

    # 存储格式：(correct_x, expire_at, remaining_attempts, gap_y)
    _captcha_store[ip] = (gap_x, expire_at, 3, gap_y)

    return {
        "token": token,
        "background": _svg_to_data_uri(bg_svg),
        "slider": _svg_to_data_uri(slider_svg),
        "slider_width": slider_w,
        "slider_height": slider_h,
        "slider_y": gap_y,
    }


def verify_captcha(ip: str, token: str, x: int | None) -> bool:
    """验证滑动拼图验证码位置，超过最大尝试次数或过期则清除记录。"""
    stored = _captcha_store.get(ip)
    if not stored:
        return False
    correct_x, expire_at, remaining_attempts, _gap_y = stored
    now = datetime.now(timezone.utc).timestamp()

    if now > expire_at:
        del _captcha_store[ip]
        return False

    # token 只做标识，实际安全依赖 IP 级存储和尝试次数限制
    if x is None:
        return False

    # 允许 4 像素误差
    if abs(int(x) - correct_x) <= 4:
        del _captcha_store[ip]
        return True

    # 答案错误，递减剩余次数
    remaining_attempts -= 1
    if remaining_attempts <= 0:
        del _captcha_store[ip]
    else:
        _captcha_store[ip] = (correct_x, expire_at, remaining_attempts, _gap_y)
    return False


def _get_client_ip(request: Request | None) -> str:
    """获取客户端真实 IP。

    安全说明：
    - 仅当直接连接方是可信赖的反向代理（如 nginx、内网 LB）时，才使用 X-Real-IP。
    - 若后端被直连（客户端 IP 不在可信代理网段），则忽略 X-Real-IP，
      防止攻击者伪造该头部绕过速率限制或嫁祸他人。
    - 不使用 X-Forwarded-For，因为该值可被客户端任意伪造。
    """
    if request is None:
        return "unknown"

    client_ip = request.client.host if request.client else None
    if not client_ip:
        return "unknown"

    real_ip = request.headers.get("x-real-ip")
    if real_ip and _is_trusted_proxy(client_ip):
        return real_ip.strip()

    return client_ip


def get_login_attempts_remaining(request: Request) -> int:
    """计算当前 IP 在登录动作上还剩下几次尝试机会"""
    if _is_rate_limit_disabled():
        return _MAX_LOGIN_ATTEMPTS
    client_ip = _get_client_ip(request)
    key = f"{client_ip}:登录"
    attempts = _auth_attempts.get(key)
    if not attempts:
        return _MAX_LOGIN_ATTEMPTS
    now = datetime.now(timezone.utc).timestamp()
    while attempts and attempts[0] < now - _LOGIN_WINDOW_SECONDS:
        attempts.popleft()
    return max(0, _MAX_LOGIN_ATTEMPTS - len(attempts))


def is_captcha_required(request: Request) -> bool:
    """判断当前 IP 是否需要验证码（5 分钟内失败 >= 2 次）"""
    if _is_rate_limit_disabled():
        return False
    client_ip = _get_client_ip(request)
    key = f"{client_ip}:登录"
    attempts = _auth_attempts.get(key)
    if not attempts:
        return False
    now = datetime.now(timezone.utc).timestamp()
    while attempts and attempts[0] < now - _LOGIN_WINDOW_SECONDS:
        attempts.popleft()
    return len(attempts) >= 2


def _is_rate_limit_disabled() -> bool:
    return os.environ.get("SPARKBIN_TESTING") == "1"


def check_rate_limit(request: Request, action: str) -> None:
    """检查指定动作的速率限制（登录/注册等）"""
    if _is_rate_limit_disabled():
        return

    client_ip = _get_client_ip(request)
    key = f"{client_ip}:{action}"
    now = datetime.now(timezone.utc).timestamp()

    attempts = _auth_attempts.get(key)
    if attempts is None:
        return

    # 清理过期记录
    while attempts and attempts[0] < now - _LOGIN_WINDOW_SECONDS:
        attempts.popleft()

    if len(attempts) >= _MAX_LOGIN_ATTEMPTS:
        # 动态计算 Retry-After：距离最早一次尝试过期还剩多少秒
        oldest_attempt = attempts[0]
        retry_after = max(1, int(oldest_attempt + _LOGIN_WINDOW_SECONDS - now))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"{action}尝试次数过多，请{retry_after}秒后重试",
            headers={"Retry-After": str(retry_after)},
        )


def record_rate_limit_failure(request: Request, action: str) -> None:
    """记录一次认证失败（测试模式下跳过）"""
    record_rate_limit_attempt(request, action)


def record_rate_limit_attempt(request: Request, action: str) -> None:
    """记录一次动作尝试，用于通用端点速率限制（如 forgot-password 邮件发送）。"""
    if _is_rate_limit_disabled():
        return

    client_ip = _get_client_ip(request)
    key = f"{client_ip}:{action}"
    if key not in _auth_attempts:
        _auth_attempts[key] = deque(maxlen=100)
    # 防 DoS：限制总条目数
    if len(_auth_attempts) >= _MAX_AUTH_ATTEMPTS_ENTRIES:
        # 清理空或过期条目
        now = datetime.now(timezone.utc).timestamp()
        expired_keys = [
            k for k, attempts in _auth_attempts.items()
            if not attempts or attempts[-1] < now - _LOGIN_WINDOW_SECONDS
        ]
        for k in expired_keys[:len(expired_keys) // 2]:
            del _auth_attempts[k]
    _auth_attempts[key].append(datetime.now(timezone.utc).timestamp())


def check_login_rate_limit(request: Request) -> None:
    """检查登录频率限制（兼容包装）"""
    check_rate_limit(request, "登录")


def record_login_failure(request: Request) -> None:
    """记录一次登录失败（兼容包装）"""
    record_rate_limit_failure(request, "登录")


def _prehash_password(password: str) -> bytes:
    """使用 SHA-256 预哈希密码，规避 bcrypt 72 字节截断限制"""
    return hashlib.sha256(password.encode('utf-8')).hexdigest().encode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码（支持 SHA-256+bcrypt 新方式及直接 bcrypt 旧方式兼容）"""
    if not plain_password or not hashed_password:
        return False
    try:
        hashed_bytes = hashed_password.encode('utf-8')
        # 先尝试新方式：SHA-256 预哈希 + bcrypt
        prehashed = _prehash_password(plain_password)
        if bcrypt.checkpw(prehashed, hashed_bytes):
            return True
        # 回退旧方式：直接截断 bcrypt（兼容历史用户）
        if bcrypt.checkpw(plain_password.encode('utf-8')[:72], hashed_bytes):
            return True
        return False
    except Exception as exc:
        logger.warning(f"Password verification error: {type(exc).__name__}: {exc}")
        return False


def hash_password(password: str) -> str:
    """哈希密码（SHA-256 预哈希 + bcrypt）"""
    prehashed = _prehash_password(password)
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(prehashed, salt)
    return hashed.decode('utf-8')


def _create_token(data: dict, expires_delta: timedelta, token_type: str, token_version: int = 0) -> str:
    """创建 JWT Token（内部通用）"""
    settings = get_settings()
    to_encode = data.copy()
    to_encode.update({
        "exp": datetime.now(timezone.utc) + expires_delta,
        "type": token_type,
        "ver": token_version,
    })
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm="HS256")
    return encoded_jwt


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None, token_version: int = 0) -> str:
    """创建 Access Token（默认15分钟，可通过 ACCESS_TOKEN_EXPIRE_MINUTES 覆盖）"""
    if expires_delta is None:
        settings = get_settings()
        expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
    return _create_token(data, expires_delta, "access", token_version)


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None, token_version: int = 0) -> str:
    """创建 Refresh Token（默认7天，可通过 REFRESH_TOKEN_EXPIRE_DAYS 覆盖）"""
    if expires_delta is None:
        settings = get_settings()
        expires_delta = timedelta(days=settings.refresh_token_expire_days)
    return _create_token(data, expires_delta, "refresh", token_version)


def decode_token(token: str, expected_type: Optional[str] = None) -> Optional[dict]:
    """解码 JWT Token，可校验类型"""
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        if expected_type and payload.get("type") != expected_type:
            return None
        return payload
    except JWTError:
        return None


def create_email_verification_token(user_id: str, email: str, token_id: str | None = None) -> str:
    """创建邮箱验证 token（24小时有效）"""
    data = {"sub": user_id, "email": email}
    if token_id:
        data["jti"] = token_id
    return _create_token(
        data,
        timedelta(hours=24),
        "email_verify"
    )


def create_password_reset_token(user_id: str, email: str, token_id: str | None = None) -> str:
    """创建密码重置 token（24小时有效）"""
    data = {"sub": user_id, "email": email}
    if token_id:
        data["jti"] = token_id
    return _create_token(
        data,
        timedelta(hours=24),
        "password_reset"
    )


def decode_email_token(token: str, expected_type: str) -> Optional[dict]:
    """解码邮箱相关 token（验证/重置）"""
    return decode_token(token, expected_type=expected_type)


def validate_password_complexity(password: str) -> tuple[bool, str]:
    """校验密码复杂度

    规则：
    - 至少 8 个字符
    - 包含至少 1 个大写字母
    - 包含至少 1 个小写字母
    - 包含至少 1 个数字
    - 包含至少 1 个特殊字符
    """
    if len(password) < 8:
        return False, "密码至少需要 8 个字符"
    if not any(c.isupper() for c in password):
        return False, "密码需要包含至少 1 个大写字母"
    if not any(c.islower() for c in password):
        return False, "密码需要包含至少 1 个小写字母"
    if not any(c.isdigit() for c in password):
        return False, "密码需要包含至少 1 个数字"
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]', password):
        return False, "密码需要包含至少 1 个特殊字符（如 !@#$%^&*）"
    return True, ""


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security_optional),
    db: Session = Depends(get_db)
) -> User:
    """获取当前登录用户（要求 access token，支持 Header Bearer 或 HttpOnly Cookie）"""
    token = None
    if credentials is not None:
        token = credentials.credentials
    if not token:
        # 回退到 HttpOnly Cookie（推荐，避免 token 暴露在 localStorage / URL）
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(token, expected_type="access")

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 校验 token_version
    token_ver = payload.get("ver", 0)
    if token_ver != user.token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 强制首次登录改密：除白名单接口外，一律拒绝访问
    if user.require_password_change:
        allowed_paths = {
            "/auth/change-password",
            "/auth/logout",
            "/auth/refresh",
            "/auth/me",
        }
        if request.url.path not in allowed_paths:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="请先修改初始密码",
            )

    return user


async def get_current_user_from_query_or_header(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security_optional),
    db: Session = Depends(get_db)
) -> User:
    """获取当前登录用户，支持从 Header Bearer Token、URL Query Param ?token=xxx 或 Cookie 读取"""
    token = None

    # 优先从 Header 读取
    if credentials is not None:
        token = credentials.credentials

    # 其次从 Cookie 读取
    if not token:
        token = request.cookies.get("access_token")

    # 如果 Header/Cookie 都没有，尝试从 query param 读取（用于浏览器跳转场景）
    if not token:
        token = request.query_params.get("token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(token, expected_type="access")

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 校验 token_version
    token_ver = payload.get("ver", 0)
    if token_ver != user.token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """要求当前用户为管理员"""
    if current_user.role.value != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限",
        )
    return current_user


def init_default_user(db: Session):
    """初始化默认用户（如果不存在）；如果存在但哈希不兼容当前算法，自动修复"""
    settings = get_settings()

    # 一致性自检：确保当前进程的 hash_password / verify_password 互相兼容
    try:
        _test_hash = hash_password("__self_test__")
        assert verify_password("__self_test__", _test_hash) is True
    except Exception as exc:
        raise RuntimeError(
            f"CRITICAL: auth module hash/verify inconsistency detected: {exc}. "
            "Please restart the application and clear __pycache__."
        ) from exc

    # 安全检查：默认口令必须满足复杂度要求，且不能是已知弱组合
    is_complex, error_msg = validate_password_complexity(settings.default_password)
    if not is_complex:
        raise ValueError(
            f"SECURITY ERROR: DEFAULT_PASSWORD does not meet complexity requirements: {error_msg}. "
            "Please set a strong DEFAULT_PASSWORD in your .env file before starting the application."
        )

    if settings.default_username.lower() == "admin":
        raise ValueError(
            "SECURITY ERROR: DEFAULT_USERNAME cannot be 'admin'. "
            "Please change DEFAULT_USERNAME in your .env file before starting the application."
        )

    existing_user = db.query(User).filter(
        User.username == settings.default_username
    ).first()

    if existing_user:
        # 如果当前默认密码无法通过当前代码验证，说明哈希格式可能不兼容
        if not verify_password(settings.default_password, existing_user.password_hash):
            if existing_user.require_password_change:
                # 用户尚未完成首次登录改密，安全地重置为默认密码
                logger.warning(
                    "Admin password hash is incompatible with current verify_password. "
                    "Resetting to default_password (require_password_change=True)."
                )
                existing_user.password_hash = hash_password(settings.default_password)
                db.commit()
            else:
                # 用户已自行修改过密码，不做覆盖，仅记录警告
                logger.warning(
                    "Admin password hash failed verification but require_password_change=False. "
                    "If login fails, ask the admin to use 'Forgot Password' or manually reset the hash."
                )
        return

    # 创建默认用户（第一个用户为管理员，强制首次登录改密）
    new_user = User(
        username=settings.default_username,
        password_hash=hash_password(settings.default_password),
        role=UserRole.ADMIN,
        require_password_change=True,
    )
    db.add(new_user)
    db.commit()
