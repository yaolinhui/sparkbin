#!/usr/bin/env python3
"""
SparkBin 后端启动脚本
"""
import os
import uvicorn
from app.config import get_settings

# 禁用 .pyc 字节码缓存，防止 reload 时加载过时的编译缓存
os.environ.setdefault("PYTHONDONTWRITEBYTECODE", "1")

settings = get_settings()

if __name__ == "__main__":
    print(f"Starting SparkBin API on port {settings.api_port}")
    print(f"API Docs: http://localhost:{settings.api_port}/docs")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.api_port,
        reload=True,
        log_level="info"
    )
