import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from contextlib import asynccontextmanager

from .config import get_settings, get_cors_origins

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
from .database import engine, SessionLocal
from .models import Base
from .auth import init_default_user
from .services.ai_proxy import init_default_ai_configs
from .routers import auth, projects, ai, admin, payments


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """添加安全响应头中间件"""

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # 防止 MIME 类型嗅探
        response.headers["X-Content-Type-Options"] = "nosniff"

        # 防止点击劫持
        response.headers["X-Frame-Options"] = "DENY"

        # XSS 保护（现代浏览器主要依赖 CSP，此头部为向后兼容）
        response.headers["X-XSS-Protection"] = "1; mode=block"

        #  referrer 策略
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # 权限策略
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

        # 内容安全策略（CSP）— 根据实际前端资源调整
        # 当前为 SPA + 本地开发环境设置；生产环境部署 HTTPS 时需进一步收紧
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://js.stripe.com; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self'; "
            "connect-src 'self' http://localhost:8000 https://api.stripe.com; "
            "frame-src https://js.stripe.com https://hooks.stripe.com; "
            "object-src 'none'; "
            "base-uri 'self';"
        )
        response.headers["Content-Security-Policy"] = csp

        # HSTS（仅在 HTTPS 环境下生效；开发环境可注释或设为 0）
        # 此处设为 0 秒以避免开发环境强制 HTTPS 导致无法访问
        # 生产环境部署时：改为 "max-age=31536000; includeSubDomains; preload"
        response.headers["Strict-Transport-Security"] = "max-age=0"

        return response


def _ensure_sqlite_columns():
    """SQLite 兼容性：确保新增列存在（避免修改已有迁移文件）"""
    if not str(engine.url).startswith("sqlite"):
        return

    from sqlalchemy import text, inspect
    inspector = inspect(engine)

    # users 表
    user_columns = {col["name"] for col in inspector.get_columns("users")}
    with engine.connect() as conn:
        if "subscription_status" not in user_columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'inactive' NOT NULL"))
        if "stripe_customer_id" not in user_columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255)"))
        if "stripe_subscription_id" not in user_columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN stripe_subscription_id VARCHAR(255)"))
        if "current_tier_id" not in user_columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN current_tier_id VARCHAR(50)"))
        if "pet_config" not in user_columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN pet_config JSON DEFAULT '{}'"))
        if "theme_preference" not in user_columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN theme_preference VARCHAR(20) DEFAULT 'dark'"))
        if "require_password_change" not in user_columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN require_password_change BOOLEAN DEFAULT 0"))
            conn.execute(text("UPDATE users SET require_password_change = 0"))
        conn.commit()

    # projects 表
    project_columns = {col["name"] for col in inspector.get_columns("projects")}
    with engine.connect() as conn:
        if "original_idea" not in project_columns:
            conn.execute(text("ALTER TABLE projects ADD COLUMN original_idea TEXT DEFAULT ''"))
        conn.commit()

    # ai_call_logs 表
    ai_log_columns = {col["name"] for col in inspector.get_columns("ai_call_logs")}
    with engine.connect() as conn:
        if "user_id" not in ai_log_columns:
            conn.execute(text("ALTER TABLE ai_call_logs ADD COLUMN user_id VARCHAR(36)"))
        conn.commit()


def init_database():
    """初始化数据库表和默认数据"""
    # 创建所有表
    Base.metadata.create_all(bind=engine)

    # SQLite 兼容性补丁：动态添加新列
    _ensure_sqlite_columns()

    # 初始化默认数据
    db = SessionLocal()
    try:
        init_default_user(db)
        init_default_ai_configs(db)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时
    init_database()
    yield
    # 关闭时（如果有需要清理的资源）


app = FastAPI(
    title="SparkBin API",
    description="SparkBin 后端 API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS 配置
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 安全响应头中间件
app.add_middleware(SecurityHeadersMiddleware)

# 注册路由
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(ai.router)
app.include_router(admin.router)
app.include_router(payments.router)


@app.get("/")
def root():
    return {
        "name": "SparkBin API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.api_port,
        reload=True
    )
