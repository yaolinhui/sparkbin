import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
from .routers import auth, projects, ai, admin


def init_database():
    """初始化数据库表和默认数据"""
    # 创建所有表
    Base.metadata.create_all(bind=engine)

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

# 注册路由
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(ai.router)
app.include_router(admin.router)


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
