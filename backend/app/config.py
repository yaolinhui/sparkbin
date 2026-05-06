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
    debug: bool = False
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"

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
    resend_from_email: str = "SparkBin <noreply@sparkbin.dev>"

    # OAuth 配置
    google_client_id: str = ""
    google_client_secret: str = ""
    github_client_id: str = ""
    github_client_secret: str = ""
    frontend_url: str = "http://localhost:5173"  # OAuth 回调和邮件链接基础地址

    # HTTP 代理配置（用于后端访问外部 API，如 Google/GitHub）
    http_proxy: str = ""
    https_proxy: str = ""

    class Config:
        # 自动加载 .env 文件中的配置
        env_file = ".env"
        env_file_encoding = "utf-8"


_DEFAULT_SECRET_KEY = "your-secret-key-change-this"
_DEFAULT_ENCRYPTION_KEY = "your-32-byte-encryption-key-here!"


@lru_cache()
def get_settings() -> Settings:
    settings = Settings()

    if not settings.secret_key or settings.secret_key == _DEFAULT_SECRET_KEY:
        raise ValueError(
            "SECURITY ERROR: SECRET_KEY is not set or is using the default value. "
            "Please set a strong SECRET_KEY in your .env file before starting the application."
        )
    if len(settings.secret_key) < 32:
        raise ValueError(
            "SECURITY ERROR: SECRET_KEY must be at least 32 characters long."
        )

    if not settings.encryption_key or settings.encryption_key == _DEFAULT_ENCRYPTION_KEY:
        raise ValueError(
            "SECURITY ERROR: ENCRYPTION_KEY is not set or is using the default value. "
            "Please set a strong ENCRYPTION_KEY in your .env file before starting the application."
        )
    if len(settings.encryption_key) < 32:
        raise ValueError(
            "SECURITY ERROR: ENCRYPTION_KEY must be at least 32 characters long."
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
