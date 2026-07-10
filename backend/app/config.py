from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import base64
import re


class Settings(BaseSettings):
    # 数据库
    database_url: str = "sqlite:///./sparkbin.db"

    # 安全密钥
    secret_key: str = "your-secret-key-change-this"
    encryption_key: str = "your-32-byte-encryption-key-here!"

    # 初始管理员
    default_username: str = "admin"
    default_password: str = "admin"

    # API 配置
    api_port: int = 8000
    debug: bool = False
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # GitHub 备份（可选）
    github_token: str = ""
    github_owner: str = ""
    github_repo: str = ""
    github_file_path: str = "data/projects.json"

    # 商业模式开关
    enable_payments: bool = False  # 是否启用支付/充值功能（SaaS=true, 自托管=false）
    enable_saas_features: bool = False  # SaaS 专属功能开关
    credits_grant_on_register: int = 20  # 注册赠送 AI 额度
    credits_packs: str = "5:100,10:250,20:600"  # 价格(美元):额度数

    # Stripe 支付配置（测试模式）
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_publishable_key: str = ""  # 前端展示用，可选
    app_url: str = "http://localhost:5173"  # 支付回调基础地址

    # 邮件服务（Resend）
    resend_api_key: str = ""
    resend_from_email: str = "SparkBin <noreply@sparkbin.wanchun.me>"

    # OAuth 配置
    google_client_id: str = ""
    google_client_secret: str = ""
    github_client_id: str = ""
    github_client_secret: str = ""
    frontend_url: str = "http://localhost:5173"  # OAuth 回调和邮件链接基础地址

    # HSTS 配置（生产环境启用）
    hsts_max_age: int = 0  # 设为 31536000（1年）以启用 HSTS

    # HTTP 代理配置（用于后端访问外部 API，如 Google/GitHub）
    http_proxy: str = ""
    https_proxy: str = ""

    # 后端 API 公开地址（用于 CSP connect-src 等）
    api_url: str = "http://localhost:8000"

    # 可信 Host 列表（生产环境逗号分隔，如 localhost,api.example.com）
    allowed_hosts: str = "localhost"

model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )


_DEFAULT_SECRET_KEY = "your-secret-key-change-this"
_DEFAULT_ENCRYPTION_KEY = "your-32-byte-encryption-key-here!"


def _is_hex(key: str) -> bool:
    """判断字符串是否全为十六进制字符。"""
    if not key:
        return False
    return all(c in "0123456789abcdefABCDEF" for c in key)


_FERNET_KEY_PATTERN = re.compile(r"^[A-Za-z0-9_-]{43}(=?)$")


def _decode_fernet_key(key: str) -> bytes:
    """验证并解码 Fernet 密钥。

    要求：
    - 仅包含 urlsafe base64 字符（A-Z, a-z, 0-9, -, _）和末尾可选的 = 填充。
    - 长度为 43（无填充）或 44（有填充）。
    - 解码后恰好 32 字节。
    """
    if not _FERNET_KEY_PATTERN.match(key):
        raise ValueError(
            "Fernet key must be 43 (unpadded) or 44 (padded) URL-safe base64 characters."
        )
    padded = key + "=" * (-len(key) % 4)
    decoded = base64.urlsafe_b64decode(padded)
    if len(decoded) != 32:
        raise ValueError(f"Fernet key must decode to 32 bytes, got {len(decoded)}")
    return decoded


def _is_valid_fernet_key(key: str) -> bool:
    """判断字符串是否为合法的 Fernet 密钥格式。"""
    try:
        _decode_fernet_key(key)
        return True
    except Exception:
        return False


@lru_cache()
def get_settings() -> Settings:
    settings = Settings()

    if not settings.secret_key or settings.secret_key == _DEFAULT_SECRET_KEY:
        raise ValueError(
            "SECURITY ERROR: SECRET_KEY is not set or is using the default value. "
            "Please set a strong SECRET_KEY in your .env file before starting the application."
        )
    # HS256 需要至少 256 位（32 字节）熵。若用户使用十六进制，需至少 64 字符；
    # 若使用随机 ASCII 字符串，需至少 32 字符。
    if _is_hex(settings.secret_key):
        if len(settings.secret_key) < 64:
            raise ValueError(
                "SECURITY ERROR: SECRET_KEY appears to be hexadecimal but is less than 64 characters "
                "(32 bytes). Please generate a 64-character hex string with: "
                "python -c \"import secrets; print(secrets.token_hex(32))\""
            )
    elif len(settings.secret_key) < 32:
        raise ValueError(
            "SECURITY ERROR: SECRET_KEY must be at least 32 characters long "
            "or 64 hexadecimal characters. "
            "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
        )

    if not settings.encryption_key or settings.encryption_key == _DEFAULT_ENCRYPTION_KEY:
        raise ValueError(
            "SECURITY ERROR: ENCRYPTION_KEY is not set or is using the default value. "
            "Please set a strong ENCRYPTION_KEY in your .env file before starting the application."
        )
    # ENCRYPTION_KEY 必须是标准 Fernet 密钥：32 字节 urlsafe base64。
    # 兼容 43 字符无填充（secrets.token_urlsafe(32)）和 44 字符有填充（Fernet.generate_key()）。
    if not _is_valid_fernet_key(settings.encryption_key):
        raise ValueError(
            "SECURITY ERROR: ENCRYPTION_KEY must be a valid 32-byte URL-safe base64 Fernet key. "
            "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )

    # 拒绝已知弱口令默认值，强制用户设置强密码
    _default_weak_passwords = {
        "admin", "password", "123456", "admin123", "changeme",
        "changeme-strong-password", "password123", "qwerty", "12345678",
    }
    if settings.default_password and settings.default_password.lower() in _default_weak_passwords:
        raise ValueError(
            "SECURITY ERROR: DEFAULT_PASSWORD is using a known weak value. "
            "Please generate a strong DEFAULT_PASSWORD in your .env file before starting the application."
        )

    return settings


def get_cors_origins() -> list[str]:
    settings = get_settings()
    origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
    # 拒绝通配符 origin（与 allow_credentials=True 组合时有安全风险）
    if "*" in origins:
        raise ValueError(
            "SECURITY ERROR: CORS_ORIGINS cannot contain '*'. "
            "Please specify explicit origins in your .env file."
        )
    return origins
