"""
Auth module tests — 验证密码哈希一致性、兼容性及 init_default_user 自修复逻辑
"""
import os
import sys
from uuid import uuid4

# Ensure we don't write bytecode in tests either
os.environ.setdefault("SPARKBIN_TESTING", "1")
# 提供足够强度的测试配置，避免 config.get_settings() 的安全校验在导入阶段崩溃。
os.environ.setdefault("SECRET_KEY", "00" * 32)  # 64 字符十六进制 = 32 字节熵
os.environ.setdefault("ENCRYPTION_KEY", "A" * 43 + "=")  # 标准 32 字节 Fernet 密钥
os.environ.setdefault("DEFAULT_USERNAME", "testadmin")
os.environ.setdefault("DEFAULT_PASSWORD", "Test@123456")
sys.dont_write_bytecode = True

import bcrypt
import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Must import app models before creating tables
from app.models import Base, User, UserRole, AgentRun, Project
from app.auth import (
    verify_password,
    hash_password,
    init_default_user,
    validate_password_complexity,
    check_rate_limit,
    record_rate_limit_failure,
    create_password_reset_token,
    create_email_verification_token,
    decode_email_token,
    generate_captcha,
    verify_captcha,
)
from app.agents.orchestrator import AgentOrchestrator
from app.routers.auth import (
    register,
    _create_bind_state, _verify_bind_state,
    _create_connect_state, _verify_connect_state,
    _sanitize_avatar_url,
)
from app.auth import _get_client_ip
from app.schemas import RegisterRequest


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


class TestTokenSingleUse:
    def test_password_reset_token_includes_jti(self):
        token = create_password_reset_token("user-1", "user@example.com", token_id="token-id-1")
        payload = decode_email_token(token, "password_reset")
        assert payload is not None
        assert payload.get("jti") == "token-id-1"

    def test_email_verification_token_includes_jti(self):
        token = create_email_verification_token("user-1", "user@example.com", token_id="token-id-2")
        payload = decode_email_token(token, "email_verify")
        assert payload is not None
        assert payload.get("jti") == "token-id-2"


class TestRegisterUserEnumeration:
    def test_duplicate_username_or_email_returns_generic_message(self, db_session):
        from datetime import datetime, timezone

        # 先创建一个用户
        existing = User(
            username="existinguser",
            email="existing@example.com",
            password_hash=hash_password("MyP@ssw0rd!"),
            role=UserRole.USER,
        )
        db_session.add(existing)
        db_session.commit()

        # 构造一个合法的 form_start_time（2-300 秒前）
        valid_start_time = datetime.now(timezone.utc).timestamp() - 5.0

        # 使用相同用户名注册，应返回模糊消息
        with pytest.raises(HTTPException) as exc_info:
            register(
                request=RegisterRequest(
                    username="existinguser",
                    email="new@example.com",
                    password="NewP@ssw0rd!1",
                    honeypot="",
                    form_start_time=valid_start_time,
                ),
                db=db_session,
            )
        assert exc_info.value.status_code == 400
        assert "用户名或邮箱已被使用" in exc_info.value.detail

        # 使用相同邮箱注册，也应返回同一模糊消息
        with pytest.raises(HTTPException) as exc_info:
            register(
                request=RegisterRequest(
                    username="newuser",
                    email="existing@example.com",
                    password="NewP@ssw0rd!1",
                    honeypot="",
                    form_start_time=valid_start_time,
                ),
                db=db_session,
            )
        assert exc_info.value.status_code == 400
        assert "用户名或邮箱已被使用" in exc_info.value.detail


class TestOAuthStateSingleUse:
    def test_bind_state_includes_jti(self):
        state = _create_bind_state("user-1", token_id="bind-token-id")
        payload = _verify_bind_state(state)
        assert payload is not None
        assert payload.get("oauth") == "bind"
        assert payload.get("user_id") == "user-1"
        assert payload.get("jti") == "bind-token-id"

    def test_connect_state_includes_jti(self):
        state = _create_connect_state("user-1", token_id="connect-token-id")
        payload = _verify_connect_state(state)
        assert payload is not None
        assert payload.get("oauth") == "connect"
        assert payload.get("user_id") == "user-1"
        assert payload.get("jti") == "connect-token-id"


class TestClientIpExtraction:
    def test_prefers_x_real_ip(self):
        from fastapi import Request

        scope = {
            "type": "http",
            "client": ("10.0.0.1", 12345),
            "headers": [
                (b"x-real-ip", b"203.0.113.1"),
                (b"x-forwarded-for", b"1.2.3.4, 5.6.7.8"),
            ],
        }
        request = Request(scope)
        assert _get_client_ip(request) == "203.0.113.1"

    def test_ignores_spoofed_x_forwarded_for(self):
        from fastapi import Request

        scope = {
            "type": "http",
            "client": ("10.0.0.1", 12345),
            "headers": [
                (b"x-forwarded-for", b"1.2.3.4, 5.6.7.8"),
            ],
        }
        request = Request(scope)
        # 没有 X-Real-IP 时应回退到直接连接 IP，而非 X-Forwarded-For 左侧
        assert _get_client_ip(request) == "10.0.0.1"

    def test_returns_unknown_for_none_request(self):
        assert _get_client_ip(None) == "unknown"


class TestAvatarUrlSanitization:
    def test_valid_https_url_allowed(self):
        assert _sanitize_avatar_url("https://example.com/avatar.png") == "https://example.com/avatar.png"

    def test_valid_http_url_allowed(self):
        assert _sanitize_avatar_url("http://example.com/avatar.png") == "http://example.com/avatar.png"

    def test_javascript_scheme_rejected(self):
        assert _sanitize_avatar_url("javascript:alert(1)") is None

    def test_data_scheme_rejected(self):
        assert _sanitize_avatar_url("data:text/html,<script>alert(1)</script>") is None

    def test_empty_url_returns_none(self):
        assert _sanitize_avatar_url("") is None
        assert _sanitize_avatar_url(None) is None


class TestAgentRunIdor:
    def test_user_cannot_access_other_users_agent_run(self, db_session):
        # 创建两个用户
        user1 = User(
            username="agentuser1",
            email="agent1@example.com",
            password_hash=hash_password("MyP@ssw0rd!1"),
            role=UserRole.USER,
        )
        user2 = User(
            username="agentuser2",
            email="agent2@example.com",
            password_hash=hash_password("MyP@ssw0rd!2"),
            role=UserRole.USER,
        )
        db_session.add_all([user1, user2])
        db_session.commit()

        # 创建属于 user1 的项目与 AgentRun
        project = Project(
            user_id=user1.id,
            title="Test Project",
            pain_point="Test pain",
            original_idea="Test idea",
        )
        db_session.add(project)
        db_session.commit()
        db_session.refresh(project)

        run = AgentRun(
            user_id=user1.id,
            project_id=project.id,
            status="completed",
            strategy="router",
            summary="user1 run",
        )
        db_session.add(run)
        db_session.commit()
        db_session.refresh(run)

        # user2 的 orchestrator 无法查到该 run
        orch = AgentOrchestrator(db_session, user_id=str(user2.id))
        status = orch.get_run_status(str(run.id))
        assert status is None

        # user1 的 orchestrator 可以查到
        orch1 = AgentOrchestrator(db_session, user_id=str(user1.id))
        status1 = orch1.get_run_status(str(run.id))
        assert status1 is not None
        assert status1["summary"] == "user1 run"


class TestCaptcha:
    def test_captcha_does_not_expose_answer_hash(self):
        result = generate_captcha("127.0.0.1")
        assert "question" in result
        assert "answer_hash" not in result

    def test_captcha_verifies_correct_answer(self):
        # 通过解析题目获取答案（测试专用）
        result = generate_captcha("127.0.0.2")
        question = result["question"]
        parts = question.split()
        a, op, b = int(parts[0]), parts[1], int(parts[2])
        if op == "+":
            answer = str(a + b)
        elif op == "-":
            answer = str(a - b)
        else:
            answer = str(a * b)
        assert verify_captcha("127.0.0.2", answer) is True

    def test_captcha_invalidates_after_max_attempts(self):
        generate_captcha("127.0.0.3")
        assert verify_captcha("127.0.0.3", "wrong") is False
        assert verify_captcha("127.0.0.3", "wrong") is False
        assert verify_captcha("127.0.0.3", "wrong") is False
        # 超过 3 次错误后，验证码已被销毁，任何答案都失败
        assert verify_captcha("127.0.0.3", "still_wrong") is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
