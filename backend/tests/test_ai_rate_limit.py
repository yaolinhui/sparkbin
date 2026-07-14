"""
AI 用户级速率限制测试
"""
import pytest
from fastapi import HTTPException

from app.routers.ai import (
    check_ai_rate_limit,
    record_ai_rate_limit,
    _ai_call_attempts,
    _MAX_AI_CALLS_PER_WINDOW,
)


@pytest.fixture(autouse=True)
def reset_ai_rate_limit_state(monkeypatch):
    """每个测试前清空 AI 速率限制状态，并强制启用限制（忽略 SPARKBIN_TESTING）"""
    _ai_call_attempts.clear()
    monkeypatch.setattr("app.routers.ai._is_ai_rate_limit_disabled", lambda: False)


class TestAIRateLimit:
    def test_allows_calls_under_limit(self):
        """在限制次数内应通过"""
        for _ in range(_MAX_AI_CALLS_PER_WINDOW - 1):
            record_ai_rate_limit("user-1")
        # 未超限，不应抛异常
        check_ai_rate_limit("user-1")

    def test_blocks_calls_at_limit(self):
        """达到限制次数后再调用应被拦截"""
        for _ in range(_MAX_AI_CALLS_PER_WINDOW):
            record_ai_rate_limit("user-2")

        with pytest.raises(HTTPException) as exc_info:
            check_ai_rate_limit("user-2")
        assert exc_info.value.status_code == 429
        assert "AI 调用过于频繁" in exc_info.value.detail

    def test_rate_limit_is_per_user(self):
        """不同用户独立计数"""
        for _ in range(_MAX_AI_CALLS_PER_WINDOW):
            record_ai_rate_limit("user-a")

        # user-b 未超限
        check_ai_rate_limit("user-b")

        # user-a 已超限
        with pytest.raises(HTTPException) as exc_info:
            check_ai_rate_limit("user-a")
        assert exc_info.value.status_code == 429
