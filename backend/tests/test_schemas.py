"""
请求体验证安全测试
"""
import pytest
from pydantic import ValidationError

from app.schemas import AIChatRequest, GitHubImportCreateRequest
from app.models import AIProvider


class TestAIChatRequestValidation:
    def test_valid_messages_pass(self):
        req = AIChatRequest(
            provider=AIProvider.DEEPSEEK,
            messages=[{"role": "user", "content": "Hello"}],
        )
        assert len(req.messages) == 1

    def test_too_many_messages_rejected(self):
        with pytest.raises(ValidationError):
            AIChatRequest(
                provider=AIProvider.DEEPSEEK,
                messages=[{"role": "user", "content": "x"} for _ in range(51)],
            )

    def test_invalid_role_rejected(self):
        with pytest.raises(ValidationError):
            AIChatRequest(
                provider=AIProvider.DEEPSEEK,
                messages=[{"role": "attacker", "content": "x"}],
            )

    def test_empty_content_rejected(self):
        with pytest.raises(ValidationError):
            AIChatRequest(
                provider=AIProvider.DEEPSEEK,
                messages=[{"role": "user", "content": ""}],
            )

    def test_overlong_content_rejected(self):
        with pytest.raises(ValidationError):
            AIChatRequest(
                provider=AIProvider.DEEPSEEK,
                messages=[{"role": "user", "content": "x" * 8001}],
            )


class TestGitHubImportRequestValidation:
    def test_readme_content_max_length(self):
        with pytest.raises(ValidationError):
            GitHubImportCreateRequest(
                owner="test",
                repo="repo",
                title="Test",
                readme_content="x" * 50001,
            )

    def test_valid_readme_content_pass(self):
        req = GitHubImportCreateRequest(
            owner="test",
            repo="repo",
            title="Test",
            readme_content="x" * 50000,
        )
        assert len(req.readme_content) == 50000
