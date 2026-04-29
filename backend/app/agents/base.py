import json
import time
import logging
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from sqlalchemy.orm import Session

from ..models import AIProvider, AgentTask
from ..services.ai_proxy import AIProxyService

logger = logging.getLogger(__name__)


@dataclass
class AgentResult:
    """Agent 执行结果"""
    success: bool
    data: Dict[str, Any] = field(default_factory=dict)
    raw_text: str = ""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    error: str = ""
    duration_ms: int = 0


class BaseAgent:
    """
    Agent 基类。

    设计原则：
    - 零外部框架依赖，纯 asyncio + httpx
    - 每个 Agent 是独立的无状态执行单元
    - 通过 AIProxyService 调用 LLM，自动享受 fallback 和日志
    - 输出强制为结构化 JSON，失败时回退到 raw_text
    """

    agent_type: str = "base"
    default_provider: AIProvider = AIProvider.DEEPSEEK

    def __init__(self, db: Session, user_id: Optional[str] = None):
        self.db = db
        self.user_id = user_id
        self.ai_service = AIProxyService(db, user_id=user_id)

    def _build_prompt(self, context: Dict[str, Any]) -> str:
        """子类必须实现：根据上下文构建 prompt"""
        raise NotImplementedError

    def _parse_response(self, raw_text: str) -> Dict[str, Any]:
        """
        子类可覆盖：解析 LLM 返回的文本为结构化数据。
        默认尝试提取 JSON 代码块或整段 JSON。
        """
        text = raw_text.strip()
        # 尝试提取 ```json ... ``` 代码块
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            parts = text.split("```")
            if len(parts) >= 3:
                text = parts[1]
                if text.lower().startswith("json"):
                    text = text[4:]

        text = text.strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # 尝试提取最外层 {}
            start = text.find("{")
            end = text.rfind("}")
            if start != -1 and end != -1 and end > start:
                try:
                    return json.loads(text[start:end + 1])
                except json.JSONDecodeError:
                    pass
            logger.warning(f"[{self.agent_type}] JSON parse failed, returning raw fallback")
            return {"raw": text, "parsed": False}

    async def execute(
        self,
        context: Dict[str, Any],
        provider: Optional[AIProvider] = None,
        task_record: Optional[AgentTask] = None,
    ) -> AgentResult:
        """
        执行 Agent：构建 prompt -> 调用 LLM -> 解析结果 -> 记录日志
        """
        start_time = time.time()
        provider = provider or self.default_provider

        prompt = self._build_prompt(context)
        prompt_tokens = len(prompt) // 4

        if task_record:
            task_record.status = "running"
            task_record.started_at = __import__("datetime").datetime.utcnow()
            task_record.input_preview = prompt[:500]
            self.db.commit()

        messages = [{"role": "user", "content": prompt}]
        raw_text = ""
        completion_tokens = 0
        status = "success"
        error_msg = ""

        try:
            # 使用非流式调用获取完整结果（Agent 内部不需要 SSE 流）
            # 直接复用 ai_service.chat_completion 但收集所有 chunk
            chunks = []
            async for chunk in self.ai_service.chat_completion(
                provider=provider,
                messages=messages,
                stream=True,
                max_tokens=2000,
                temperature=0.5,
            ):
                # chunk 是 SSE 格式的 data: {...} 或 data: [DONE]
                if chunk.strip() == "data: [DONE]\n\n":
                    continue
                if chunk.startswith("data: "):
                    data_str = chunk[6:].strip()
                    try:
                        data = json.loads(data_str)
                        if data.get("error"):
                            error_msg = data["error"]
                            status = "error"
                            break
                        content = (
                            data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            or data.get("choices", [{}])[0].get("message", {}).get("content", "")
                        )
                        if content:
                            raw_text += content
                            completion_tokens += len(content) // 4
                    except json.JSONDecodeError:
                        continue

            if status == "error":
                raise Exception(error_msg)

            parsed = self._parse_response(raw_text)
            duration_ms = int((time.time() - start_time) * 1000)

            result = AgentResult(
                success=True,
                data=parsed,
                raw_text=raw_text,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                duration_ms=duration_ms,
            )

        except Exception as e:
            logger.exception(f"[{self.agent_type}] Execution failed")
            duration_ms = int((time.time() - start_time) * 1000)
            result = AgentResult(
                success=False,
                error=str(e) or f"{provider.value} API 调用失败",
                raw_text=raw_text,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                duration_ms=duration_ms,
            )

        if task_record:
            task_record.status = "completed" if result.success else "failed"
            task_record.completed_at = __import__("datetime").datetime.utcnow()
            task_record.provider = provider
            try:
                task_record.model = self.ai_service.get_active_config(provider).default_model
            except Exception:
                task_record.model = "unknown"
            task_record.prompt_tokens = result.prompt_tokens
            task_record.completion_tokens = result.completion_tokens
            task_record.output_result = json.dumps(result.data, ensure_ascii=False)[:4000]
            task_record.error_msg = result.error[:500]
            self.db.commit()

        return result

    @classmethod
    def get_specialist(cls, agent_type: str) -> Optional[type]:
        """根据 agent_type 获取对应的 Specialist 类"""
        from .specialists import (
            IdeaAgent, ValidateAgent, PrototypeAgent,
            ShipAgent, GrowAgent, MonetizeAgent, AnalystAgent,
        )
        mapping = {
            "idea": IdeaAgent,
            "validate": ValidateAgent,
            "prototype": PrototypeAgent,
            "ship": ShipAgent,
            "grow": GrowAgent,
            "monetize": MonetizeAgent,
            "analyst": AnalystAgent,
        }
        return mapping.get(agent_type)
