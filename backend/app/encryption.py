from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os
from .config import get_settings


class EncryptionManager:
    def __init__(self, key: str = None):
        if key is None:
            key = get_settings().encryption_key
        # 确保密钥是有效的 Fernet 密钥（32 字节 base64）
        if len(key) < 32:
            # 如果密钥不够长，用 PBKDF2 派生
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b'sparkbin_salt_2024',
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(key.encode()))
        elif len(key) != 44:  # Fernet 密钥 base64 编码后是 44 字节
            # 使用 SHA256 哈希然后 base64 编码
            import hashlib
            key = base64.urlsafe_b64encode(hashlib.sha256(key.encode()).digest())
        else:
            try:
                # 尝试解码验证
                base64.urlsafe_b64decode(key)
            except Exception:
                import hashlib
                key = base64.urlsafe_b64encode(hashlib.sha256(key.encode()).digest())

        self.cipher = Fernet(key)

    def encrypt(self, data: str) -> str:
        """加密字符串"""
        if not data:
            return ""
        return self.cipher.encrypt(data.encode()).decode()

    def decrypt(self, encrypted_data: str) -> str:
        """解密字符串"""
        if not encrypted_data:
            return ""
        try:
            return self.cipher.decrypt(encrypted_data.encode()).decode()
        except Exception:
            return ""


# 全局加密管理器实例
_encryption_manager = None


def get_encryption_manager() -> EncryptionManager:
    global _encryption_manager
    if _encryption_manager is None:
        _encryption_manager = EncryptionManager()
    return _encryption_manager
