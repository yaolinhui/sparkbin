#!/usr/bin/env python3
"""
SparkBin 后端启动脚本
"""
import uvicorn
from app.config import get_settings

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
