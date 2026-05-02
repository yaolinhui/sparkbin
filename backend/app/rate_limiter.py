import os
import logging
from datetime import datetime, timedelta
from typing import Optional, Tuple, Any
from collections import deque

logger = logging.getLogger(__name__)

# 尝试导入 redis，未安装时降级到内存限流
try:
    import redis
    _redis_available = True
except ImportError:
    _redis_available = False
    logger.warning("redis package not installed, falling back to in-memory rate limiting")

_redis_client: Optional[Any] = None


def _get_redis_client() -> Optional[Any]:
    """获取 Redis 客户端，连接失败时返回 None"""
    global _redis_client
    if _redis_client is not None:
        try:
            _redis_client.ping()
            return _redis_client
        except Exception:
            _redis_client = None

    if not _redis_available:
        return None

    redis_url = os.environ.get("REDIS_URL") or os.environ.get("REDISCLOUD_URL")
    if not redis_url:
        return None

    try:
        _redis_client = redis.from_url(redis_url, decode_responses=True, socket_connect_timeout=2, socket_timeout=2)
        _redis_client.ping()
        logger.info("Redis rate limiter connected")
        return _redis_client
    except Exception as e:
        logger.warning(f"Redis connection failed: {e}, falling back to in-memory rate limiting")
        return None


class RateLimiter:
    """分布式限流器（Redis 优先，降级到内存）"""

    def __init__(self, key_prefix: str, max_requests: int, window_seconds: int):
        self.key_prefix = key_prefix
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._memory_store: dict[str, deque] = {}

    def is_allowed(self, key: str) -> Tuple[bool, int]:
        """返回 (是否允许, 重试等待秒数)"""
        r = _get_redis_client()
        full_key = f"{self.key_prefix}:{key}"
        now = int(datetime.utcnow().timestamp())

        if r:
            try:
                return self._redis_check(r, full_key, now)
            except Exception as e:
                logger.warning(f"Redis rate limit failed: {e}, falling back to memory")

        return self._memory_check(full_key, now)

    def _redis_check(self, r: Any, full_key: str, now: int) -> Tuple[bool, int]:
        """Redis 滑动窗口限流"""
        window_start = now - self.window_seconds

        pipe = r.pipeline()
        pipe.zremrangebyscore(full_key, 0, window_start)
        pipe.zcard(full_key)
        pipe.zadd(full_key, {str(now): now})
        pipe.expire(full_key, self.window_seconds)
        _, current_count, _, _ = pipe.execute()

        if current_count >= self.max_requests:
            # 计算最早一条记录何时过期
            oldest = r.zrange(full_key, 0, 0, withscores=True)
            if oldest:
                retry_after = max(1, int(oldest[0][1] + self.window_seconds - now))
            else:
                retry_after = self.window_seconds
            return False, retry_after

        return True, 0

    def _memory_check(self, full_key: str, now: int) -> Tuple[bool, int]:
        """内存滑动窗口限流（降级用）"""
        if full_key not in self._memory_store:
            self._memory_store[full_key] = deque()

        attempts = self._memory_store[full_key]

        # 清理过期记录
        while attempts and attempts[0] < now - self.window_seconds:
            attempts.popleft()

        if len(attempts) >= self.max_requests:
            oldest = attempts[0]
            retry_after = max(1, int(oldest + self.window_seconds - now))
            return False, retry_after

        attempts.append(now)
        return True, 0

    def record(self, key: str) -> None:
        """手动记录一次请求（用于失败场景，当 check 没有预先计数时）"""
        r = _get_redis_client()
        full_key = f"{self.key_prefix}:{key}"
        now = int(datetime.utcnow().timestamp())

        if r:
            try:
                pipe = r.pipeline()
                pipe.zremrangebyscore(full_key, 0, now - self.window_seconds)
                pipe.zadd(full_key, {str(now): now})
                pipe.expire(full_key, self.window_seconds)
                pipe.execute()
                return
            except Exception as e:
                logger.warning(f"Redis rate limit record failed: {e}, falling back to memory")

        # 内存降级
        if full_key not in self._memory_store:
            self._memory_store[full_key] = deque()
        attempts = self._memory_store[full_key]
        while attempts and attempts[0] < now - self.window_seconds:
            attempts.popleft()
        attempts.append(now)

    def peek_count(self, key: str) -> int:
        """查询当前窗口内的请求数量（不增加计数）"""
        r = _get_redis_client()
        full_key = f"{self.key_prefix}:{key}"
        now = int(datetime.utcnow().timestamp())

        if r:
            try:
                r.zremrangebyscore(full_key, 0, now - self.window_seconds)
                return r.zcard(full_key)
            except Exception as e:
                logger.warning(f"Redis rate limit peek failed: {e}, falling back to memory")

        # 内存降级
        if full_key not in self._memory_store:
            return 0
        attempts = self._memory_store[full_key]
        while attempts and attempts[0] < now - self.window_seconds:
            attempts.popleft()
        return len(attempts)


# 全局限流器实例
_login_limiter = RateLimiter("sparkbin:login", max_requests=5, window_seconds=300)
_register_limiter = RateLimiter("sparkbin:register", max_requests=5, window_seconds=300)
_captcha_limiter = RateLimiter("sparkbin:captcha", max_requests=10, window_seconds=300)
