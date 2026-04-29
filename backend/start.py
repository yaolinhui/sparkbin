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

# 将 .env 中的代理配置注入到 os.environ，供 httpx 等库使用
if settings.http_proxy:
    os.environ.setdefault("HTTP_PROXY", settings.http_proxy)
if settings.https_proxy:
    os.environ.setdefault("HTTPS_PROXY", settings.https_proxy)

if __name__ == "__main__":
    # 确保 .env 中的代理配置对子进程可见
    if settings.http_proxy:
        os.environ.setdefault("HTTP_PROXY", settings.http_proxy)
    if settings.https_proxy:
        os.environ.setdefault("HTTPS_PROXY", settings.https_proxy)

    print(f"Starting SparkBin API on port {settings.api_port}")
    print(f"API Docs: http://localhost:{settings.api_port}/docs")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.api_port,
        reload=True,
        log_level="info",
    )
