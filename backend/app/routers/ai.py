from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Any, Dict, List
import json
import logging
from uuid import UUID

from ..database import get_db
from ..auth import get_current_user, require_admin
from ..models import User, AIProvider, AIConfig, AICallLog, Project, Stage, StageKey
from ..schemas import (
    AIProviderInfo, AIConfigUpdate, AIChatRequest,
    AIPromoteSuggestRequest, PromoteSuggestionInfo, BaseResponse,
    IdeaSuggestRequest, IdeaSuggestResponse, AITestConfigRequest
)
from ..services.ai_proxy import AIProxyService
from ..services.stage_context import (
    build_stage_snapshot,
    build_stage_native_system_prompt,
    validate_stage_native_response,
    extract_sync_payload,
    extract_sync_payload_structured,
    extract_next_round_question,
)
from ..services.logger import OperationLogger
from ..encryption import get_encryption_manager
from ..config import get_settings
from sqlalchemy import func
from datetime import datetime

router = APIRouter(prefix="/ai", tags=["ai"])
logger = logging.getLogger(__name__)


def _check_ai_quota(user: User, db) -> None:
    """检查用户 AI 调用配额，超出则抛出 429"""
    settings = get_settings()
    # 自托管模式或未配置 Stripe：不限制
    if not settings.stripe_secret_key:
        return
    # 管理员不限制
    if user.role.value == "admin":
        return

    tier = user.current_tier_id or "free"
    tier_limits = {"free": 30, "pro": 500, "team": 2000}
    limit = tier_limits.get(tier, 30)

    now = datetime.utcnow()
    start_of_month = datetime(now.year, now.month, 1)
    used = db.query(func.count(AICallLog.id)).filter(
        AICallLog.user_id == user.id,
        AICallLog.created_at >= start_of_month
    ).scalar() or 0

    if used >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"本月 AI 调用配额已用完（{used}/{limit}）。请升级套餐或等待下个月重置。"
        )


def _extract_content_from_sse_chunks(chunks: List[str]) -> str:
    content_parts: List[str] = []
    for chunk in chunks:
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
                content_parts.append(text)

    return "".join(content_parts).strip()


async def _collect_sse_chunks(
    ai_service: AIProxyService,
    provider: AIProvider,
    messages: List[Dict[str, str]]
) -> List[str]:
    chunks: List[str] = []
    generator = ai_service.chat_completion(provider=provider, messages=messages, stream=True)
    async for chunk in generator:
        chunks.append(chunk)
    return chunks


@router.get("/ping")
def ping():
    return {"message": "pong"}


@router.get("/providers", response_model=List[AIProviderInfo])
def list_providers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取可用的 AI 提供商列表"""
    configs = db.query(AIConfig).all()
    config_map = {c.provider: c for c in configs}

    providers = []
    for provider in [AIProvider.DEEPSEEK, AIProvider.KIMI, AIProvider.DOUBAO, AIProvider.OPENAI, AIProvider.OLLAMA]:
        config = config_map.get(provider)
        providers.append(AIProviderInfo(
            provider=provider,
            name=provider.value.upper(),
            is_active=config.is_active if config else False
        ))

    return providers


@router.get("/configs")
def list_configs(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """获取所有 AI 配置（隐藏真实 API Key）"""
    configs = db.query(AIConfig).all()
    return [
        {
            "id": c.id,
            "provider": c.provider.value,
            "base_url": c.base_url,
            "api_key": "***" if c.api_key_encrypted else "",
            "default_model": c.default_model,
            "is_active": c.is_active
        }
        for c in configs
    ]


@router.put("/configs/{provider}", response_model=BaseResponse)
def update_config(
    provider: AIProvider,
    request: AIConfigUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """更新 AI 配置"""
    config = db.query(AIConfig).filter(AIConfig.provider == provider).first()

    encryption = get_encryption_manager()

    # Ollama 允许空 API Key
    api_key_to_store = request.api_key
    if provider == AIProvider.OLLAMA and not api_key_to_store:
        api_key_to_store = ""

    if not config:
        # 创建新配置
        config = AIConfig(
            provider=provider,
            base_url=request.base_url,
            api_key_encrypted=encryption.encrypt(api_key_to_store),
            default_model=request.default_model,
            is_active=request.is_active
        )
        db.add(config)
    else:
        # 记录旧值
        logger = OperationLogger(db)
        old_values = {
            "base_url": config.base_url,
            "default_model": config.default_model,
            "is_active": config.is_active
        }

        config.base_url = request.base_url
        config.api_key_encrypted = encryption.encrypt(api_key_to_store)
        config.default_model = request.default_model
        config.is_active = request.is_active

        logger.log_update(current_user.id, "ai_config", config.id, old_values, {
            "base_url": config.base_url,
            "default_model": config.default_model,
            "is_active": config.is_active
        })

    db.commit()
    return BaseResponse(message=f"{provider.value} 配置已更新")


@router.post("/test/{provider}")
async def test_ai_config(
    provider: AIProvider,
    request: AITestConfigRequest | None = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """测试 AI API 连接（支持传入临时配置做预览测试）"""
    ai_service = AIProxyService(db)
    result = await ai_service.test_connection(
        provider,
        base_url=request.base_url if request else None,
        api_key=request.api_key if request else None,
        model=request.default_model if request else None,
    )
    return result


@router.post("/chat")
async def chat_completion(
    request: AIChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    AI 聊天接口，支持流式返回
    返回 SSE 流
    """
    _check_ai_quota(current_user, db)
    ai_service = AIProxyService(db, user_id=str(current_user.id))

    merged_messages = list(request.messages)
    stage_snapshot = None

    if request.project_id and request.stage_key:
        project = db.query(Project).filter(
            Project.id == request.project_id,
            Project.user_id == current_user.id,
            Project.deleted_at.is_(None)
        ).first()

        if not project:
            raise HTTPException(status_code=404, detail="Project not found for AI context")

        stage = db.query(Stage).filter(
            Stage.project_id == request.project_id,
            Stage.stage_key == request.stage_key
        ).first()

        if not stage:
            raise HTTPException(status_code=404, detail="Stage not found for AI context")

        stage_snapshot = build_stage_snapshot(project, stage)
        merged_messages = [
            {
                "role": "system",
                "content": build_stage_native_system_prompt(stage_snapshot, request.enable_stage_loop),
            },
            *merged_messages,
        ]

    async def event_generator():
        text_buffer: List[str] = []
        done_chunk: str | None = None
        try:
            generator = ai_service.chat_completion(
                provider=request.provider, messages=merged_messages, stream=True
            )
            async for chunk in generator:
                if chunk.strip() == "data: [DONE]":
                    done_chunk = chunk
                    break
                yield chunk
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

            full_text = "".join(text_buffer).strip()

            sync_payload = extract_sync_payload(full_text) if full_text else ""
            sync_payload_structured = extract_sync_payload_structured(full_text) if full_text else {}
            next_question = extract_next_round_question(full_text) if full_text else ""
            meta_event: Dict[str, Any] = {
                "meta": {
                    "stage_snapshot": stage_snapshot,
                    "sync_payload": sync_payload,
                    "sync_payload_structured": sync_payload_structured,
                    "next_question": next_question,
                    "retry_used": False,
                }
            }
            yield f"data: {json.dumps(meta_event, ensure_ascii=False)}\n\n"

            if done_chunk:
                yield done_chunk
            else:
                yield "data: [DONE]\n\n"
        except Exception:
            error_data = json.dumps({"error": "AI 服务暂时不可用，请稍后重试"})
            yield f"data: {error_data}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )


@router.get("/stage-context/{project_id}/{stage_key}")
def get_stage_context(
    project_id: str,
    stage_key: StageKey,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取指定项目阶段的上下文快照（完成度+缺口）"""
    try:
        project_uuid = UUID(project_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid project id") from exc

    project = db.query(Project).filter(
        Project.id == project_uuid,
        Project.user_id == current_user.id,
        Project.deleted_at.is_(None)
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    stage = db.query(Stage).filter(
        Stage.project_id == project.id,
        Stage.stage_key == stage_key
    ).first()

    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")

    return build_stage_snapshot(project, stage)


@router.post("/promote-suggest", response_model=PromoteSuggestionInfo)
async def generate_promote_suggestions(
    request: AIPromoteSuggestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """生成推广建议"""
    _check_ai_quota(current_user, db)
    ai_service = AIProxyService(db, user_id=str(current_user.id))

    suggestions = await ai_service.generate_promote_suggestions(
        provider=request.provider,
        project_title=request.project_title,
        pain_point=request.pain_point,
        project_description=request.project_description
    )

    # 保存到数据库（关联到项目）
    from ..models import PromoteSuggestion
    import uuid

    suggestion = PromoteSuggestion(
        project_id=uuid.UUID(str(request.project_id)) if hasattr(request, 'project_id') else None,
        channels=suggestions["channels"],
        templates=suggestions["templates"]
    )

    if hasattr(request, 'project_id') and request.project_id:
        project = db.query(Project).filter(
            Project.id == request.project_id,
            Project.user_id == current_user.id,
            Project.deleted_at.is_(None)
        ).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        suggestion.project_id = request.project_id
        db.add(suggestion)
        db.commit()

    return PromoteSuggestionInfo(
        id=suggestion.id if hasattr(suggestion, 'id') else None,
        channels=suggestions["channels"],
        templates=suggestions["templates"],
        created_at=suggestion.created_at if hasattr(suggestion, 'created_at') else __import__('datetime').datetime.utcnow()
    )


@router.post("/idea-suggest", response_model=IdeaSuggestResponse)
async def generate_idea_suggestions(
    request: IdeaSuggestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """生成想法阶段便利贴建议"""
    _check_ai_quota(current_user, db)
    ai_service = AIProxyService(db, user_id=str(current_user.id))

    # 使用用户首选模型，如果没有则默认使用 DeepSeek
    provider = current_user.preferred_model or AIProvider.DEEPSEEK

    suggestions = await ai_service.generate_idea_suggestions(
        provider=provider,
        title=request.title,
        pain_point=request.pain_point,
        original_idea=request.original_idea,
        current_notes=[{"title": n.title, "content": n.content} for n in request.current_notes]
    )

    return IdeaSuggestResponse(notes=suggestions)


@router.get("/call-logs")
def list_call_logs(
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取 AI 调用日志"""
    max_limit = 1000
    if limit < 1:
        limit = 1
    elif limit > max_limit:
        limit = max_limit

    logs = db.query(AICallLog).filter(
        AICallLog.user_id == current_user.id
    ).order_by(
        AICallLog.created_at.desc()
    ).limit(limit).all()

    return [
        {
            "id": log.id,
            "provider": log.provider.value,
            "model": log.model,
            "prompt_tokens": log.prompt_tokens,
            "completion_tokens": log.completion_tokens,
            "status": log.status,
            "created_at": log.created_at
        }
        for log in logs
    ]


@router.get("/ollama/models")
async def list_ollama_models(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取本地 Ollama 可用模型列表（仅管理员）"""
    if current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="需要管理员权限")

    config = db.query(AIConfig).filter(AIConfig.provider == AIProvider.OLLAMA).first()
    base_url = config.base_url if config else "http://localhost:11434"

    # 移除 /v1 后缀（Ollama 原生 API 在 /api/tags）
    native_base = base_url.replace("/v1", "").rstrip("/")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{native_base}/api/tags")
            if response.status_code == 200:
                data = response.json()
                models = [m.get("name", "") for m in data.get("models", [])]
                return {"models": models, "base_url": native_base}
            else:
                return {"models": [], "base_url": native_base, "error": f"HTTP {response.status_code}"}
    except Exception as e:
        return {"models": [], "base_url": native_base, "error": str(e)}
