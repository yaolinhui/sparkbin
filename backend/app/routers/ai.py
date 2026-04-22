from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Any, Dict, List
import json
import logging
from uuid import UUID

from ..database import get_db
from ..auth import get_current_user
from ..models import User, AIProvider, AIConfig, AICallLog, Project, Stage, StageKey
from ..schemas import (
    AIProviderInfo, AIConfigUpdate, AIChatRequest,
    AIPromoteSuggestRequest, PromoteSuggestionInfo, BaseResponse
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

router = APIRouter(prefix="/ai", tags=["ai"])
logger = logging.getLogger(__name__)


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
    for provider in [AIProvider.DEEPSEEK, AIProvider.KIMI, AIProvider.DOUBAO, AIProvider.OPENAI]:
        config = config_map.get(provider)
        providers.append(AIProviderInfo(
            provider=provider,
            name=provider.value.upper(),
            is_active=config.is_active if config else False
        ))

    return providers


@router.get("/configs")
def list_configs(
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新 AI 配置"""
    config = db.query(AIConfig).filter(AIConfig.provider == provider).first()

    encryption = get_encryption_manager()

    if not config:
        # 创建新配置
        config = AIConfig(
            provider=provider,
            base_url=request.base_url,
            api_key_encrypted=encryption.encrypt(request.api_key),
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
        config.api_key_encrypted = encryption.encrypt(request.api_key)
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """测试 AI API 连接"""
    ai_service = AIProxyService(db)
    result = await ai_service.test_connection(provider)
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
    ai_service = AIProxyService(db)

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
        try:
            selected_chunks = await _collect_sse_chunks(ai_service, request.provider, merged_messages)
            selected_text = _extract_content_from_sse_chunks(selected_chunks)
            retry_used = False

            if stage_snapshot and selected_text:
                validation = validate_stage_native_response(selected_text, request.enable_stage_loop)
                if not validation["valid"]:
                    retry_used = True
                    repair_messages = [
                        *merged_messages,
                        {
                            "role": "system",
                            "content": (
                                "你的上一条回答格式不完整。"
                                f"缺失章节: {json.dumps(validation['missing_sections'], ensure_ascii=False)}。"
                                "请严格按指定章节完整重答，不要省略。"
                            ),
                        },
                    ]
                    retry_chunks = await _collect_sse_chunks(ai_service, request.provider, repair_messages)
                    retry_text = _extract_content_from_sse_chunks(retry_chunks)
                    retry_validation = validate_stage_native_response(retry_text, request.enable_stage_loop)
                    if retry_validation["valid"] and retry_text:
                        selected_chunks = retry_chunks
                        selected_text = retry_text

            sync_payload = extract_sync_payload(selected_text) if selected_text else ""
            sync_payload_structured = extract_sync_payload_structured(selected_text) if selected_text else {}
            next_question = extract_next_round_question(selected_text) if selected_text else ""
            meta_event: Dict[str, Any] = {
                "meta": {
                    "stage_snapshot": stage_snapshot,
                    "sync_payload": sync_payload,
                    "sync_payload_structured": sync_payload_structured,
                    "next_question": next_question,
                    "retry_used": retry_used,
                }
            }
            yield f"data: {json.dumps(meta_event, ensure_ascii=False)}\n\n"

            for chunk in selected_chunks:
                yield chunk

            if not selected_chunks or selected_chunks[-1].strip() != "data: [DONE]":
                yield "data: [DONE]\n\n"
        except Exception as e:
            import sys
            error_type = type(e).__name__
            error_msg = str(e) or f"({error_type})"
            error_data = json.dumps({"error": f"{error_type}: {error_msg}"})
            sys.stderr.write(f"DEBUG: Caught {error_type}: {error_msg}\\n")
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
    ai_service = AIProxyService(db)

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
        suggestion.project_id = request.project_id
        db.add(suggestion)
        db.commit()

    return PromoteSuggestionInfo(
        id=suggestion.id if hasattr(suggestion, 'id') else None,
        channels=suggestions["channels"],
        templates=suggestions["templates"],
        created_at=suggestion.created_at if hasattr(suggestion, 'created_at') else __import__('datetime').datetime.utcnow()
    )


@router.get("/call-logs")
def list_call_logs(
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取 AI 调用日志"""
    logs = db.query(AICallLog).order_by(
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
