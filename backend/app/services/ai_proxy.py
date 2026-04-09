import httpx
import json
import ssl
from typing import AsyncGenerator, List, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException
import logging

from ..models import AIProvider, AIConfig, AICallLog
from ..encryption import get_encryption_manager

# 配置日志
logger = logging.getLogger(__name__)


# 默认配置
DEFAULT_CONFIGS = {
    AIProvider.DEEPSEEK: {
        "base_url": "https://api.deepseek.com/v1",
        "model": "deepseek-chat"
    },
    AIProvider.KIMI: {
        "base_url": "https://api.moonshot.cn/v1",
        "model": "moonshot-v1-8k"
    },
    AIProvider.DOUBAO: {
        "base_url": "https://ark.cn-beijing.volces.com/api/v3",
        "model": "doubao-lite-4k"
    }
}


class AIProxyService:
    def __init__(self, db: Session):
        self.db = db
        self.encryption = get_encryption_manager()

    def get_active_config(self, provider: AIProvider) -> AIConfig:
        """获取启用的 AI 配置"""
        config = self.db.query(AIConfig).filter(
            AIConfig.provider == provider,
            AIConfig.is_active == True
        ).first()

        if not config:
            raise HTTPException(
                status_code=400,
                detail=f"AI provider '{provider.value}' is not configured or inactive"
            )

        return config

    def decrypt_api_key(self, config: AIConfig) -> str:
        """解密 API Key"""
        return self.encryption.decrypt(config.api_key_encrypted)

    async def test_connection(self, provider: AIProvider) -> dict:
        """
        测试 AI API 配置（实际调用 API 验证）
        返回: {"success": bool, "message": str}
        """
        try:
            config = self.get_active_config(provider)
            api_key = self.decrypt_api_key(config)

            # 本地验证 API Key 格式
            if not api_key or len(api_key) < 10:
                return {"success": False, "message": "API Key 格式无效"}

            # 验证 URL 格式
            if not config.base_url.startswith("http"):
                return {"success": False, "message": "Base URL 格式无效"}

            # 验证模型名称
            if not config.default_model:
                return {"success": False, "message": "模型名称不能为空"}

            # 实际调用 API 进行验证
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }

            payload = {
                "model": config.default_model,
                "messages": [{"role": "user", "content": "Hi"}],
                "stream": False,
                "max_tokens": 5  # 限制响应长度，仅用于测试
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{config.base_url}/chat/completions",
                    headers=headers,
                    json=payload
                )

                if response.status_code == 200:
                    result = response.json()
                    content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
                    if content:
                        return {"success": True, "message": f"API 连接成功 ({provider.value})"}
                    else:
                        return {"success": False, "message": "API 返回空响应，请检查模型配置"}
                elif response.status_code == 401:
                    return {"success": False, "message": "API Key 无效或已过期"}
                elif response.status_code == 404:
                    return {"success": False, "message": "模型不存在，请检查模型名称"}
                else:
                    error_text = response.text[:200]
                    return {"success": False, "message": f"API 错误 (HTTP {response.status_code}): {error_text}"}

        except HTTPException as e:
            import traceback
            traceback.print_exc()
            return {"success": False, "message": f"配置错误: {e.detail}"}
        except httpx.TimeoutException:
            return {"success": False, "message": "连接超时，请检查网络或 API 地址"}
        except Exception as e:
            import sys
            print(f"DEBUG EXCEPTION: {type(e).__name__}: {repr(str(e))}", file=sys.stderr)
            import traceback
            traceback.print_exc()
            return {"success": False, "message": f"验证失败: {str(e)}"}

    async def chat_completion(
        self,
        provider: AIProvider,
        messages: List[Dict[str, str]],
        stream: bool = True
    ) -> AsyncGenerator[str, None]:
        """
        统一的聊天接口，支持流式返回
        返回 SSE 格式的数据流
        """
        # logger.info(f"Starting chat_completion for provider: {provider.value}")

        config = self.get_active_config(provider)
        api_key = self.decrypt_api_key(config)

        # 验证 API Key 是否有效
        if not api_key or len(api_key) < 10:
            logger.error(f"Invalid API Key for provider {provider.value}: key length = {len(api_key) if api_key else 0}")
            raise HTTPException(status_code=400, detail=f"API Key not configured or invalid for {provider.value}")

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": config.default_model,
            "messages": messages,
            "stream": stream
        }

        # logger.info(f"Sending request to {config.base_url}/chat/completions with model {config.default_model}")

        prompt_tokens = sum(len(m.get("content", "")) // 4 for m in messages)
        completion_tokens = 0
        status = "success"
        error_msg = ""

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    f"{config.base_url}/chat/completions",
                    headers=headers,
                    json=payload
                ) as response:
                    if response.status_code != 200:
                        error_text = await response.aread()
                        status = "error"
                        error_msg = f"HTTP {response.status_code}: {error_text}"
                        raise HTTPException(
                            status_code=response.status_code,
                            detail=f"AI API error: {error_text}"
                        )

                    # 使用 aiter_text 更可靠地处理 SSE 流
                    chunk_count = 0
                    data_count = 0
                    async for chunk in response.aiter_text():
                        chunk_count += 1
                        for line in chunk.split('\n'):
                            line = line.strip()
                            if not line:
                                continue
                            if line.startswith("data: "):
                                data_count += 1
                                data = line[6:]
                                if data == "[DONE]":
                                    logger.info(f"Stream completed: received {chunk_count} chunks, {data_count} data lines, {completion_tokens} tokens")
                                    yield "data: [DONE]\n\n"
                                    break

                                try:
                                    parsed = json.loads(data)
                                    # 处理流式响应格式 (delta)
                                    delta = parsed.get("choices", [{}])[0].get("delta", {})
                                    content = delta.get("content", "")

                                    if content:
                                        completion_tokens += len(content) // 4

                                    # 转发原始数据
                                    yield f"data: {data}\n\n"
                                except json.JSONDecodeError as e:
                                    logger.warning(f"Failed to parse JSON: {e}, data: {data[:100]}")
                                    continue

        except HTTPException as e:
            import traceback
            traceback.print_exc()
            status = "error"
            error_msg = e.detail if hasattr(e, 'detail') else str(e)
            logger.error(f"HTTP Error in chat_completion: {error_msg}")
            error_data = json.dumps({"error": error_msg})
            yield f"data: {error_data}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            import sys
            print(f"DEBUG EXCEPTION: {type(e).__name__}: {repr(str(e))}", file=sys.stderr)
            import traceback
            traceback.print_exc()
            status = "error"
            error_msg = str(e)
            logger.error(f"Error in chat_completion: {error_msg}")
            # 发送错误信息给前端，而不是抛出异常导致连接中断
            error_data = json.dumps({"error": error_msg or "Unknown error occurred"})
            yield f"data: {error_data}\n\n"
            yield "data: [DONE]\n\n"
        finally:
            # 记录调用日志
            log = AICallLog(
                provider=provider,
                model=config.default_model,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                status=status,
                error_msg=error_msg[:500]  # 限制长度
            )
            self.db.add(log)
            self.db.commit()

    async def generate_promote_suggestions(
        self,
        provider: AIProvider,
        project_title: str,
        pain_point: str,
        project_description: str
    ) -> Dict[str, List[str]]:
        """
        生成推广建议
        返回：{"channels": [...], "templates": [...]}
        """
        config = self.get_active_config(provider)
        api_key = self.decrypt_api_key(config)

        prompt = f"""你是一个产品推广专家。请为以下项目提供推广建议。

项目标题：{project_title}
痛点：{pain_point}
项目描述：{project_description}

请提供：
1. 5-8个适合的推广渠道（如 Twitter、ProductHunt、Reddit 等）
2. 3-5个推广文案模板

请严格按以下 JSON 格式返回，不要包含其他内容：
{{
    "channels": ["渠道1", "渠道2", ...],
    "templates": ["模板1", "模板2", ...]
}}"""

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": config.default_model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False
        }

        prompt_tokens = len(prompt) // 4
        completion_tokens = 0
        status = "success"
        error_msg = ""

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{config.base_url}/chat/completions",
                    headers=headers,
                    json=payload
                )

                if response.status_code != 200:
                    status = "error"
                    error_msg = f"HTTP {response.status_code}: {response.text}"
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"AI API error: {response.text}"
                    )

                result = response.json()
                content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
                completion_tokens = len(content) // 4

                # 解析 JSON
                try:
                    # 清理可能的 markdown 代码块
                    if "```json" in content:
                        content = content.split("```json")[1].split("```")[0]
                    elif "```" in content:
                        content = content.split("```")[1].split("```")[0]

                    suggestions = json.loads(content.strip())
                    return {
                        "channels": suggestions.get("channels", []),
                        "templates": suggestions.get("templates", [])
                    }
                except json.JSONDecodeError:
                    # 如果解析失败，返回空结构
                    return {"channels": [], "templates": []}

        except Exception as e:
            import sys
            print(f"DEBUG EXCEPTION: {type(e).__name__}: {repr(str(e))}", file=sys.stderr)
            import traceback
            traceback.print_exc()
            status = "error"
            error_msg = str(e)
            raise
        finally:
            log = AICallLog(
                provider=provider,
                model=config.default_model,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                status=status,
                error_msg=error_msg[:500]
            )
            self.db.add(log)
            self.db.commit()


def init_default_ai_configs(db: Session):
    """初始化默认 AI 配置（空 API Key，需要用户去配置）"""
    encryption = get_encryption_manager()
    empty_key = encryption.encrypt("")  # 加密空字符串

    for provider in [AIProvider.DEEPSEEK, AIProvider.KIMI, AIProvider.DOUBAO]:
        existing = db.query(AIConfig).filter(AIConfig.provider == provider).first()
        if not existing:
            default = DEFAULT_CONFIGS[provider]
            config = AIConfig(
                provider=provider,
                base_url=default["base_url"],
                api_key_encrypted=empty_key,
                default_model=default["model"],
                is_active=False  # 默认不启用，等配置后才启用
            )
            db.add(config)

    db.commit()
    print("Default AI configs initialized")
