"""
Cookies 配置 API
用户可以配置自己的 cookies 到共享池
"""
import logging
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from core.limiter import limiter
from services.cookies_pool import cookies_pool
from utils.cookies import get_platform_from_url

logger = logging.getLogger(__name__)

router = APIRouter()


class CookiesConfigRequest(BaseModel):
    platform: str
    cookies: str


@router.post("/cookies")
@limiter.limit("5/hour")  # 每小时最多配置 5 次
async def configure_cookies(request: Request, data: CookiesConfigRequest):
    """
    配置 cookies 到共享池
    """
    platform = data.platform.lower()
    cookies_content = data.cookies.strip()

    if not cookies_content:
        raise HTTPException(status_code=400, detail="Cookies 内容不能为空")

    # 验证 cookies 格式（简单检查）
    if "# Netscape HTTP Cookie File" not in cookies_content:
        raise HTTPException(status_code=400, detail="Cookies 格式错误，请使用 Netscape 格式")

    # TODO: 可以添加更严格的验证，比如测试 cookies 是否有效

    try:
        result = await cookies_pool.add_cookies(platform, cookies_content)
        return result
    except Exception as e:
        logger.error(f"Failed to add cookies: {e}")
        raise HTTPException(status_code=500, detail="配置失败，请稍后重试")


@router.get("/cookies/status")
async def get_cookies_status():
    """
    获取所有平台的 cookies 池状态
    """
    try:
        statuses = await cookies_pool.get_all_status()
        return {"platforms": statuses}
    except Exception as e:
        logger.error(f"Failed to get cookies status: {e}")
        raise HTTPException(status_code=500, detail="获取状态失败")


@router.get("/cookies/status/{platform}")
async def get_platform_cookies_status(platform: str):
    """
    获取指定平台的 cookies 池状态
    """
    try:
        status = await cookies_pool.get_pool_status(platform.lower())
        return status
    except Exception as e:
        logger.error(f"Failed to get cookies status for {platform}: {e}")
        raise HTTPException(status_code=500, detail="获取状态失败")
