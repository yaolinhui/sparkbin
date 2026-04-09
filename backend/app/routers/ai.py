from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import json
import logging

from ..database import get_db
from ..auth import get_current_user
from ..models import User, AIProvider, AIConfig, AICallLog
from ..schemas import (
    AIProviderInfo, AIConfigUpdate, AIChatRequest,
    AIPromoteSuggestRequest, PromoteSuggestionInfo, BaseResponse
)
from ..services.ai_proxy import AIProxyService
from ..services.logger import OperationLogger
from ..encryption import get_encryption_manager

router = APIRouter(prefix="/ai", tags=["ai"])
logger = logging.getLogger(__name__)


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
    for provider in [AIProvider.DEEPSEEK, AIProvider.KIMI, AIProvider.DOUBAO]:
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

    async def event_generator():
        chunk_count = 0
        try:
            # Get the generator
            gen = ai_service.chat_completion(
                provider=request.provider,
                messages=request.messages,
                stream=True
            )
            async for chunk in gen:
                chunk_count += 1
                yield chunk
        except Exception as e:
            import sys
            error_type = type(e).__name__
            error_msg = str(e) or f"({error_type})"
            error_data = json.dumps({"error": f"{error_type}: {error_msg} (chunks={chunk_count})"})
            sys.stderr.write(f"DEBUG: Caught {error_type}: {error_msg} (chunks={chunk_count})\\n")
            yield f"data: {error_data}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )


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
