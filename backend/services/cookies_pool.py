"""
Cookies 池管理服务
支持多用户贡献的 cookies 轮询使用
"""
import json
import logging
import tempfile
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

import redis.asyncio as redis

from core.config import settings

logger = logging.getLogger(__name__)


class CookiesPool:
    """Cookies 池管理器"""

    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None

    async def connect(self):
        """连接 Redis"""
        if not self.redis_client:
            self.redis_client = await redis.from_url(settings.redis_url, decode_responses=True)
            logger.info("Cookies pool connected to Redis")

    async def close(self):
        """关闭 Redis 连接"""
        if self.redis_client:
            await self.redis_client.close()
            logger.info("Cookies pool disconnected from Redis")

    def _get_pool_key(self, platform: str) -> str:
        """获取平台的 Redis key"""
        return f"cookies_pool:{platform}"

    async def add_cookies(self, platform: str, cookies: str) -> dict:
        """
        添加 cookies 到池中
        返回: {"id": "uuid", "message": "success"}
        """
        cookie_id = str(uuid.uuid4())
        now = datetime.now().isoformat()

        cookie_data = {
            "id": cookie_id,
            "cookies": cookies,
            "added_at": now,
            "last_used": None,
            "success_count": 0,
            "fail_count": 0,
            "status": "active",  # active / failed / expired
        }

        pool_key = self._get_pool_key(platform)

        # 获取现有池
        pool_json = await self.redis_client.get(pool_key)
        pool = json.loads(pool_json) if pool_json else []

        # 添加新 cookie
        pool.append(cookie_data)

        # 保存回 Redis
        await self.redis_client.set(pool_key, json.dumps(pool))

        logger.info(f"Added cookies to {platform} pool: {cookie_id}")
        return {"id": cookie_id, "message": "配置成功"}

    async def get_next_cookies(self, platform: str) -> Optional[tuple[str, str]]:
        """
        从池中获取下一个可用的 cookies
        返回: (cookie_id, cookies_content) 或 None
        策略：
        1. 只选择 status=active 的
        2. 按 last_used 时间排序（最久未用的优先，None 优先）
        3. 使用后更新 last_used
        """
        pool_key = self._get_pool_key(platform)
        pool_json = await self.redis_client.get(pool_key)

        if not pool_json:
            logger.warning(f"No cookies pool found for {platform}")
            return None

        pool = json.loads(pool_json)

        # 筛选 active 状态的 cookies
        active_cookies = [c for c in pool if c["status"] == "active"]

        if not active_cookies:
            logger.warning(f"No active cookies in {platform} pool")
            return None

        # 按 last_used 排序（None 排在最前面）
        active_cookies.sort(key=lambda x: x["last_used"] or "")

        # 选择第一个（最久未使用的）
        selected = active_cookies[0]
        cookie_id = selected["id"]
        cookies_content = selected["cookies"]

        # 更新 last_used 时间
        for cookie in pool:
            if cookie["id"] == cookie_id:
                cookie["last_used"] = datetime.now().isoformat()
                break

        # 保存回 Redis
        await self.redis_client.set(pool_key, json.dumps(pool))

        logger.info(f"Selected cookies from {platform} pool: {cookie_id}")
        return (cookie_id, cookies_content)

    async def mark_success(self, platform: str, cookie_id: str):
        """标记 cookies 使用成功"""
        pool_key = self._get_pool_key(platform)
        pool_json = await self.redis_client.get(pool_key)

        if not pool_json:
            return

        pool = json.loads(pool_json)

        for cookie in pool:
            if cookie["id"] == cookie_id:
                cookie["success_count"] += 1
                cookie["fail_count"] = 0  # 重置失败计数
                break

        await self.redis_client.set(pool_key, json.dumps(pool))
        logger.debug(f"Marked cookies {cookie_id} as success")

    async def mark_failure(self, platform: str, cookie_id: str):
        """
        标记 cookies 使用失败
        连续失败 3 次后标记为 failed
        """
        pool_key = self._get_pool_key(platform)
        pool_json = await self.redis_client.get(pool_key)

        if not pool_json:
            return

        pool = json.loads(pool_json)

        for cookie in pool:
            if cookie["id"] == cookie_id:
                cookie["fail_count"] += 1

                # 连续失败 3 次，标记为 failed
                if cookie["fail_count"] >= 3:
                    cookie["status"] = "failed"
                    logger.warning(f"Cookies {cookie_id} marked as failed after 3 failures")

                break

        await self.redis_client.set(pool_key, json.dumps(pool))
        logger.debug(f"Marked cookies {cookie_id} as failure")

    async def get_pool_status(self, platform: str) -> dict:
        """
        获取平台的 cookies 池状态
        返回: {"platform": "instagram", "total": 5, "active": 3, "failed": 2}
        """
        pool_key = self._get_pool_key(platform)
        pool_json = await self.redis_client.get(pool_key)

        if not pool_json:
            return {"platform": platform, "total": 0, "active": 0, "failed": 0, "warning": 0}

        pool = json.loads(pool_json)

        total = len(pool)
        active = len([c for c in pool if c["status"] == "active"])
        failed = len([c for c in pool if c["status"] == "failed"])

        # warning: active 但失败次数 >= 1
        warning = len([c for c in pool if c["status"] == "active" and c["fail_count"] >= 1])

        return {
            "platform": platform,
            "total": total,
            "active": active,
            "failed": failed,
            "warning": warning,
        }

    async def get_all_status(self) -> list[dict]:
        """获取所有平台的状态"""
        platforms = ["instagram", "youtube", "tiktok", "twitter", "facebook", "reddit", "douyin", "kuaishou"]
        statuses = []

        for platform in platforms:
            status = await self.get_pool_status(platform)
            statuses.append(status)

        return statuses

    async def create_temp_cookies_file(self, cookies_content: str) -> Path:
        """
        创建临时 cookies 文件
        返回文件路径
        """
        temp_file = tempfile.NamedTemporaryFile(
            mode='w',
            delete=False,
            suffix='.txt',
            prefix='cookies_pool_'
        )

        temp_file.write(cookies_content)
        temp_file.close()

        return Path(temp_file.name)


# 全局单例
cookies_pool = CookiesPool()
