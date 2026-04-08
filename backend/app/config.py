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
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # GitHub 备份（可选）
    github_token: str = ""
    github_owner: str = ""
    github_repo: str = ""
    github_file_path: str = "data/projects.json"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


def get_cors_origins() -> list[str]:
    settings = get_settings()
    return [origin.strip() for origin in settings.cors_origins.split(",")]
