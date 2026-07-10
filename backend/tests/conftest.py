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
sys.dont_write_bytecode = True
