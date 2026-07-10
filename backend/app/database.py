from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import StaticPool
from .config import get_settings

settings = get_settings()

# 支持 SQLite 和 PostgreSQL
if settings.database_url.startswith("sqlite"):
    # 内存 SQLite 必须使用 StaticPool，否则多线程/异步 lifespan 中创建的表
    # 在请求线程中不可见。
    poolclass = StaticPool if ":memory:" in settings.database_url else None
    engine_kwargs = {
        "connect_args": {"check_same_thread": False},
    }
    if poolclass is not None:
        engine_kwargs["poolclass"] = poolclass
    engine = create_engine(settings.database_url, **engine_kwargs)
else:
    engine = create_engine(settings.database_url)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass


def get_db():
    """依赖注入用，获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
