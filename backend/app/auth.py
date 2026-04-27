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

# HTTP Bearer 认证
security = HTTPBearer()

# 内存中的登录失败记录: {ip: deque([timestamp, ...])}
_login_attempts: dict[str, deque] = {}
_MAX_LOGIN_ATTEMPTS = 5
_LOGIN_WINDOW_SECONDS = 300  # 5分钟


def check_login_rate_limit(request: Request) -> None:
    """检查登录频率限制"""
    client_ip = request.client.host if request.client else "unknown"
    now = datetime.utcnow().timestamp()

    attempts = _login_attempts.get(client_ip)
    if attempts is None:
        return

    # 清理过期记录
    while attempts and attempts[0] < now - _LOGIN_WINDOW_SECONDS:
        attempts.popleft()

    if len(attempts) >= _MAX_LOGIN_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="登录尝试次数过多，请5分钟后重试",
            headers={"Retry-After": str(_LOGIN_WINDOW_SECONDS)},
        )


def record_login_failure(request: Request) -> None:
    """记录一次登录失败"""
    client_ip = request.client.host if request.client else "unknown"
    if client_ip not in _login_attempts:
        _login_attempts[client_ip] = deque()
    _login_attempts[client_ip].append(datetime.utcnow().timestamp())


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """要求当前用户为管理员"""
    if current_user.role.value != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限",
        )
    return current_user


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    try:
        password_bytes = plain_password.encode('utf-8')[:72]
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False


def hash_password(password: str) -> str:
    """哈希密码"""
    password_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


_ACCESS_TOKEN_EXPIRE_MINUTES = 15
_REFRESH_TOKEN_EXPIRE_DAYS = 7


def _create_token(data: dict, expires_delta: timedelta, token_type: str) -> str:
    """创建 JWT Token（内部通用）"""
    settings = get_settings()
    to_encode = data.copy()
    to_encode.update({
        "exp": datetime.utcnow() + expires_delta,
        "type": token_type,
    })
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm="HS256")
    return encoded_jwt


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """创建 Access Token（默认15分钟）"""
    if expires_delta is None:
        expires_delta = timedelta(minutes=_ACCESS_TOKEN_EXPIRE_MINUTES)
    return _create_token(data, expires_delta, "access")


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """创建 Refresh Token（默认7天）"""
    if expires_delta is None:
        expires_delta = timedelta(days=_REFRESH_TOKEN_EXPIRE_DAYS)
    return _create_token(data, expires_delta, "refresh")


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


def validate_password_complexity(password: str) -> tuple[bool, str]:
    """校验密码复杂度

    规则：
    - 至少 8 个字符
    - 包含至少 1 个大写字母
    - 包含至少 1 个小写字母
    - 包含至少 1 个数字
    """
    if len(password) < 8:
        return False, "密码至少需要 8 个字符"
    if not any(c.isupper() for c in password):
        return False, "密码需要包含至少 1 个大写字母"
    if not any(c.islower() for c in password):
        return False, "密码需要包含至少 1 个小写字母"
    if not any(c.isdigit() for c in password):
        return False, "密码需要包含至少 1 个数字"
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

    return user


def init_default_user(db: Session):
    """初始化默认用户（如果不存在）"""
    settings = get_settings()

    existing_user = db.query(User).filter(
        User.username == settings.default_username
    ).first()

    if existing_user:
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
        import warnings
        warnings.warn(
            "SECURITY WARNING: Default user is using admin/admin. "
            "Please change the default credentials via environment variables.",
            RuntimeWarning,
            stacklevel=2
        )
