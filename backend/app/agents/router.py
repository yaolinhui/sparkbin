import json
import logging
from typing import Any, Dict, List

from .base import BaseAgent, AgentResult
from .prompts import build_router_prompt
from ..models import AIProvider

logger = logging.getLogger(__name__)


class RouterAgent(BaseAgent):
    """
    中央调度 Agent（Router）。

    职责：
    1. 读取项目所有阶段快照
    2. 评估各阶段完成度和缺口
    3. 决定调用哪些 Specialist Agent，以及优先级
    4. 返回执行计划（plan）

    设计灵感来自 OpenAI Swarm 的 triage pattern 和
    LangGraph 的 conditional edges，但实现上零依赖。
    """

    agent_type = "router"
    default_provider = AIProvider.KIMI  # Router 用较快的中等模型

    async def route(
        self,
        project: Dict[str, Any],
        stage_evaluations: Dict[str, Any],
        provider: AIProvider = AIProvider.KIMI,
    ) -> AgentResult:
        """
        分析项目状态并返回 Agent 执行计划。

        返回数据结构：
        {
            "plan": [
                {"agent_type": "idea", "priority": 1, "rationale": "...", "focus": "..."}
            ],
            "summary": "整体策略一句话总结"
        }
        """
        context = {
            "project": project,
            "stage_evaluations": stage_evaluations,
        }
        result = await self.execute(context, provider=provider)

        if not result.success:
            logger.error(f"Router failed: {result.error}")
            # Router 失败时回退到默认计划：只分析当前阶段
            current_stage = project.get("current_stage", "idea")
            result.success = True
            result.data = {
                "plan": [
                    {
                        "agent_type": current_stage,
                        "priority": 1,
                        "rationale": "Router 失败，回退到当前阶段",
                        "focus": "分析当前阶段并提供建议",
                    }
                ],
                "summary": "回退模式：仅分析当前阶段",
            }

        # 后处理：确保 plan 是列表且最多 4 个
        plan = result.data.get("plan", [])
        if not isinstance(plan, list):
            plan = []
        # 去重：同类型 agent 只保留优先级最高的一个
        seen = set()
        deduped = []
        for p in sorted(plan, key=lambda x: x.get("priority", 99)):
            atype = p.get("agent_type", "")
            if atype and atype not in seen:
                seen.add(atype)
                deduped.append(p)
        result.data["plan"] = deduped[:4]

        return result

    def _build_prompt(self, context: Dict[str, Any]) -> str:
        project = context["project"]
        stage_evaluations = context["stage_evaluations"]
        return build_router_prompt(project, stage_evaluations)
