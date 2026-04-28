"""
Auth module tests — 验证密码哈希一致性、兼容性及 init_default_user 自修复逻辑
"""
import os
import sys

# Ensure we don't write bytecode in tests either
os.environ.setdefault("SPARKBIN_TESTING", "1")
sys.dont_write_bytecode = True

import bcrypt
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Must import app models before creating tables
from app.models import Base, User, UserRole
from app.auth import (
    verify_password,
    hash_password,
    init_default_user,
    validate_password_complexity,
    check_rate_limit,
    record_rate_limit_failure,
)


# Create an in-memory SQLite DB for tests
@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    yield session
    session.close()


class TestPasswordHashing:
    def test_hash_and_verify_roundtrip(self):
        password = "MyP@ssw0rd!"
        hashed = hash_password(password)
        assert verify_password(password, hashed) is True

    def test_verify_wrong_password_fails(self):
        password = "MyP@ssw0rd!"
        hashed = hash_password(password)
        assert verify_password("WrongPassword", hashed) is False

    def test_verify_empty_password(self):
        hashed = hash_password("something")
        assert verify_password("", hashed) is False

    def test_verify_empty_hash(self):
        assert verify_password("password", "") is False

    def test_backward_compatible_with_old_bcrypt(self):
        """旧格式（直接 bcrypt，无 SHA-256 预哈希）仍能验证通过"""
        old_hash = bcrypt.hashpw(b"old_password", bcrypt.gensalt()).decode("utf-8")
        assert verify_password("old_password", old_hash) is True

    def test_self_test_in_init_default_user(self, db_session, monkeypatch):
        """init_default_user 中的一致性自检不应抛出异常"""
        from app import auth as auth_module

        class MockSettings:
            default_username = "testadmin"
            default_password = "Test@123456"

        def mock_get_settings():
            return MockSettings()

        monkeypatch.setattr(auth_module, "get_settings", mock_get_settings)
        # 如果 hash_password / verify_password 不一致，init_default_user 会抛出 RuntimeError
        init_default_user(db_session)
        # 重复调用应安全（幂等）
        init_default_user(db_session)


class TestPasswordComplexity:
    def test_valid_password(self):
        ok, msg = validate_password_complexity("Hello1!World")
        assert ok is True
        assert msg == ""

    def test_too_short(self):
        ok, msg = validate_password_complexity("Hi1!")
        assert ok is False
        assert "8" in msg

    def test_missing_uppercase(self):
        ok, msg = validate_password_complexity("hello1!world")
        assert ok is False
        assert "大写" in msg

    def test_missing_lowercase(self):
        ok, msg = validate_password_complexity("HELLO1!WORLD")
        assert ok is False
        assert "小写" in msg

    def test_missing_digit(self):
        ok, msg = validate_password_complexity("Hello!!world")
        assert ok is False
        assert "数字" in msg

    def test_missing_special(self):
        ok, msg = validate_password_complexity("Hello123world")
        assert ok is False
        assert "特殊" in msg


class TestRateLimit:
    def test_rate_limit_disabled_in_testing(self):
        from fastapi import Request
        from starlette.datastructures import Headers

        scope = {
            "type": "http",
            "client": ("127.0.0.1", 12345),
            "headers": [],
        }
        request = Request(scope)
        # 测试模式下不应抛异常
        check_rate_limit(request, "login")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
