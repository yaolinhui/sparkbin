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
import secrets
from datetime import datetime, timezone
from fastapi import HTTPException, Request, Response
from fastapi.testclient import TestClient
from urllib.parse import urlparse, parse_qs
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Must import app models before creating tables
from app.models import Base, User, UserRole, AgentRun, Project
from app.main import app
from app.auth import (
    verify_password,
    hash_password,
    init_default_user,
    validate_password_complexity,
    check_rate_limit,
    record_rate_limit_failure,
    create_password_reset_token,
    create_email_verification_token,
    create_refresh_token,
    decode_email_token,
    decode_token,
    generate_captcha,
    verify_captcha,
)
from app.agents.orchestrator import AgentOrchestrator
from app.routers.auth import (
    register,
    refresh_token,
    verify_email_status,
    verify_email,
    _create_bind_state, _verify_bind_state,
    _create_connect_state, _verify_connect_state,
    _sanitize_avatar_url,
    _create_oauth_state,
    _verify_oauth_state,
    oauth_google_callback,
)
from app.auth import _get_client_ip
from app.schemas import RegisterRequest, RefreshTokenRequest, VerifyEmailRequest


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


class TestRegisterNoAutoLogin:
    def test_register_does_not_issue_tokens(self, db_session):
        """注册成功后不应自动签发 token，防止未验证邮箱被抢注后直接使用账号"""
        from fastapi import Request

        valid_start_time = datetime.now(timezone.utc).timestamp() - 5.0
        request = Request({
            "type": "http",
            "headers": [],
            "scheme": "http",
            "path": "/auth/register",
            "server": ("testserver", 80),
        })

        response = register(
            request=RegisterRequest(
                username="newnologin",
                email="newnologin@example.com",
                password="NewP@ssw0rd!1",
                honeypot="",
                form_start_time=valid_start_time,
            ),
            req=request,
            db=db_session,
        )

        assert response.success is True
        assert "验证邮件" in response.message
        # 确认数据库中存在该用户，但邮箱未验证
        user = db_session.query(User).filter(User.username == "newnologin").first()
        assert user is not None
        assert user.email_verified is False


class TestOAuthStateSingleUse:
    def test_bind_state_includes_jti(self):
        nonce = secrets.token_urlsafe(32)
        state = _create_bind_state("user-1", nonce=nonce, token_id="bind-token-id")
        callback_request = Request({
            "type": "http",
            "scheme": "http",
            "path": "/auth/oauth/google/bind/callback",
            "server": ("testserver", 80),
            "headers": [(b"cookie", f"oauth_bind_state={nonce}".encode())],
        })
        payload = _verify_bind_state(state, callback_request)
        assert payload is not None
        assert payload.get("oauth") == "bind"
        assert payload.get("user_id") == "user-1"
        assert payload.get("jti") == "bind-token-id"

    def test_bind_state_fails_without_cookie(self):
        nonce = secrets.token_urlsafe(32)
        state = _create_bind_state("user-1", nonce=nonce, token_id="bind-token-id")
        callback_request = Request({
            "type": "http",
            "scheme": "http",
            "path": "/auth/oauth/google/bind/callback",
            "server": ("testserver", 80),
            "headers": [],
        })
        assert _verify_bind_state(state, callback_request) is None

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

    def test_ignores_x_real_ip_from_untrusted_client(self):
        """直连公网 IP 时，X-Real-IP 应被忽略，防止伪造"""
        from fastapi import Request

        scope = {
            "type": "http",
            "client": ("1.2.3.4", 12345),
            "headers": [
                (b"x-real-ip", b"203.0.113.1"),
            ],
        }
        request = Request(scope)
        assert _get_client_ip(request) == "1.2.3.4"

    def test_trusts_x_real_ip_from_loopback(self):
        """来自 127.0.0.1 的请求应信任 X-Real-IP"""
        from fastapi import Request

        scope = {
            "type": "http",
            "client": ("127.0.0.1", 12345),
            "headers": [
                (b"x-real-ip", b"203.0.113.1"),
            ],
        }
        request = Request(scope)
        assert _get_client_ip(request) == "203.0.113.1"


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


class TestGoogleOAuthAutoBind:
    """Google OAuth 自动绑定安全回归测试"""

    @staticmethod
    def _mock_http_client(google_email_verified: bool = True):
        """构造一个伪造的 httpx client，模拟 Google token/userinfo 接口"""
        class FakeResp:
            def __init__(self, status, data):
                self.status_code = status
                self._data = data

            def json(self):
                return self._data

        class FakeClient:
            def post(self, *args, **kwargs):
                return FakeResp(200, {"access_token": "fake-google-token"})

            def get(self, url, *args, **kwargs):
                if "userinfo" in url:
                    return FakeResp(200, {
                        "id": "google-123",
                        "email": "victim@example.com",
                        "name": "Victim User",
                        "picture": "https://example.com/avatar.png",
                        "email_verified": google_email_verified,
                    })
                return FakeResp(404, {})

        return FakeClient()

    @staticmethod
    def _make_state_request() -> tuple[str, Request]:
        """生成 OAuth state 并构造带对应 cookie 的回调 Request"""
        response = Response()
        request = Request({
            "type": "http",
            "headers": [],
            "scheme": "http",
            "path": "/auth/oauth/google",
            "server": ("testserver", 80),
        })
        state = _create_oauth_state(response, request)
        payload = decode_token(state, expected_type="access")
        nonce = payload["nonce"]
        callback_request = Request({
            "type": "http",
            "headers": [(b"cookie", f"oauth_state={nonce}".encode())],
            "scheme": "http",
            "path": "/auth/oauth/google/callback",
            "server": ("testserver", 80),
        })
        return state, callback_request

    def test_google_oauth_does_not_auto_bind_unverified_email(self, db_session, monkeypatch):
        """现有账号邮箱未验证时，Google OAuth 不应自动绑定并登录"""
        existing = User(
            username="victimuser",
            email="victim@example.com",
            password_hash=hash_password("MyP@ssw0rd!1"),
            role=UserRole.USER,
            email_verified=False,
        )
        db_session.add(existing)
        db_session.commit()

        monkeypatch.setattr(
            "app.routers.auth._get_http_client",
            lambda: self._mock_http_client(google_email_verified=True),
        )

        state, callback_request = self._make_state_request()
        with pytest.raises(HTTPException) as exc_info:
            oauth_google_callback(code="fake-code", state=state, request=callback_request, db=db_session)

        assert exc_info.value.status_code == 409
        assert "验证邮箱" in exc_info.value.detail or "未验证" in exc_info.value.detail

    def test_google_oauth_requires_email_verified_claim(self, db_session, monkeypatch):
        """Google 返回 email_verified=false 时不应创建或绑定用户"""
        monkeypatch.setattr(
            "app.routers.auth._get_http_client",
            lambda: self._mock_http_client(google_email_verified=False),
        )

        state, callback_request = self._make_state_request()
        with pytest.raises(HTTPException) as exc_info:
            oauth_google_callback(code="fake-code", state=state, request=callback_request, db=db_session)

        assert exc_info.value.status_code == 400

    def test_google_oauth_auto_bind_verified_email(self, db_session, monkeypatch):
        """现有账号邮箱已验证时，Google OAuth 可以自动绑定"""
        existing = User(
            username="verifieduser",
            email="verified@example.com",
            password_hash=hash_password("MyP@ssw0rd!1"),
            role=UserRole.USER,
            email_verified=True,
        )
        db_session.add(existing)
        db_session.commit()

        monkeypatch.setattr(
            "app.routers.auth._get_http_client",
            lambda: self._mock_http_client(google_email_verified=True),
        )

        state, callback_request = self._make_state_request()
        response = oauth_google_callback(code="fake-code", state=state, request=callback_request, db=db_session)
        assert response.status_code in (302, 307)
        # 成功后 token 应通过 Cookie 下发，URL fragment 中不再包含 token
        assert "set-cookie" in response.headers
        assert "access_token=" in response.headers["set-cookie"]
        redirect_url = response.headers.get("location", "")
        assert "access_token=" not in redirect_url
        assert "refresh_token=" not in redirect_url


class TestOAuthStateBinding:
    """OAuth 登录 state 与会话 cookie 绑定回归测试"""

    def _make_state_request(self, with_cookie: bool = True, wrong_cookie: bool = False) -> tuple[str, Request]:
        response = Response()
        request = Request({
            "type": "http",
            "headers": [],
            "scheme": "http",
            "path": "/auth/oauth/google",
            "server": ("testserver", 80),
        })
        state = _create_oauth_state(response, request)
        payload = decode_token(state, expected_type="access")
        nonce = payload["nonce"]
        base_scope = {
            "type": "http",
            "scheme": "http",
            "path": "/auth/oauth/google/callback",
            "server": ("testserver", 80),
        }
        if not with_cookie:
            callback_request = Request({**base_scope, "headers": []})
        elif wrong_cookie:
            callback_request = Request({**base_scope, "headers": [(b"cookie", b"oauth_state=attacker-nonce")]})
        else:
            callback_request = Request({**base_scope, "headers": [(b"cookie", f"oauth_state={nonce}".encode())]})
        return state, callback_request

    def test_state_verifies_with_matching_cookie(self):
        """state 与 cookie nonce 匹配时应通过"""
        state, callback_request = self._make_state_request(with_cookie=True)
        assert _verify_oauth_state(state, callback_request) is True

    def test_state_fails_without_cookie(self):
        """缺少对应 cookie 时 state 验证应失败"""
        state, callback_request = self._make_state_request(with_cookie=False)
        assert _verify_oauth_state(state, callback_request) is False

    def test_state_fails_with_wrong_cookie(self):
        """cookie nonce 不匹配时 state 验证应失败"""
        state, callback_request = self._make_state_request(wrong_cookie=True)
        assert _verify_oauth_state(state, callback_request) is False


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


class TestRefreshTokenRotation:
    """Refresh Token Rotation 安全回归测试"""

    def test_refresh_token_invalidates_after_use(self, db_session):
        """同一条 refresh token 只能成功刷新一次，第二次应失效"""
        user = User(
            username="refreshuser",
            email="refresh@example.com",
            password_hash=hash_password("MyP@ssw0rd!1"),
            role=UserRole.USER,
            token_version=5,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        refresh_token_str = create_refresh_token(
            data={"sub": user.username},
            token_version=user.token_version,
        )

        # 第一次刷新应成功
        first_response = refresh_token(
            request=Request({"type": "http", "headers": [], "scheme": "http", "path": "/auth/refresh", "server": ("testserver", 80)}),
            response=Response(),
            body=RefreshTokenRequest(refresh_token=refresh_token_str),
            db=db_session,
        )
        assert first_response.access_token
        assert first_response.refresh_token

        # 用户版本号已递增
        db_session.refresh(user)
        assert user.token_version == 6

        # 使用同一条旧 refresh token 再次刷新应失败
        with pytest.raises(HTTPException) as exc_info:
            refresh_token(
                request=Request({"type": "http", "headers": [], "scheme": "http", "path": "/auth/refresh", "server": ("testserver", 80)}),
                response=Response(),
                body=RefreshTokenRequest(refresh_token=refresh_token_str),
                db=db_session,
            )
        assert exc_info.value.status_code == 401


class TestVerifyEmailLinkPrefetch:
    """邮箱验证链接预取消耗防护回归测试"""

    def _create_user_with_email_token(self, db_session):
        user = User(
            username="verifyuser",
            email="verify@example.com",
            password_hash=hash_password("MyP@ssw0rd!1"),
            role=UserRole.USER,
            email_verified=False,
            email_verification_token_id="verify-token-id-1",
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    def test_get_verify_email_does_not_consume_token(self, db_session):
        """GET /verify-email 只检查状态，不应消耗 token"""
        user = self._create_user_with_email_token(db_session)
        token = create_email_verification_token(
            str(user.id), user.email, token_id=user.email_verification_token_id
        )

        response = verify_email_status(token=token, db=db_session)
        assert response.success is True

        db_session.refresh(user)
        assert user.email_verified is False
        assert user.email_verification_token_id == "verify-token-id-1"

    def test_post_verify_email_consumes_token(self, db_session):
        """POST /verify-email 才实际消耗 token"""
        user = self._create_user_with_email_token(db_session)
        token = create_email_verification_token(
            str(user.id), user.email, token_id=user.email_verification_token_id
        )

        response = verify_email(request=VerifyEmailRequest(token=token), db=db_session)
        assert response.success is True

        db_session.refresh(user)
        assert user.email_verified is True
        assert user.email_verification_token_id is None

    def test_post_verify_email_rejects_reused_token(self, db_session):
        """已消耗的 token 再次 POST 应失败"""
        user = self._create_user_with_email_token(db_session)
        token = create_email_verification_token(
            str(user.id), user.email, token_id=user.email_verification_token_id
        )

        first = verify_email(request=VerifyEmailRequest(token=token), db=db_session)
        assert first.success is True

        second = verify_email(request=VerifyEmailRequest(token=token), db=db_session)
        assert second.success is False


class TestGitHubConnectAuth:
    """GitHub 增量授权（仓库导入）鉴权回归测试"""

    @staticmethod
    def _login(client: TestClient) -> str:
        resp = client.post("/auth/login", json={
            "username": "testadmin",
            "password": "Test@123456",
        })
        assert resp.status_code == 200, resp.text
        return resp.json()["access_token"]

    @pytest.mark.skip(reason="TODO: 更新测试以适配 HttpOnly Cookie + 强制首次改密（默认管理员 require_password_change=True）")
    def test_connect_rejects_token_in_query(self):
        """URL query 中传 token 应被拒绝，防止 token 进入日志/Referer"""
        with TestClient(app) as client:
            token = self._login(client)
            resp = client.get(f"/auth/oauth/github/connect?token={token}")
            assert resp.status_code in (401, 403)

    def test_connect_requires_authentication(self):
        """未提供认证时应被拒绝"""
        with TestClient(app) as client:
            resp = client.get("/auth/oauth/github/connect")
            assert resp.status_code in (401, 403)

    @pytest.mark.skip(reason="TODO: 更新测试以适配 HttpOnly Cookie + 强制首次改密（默认管理员 require_password_change=True）")
    def test_connect_returns_github_url_with_valid_state(self):
        """使用 Authorization header 应返回带合法 state 的 GitHub 授权 URL"""
        with TestClient(app) as client:
            token = self._login(client)
            user_id = self._get_user_id(client, token)
            resp = client.get(
                "/auth/oauth/github/connect",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp.status_code == 200, resp.text
            data = resp.json()
            assert "url" in data
            url = data["url"]
            assert "https://github.com/login/oauth/authorize" in url

            parsed = urlparse(url)
            query = parse_qs(parsed.query)
            assert "state" in query
            state = query["state"][0]

            payload = _verify_connect_state(state)
            assert payload is not None
            assert payload.get("oauth") == "connect"
            assert payload.get("user_id") == user_id
            assert payload.get("jti") is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
