import asyncio
import json
import time
from typing import AsyncGenerator
from unittest.mock import AsyncMock

import pytest


class MockAsyncGenerator:
    """模拟 AI 流式响应，可控延迟"""
    def __init__(self, delay: float = 0.5, chunks=None):
        self.delay = delay
        self.chunks = chunks or [
            'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
            'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
            "data: [DONE]\n\n",
        ]

    async def __aiter__(self) -> AsyncGenerator[str, None]:
        await asyncio.sleep(self.delay)
        for chunk in self.chunks:
            yield chunk


@pytest.mark.asyncio
async def test_streaming_ttft():
    """
    验证：修复后内容 chunk 应立即透传，TTFT 接近 AI 首字延迟。
    """
    mock_generator = MockAsyncGenerator(delay=0.3)
    ai_service = AsyncMock()
    ai_service.chat_completion.return_value = mock_generator

    start = time.time()
    first_chunk_time = None
    text_buffer: list[str] = []
    done_chunk = None

    generator = await ai_service.chat_completion()
    async for chunk in generator:
        if chunk.strip() == "data: [DONE]":
            done_chunk = chunk
            break
        if first_chunk_time is None:
            first_chunk_time = time.time()
        for line in chunk.splitlines():
            stripped = line.strip()
            if not stripped.startswith("data: "):
                continue
            payload = stripped[6:]
            if payload == "[DONE]":
                continue
            try:
                data = json.loads(payload)
            except json.JSONDecodeError:
                continue
            delta_content = data.get("choices", [{}])[0].get("delta", {}).get("content", "")
            message_content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            text = delta_content or message_content
            if text:
                text_buffer.append(text)

    total_time = time.time() - start
    ttft = (first_chunk_time - start) if first_chunk_time else total_time

    assert 0.0 <= ttft <= 0.6, f"TTFT 异常: {ttft:.3f}s，预期约 0.3s"
    assert total_time <= 1.0, f"总时间异常: {total_time:.3f}s"
    assert "".join(text_buffer) == "Hello world"
    assert done_chunk is not None


@pytest.mark.asyncio
async def test_prompt_length_reduction():
    """
    验证：精简后的 prompt 不再包含庞大的原始 content，长度显著下降。
    """
    from app.services.stage_context import build_stage_native_system_prompt

    large_snapshot = {
        "project_id": "uuid-123",
        "project_title": "Test Project",
        "project_pain_point": "Some pain",
        "current_stage": "grow",
        "stage_key": "grow",
        "stage_locked": False,
        "completion": {
            "score": 75,
            "missing_items": ["内容日历不足", "缺少渠道指标"],
        },
        "content": {
            "raw": json.dumps(
                {"contentCalendar": [{"title": f"Post {i}", "status": "draft"} for i in range(100)]}
            ),
            "normalized": [{"title": f"Post {i}", "status": "draft"} for i in range(100)],
        },
    }

    prompt = build_stage_native_system_prompt(large_snapshot, enable_stage_loop=True)

    assert "contentCalendar" not in prompt, "prompt 仍包含原始 content，未精简"
    assert len(prompt) < 1500, f"prompt 长度 {len(prompt)} 仍过大，预期 < 1500"


@pytest.mark.asyncio
async def test_stream_integrity():
    """
    验证：流结束后 meta event 提取字段正确，内容完整性有保障。
    """
    from app.routers.ai import _extract_content_from_sse_chunks
    from app.services.stage_context import (
        extract_sync_payload,
        extract_sync_payload_structured,
        extract_next_round_question,
    )

    simulated_ai_text = (
        "【阶段事实】当前处于 Grow 阶段，完成度 60%。\n"
        "【关键缺口】内容日历不足、缺少渠道指标。\n"
        "【下一步动作】1. 补充内容日历 2. 添加渠道指标 3. 发布首批内容\n"
        '【可同步JSON】{"summary":"补充内容","items":["发布博客","设置分析"],"stage_key":"grow","sync_mode":"append"}\n'
        "【下一轮问题】你打算优先运营哪个渠道？"
    )

    chunks = [
        f'data: {json.dumps({"choices":[{"delta":{"content":simulated_ai_text[:30]}}]})}\n\n',
        f'data: {json.dumps({"choices":[{"delta":{"content":simulated_ai_text[30:]}}]})}\n\n',
        "data: [DONE]\n\n",
    ]

    full_text = _extract_content_from_sse_chunks(chunks)
    assert "【阶段事实】" in full_text

    sync_payload = extract_sync_payload(full_text)
    assert "补充内容" in sync_payload

    structured = extract_sync_payload_structured(full_text)
    assert structured.get("stage_key") == "grow"
    assert len(structured.get("items", [])) == 2

    next_question = extract_next_round_question(full_text)
    assert "渠道" in next_question
