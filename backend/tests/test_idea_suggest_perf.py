"""
测试：AI 建议生成接口的响应时间和输出质量
运行方式：cd backend && python -m pytest tests/test_idea_suggest_perf.py -v -s
"""
import asyncio
import time
import sys
import os

# 临时处理 frontend/.env 中的 VITE_API_URL 导致 pydantic 报错的问题
os.environ.pop("VITE_API_URL", None)
os.environ["DATABASE_URL"] = "sqlite:///./sparkbin_v2.db"
os.environ["SECRET_KEY"] = "your-secret-key-for-jwt-here-change-in-production"
os.environ["ENCRYPTION_KEY"] = "this-is-a-very-long-test-encryption-key-123"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import AIProvider
from app.services.ai_proxy import AIProxyService


async def test_idea_suggestions_latency():
    """测试想法建议生成的端到端延迟"""
    db = SessionLocal()
    try:
        service = AIProxyService(db, user_id="ef0898d1-e787-4698-9faa-9c4d9bde972e")

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

        for case in test_cases:
            print(f"\n{'='*60}")
            print(f"测试场景: {case['name']}")
            print(f"{'='*60}")

            start = time.time()
            try:
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

                # 延迟断言（宽松：20秒内都算可接受，12秒内算优秀）
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

    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(test_idea_suggestions_latency())
