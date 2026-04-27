from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # 数据库
    database_url: str = "postgresql://postgres:password@localhost:5432/sparkbin"

    # 安全密钥
    secret_key: str = "your-secret-key-change-this"
    encryption_key: str = "your-32-byte-encryption-key-here!"

    # 初始管理员
    default_username: str = "admin"
    default_password: str = "admin"

    # API 配置
    api_port: int = 8000
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"

    # GitHub 备份（可选）
    github_token: str = ""
    github_owner: str = ""
    github_repo: str = ""
    github_file_path: str = "data/projects.json"

    # Stripe 支付配置（测试模式）
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_publishable_key: str = ""  # 前端展示用，可选
    app_url: str = "http://localhost:5173"  # 支付回调基础地址

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


_DEFAULT_SECRET_KEY = "your-secret-key-change-this"
_DEFAULT_ENCRYPTION_KEY = "your-32-byte-encryption-key-here!"


@lru_cache()
def get_settings() -> Settings:
    settings = Settings()

    if settings.secret_key == _DEFAULT_SECRET_KEY:
        raise ValueError(
            "SECURITY ERROR: SECRET_KEY is using the default value. "
            "Please set a strong SECRET_KEY in your .env file before starting the application."
        )
    if settings.encryption_key == _DEFAULT_ENCRYPTION_KEY:
        raise ValueError(
            "SECURITY ERROR: ENCRYPTION_KEY is using the default value. "
            "Please set a strong ENCRYPTION_KEY in your .env file before starting the application."
        )

    return settings


def get_cors_origins() -> list[str]:
    settings = get_settings()
    return [origin.strip() for origin in settings.cors_origins.split(",")]
