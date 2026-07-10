from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os
import warnings
from .config import get_settings, _is_valid_fernet_key


def _normalize_fernet_key(key: str | bytes) -> bytes:
    """将输入密钥规范化为 Fernet 可接受的 32 字节 urlsafe base64（含填充）。

    校验规则：
    - 必须是 urlsafe base64 字符串（允许无填充）。
    - 解码后必须恰好为 32 字节。
    - 返回带填充的 ASCII bytes，可直接传给 Fernet。
    """
    if isinstance(key, bytes):
        key_str = key.decode("ascii")
    else:
        key_str = key

    if not _is_valid_fernet_key(key_str):
        raise ValueError(
            "ENCRYPTION_KEY 不是有效的 32 字节 urlsafe base64 Fernet 密钥。"
        )

    padded = key_str + "=" * (-len(key_str) % 4)
    return padded.encode("ascii")


class EncryptionManager:
    def __init__(self, key: str = None):
        if key is None:
            key = get_settings().encryption_key

        # P0 安全修复：优先按标准 Fernet 密钥格式使用。
        # 若用户提供的是 43 字符无填充或 44 字符有填充的 32 字节 urlsafe base64，
        # 直接用于 Fernet，避免之前版本对 43 字符密钥错误地做一次 SHA256 哈希
        # 导致与 Fernet 真实密钥不一致、数据无法解密的问题。
        if _is_valid_fernet_key(key):
            normalized_key = _normalize_fernet_key(key)
        else:
            # 兼容性回退：历史部署可能使用非标准长度密钥或旧版派生方式。
            # 此处保留旧逻辑以保证已加密数据仍可解密，但会发出强警告，
            # 提示运维人员尽快迁移到标准 Fernet 密钥并重新加密敏感数据。
            warnings.warn(
                "ENCRYPTION_KEY 不是标准 32 字节 urlsafe base64 Fernet 密钥。"
                "当前处于兼容模式，建议立即执行迁移："
                "1) 使用 'python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"' 生成新密钥；"
                "2) 更新 .env；3) 重新设置/授权所有已加密的 API Key / GitHub Token。",
                DeprecationWarning,
                stacklevel=2,
            )
            normalized_key = _legacy_normalize_key(key)

        self.cipher = Fernet(normalized_key)

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
        except Exception as e:
            # 解密失败时抛出异常，让调用者处理，避免静默返回空字符串导致数据丢失
            raise ValueError(f"Failed to decrypt data: {e}") from e


def _legacy_normalize_key(key: str) -> bytes:
    """旧版密钥规范化逻辑（保留用于向后兼容）。

    注意：此逻辑存在已知问题——对 43 字符的 urlsafe base64 密钥会错误地
    进行 SHA256 哈希，导致与 Fernet 期望的真实 32 字节密钥不一致。
    仅用于已有加密数据的解密迁移，新部署请勿依赖。
    """
    # 确保密钥是有效的 Fernet 密钥（32 字节 base64）
    if len(key) < 32:
        # 如果密钥不够长，用 PBKDF2 派生
        # 使用基于密钥的派生 salt（每个密钥不同，但确定性强）
        import hashlib
        derived_salt = hashlib.sha256(b'sparkbin_v2_' + key.encode()).digest()[:16]
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=derived_salt,
            iterations=600000,
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

    return key if isinstance(key, bytes) else key.encode("ascii")


# 全局加密管理器实例
_encryption_manager = None


def get_encryption_manager() -> EncryptionManager:
    global _encryption_manager
    if _encryption_manager is None:
        _encryption_manager = EncryptionManager()
    return _encryption_manager
