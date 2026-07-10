"""
Pytest 共享配置：在测试收集阶段之前注入足够强度的安全密钥，
避免 app.database 等模块在导入时触发 config.get_settings() 的安全校验而崩溃。
"""
import os
import sys

os.environ.setdefault("SPARKBIN_TESTING", "1")
os.environ.setdefault("SECRET_KEY", "00" * 32)  # 64 字符十六进制 = 32 字节熵
os.environ.setdefault("ENCRYPTION_KEY", "A" * 43 + "=")  # 标准 32 字节 Fernet 密钥
os.environ.setdefault("DEFAULT_USERNAME", "testadmin")
os.environ.setdefault("DEFAULT_PASSWORD", "Test@123456")
# 使用内存数据库，避免测试文件污染和并行问题
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
# 为 GitHub connect 测试提供 mock client id
os.environ.setdefault("GITHUB_CLIENT_ID", "test_github_client_id")
os.environ.setdefault("GITHUB_CLIENT_SECRET", "test_github_client_secret")
# FastAPI TestClient 使用 host "testserver"，必须加入可信 Host
os.environ.setdefault("ALLOWED_HOSTS", "localhost,testserver")
sys.dont_write_bytecode = True
