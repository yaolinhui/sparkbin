"""
测试：AI 建议生成接口的响应时间和输出质量
运行方式：cd backend && python -m pytest tests/test_idea_suggest_perf.py -v -s

说明：
- 若环境变量 DEEPSEEK_API_KEY 已配置，则进行真实 API 性能测试。
- 否则使用 mock 数据运行功能冒烟测试，确保代码路径在无密钥的 CI 环境也能通过。
"""
import asyncio
import os
import sys
import time
from unittest.mock import AsyncMock, patch

# pytest 在 Windows 默认编码下捕获中文输出会报错，强制使用 utf-8
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# 临时处理 frontend/.env 中的 VITE_API_URL 导致 pydantic 报错的问题
os.environ.pop("VITE_API_URL", None)
# 使用内存数据库，避免持久化文件因历史加密数据/表结构不一致导致测试失败
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models import Base, AIProvider
from app.services.ai_proxy import AIProxyService, init_default_ai_configs


@pytest.fixture
def db_session():
    """创建内存 SQLite 会话并初始化表与默认 AI 配置"""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    init_default_ai_configs(session)
    try:
        yield session
    finally:
        session.close()


@pytest.mark.asyncio
async def test_idea_suggestions_latency(db_session):
    """测试想法建议生成的端到端延迟或功能路径"""
    service = AIProxyService(db_session, user_id="ef0898d1-e787-4698-9faa-9c4d9bde972e")

    test_cases = [
        {
            "name": "全新项目（空便利贴）",
            "title": "AI 代码审查助手",
            "pain_point": "代码审查耗时太长，容易遗漏问题",
            "original_idea": "做一个 AI 助手，自动审查代码并给出改进建议",
            "current_notes": [],
        },
        {
            "name": "部分填写项目",
            "title": "个人财务管理工具",
            "pain_point": "现有的记账软件太复杂，独立开发者想要简单的收支追踪",
            "original_idea": "极简的记账工具，专注在每周回顾而不是每日记录",
            "current_notes": [
                {"title": "核心痛点", "content": "记账太麻烦，坚持不下来"},
                {"title": "目标用户", "content": "点击编辑..."},
                {"title": "使用场景", "content": "点击编辑..."},
                {"title": "解决方案", "content": "点击编辑..."},
                {"title": "差异化价值", "content": "点击编辑..."},
            ],
        },
    ]

    # 无真实 API Key 时使用 mock 数据跑通功能路径
    use_mock = not os.environ.get("DEEPSEEK_API_KEY")
    if use_mock:
        print("\n[NOTE] DEEPSEEK_API_KEY not configured, running with mocked AI response")

    for case in test_cases:
        print(f"\n{'='*60}")
        print(f"测试场景: {case['name']}")
        print(f"{'='*60}")

        start = time.time()
        try:
            if use_mock:
                with patch.object(
                    AIProxyService,
                    "_generate_idea_suggestions_single",
                    new=AsyncMock(return_value=[
                        {"title": "核心痛点", "content": "示例内容 A"},
                        {"title": "目标用户", "content": "示例内容 B"},
                        {"title": "使用场景", "content": "示例内容 C"},
                        {"title": "解决方案", "content": "示例内容 D"},
                        {"title": "差异化价值", "content": "示例内容 E"},
                    ]),
                ):
                    result = await service.generate_idea_suggestions(
                        provider=AIProvider.DEEPSEEK,
                        title=case["title"],
                        pain_point=case["pain_point"],
                        original_idea=case["original_idea"],
                        current_notes=case["current_notes"],
                    )
            else:
                result = await service.generate_idea_suggestions(
                    provider=AIProvider.DEEPSEEK,
                    title=case["title"],
                    pain_point=case["pain_point"],
                    original_idea=case["original_idea"],
                    current_notes=case["current_notes"],
                )
            elapsed = time.time() - start

            print(f"✅ 请求成功 | 耗时: {elapsed:.2f}s")
            print(f"   返回维度数: {len(result)}")

            # 验证输出质量
            expected_titles = ["核心痛点", "目标用户", "使用场景", "解决方案", "差异化价值"]
            for i, note in enumerate(result):
                title = note.get("title", "")
                content = note.get("content", "")
                print(f"   [{i+1}] {title}: {content[:40]}{'...' if len(content) > 40 else ''}")
                assert title in expected_titles, f"Unexpected title: {title}"
                assert content, f"Empty content for {title}"
                assert len(content) <= 300, f"Content too long ({len(content)} chars) for {title}"

            assert len(result) == 5, f"Expected 5 notes, got {len(result)}"
            print(f"   ✅ 输出质量检查通过")

            if not use_mock:
                # 延迟断言（宽松：25秒内都算可接受）
                assert elapsed <= 25, f"请求耗时过长: {elapsed:.2f}s > 25s"
                if elapsed <= 15:
                    print(f"   🟢 延迟优秀 (<=15s)")
                elif elapsed <= 20:
                    print(f"   🟡 延迟可接受 (<=20s)")
                else:
                    print(f"   🔴 延迟偏高 (>20s)")

        except Exception as e:
            elapsed = time.time() - start
            print(f"❌ 请求失败 | 耗时: {elapsed:.2f}s | 错误: {e}")
            raise


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
