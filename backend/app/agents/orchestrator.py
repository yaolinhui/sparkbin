import asyncio
import json
import logging
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime

from .base import BaseAgent, AgentResult
from .router import RouterAgent
from ..models import AgentRun, AgentTask, AIProvider, User
from ..services.ai_proxy import AIProxyService

logger = logging.getLogger(__name__)


class AgentOrchestrator:
    """
    Agent 编排器：负责并行执行多个 Specialist Agent。

    核心能力：
    1. Router 调度：先执行 RouterAgent 决定调用哪些 Specialist
    2. 并行执行：使用 asyncio.gather 同时启动多个 Agent
    3. 结果聚合：收集所有 Agent 结果，生成统一报告
    4. 持久化：将运行状态和任务结果写入数据库

    性能特征：
    - 2-4 个 Agent 并行时，总延迟 ≈ 最慢单个 Agent 的延迟
    - 相比串行执行，节省 40-60% 时间
    """

    def __init__(self, db: Session, user_id: Optional[str] = None):
        self.db = db
        self.user_id = user_id
        self.ai_service = AIProxyService(db, user_id=user_id)

    async def run(
        self,
        project: Dict[str, Any],
        stage_evaluations: Dict[str, Any],
        strategy: str = "router",  # router | parallel_all | sequential
        preferred_provider: Optional[AIProvider] = None,
    ) -> Dict[str, Any]:
        """
        启动一次 Agent 运行。

        流程：
        1. 创建 AgentRun 记录
        2. 根据 strategy 决定执行模式
        3. 并行执行 Agent
        4. 聚合结果并更新 AgentRun
        """
        # 创建 AgentRun
        user_uuid = None
        if self.user_id:
            from uuid import UUID
            try:
                user_uuid = UUID(self.user_id)
            except ValueError:
                pass

        from uuid import UUID as UUIDType
        project_uuid = UUIDType(project["id"]) if project.get("id") else None

        agent_run = AgentRun(
            user_id=user_uuid,
            project_id=project_uuid,
            status="running",
            strategy=strategy,
        )
        self.db.add(agent_run)
        self.db.commit()
        self.db.refresh(agent_run)

        try:
            if strategy == "router":
                results = await self._run_with_router(
                    agent_run, project, stage_evaluations, preferred_provider
                )
            elif strategy == "parallel_all":
                results = await self._run_parallel_all(
                    agent_run, project, stage_evaluations, preferred_provider
                )
            else:
                results = await self._run_sequential(
                    agent_run, project, stage_evaluations, preferred_provider
                )

            # 生成总结
            summary = self._generate_summary(results)
            agent_run.status = "completed"
            agent_run.summary = summary
            agent_run.completed_at = datetime.utcnow()
            self.db.commit()

            return {
                "run_id": str(agent_run.id),
                "status": "completed",
                "strategy": strategy,
                "summary": summary,
                "results": results,
            }

        except Exception as e:
            logger.exception("Agent orchestration failed")
            agent_run.status = "failed"
            agent_run.summary = f"编排失败: {str(e)}"
            agent_run.completed_at = datetime.utcnow()
            self.db.commit()
            return {
                "run_id": str(agent_run.id),
                "status": "failed",
                "error": str(e),
                "results": {},
            }

    async def _run_with_router(
        self,
        agent_run: AgentRun,
        project: Dict[str, Any],
        stage_evaluations: Dict[str, Any],
        preferred_provider: Optional[AIProvider],
    ) -> Dict[str, Any]:
        """Router 模式：先路由，再并行执行选中的 Agent"""
        # Step 1: Router 决策
        router = RouterAgent(self.db, user_id=self.user_id)
        router_task = AgentTask(
            run_id=agent_run.id,
            agent_type="router",
            status="pending",
            provider=router.default_provider,
            model="",
        )
        self.db.add(router_task)
        self.db.commit()

        router_result = await router.route(
            project, stage_evaluations, provider=preferred_provider or router.default_provider
        )

        # 更新 router task
        router_task.status = "completed" if router_result.success else "failed"
        router_task.completed_at = datetime.utcnow()
        router_task.provider = preferred_provider or router.default_provider
        router_task.output_result = json.dumps(router_result.data, ensure_ascii=False)[:4000]
        router_task.error_msg = router_result.error[:500]
        self.db.commit()

        if not router_result.success:
            return {"router": {"success": False, "error": router_result.error}}

        plan = router_result.data.get("plan", [])
        logger.info(f"Router plan: {[p['agent_type'] for p in plan]}")

        # Step 2: 并行执行选中的 Specialist
        tasks_to_run = []
        for p in plan:
            agent_type = p.get("agent_type")
            if not agent_type:
                continue
            agent_cls = BaseAgent.get_specialist(agent_type)
            if not agent_cls:
                logger.warning(f"Unknown agent_type: {agent_type}")
                continue

            task_record = AgentTask(
                run_id=agent_run.id,
                agent_type=agent_type,
                status="pending",
                provider=preferred_provider or AIProvider.DEEPSEEK,
                model="",
                input_preview=p.get("focus", "")[:200],
            )
            self.db.add(task_record)
            self.db.commit()

            agent = agent_cls(self.db, user_id=self.user_id)
            context = self._build_agent_context(agent_type, project, stage_evaluations)
            tasks_to_run.append(
                self._execute_agent_task(agent, context, preferred_provider, task_record)
            )

        # 并行执行
        if tasks_to_run:
            await asyncio.gather(*tasks_to_run, return_exceptions=True)

        # 收集结果
        return self._collect_results(agent_run)

    async def _run_parallel_all(
        self,
        agent_run: AgentRun,
        project: Dict[str, Any],
        stage_evaluations: Dict[str, Any],
        preferred_provider: Optional[AIProvider],
    ) -> Dict[str, Any]:
        """全并行模式：同时执行所有 Specialist（演示用，消耗较多 Token）"""
        all_types = ["idea", "validate", "prototype", "ship", "grow", "monetize", "analyst"]
        tasks_to_run = []

        for agent_type in all_types:
            agent_cls = BaseAgent.get_specialist(agent_type)
            if not agent_cls:
                continue

            task_record = AgentTask(
                run_id=agent_run.id,
                agent_type=agent_type,
                status="pending",
                provider=preferred_provider or AIProvider.DEEPSEEK,
                model="",
            )
            self.db.add(task_record)
            self.db.commit()

            agent = agent_cls(self.db, user_id=self.user_id)
            context = self._build_agent_context(agent_type, project, stage_evaluations)
            tasks_to_run.append(
                self._execute_agent_task(agent, context, preferred_provider, task_record)
            )

        await asyncio.gather(*tasks_to_run, return_exceptions=True)
        return self._collect_results(agent_run)

    async def _run_sequential(
        self,
        agent_run: AgentRun,
        project: Dict[str, Any],
        stage_evaluations: Dict[str, Any],
        preferred_provider: Optional[AIProvider],
    ) -> Dict[str, Any]:
        """串行模式：按顺序执行，适合低并发场景"""
        all_types = ["analyst", project.get("current_stage", "idea")]
        for agent_type in all_types:
            agent_cls = BaseAgent.get_specialist(agent_type)
            if not agent_cls:
                continue

            task_record = AgentTask(
                run_id=agent_run.id,
                agent_type=agent_type,
                status="pending",
                provider=preferred_provider or AIProvider.DEEPSEEK,
                model="",
            )
            self.db.add(task_record)
            self.db.commit()

            agent = agent_cls(self.db, user_id=self.user_id)
            context = self._build_agent_context(agent_type, project, stage_evaluations)
            await self._execute_agent_task(agent, context, preferred_provider, task_record)

        return self._collect_results(agent_run)

    async def _execute_agent_task(
        self,
        agent: BaseAgent,
        context: Dict[str, Any],
        provider: Optional[AIProvider],
        task_record: AgentTask,
    ) -> None:
        """执行单个 Agent 任务，异常隔离"""
        try:
            result = await agent.execute(context, provider=provider, task_record=task_record)
            logger.info(
                f"Agent {agent.agent_type} completed: success={result.success}, "
                f"tokens={result.prompt_tokens}+{result.completion_tokens}, "
                f"duration={result.duration_ms}ms"
            )
        except Exception as e:
            logger.exception(f"Agent {agent.agent_type} failed")
            task_record.status = "failed"
            task_record.error_msg = str(e)[:500]
            task_record.completed_at = datetime.utcnow()
            self.db.commit()

    def _build_agent_context(
        self,
        agent_type: str,
        project: Dict[str, Any],
        stage_evaluations: Dict[str, Any],
    ) -> Dict[str, Any]:
        """根据 agent_type 构建上下文"""
        context: Dict[str, Any] = {"project": project}

        if agent_type == "analyst":
            context["stage_evaluations"] = stage_evaluations
            return context

        # 解析阶段内容
        stage_content = project.get("stages", {})

        if agent_type == "idea":
            idea_content = stage_content.get("idea", {}).get("content", "[]")
            try:
                notes = json.loads(idea_content)
            except json.JSONDecodeError:
                notes = []
            context["current_notes"] = notes if isinstance(notes, list) else []

        elif agent_type == "validate":
            validate_content = stage_content.get("validate", {}).get("content", "{}")
            try:
                data = json.loads(validate_content)
            except json.JSONDecodeError:
                data = {}
            context["current_items"] = data.get("items", []) if isinstance(data, dict) else []
            context["current_tools"] = data.get("tools", []) if isinstance(data, dict) else []

        elif agent_type == "prototype":
            prototype_content = stage_content.get("prototype", {}).get("content", "{}")
            try:
                data = json.loads(prototype_content)
            except json.JSONDecodeError:
                data = {}
            context["current_features"] = data.get("features", []) if isinstance(data, dict) else []

        elif agent_type == "ship":
            ship_content = stage_content.get("ship", {}).get("content", "{}")
            try:
                data = json.loads(ship_content)
            except json.JSONDecodeError:
                data = {}
            checklist = data.get("checklist", {}) if isinstance(data, dict) else {}
            context["current_checklist"] = checklist if isinstance(checklist, dict) else {}

        elif agent_type == "grow":
            grow_content = stage_content.get("grow", {}).get("content", "{}")
            try:
                data = json.loads(grow_content)
            except json.JSONDecodeError:
                data = {}
            context["current_channels"] = data.get("channelMetrics", []) if isinstance(data, dict) else []

        elif agent_type == "monetize":
            monetize_content = stage_content.get("monetize", {}).get("content", "{}")
            try:
                data = json.loads(monetize_content)
            except json.JSONDecodeError:
                data = {}
            context["current_data"] = data if isinstance(data, dict) else {}

        return context

    def _collect_results(self, agent_run: AgentRun) -> Dict[str, Any]:
        """从数据库收集本次运行的所有任务结果"""
        self.db.refresh(agent_run)
        results: Dict[str, Any] = {}
        for task in agent_run.tasks:
            if task.agent_type == "router":
                continue
            try:
                output = json.loads(task.output_result) if task.output_result else {}
            except json.JSONDecodeError:
                output = {"raw": task.output_result}

            results[task.agent_type] = {
                "success": task.status == "completed",
                "status": task.status,
                "provider": task.provider.value if task.provider else None,
                "model": task.model,
                "prompt_tokens": task.prompt_tokens,
                "completion_tokens": task.completion_tokens,
                "duration_ms": None,  # 可从 started_at/completed_at 计算
                "data": output,
                "error": task.error_msg,
            }
        return results

    def _generate_summary(self, results: Dict[str, Any]) -> str:
        """生成运行总结"""
        total = len(results)
        success = sum(1 for r in results.values() if r.get("success"))
        total_tokens = sum(
            (r.get("prompt_tokens", 0) + r.get("completion_tokens", 0))
            for r in results.values()
        )
        return f"{success}/{total} 个 Agent 成功执行，总消耗 {total_tokens} tokens"

    def get_run_status(self, run_id: str) -> Optional[Dict[str, Any]]:
        """查询运行状态"""
        from uuid import UUID
        try:
            run_uuid = UUID(run_id)
        except ValueError:
            return None

        agent_run = self.db.query(AgentRun).filter(AgentRun.id == run_uuid).first()
        if not agent_run:
            return None

        results = self._collect_results(agent_run)
        return {
            "run_id": str(agent_run.id),
            "status": agent_run.status,
            "strategy": agent_run.strategy,
            "summary": agent_run.summary,
            "created_at": agent_run.created_at.isoformat() if agent_run.created_at else None,
            "completed_at": agent_run.completed_at.isoformat() if agent_run.completed_at else None,
            "results": results,
            "tasks": [
                {
                    "id": str(t.id),
                    "agent_type": t.agent_type,
                    "status": t.status,
                    "provider": t.provider.value if t.provider else None,
                    "model": t.model,
                    "error": t.error_msg,
                }
                for t in agent_run.tasks
            ],
        }
