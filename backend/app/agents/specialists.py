import json
import logging
from typing import Any, Dict, List

from .base import BaseAgent
from .prompts import (
    build_idea_prompt,
    build_validate_prompt,
    build_prototype_prompt,
    build_ship_prompt,
    build_grow_prompt,
    build_monetize_prompt,
    build_analyst_prompt,
)
from ..models import AIProvider

logger = logging.getLogger(__name__)


class IdeaAgent(BaseAgent):
    """想法阶段顾问：完善产品概念"""
    agent_type = "idea"
    default_provider = AIProvider.DEEPSEEK

    def _build_prompt(self, context: Dict[str, Any]) -> str:
        return build_idea_prompt(
            context["project"],
            context.get("current_notes", []),
        )


class ValidateAgent(BaseAgent):
    """验证阶段顾问：设计验证实验"""
    agent_type = "validate"
    default_provider = AIProvider.DEEPSEEK

    def _build_prompt(self, context: Dict[str, Any]) -> str:
        return build_validate_prompt(
            context["project"],
            context.get("current_items", []),
            context.get("current_tools", []),
        )


class PrototypeAgent(BaseAgent):
    """原型阶段顾问：规划 MVP"""
    agent_type = "prototype"
    default_provider = AIProvider.DEEPSEEK

    def _build_prompt(self, context: Dict[str, Any]) -> str:
        return build_prototype_prompt(
            context["project"],
            context.get("current_features", []),
        )


class ShipAgent(BaseAgent):
    """发布阶段顾问：上线 checklist + 推广文案"""
    agent_type = "ship"
    default_provider = AIProvider.KIMI

    def _build_prompt(self, context: Dict[str, Any]) -> str:
        return build_ship_prompt(
            context["project"],
            context.get("current_checklist", {}),
        )


class GrowAgent(BaseAgent):
    """增长阶段顾问：获客渠道 + 内容策略"""
    agent_type = "grow"
    default_provider = AIProvider.KIMI

    def _build_prompt(self, context: Dict[str, Any]) -> str:
        return build_grow_prompt(
            context["project"],
            context.get("current_channels", []),
        )


class MonetizeAgent(BaseAgent):
    """变现阶段顾问：定价 + 转化漏斗"""
    agent_type = "monetize"
    default_provider = AIProvider.KIMI

    def _build_prompt(self, context: Dict[str, Any]) -> str:
        return build_monetize_prompt(
            context["project"],
            context.get("current_data", {}),
        )


class AnalystAgent(BaseAgent):
    """全局数据分析师：跨阶段诊断"""
    agent_type = "analyst"
    default_provider = AIProvider.DEEPSEEK

    def _build_prompt(self, context: Dict[str, Any]) -> str:
        return build_analyst_prompt(
            context["project"],
            context["stage_evaluations"],
        )
