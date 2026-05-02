import logging
import os
import hashlib
import re
from datetime import datetime, timedelta
from typing import Optional
from collections import deque
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from .config import get_settings
from .database import get_db
from .models import User, UserRole
from .rate_limiter import _login_limiter, _register_limiter

logger = logging.getLogger(__name__)

# HTTP Bearer 认证
security = HTTPBearer()

_MAX_LOGIN_ATTEMPTS = 5
_LOGIN_WINDOW_SECONDS = 300  # 5分钟

# 内存中的验证码存储: {"{ip}": (answer, expire_timestamp)}
_captcha_store: dict[str, tuple[str, float]] = {}
_CAPTCHA_TTL_SECONDS = 300  # 5分钟


def generate_captcha(ip: str) -> dict:
    """生成纯文本数学验证码（1-20 的加法）"""
    import random
    a = random.randint(1, 10)
    b = random.randint(1, 10)
    answer = str(a + b)
    question = f"{a} + {b}"
    answer_hash = hashlib.sha256(answer.encode("utf-8")).hexdigest()
    expire_at = datetime.utcnow().timestamp() + _CAPTCHA_TTL_SECONDS
    _captcha_store[ip] = (answer, expire_at)
    return {"question": question, "answer_hash": answer_hash}


def verify_captcha(ip: str, answer: str) -> bool:
    """验证验证码答案，验证后清除记录"""
    stored = _captcha_store.get(ip)
    if not stored:
        return False
    correct_answer, expire_at = stored
    now = datetime.utcnow().timestamp()
    del _captcha_store[ip]
    if now > expire_at:
        return False
    return answer.strip() == correct_answer


def _get_client_ip(request: Request) -> str:
    """获取客户端真实 IP（支持代理环境）"""
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "unknown"


def _is_rate_limit_disabled() -> bool:
    return os.environ.get("SPARKBIN_TESTING") == "1"


def get_login_attempts_remaining(request: Request) -> int:
    """计算当前 IP 在登录动作上还剩下几次尝试机会"""
    if _is_rate_limit_disabled():
        return _MAX_LOGIN_ATTEMPTS
    client_ip = _get_client_ip(request)
    count = _login_limiter.peek_count(client_ip)
    return max(0, _MAX_LOGIN_ATTEMPTS - count)


def is_captcha_required(request: Request) -> bool:
    """判断当前 IP 是否需要验证码（5 分钟内失败 >= 2 次）"""
    if _is_rate_limit_disabled():
        return False
    client_ip = _get_client_ip(request)
    count = _login_limiter.peek_count(client_ip)
    return count >= 2


def check_rate_limit(request: Request, action: str) -> None:
    """检查指定动作的速率限制（登录/注册等）"""
    if _is_rate_limit_disabled():
        return

    client_ip = _get_client_ip(request)
    limiter = _register_limiter if action == "注册" else _login_limiter
    allowed, retry_after = limiter.is_allowed(client_ip)

    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"{action}尝试次数过多，请{retry_after}秒后重试",
            headers={"Retry-After": str(retry_after)},
        )


def record_rate_limit_failure(request: Request, action: str) -> None:
    """记录一次认证失败（测试模式下跳过）"""
    if _is_rate_limit_disabled():
        return

    client_ip = _get_client_ip(request)
    limiter = _register_limiter if action == "注册" else _login_limiter
    limiter.record(client_ip)


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


_ACCESS_TOKEN_EXPIRE_MINUTES = 15
_REFRESH_TOKEN_EXPIRE_DAYS = 7


def _create_token(data: dict, expires_delta: timedelta, token_type: str, token_version: int = 0) -> str:
    """创建 JWT Token（内部通用）"""
    settings = get_settings()
    to_encode = data.copy()
    to_encode.update({
        "exp": datetime.utcnow() + expires_delta,
        "type": token_type,
        "ver": token_version,
    })
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm="HS256")
    return encoded_jwt


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None, token_version: int = 0) -> str:
    """创建 Access Token（默认15分钟）"""
    if expires_delta is None:
        expires_delta = timedelta(minutes=_ACCESS_TOKEN_EXPIRE_MINUTES)
    return _create_token(data, expires_delta, "access", token_version)


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None, token_version: int = 0) -> str:
    """创建 Refresh Token（默认7天）"""
    if expires_delta is None:
        expires_delta = timedelta(days=_REFRESH_TOKEN_EXPIRE_DAYS)
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


def create_email_verification_token(user_id: str, email: str) -> str:
    """创建邮箱验证 token（24小时有效）"""
    return _create_token(
        {"sub": user_id, "email": email},
        timedelta(hours=24),
        "email_verify"
    )


def create_password_reset_token(user_id: str, email: str) -> str:
    """创建密码重置 token（24小时有效）"""
    return _create_token(
        {"sub": user_id, "email": email},
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
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """获取当前登录用户（要求 access token）"""
    token = credentials.credentials
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

    if settings.default_username == "admin" and settings.default_password == "admin":
        raise ValueError(
            "SECURITY ERROR: Default user is using admin/admin. "
            "Please change the default credentials via environment variables before starting the application."
        )
