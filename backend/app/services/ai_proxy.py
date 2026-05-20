import httpx
import json
import ssl
import hashlib
import time
import re
from uuid import UUID
from typing import AsyncGenerator, List, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException
import logging

from ..models import AIProvider, AIConfig, AICallLog
from ..encryption import get_encryption_manager

# 配置日志
logger = logging.getLogger(__name__)

# 敏感信息正则模式（用于 AI 日志 error_msg 脱敏）
_SENSITIVE_PATTERNS = [
    re.compile(r"Bearer\s+[A-Za-z0-9_\-\.]+", re.I),
    re.compile(r"sk-[A-Za-z0-9]{20,}", re.I),
    re.compile(r"api[_-]?key\s*[=:]\s*['\"]?[A-Za-z0-9_\-\.]+['\"]?", re.I),
    re.compile(r"[A-Za-z0-9_\-\.]+@[A-Za-z0-9\-]+\.[A-Za-z0-9\-.]+", re.I),  # 邮箱
]


def _redact_error_msg(msg: str | None) -> str:
    """对 AI 调用日志的 error_msg 进行脱敏，防止泄露 API key、token 等"""
    if not msg:
        return ""
    redacted = msg
    for pattern in _SENSITIVE_PATTERNS:
        redacted = pattern.sub("[REDACTED]", redacted)
    return redacted

# 有界 LRU 缓存，防止内存耗尽 DoS
class _LRUCache:
    def __init__(self, capacity: int = 128):
        self.capacity = capacity
        self._cache: dict = {}
        self._order: list = []

    def get(self, key: str):
        if key in self._cache:
            self._order.remove(key)
            self._order.append(key)
            return self._cache[key]
        return None

    def put(self, key: str, value) -> None:
        if key in self._cache:
            self._order.remove(key)
        elif len(self._order) >= self.capacity:
            oldest = self._order.pop(0)
            del self._cache[oldest]
        self._cache[key] = value
        self._order.append(key)


_idea_suggestion_cache = _LRUCache(capacity=128)
_CACHE_TTL = 3600  # 1 小时


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
    },
    AIProvider.OPENAI: {
        "base_url": "https://api.openai.com/v1",
        "model": "gpt-4"
    },
    AIProvider.OLLAMA: {
        "base_url": "http://localhost:11434/v1",
        "model": "llama3.2"
    }
}


class AIProxyService:
    def __init__(self, db: Session, user_id: str | None = None):
        self.db = db
        self.user_id = UUID(user_id) if user_id else None
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

    async def test_connection(
        self,
        provider: AIProvider,
        base_url: str | None = None,
        api_key: str | None = None,
        model: str | None = None
    ) -> dict:
        """
        测试 AI API 配置（实际调用 API 验证）
        如果传入 base_url/api_key/model，则使用传入值做临时测试（不读数据库）
        返回: {"success": bool, "message": str}
        """
        try:
            if api_key is not None:
                # 使用传入值做临时测试
                test_api_key = api_key
                test_base_url = base_url or DEFAULT_CONFIGS[provider]["base_url"]
                test_model = model or DEFAULT_CONFIGS[provider]["model"]
            else:
                # 从数据库读取已保存的配置
                config = self.get_active_config(provider)
                test_api_key = self.decrypt_api_key(config)
                test_base_url = config.base_url
                test_model = config.default_model

            # 本地验证 API Key 格式
            if not test_api_key or len(test_api_key) < 10:
                return {"success": False, "message": "API Key 格式无效"}

            # 验证 URL 格式
            if not test_base_url.startswith("http"):
                return {"success": False, "message": "Base URL 格式无效"}

            # 验证模型名称
            if not test_model:
                return {"success": False, "message": "模型名称不能为空"}

            # 实际调用 API 进行验证
            headers = {
                "Authorization": f"Bearer {test_api_key}",
                "Content-Type": "application/json"
            }

            payload = {
                "model": test_model,
                "messages": [{"role": "user", "content": "Hi"}],
                "stream": False,
                "max_tokens": 5  # 限制响应长度，仅用于测试
            }

            async with httpx.AsyncClient(timeout=30.0, follow_redirects=False) as client:
                response = await client.post(
                    f"{test_base_url}/chat/completions",
                    headers=headers,
                    json=payload
                )

                if response.status_code == 200:
                    # HTTP 200 即认为连接成功，不要求 content 非空
                    # 某些模型（如 DeepSeek V4）对极简测试请求可能返回空 content
                    return {"success": True, "message": f"API 连接成功 ({provider.value})"}
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
        stream: bool = True,
        max_tokens: int | None = None,
        temperature: float | None = None,
    ) -> AsyncGenerator[str, None]:
        """
        统一的聊天接口，支持流式返回
        返回 SSE 格式的数据流
        """
        # logger.info(f"Starting chat_completion for provider: {provider.value}")

        config = self.get_active_config(provider)
        api_key = self.decrypt_api_key(config)

        # 验证 API Key 是否有效（Ollama 本地模型不需要 API Key）
        if provider != AIProvider.OLLAMA and (not api_key or len(api_key) < 10):
            logger.error(f"Invalid API Key for provider {provider.value}: key length = {len(api_key) if api_key else 0}")
            raise HTTPException(status_code=400, detail=f"API Key not configured or invalid for {provider.value}")

        headers = {
            "Content-Type": "application/json"
        }
        if provider != AIProvider.OLLAMA:
            headers["Authorization"] = f"Bearer {api_key}"

        payload = {
            "model": config.default_model,
            "messages": messages,
            "stream": stream,
            "max_tokens": max_tokens if max_tokens is not None else 2048,
        }
        if temperature is not None:
            payload["temperature"] = temperature

        # logger.info(f"Sending request to {config.base_url}/chat/completions with model {config.default_model}")

        prompt_tokens = sum(len(m.get("content", "")) // 4 for m in messages)
        completion_tokens = 0
        status = "success"
        error_msg = ""
        first_chunk_at: float | None = None
        request_start = time.time()

        try:
            async with httpx.AsyncClient(timeout=60.0, follow_redirects=False) as client:
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

                    chunk_count = 0
                    data_count = 0
                    async for chunk in response.aiter_text():
                        chunk_count += 1
                        if first_chunk_at is None:
                            first_chunk_at = time.time() - request_start
                            logger.info(f"TTFT for {provider.value}: {first_chunk_at:.3f}s")
                        for line in chunk.split('\n'):
                            line = line.strip()
                            if not line:
                                continue
                            if line.startswith("data: "):
                                data_count += 1
                                data = line[6:]
                                if data == "[DONE]":
                                    logger.info(f"Stream completed: received {chunk_count} chunks, {data_count} data lines, {completion_tokens} tokens, TTFT={first_chunk_at:.3f}s")
                                    yield "data: [DONE]\n\n"
                                    break

                                try:
                                    parsed = json.loads(data)
                                    delta = parsed.get("choices", [{}])[0].get("delta", {})
                                    content = delta.get("content", "")

                                    if content:
                                        completion_tokens += len(content) // 4

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
            # 某些异常（如 httpx.ConnectError）message 为空，按类型构造友好提示
            if not error_msg:
                if isinstance(e, httpx.ConnectError):
                    error_msg = f"无法连接到 {provider.value} API 服务器，请检查网络或切换其他模型"
                elif isinstance(e, httpx.TimeoutException):
                    error_msg = f"{provider.value} API 请求超时，请稍后重试"
                else:
                    error_msg = f"{provider.value} API 调用失败: {type(e).__name__}"
            logger.error(f"Error in chat_completion: {error_msg}")
            # 发送错误信息给前端，而不是抛出异常导致连接中断
            error_data = json.dumps({"error": error_msg or "Unknown error occurred"})
            yield f"data: {error_data}\n\n"
            yield "data: [DONE]\n\n"
        finally:
            try:
                log = AICallLog(
                    user_id=self.user_id,
                    provider=provider,
                    model=config.default_model,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    status=status,
                    error_msg=_redact_error_msg(error_msg)[:500]
                )
                if first_chunk_at is not None:
                    logger.info(f"AICallLog TTFT: provider={provider.value}, ttft={first_chunk_at:.3f}s")
                self.db.add(log)
                self.db.commit()
            except Exception as log_exc:
                logger.error(f"Failed to write AI call log: {log_exc}")

    async def chat_completion_with_fallback(
        self,
        provider: AIProvider,
        messages: List[Dict[str, str]],
        stream: bool = True,
        max_tokens: int | None = None,
        temperature: float | None = None,
    ) -> AsyncGenerator[str, None]:
        """
        聊天接口（带 provider fallback），一个 provider 失败自动尝试下一个
        """
        # 构建 fallback 链：只包含已激活的 provider
        active_providers = {
            p.provider for p in self.db.query(AIConfig).filter(AIConfig.is_active == True).all()
        }
        providers_to_try = [provider]
        for p in [AIProvider.DEEPSEEK, AIProvider.KIMI, AIProvider.DOUBAO, AIProvider.OPENAI]:
            if p not in providers_to_try and p in active_providers:
                providers_to_try.append(p)

        last_error = ""
        for p in providers_to_try:
            failed = False
            try:
                async for chunk in self.chat_completion(
                    provider=p,
                    messages=messages,
                    stream=stream,
                    max_tokens=max_tokens,
                    temperature=temperature,
                ):
                    # 检测 chat_completion 内部 yield 的错误信息
                    if not failed:
                        for line in chunk.splitlines():
                            stripped = line.strip()
                            if stripped.startswith("data: "):
                                data = stripped[6:]
                                if data != "[DONE]":
                                    try:
                                        parsed = json.loads(data)
                                        if parsed.get("error"):
                                            failed = True
                                            last_error = parsed["error"]
                                            logger.warning(f"Provider {p.value} yielded error: {last_error}, trying fallback...")
                                            break
                                    except json.JSONDecodeError:
                                        pass
                        if failed:
                            break
                    yield chunk
                if not failed:
                    return
            except HTTPException as e:
                last_error = e.detail
                logger.warning(f"Provider {p.value} failed in chat: {e.detail}, trying fallback...")
                continue
            except Exception as e:
                last_error = str(e) or f"{p.value} API 调用失败"
                logger.warning(f"Provider {p.value} failed unexpectedly in chat: {last_error}, trying fallback...")
                continue

        # 所有 provider 都失败
        error_data = json.dumps({"error": f"AI 服务暂时不可用，已尝试所有模型。最后错误: {last_error}"})
        yield f"data: {error_data}\n\n"
        yield "data: [DONE]\n\n"

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
            async with httpx.AsyncClient(timeout=60.0, follow_redirects=False) as client:
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
                user_id=self.user_id,
                provider=provider,
                model=config.default_model,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                status=status,
                error_msg=_redact_error_msg(error_msg)[:500]
            )
            self.db.add(log)
            self.db.commit()


    async def _generate_idea_suggestions_single(
        self,
        provider: AIProvider,
        title: str,
        pain_point: str,
        original_idea: str,
        current_notes: List[Dict[str, str]],
        cache_key: str
    ) -> List[Dict[str, str]]:
        """调用单个 provider 生成想法建议（内部方法）"""
        config = self.get_active_config(provider)
        api_key = self.decrypt_api_key(config)

        notes_text = "\n".join(
            f"- {note['title']}: {note['content']}" for note in current_notes
        )

        prompt = f"""你是产品顾问。基于项目信息生成5个维度的优化建议，返回JSON。

项目：{title}
痛点：{pain_point}
想法：{original_idea or pain_point}
现有内容：
{notes_text}

返回格式：
{{
    "notes": [
        {{"title": "核心痛点", "content": "..."}},
        {{"title": "目标用户", "content": "..."}},
        {{"title": "使用场景", "content": "..."}},
        {{"title": "解决方案", "content": "..."}},
        {{"title": "差异化价值", "content": "..."}}
    ]
}}

约束：每维度1-2句话，每句≤30字。保留用户已有实质内容。中文。"""

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": config.default_model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
            "max_tokens": 250,
            "temperature": 0.5
        }

        prompt_tokens = len(prompt) // 4
        completion_tokens = 0
        status = "success"
        error_msg = ""

        try:
            async with httpx.AsyncClient(timeout=60.0, follow_redirects=False) as client:
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

                # 清理可能的 markdown 代码块
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0]
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0]

                parsed = json.loads(content.strip())
                notes = parsed.get("notes", [])

                # 确保返回的 notes 包含必需的字段
                validated_notes = []
                for note in notes:
                    if "title" in note and "content" in note:
                        validated_notes.append({
                            "title": note["title"],
                            "content": note["content"]
                        })

                # 写入缓存（使用与 provider 无关的缓存键）
                _idea_suggestion_cache.put(cache_key, (time.time(), validated_notes))
                return validated_notes

        except json.JSONDecodeError:
            logger.error(f"Failed to parse AI response as JSON: {content[:200]}")
            return []
        except Exception as e:
            import sys
            print(f"DEBUG EXCEPTION: {type(e).__name__}: {repr(str(e))}", file=sys.stderr)
            import traceback
            traceback.print_exc()
            status = "error"
            error_msg = str(e) or f"{provider.value} API 调用失败"
            raise HTTPException(
                status_code=503,
                detail=f"AI 服务暂时不可用: {error_msg}"
            )
        finally:
            log = AICallLog(
                user_id=self.user_id,
                provider=provider,
                model=config.default_model,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                status=status,
                error_msg=_redact_error_msg(error_msg)[:500]
            )
            self.db.add(log)
            self.db.commit()

    async def generate_idea_suggestions(
        self,
        provider: AIProvider,
        title: str,
        pain_point: str,
        original_idea: str,
        current_notes: List[Dict[str, str]]
    ) -> List[Dict[str, str]]:
        """
        生成想法阶段便利贴建议，支持 provider fallback
        返回：[{"title": "...", "content": "..."}, ...]
        """
        # 使用与 provider 无关的缓存键，所有 provider 共享结果
        cache_input = f"{title}:{pain_point}:{original_idea}:{json.dumps(current_notes, sort_keys=True)}"
        cache_key = hashlib.md5(cache_input.encode()).hexdigest()
        cache_entry = _idea_suggestion_cache.get(cache_key)
        if cache_entry:
            cached_at, cached_result = cache_entry
            if time.time() - cached_at < _CACHE_TTL:
                logger.info("Idea suggestion cache hit")
                return cached_result

        # 构建 fallback 链：只包含已激活的 provider
        active_providers = {
            p.provider for p in self.db.query(AIConfig).filter(AIConfig.is_active == True).all()
        }
        providers_to_try = [provider]
        for p in [AIProvider.DEEPSEEK, AIProvider.KIMI, AIProvider.DOUBAO, AIProvider.OPENAI]:
            if p not in providers_to_try and p in active_providers:
                providers_to_try.append(p)

        last_error = ""
        for p in providers_to_try:
            try:
                return await self._generate_idea_suggestions_single(
                    p, title, pain_point, original_idea, current_notes, cache_key
                )
            except HTTPException as e:
                last_error = e.detail
                logger.warning(f"Provider {p.value} failed: {e.detail}, trying fallback...")
                continue
            except Exception as e:
                last_error = str(e) or f"{p.value} API 调用失败"
                logger.warning(f"Provider {p.value} failed unexpectedly: {last_error}, trying fallback...")
                continue

        # 所有 provider 都失败
        raise HTTPException(
            status_code=503,
            detail=f"AI 服务暂时不可用，已尝试所有模型。最后错误: {last_error}"
        )


    async def generate_validate_suggestions(
        self,
        provider: AIProvider,
        title: str,
        pain_point: str,
        original_idea: str,
        current_items: List[Dict[str, str]],
        current_tools: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """
        生成验证阶段建议（验证项 + 验证工具 + 分析）
        返回：{"items": [...], "tools": [...], "analysis": "..."}
        """
        config = self.get_active_config(provider)
        api_key = self.decrypt_api_key(config)

        items_text = "\n".join(
            f"- [{i.get('method', 'survey')}] {i['title']}: {i['description']}" for i in current_items
        ) if current_items else "（暂无）"

        tools_text = "\n".join(
            f"- [{t.get('type', 'survey')}] {t['title']}: {t['content'][:100]}..." for t in current_tools
        ) if current_tools else "（暂无）"

        prompt = f"""你是一个资深用户研究顾问，擅长帮助创业者设计低成本、高信度的需求验证方案。

项目：{title}
痛点：{pain_point}
原始想法：{original_idea or '未填写'}

当前验证项：
{items_text}

当前验证工具：
{tools_text}

请根据以上信息，生成验证阶段建议。必须返回 JSON 格式，不要包含其他内容：
{{
    "items": [
        {{"title": "...", "description": "...", "method": "survey"}},
        {{"title": "...", "description": "...", "method": "interview"}}
    ],
    "tools": [
        {{"type": "survey", "title": "...", "content": "..."}},
        {{"type": "interview", "title": "...", "content": "..."}}
    ],
    "analysis": "简要分析建议"
}}

要求：
1. 验证项 2-5 个，覆盖痛点真实性、付费意愿、场景真实性、竞品分析等维度
2. 验证工具 1-3 个，与验证项对应
3. 每个验证项描述不超过 50 字
4. 工具内容要可直接使用（问卷问题、访谈提纲等）
5. 如果已有验证项/工具，优先补充缺失维度，不要重复
6. 用中文回复"""

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": config.default_model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
            "max_tokens": 1200,
            "temperature": 0.5
        }

        prompt_tokens = len(prompt) // 4
        completion_tokens = 0
        status = "success"
        error_msg = ""

        try:
            async with httpx.AsyncClient(timeout=60.0, follow_redirects=False) as client:
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

                # 清理可能的 markdown 代码块
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0]
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0]

                parsed = json.loads(content.strip())
                return {
                    "items": parsed.get("items", []),
                    "tools": parsed.get("tools", []),
                    "analysis": parsed.get("analysis", "")
                }

        except json.JSONDecodeError:
            logger.error(f"Failed to parse AI response as JSON: {content[:200]}")
            return {"items": [], "tools": [], "analysis": ""}
        except Exception as e:
            import sys
            print(f"DEBUG EXCEPTION: {type(e).__name__}: {repr(str(e))}", file=sys.stderr)
            import traceback
            traceback.print_exc()
            status = "error"
            error_msg = str(e) or f"{provider.value} API 调用失败"
            raise HTTPException(
                status_code=503,
                detail=f"AI 服务暂时不可用: {error_msg}"
            )
        finally:
            log = AICallLog(
                user_id=self.user_id,
                provider=provider,
                model=config.default_model,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                status=status,
                error_msg=_redact_error_msg(error_msg)[:500]
            )
            self.db.add(log)
            self.db.commit()


    async def generate_smoke_test_suggestions(
        self,
        provider: AIProvider,
        title: str,
        pain_point: str,
        original_idea: str,
        platforms: List[str],
        styles: List[str]
    ) -> Dict[str, Any]:
        """
        生成试水帖（Smoke Test）文案建议
        只暴露痛点、不暴露解决方案，适配不同平台和风格
        返回：{"variants": [{"platform": "...", "style": "...", "title": "...", "content": "...", "tags": [...]}, ...]}
        """
        config = self.get_active_config(provider)
        api_key = self.decrypt_api_key(config)

        platform_list = ", ".join(platforms) if platforms else "小红书, Twitter/X, V2EX"
        style_list = ", ".join(styles) if styles else "help, rant, research"

        platform_guide = {
            "xiaohongshu": "小红书风格：多用emoji，口语化表达，亲切自然，像姐妹聊天",
            "jike": "即刻风格：轻松随意，带点幽默感，适合短平快的表达",
            "v2ex": "V2EX风格：技术社区讨论式，理性分析问题，寻求技术人共鸣",
            "twitter": "Twitter/X风格：简洁有力，适合英文，1-2句话直击痛点，可加hashtag",
            "reddit": "Reddit风格：英文，maker/entrepreneur社区口吻，真诚分享困境",
            "indiehackers": "IndieHackers风格：英文，独立开发者口吻，分享building过程中的痛点",
            "producthunt": "ProductHunt风格：英文，产品人视角，简洁描述问题场景",
            "wechat_moments": "朋友圈风格：生活化，真情实感，不刻意营销",
            "zhihu": "知乎风格：理性分析，结构化表达，以'如何评价/如何看待'引发讨论",
            "douban": "豆瓣风格：文艺腔调，感性表达，适合生活方式类痛点"
        }

        style_guide = {
            "help": "求助型：真诚发问，寻求共鸣和建议，语气谦虚",
            "rant": "吐槽型：夸张表达frustration，引发讨论和共情",
            "research": "调研型：以'做调研'口吻收集意见，显得客观中立",
            "share": "分享型：分享个人经历，轻描淡写，不刻意引导",
            "teaser": "预告型：暗示'正在关注这个问题'，制造悬念和好奇"
        }

        platform_guides_text = "\n".join(
            f"- {k}: {v}" for k, v in platform_guide.items() if k in platforms
        )
        style_guides_text = "\n".join(
            f"- {k}: {v}" for k, v in style_guide.items() if k in styles
        )

        prompt = f"""你是社交媒体内容专家，擅长写"试水帖"——只暴露痛点、不暴露解决方案的teaser文案。

项目标题：{title}
痛点：{pain_point}
原始想法：{original_idea or '未填写'}

要求生成的平台：{platform_list}
要求生成的风格：{style_list}

平台适配指南：
{platform_guides_text}

风格指南：
{style_guides_text}

核心规则（绝对遵守）：
1. 只讨论痛点本身，绝不提及产品名称、功能细节、定价、或解决方案
2. 不要出现"我们正在做..."、"我们的产品..."、"欢迎试用..."等暴露项目的表述
3. 文案要像真实用户自发发帖，不是广告
4. 每个variant必须包含：platform（平台key）、style（风格key）、title（帖子标题）、content（正文内容）、tags（推荐标签数组）

请为每个平台×风格的组合生成1个variant，严格按以下JSON格式返回，不要包含其他内容：
{{
    "variants": [
        {{
            "platform": "xiaohongshu",
            "style": "help",
            "title": "帖子标题",
            "content": "正文内容...",
            "tags": ["标签1", "标签2"]
        }}
    ]
}}

要求：
1. 标题吸引人点击，不超过20字
2. 正文长度适配平台（小红书/知乎可稍长，Twitter/即刻要短）
3. tags 2-5个，贴合平台调性
4. 用中文回复（英文平台如Twitter/Reddit/PH/IH的内容用英文）"""

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": config.default_model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
            "max_tokens": 2000,
            "temperature": 0.7
        }

        prompt_tokens = len(prompt) // 4
        completion_tokens = 0
        status = "success"
        error_msg = ""

        try:
            async with httpx.AsyncClient(timeout=60.0, follow_redirects=False) as client:
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

                # 清理可能的 markdown 代码块
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0]
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0]

                parsed = json.loads(content.strip())
                return {"variants": parsed.get("variants", [])}

        except json.JSONDecodeError:
            logger.error(f"Failed to parse AI response as JSON: {content[:200]}")
            return {"variants": []}
        except Exception as e:
            import sys
            print(f"DEBUG EXCEPTION: {type(e).__name__}: {repr(str(e))}", file=sys.stderr)
            import traceback
            traceback.print_exc()
            status = "error"
            error_msg = str(e) or f"{provider.value} API 调用失败"
            raise HTTPException(
                status_code=503,
                detail=f"AI 服务暂时不可用: {error_msg}"
            )
        finally:
            log = AICallLog(
                user_id=self.user_id,
                provider=provider,
                model=config.default_model,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                status=status,
                error_msg=_redact_error_msg(error_msg)[:500]
            )
            self.db.add(log)
            self.db.commit()


def init_default_ai_configs(db: Session):
    """初始化默认 AI 配置（优先从环境变量读取）"""
    import os
    encryption = get_encryption_manager()
    empty_key = encryption.encrypt("")  # 加密空字符串

    env_map = {
        AIProvider.DEEPSEEK: {
            "api_key": os.environ.get("DEEPSEEK_API_KEY", ""),
            "base_url": os.environ.get("DEEPSEEK_BASE_URL", ""),
            "model": os.environ.get("DEEPSEEK_DEFAULT_MODEL", ""),
        },
        AIProvider.KIMI: {
            "api_key": os.environ.get("KIMI_API_KEY", ""),
            "base_url": os.environ.get("KIMI_BASE_URL", ""),
            "model": os.environ.get("KIMI_DEFAULT_MODEL", ""),
        },
        AIProvider.DOUBAO: {
            "api_key": os.environ.get("DOUBAO_API_KEY", ""),
            "base_url": os.environ.get("DOUBAO_BASE_URL", ""),
            "model": os.environ.get("DOUBAO_DEFAULT_MODEL", ""),
        },
        AIProvider.OPENAI: {
            "api_key": os.environ.get("OPENAI_API_KEY", ""),
            "base_url": os.environ.get("OPENAI_BASE_URL", ""),
            "model": os.environ.get("OPENAI_DEFAULT_MODEL", ""),
        },
        AIProvider.OLLAMA: {
            "api_key": os.environ.get("OLLAMA_API_KEY", ""),
            "base_url": os.environ.get("OLLAMA_BASE_URL", ""),
            "model": os.environ.get("OLLAMA_DEFAULT_MODEL", ""),
        },
    }

    for provider in [AIProvider.DEEPSEEK, AIProvider.KIMI, AIProvider.DOUBAO, AIProvider.OPENAI, AIProvider.OLLAMA]:
        default = DEFAULT_CONFIGS[provider]
        env_cfg = env_map.get(provider, {})
        env_api_key = env_cfg.get("api_key", "")
        env_base_url = env_cfg.get("base_url", "")
        env_model = env_cfg.get("model", "")

        existing = db.query(AIConfig).filter(AIConfig.provider == provider).first()
        if not existing:
            config = AIConfig(
                provider=provider,
                base_url=env_base_url or default["base_url"],
                api_key_encrypted=encryption.encrypt(env_api_key) if env_api_key else empty_key,
                default_model=env_model or default["model"],
                is_active=bool(env_api_key)
            )
            db.add(config)
        else:
            # 环境变量存在时优先覆盖数据库配置，方便运维部署
            if env_api_key:
                existing.api_key_encrypted = encryption.encrypt(env_api_key)
                existing.is_active = True
            if env_base_url:
                existing.base_url = env_base_url
            if env_model:
                existing.default_model = env_model

    db.commit()
    print("Default AI configs initialized")
