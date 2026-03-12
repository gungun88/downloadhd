import redis.asyncio as aioredis

from core.config import settings

_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis | None:
    global _redis
    if _redis is None:
        try:
            _redis = await aioredis.from_url(settings.redis_url, decode_responses=True)
            await _redis.ping()
        except Exception:
            # Redis not available — caching disabled
            _redis = None
            return None
    return _redis
