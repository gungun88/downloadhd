import hashlib
import logging
from datetime import datetime, timedelta

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from core.redis_client import get_redis

logger = logging.getLogger(__name__)

router = APIRouter()

# 管理员密码（实际生产环境应该使用环境变量）
ADMIN_PASSWORD = "admin888"


class AdminLoginRequest(BaseModel):
    password: str


@router.post("/login")
async def admin_login(body: AdminLoginRequest):
    """
    管理员登录
    """
    if body.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="密码错误")

    # 生成简单的 token（实际生产环境应该使用 JWT）
    token = hashlib.sha256(f"{ADMIN_PASSWORD}{datetime.now().isoformat()}".encode()).hexdigest()

    return {
        "success": True,
        "token": token,
        "message": "登录成功"
    }


@router.get("/dashboard")
async def get_dashboard(redis: aioredis.Redis | None = Depends(get_redis)):
    """
    获取管理后台仪表盘数据
    包含：概览、趋势、平台分布、Cookie状态、系统监控
    """
    if not redis:
        return {"error": "Redis 未配置"}

    try:
        today = datetime.now().date()

        # 获取今日、本周、本月统计
        today_str = today.isoformat()
        week_start = today - timedelta(days=today.weekday())
        month_start = today.replace(day=1)

        # 今日数据
        video_today = int(await redis.get(f"video:stats:{today_str}:total") or 0)
        gallery_today = int(await redis.get(f"gallery:stats:{today_str}:total") or 0)
        merge_today = int(await redis.get(f"merge:stats:{today_str}:total") or 0)

        # 本周数据
        video_week = 0
        gallery_week = 0
        merge_week = 0
        for i in range(7):
            day = week_start + timedelta(days=i)
            if day > today:
                break
            day_str = day.isoformat()
            video_week += int(await redis.get(f"video:stats:{day_str}:total") or 0)
            gallery_week += int(await redis.get(f"gallery:stats:{day_str}:total") or 0)
            merge_week += int(await redis.get(f"merge:stats:{day_str}:total") or 0)

        # 本月数据
        video_month = 0
        gallery_month = 0
        merge_month = 0
        current_day = month_start
        while current_day <= today:
            day_str = current_day.isoformat()
            video_month += int(await redis.get(f"video:stats:{day_str}:total") or 0)
            gallery_month += int(await redis.get(f"gallery:stats:{day_str}:total") or 0)
            merge_month += int(await redis.get(f"merge:stats:{day_str}:total") or 0)
            current_day += timedelta(days=1)

        # 7天趋势数据
        trends_dates = []
        trends_video = []
        trends_gallery = []
        trends_merge = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            day_str = day.isoformat()
            trends_dates.append(day_str)
            trends_video.append(int(await redis.get(f"video:stats:{day_str}:total") or 0))
            trends_gallery.append(int(await redis.get(f"gallery:stats:{day_str}:total") or 0))
            trends_merge.append(int(await redis.get(f"merge:stats:{day_str}:total") or 0))

        # 平台分布（今日）
        platforms = {
            "youtube": int(await redis.get(f"video:stats:{today_str}:youtube") or 0),
            "tiktok": int(await redis.get(f"video:stats:{today_str}:tiktok") or 0),
            "instagram": int(await redis.get(f"video:stats:{today_str}:instagram") or 0) +
                        int(await redis.get(f"gallery:stats:{today_str}:instagram") or 0),
            "twitter": int(await redis.get(f"video:stats:{today_str}:twitter") or 0),
            "facebook": int(await redis.get(f"video:stats:{today_str}:facebook") or 0),
            "xiaohongshu": int(await redis.get(f"video:stats:{today_str}:xiaohongshu") or 0),
            "other": int(await redis.get(f"video:stats:{today_str}:other") or 0) +
                    int(await redis.get(f"gallery:stats:{today_str}:other") or 0)
        }

        # Cookie 状态（从 cookies pool 获取）
        cookies_status = []
        cookie_platforms = ["youtube", "tiktok", "instagram", "twitter", "facebook", "douyin", "kuaishou", "reddit", "xiaohongshu"]
        for platform in cookie_platforms:
            try:
                # 检查 cookie 是否存在（使用正确的 key 格式）
                cookie_key = f"cookies_pool:{platform}"
                exists = await redis.exists(cookie_key)
                cookies_status.append({
                    "platform": platform,
                    "status": "online" if exists else "offline"
                })
            except:
                cookies_status.append({
                    "platform": platform,
                    "status": "unknown"
                })

        # 系统监控
        system_health = {
            "redis": True,  # 如果能执行到这里说明 Redis 正常
            "ffmpeg": check_ffmpeg_available(),
        }

        return {
            "overview": {
                "today": {
                    "video": video_today,
                    "gallery": gallery_today,
                    "merge": merge_today,
                    "total": video_today + gallery_today + merge_today
                },
                "week": {
                    "video": video_week,
                    "gallery": gallery_week,
                    "merge": merge_week,
                    "total": video_week + gallery_week + merge_week
                },
                "month": {
                    "video": video_month,
                    "gallery": gallery_month,
                    "merge": merge_month,
                    "total": video_month + gallery_month + merge_month
                }
            },
            "trends": {
                "dates": trends_dates,
                "video": trends_video,
                "gallery": trends_gallery,
                "merge": trends_merge
            },
            "platforms": platforms,
            "cookies": cookies_status,
            "system": system_health,
            "date": today_str
        }

    except Exception as e:
        logger.exception("Failed to get dashboard data")
        raise HTTPException(status_code=500, detail=f"获取仪表盘数据失败: {str(e)}")


def check_ffmpeg_available() -> bool:
    """检查 FFmpeg 是否可用"""
    import subprocess
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, timeout=2)
        return True
    except:
        return False


@router.get("/overview")
async def get_admin_overview(redis: aioredis.Redis | None = Depends(get_redis)):
    """
    获取管理后台概览数据
    返回今日的视频和图片解析统计
    """
    if not redis:
        return {
            "error": "Redis 未配置，无法获取统计信息"
        }

    try:
        today = datetime.now().date().isoformat()

        # 获取视频解析统计
        video_key = f"video:stats:{today}"
        video_total = int(await redis.get(f"{video_key}:total") or 0)
        video_youtube = int(await redis.get(f"{video_key}:youtube") or 0)
        video_tiktok = int(await redis.get(f"{video_key}:tiktok") or 0)
        video_other = int(await redis.get(f"{video_key}:other") or 0)

        # 获取图片解析统计
        gallery_key = f"gallery:stats:{today}"
        gallery_total = int(await redis.get(f"{gallery_key}:total") or 0)
        gallery_instagram = int(await redis.get(f"{gallery_key}:instagram") or 0)
        gallery_other = int(await redis.get(f"{gallery_key}:other") or 0)

        return {
            "date": today,
            "video": {
                "total": video_total,
                "youtube": video_youtube,
                "tiktok": video_tiktok,
                "other": video_other
            },
            "gallery": {
                "total": gallery_total,
                "instagram": gallery_instagram,
                "other": gallery_other
            },
            "total": video_total + gallery_total
        }

    except Exception as e:
        logger.exception("Failed to get admin overview")
        raise HTTPException(status_code=500, detail=f"获取概览失败: {str(e)}")


@router.get("/video-stats")
async def get_video_stats(redis: aioredis.Redis | None = Depends(get_redis)):
    """
    获取视频解析详细统计
    返回：今日、昨日、本周、本月的统计
    """
    if not redis:
        return {
            "error": "Redis 未配置，无法获取统计信息"
        }

    try:
        today = datetime.now().date()
        yesterday = today - timedelta(days=1)
        week_start = today - timedelta(days=today.weekday())
        month_start = today.replace(day=1)

        # 今日统计
        today_key = f"video:stats:{today.isoformat()}"
        today_data = {
            "total": int(await redis.get(f"{today_key}:total") or 0),
            "youtube": int(await redis.get(f"{today_key}:youtube") or 0),
            "tiktok": int(await redis.get(f"{today_key}:tiktok") or 0),
            "other": int(await redis.get(f"{today_key}:other") or 0),
            "date": today.isoformat()
        }

        # 昨日统计
        yesterday_key = f"video:stats:{yesterday.isoformat()}"
        yesterday_data = {
            "total": int(await redis.get(f"{yesterday_key}:total") or 0),
            "youtube": int(await redis.get(f"{yesterday_key}:youtube") or 0),
            "tiktok": int(await redis.get(f"{yesterday_key}:tiktok") or 0),
            "other": int(await redis.get(f"{yesterday_key}:other") or 0),
            "date": yesterday.isoformat()
        }

        # 本周统计
        week_total = 0
        week_youtube = 0
        week_tiktok = 0
        week_other = 0
        for i in range(7):
            day = week_start + timedelta(days=i)
            if day > today:
                break
            day_key = f"video:stats:{day.isoformat()}"
            week_total += int(await redis.get(f"{day_key}:total") or 0)
            week_youtube += int(await redis.get(f"{day_key}:youtube") or 0)
            week_tiktok += int(await redis.get(f"{day_key}:tiktok") or 0)
            week_other += int(await redis.get(f"{day_key}:other") or 0)

        # 本月统计
        month_total = 0
        month_youtube = 0
        month_tiktok = 0
        month_other = 0
        current_day = month_start
        while current_day <= today:
            day_key = f"video:stats:{current_day.isoformat()}"
            month_total += int(await redis.get(f"{day_key}:total") or 0)
            month_youtube += int(await redis.get(f"{day_key}:youtube") or 0)
            month_tiktok += int(await redis.get(f"{day_key}:tiktok") or 0)
            month_other += int(await redis.get(f"{day_key}:other") or 0)
            current_day += timedelta(days=1)

        return {
            "today": today_data,
            "yesterday": yesterday_data,
            "week": {
                "total": week_total,
                "youtube": week_youtube,
                "tiktok": week_tiktok,
                "other": week_other,
                "start_date": week_start.isoformat(),
                "end_date": today.isoformat()
            },
            "month": {
                "total": month_total,
                "youtube": month_youtube,
                "tiktok": month_tiktok,
                "other": month_other,
                "start_date": month_start.isoformat(),
                "end_date": today.isoformat()
            }
        }

    except Exception as e:
        logger.exception("Failed to get video stats")
        raise HTTPException(status_code=500, detail=f"获取视频统计失败: {str(e)}")
