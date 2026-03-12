import asyncio
import hashlib
import json
import logging
from datetime import datetime

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from core.config import settings
from core.limiter import limiter
from core.redis_client import get_redis
from services.ytdlp import parse_video

logger = logging.getLogger(__name__)

router = APIRouter()


def detect_platform(url: str) -> str:
    """检测视频平台"""
    url_lower = url.lower()
    if 'youtube.com' in url_lower or 'youtu.be' in url_lower:
        return 'youtube'
    elif 'tiktok.com' in url_lower:
        return 'tiktok'
    elif 'instagram.com' in url_lower:
        return 'instagram'
    elif 'twitter.com' in url_lower or 'x.com' in url_lower:
        return 'twitter'
    elif 'facebook.com' in url_lower or 'fb.watch' in url_lower:
        return 'facebook'
    else:
        return 'other'


def force_clean_error(error_msg: str) -> str:
    """最终强制清理，确保没有技术细节泄露"""
    import re

    # 特殊错误直接替换
    if "failed to extract" in error_msg.lower() and ("player" in error_msg.lower() or "response" in error_msg.lower()):
        return "视频解析失败，请稍后重试或检查链接是否正确"
    if "empty media response" in error_msg.lower():
        return "内容不可用，该帖子可能需要登录才能访问"
    if "412" in error_msg or "precondition failed" in error_msg.lower():
        return "访问受限，请稍后重试"

    # 移除所有技术内容
    error_msg = re.sub(r'\[[\w\+]+\]\s*', '', error_msg)
    error_msg = re.sub(r'please\s+.*', '', error_msg, flags=re.IGNORECASE)
    error_msg = re.sub(r'https?://[^\s]+', '', error_msg)
    error_msg = re.sub(r'[^.;]*\.com[^\s]*', '', error_msg)

    if not error_msg or len(error_msg.strip()) < 5:
        return "解析失败，请检查链接是否正确"

    return error_msg.strip()[:100]


def clean_error_message(error_msg: str) -> str:
    """清理错误消息，移除技术细节和敏感信息"""
    import re

    # 移除"解析失败:"前缀（如果存在）
    if error_msg.startswith("解析失败:"):
        error_msg = error_msg[5:].strip()

    # 特殊错误的优先匹配
    if "empty media response" in error_msg.lower() or "empty response" in error_msg.lower():
        return "内容不可用，该帖子可能需要登录才能访问"

    if "sent an empty" in error_msg.lower():
        return "平台返回空响应，该内容可能需要登录或已被删除"

    if "unexpected response" in error_msg.lower() and "webpage" in error_msg.lower():
        return "平台返回异常响应，请稍后重试"

    if "failed to extract" in error_msg.lower() and "player response" in error_msg.lower():
        return "视频解析失败，请稍后重试或检查链接是否正确"

    # HTTP错误代码处理
    if "HTTP Error" in error_msg or "HTTPError" in error_msg:
        if "412" in error_msg or "Precondition Failed" in error_msg:
            return "访问受限，请稍后重试"
        elif "403" in error_msg or "Forbidden" in error_msg:
            return "访问被拒绝，该内容可能需要登录或有地区限制"
        elif "404" in error_msg or "Not Found" in error_msg:
            return "内容不存在或已被删除"
        elif "429" in error_msg or "Too Many Requests" in error_msg:
            return "请求过于频繁，请稍后再试"
        elif "500" in error_msg or "502" in error_msg or "503" in error_msg:
            return "平台服务暂时不可用，请稍后重试"
        else:
            return "网络请求失败，请检查链接或稍后重试"

    # 移除所有平台标识 [xxx]
    error_msg = re.sub(r'\[[\w\+]+\]\s*', '', error_msg)

    # 移除GitHub和技术提示（更激进）
    error_msg = re.sub(r'please\s+.*', '', error_msg, flags=re.IGNORECASE)
    error_msg = re.sub(r'rt\s+this.*', '', error_msg, flags=re.IGNORECASE)
    error_msg = re.sub(r'https?://[^\s]+', '', error_msg)  # 移除所有URL
    error_msg = re.sub(r'[^.;]*\.com[^\s]*', '', error_msg)  # 移除所有.com
    error_msg = re.sub(r'Confirm\s+.*', '', error_msg, flags=re.IGNORECASE)
    error_msg = re.sub(r'Check\s+if.*', '', error_msg, flags=re.IGNORECASE)
    error_msg = re.sub(r'use\s+--.*', '', error_msg, flags=re.IGNORECASE)
    error_msg = re.sub(r'then\s+use.*', '', error_msg, flags=re.IGNORECASE)
    error_msg = re.sub(r'If\s+it\s+is.*', '', error_msg, flags=re.IGNORECASE)
    error_msg = re.sub(r'filling\s+out.*', '', error_msg, flags=re.IGNORECASE)
    error_msg = re.sub(r'for\s+the\s+\w+\.\.\.$', '', error_msg, flags=re.IGNORECASE)

    # 移除视频ID
    error_msg = re.sub(r'\b[A-Za-z0-9_-]{10,}:\s*', '', error_msg)

    # 移除分号之后的所有内容
    if ';' in error_msg:
        error_msg = error_msg.split(';')[0]

    # 移除caused by等技术细节
    if "caused by" in error_msg.lower():
        error_msg = error_msg.split("caused by")[0].strip()
    if "(caused by" in error_msg.lower():
        error_msg = error_msg.split("(caused by")[0].strip()

    # 清理多余的标点和空格
    error_msg = re.sub(r'[;,]\s*$', '', error_msg)
    error_msg = re.sub(r'\s+', ' ', error_msg)
    error_msg = error_msg.strip()
    error_msg = re.sub(r'\.\s*\.\s*\.', '', error_msg)  # 移除省略号

    # 如果错误消息为空或太短，返回通用提示
    if not error_msg or len(error_msg.strip()) < 5:
        return "解析失败，请检查链接是否正确"

    # 限制错误消息长度
    if len(error_msg) > 100:
        error_msg = error_msg[:100]

    return error_msg.strip()


class ParseRequest(BaseModel):
    url: str


@router.post("/parse")
@limiter.limit("10/minute")
async def parse_endpoint(
    request: Request,
    body: ParseRequest,
    redis: aioredis.Redis | None = Depends(get_redis),
):
    logger.info(f"Parse request from {request.client.host if request.client else 'unknown'}")
    key = f"parse:{hashlib.md5(body.url.encode()).hexdigest()}"

    try:
        # 先查缓存，命中则直接返回，避免重复解析
        if redis:
            try:
                cached = await redis.get(key)
            except Exception as e:
                # Redis 故障时不影响主流程，只打印日志
                logger.warning(f"Redis get failed: {e}")
                cached = None
            if cached:
                try:
                    logger.info("Cache hit")
                    return json.loads(cached)
                except Exception as e:
                    logger.warning(f"Cache decode failed: {e}")

        # 对解析逻辑做一次内建重试，解决部分平台（如 TikTok、YouTube shorts）
        # 第一次调用 yt-dlp 失败、第二次才成功的问题
        logger.info("Cache miss, starting parse")
        last_error: Exception | None = None
        result: dict | None = None

        for attempt in range(2):
            try:
                logger.info(f"Parse attempt {attempt + 1}/2")
                current = await parse_video(body.url)

                # 若解析成功但没有任何可用格式，也视为失败重试一次
                if not current.get("formats"):
                    logger.warning(f"No formats found on attempt {attempt + 1}")
                    raise ValueError("未找到可用的视频格式，该链接可能不支持或内容不可用")

                logger.info(f"Parse successful, {len(current.get('formats', []))} formats found")
                result = current
                break
            except ValueError as e:
                # ValueError 是预期的业务错误，直接抛出不重试
                logger.error(f"ValueError: {str(e)}")
                last_error = e
                error_str = str(e)
                clean_msg = force_clean_error(error_str)
                raise HTTPException(status_code=400, detail=clean_msg)
            except Exception as e:
                logger.error(f"Parse exception on attempt {attempt + 1}: {type(e).__name__}")
                last_error = e
                # 第一次失败，稍等片刻后重试一次
                if attempt == 0:
                    logger.info("Retrying after 0.5s")
                    await asyncio.sleep(0.5)
                    continue
                # 第二次仍失败，抛出 HTTP 错误（转成 400，避免后端 500）
                logger.error("All retry attempts failed")
                clean_msg = force_clean_error(str(e) if str(e) else "解析失败，请检查链接是否正确")
                raise HTTPException(status_code=400, detail=clean_msg)

        if result is None:
            # 理论上不会到这里，只是兜底
            logger.error("Result is None after all attempts")
            clean_msg = force_clean_error(str(last_error) if last_error else "解析失败，请稍后重试")
            raise HTTPException(status_code=400, detail=clean_msg)

        if redis:
            try:
                await redis.setex(key, settings.cache_ttl, json.dumps(result))
                logger.info("Cache set successfully")

                # 记录统计数据
                try:
                    today = datetime.now().date().isoformat()
                    platform = detect_platform(body.url)

                    # 增加今日总数
                    await redis.incr(f"video:stats:{today}:total")
                    # 增加平台计数
                    await redis.incr(f"video:stats:{today}:{platform}")
                except Exception as stats_error:
                    logger.warning(f"Failed to record stats: {stats_error}")

            except Exception as e:
                # 缓存写入失败不影响正常返回
                logger.warning(f"Cache set failed: {e}")

        logger.info("Parse completed successfully")
        return result

    except HTTPException as he:
        # 已经是 FastAPI 友好的错误，直接抛出
        raise
    except Exception as e:
        # 任何未预料到的异常，都转成 400 JSON，以避免 500 + 非 JSON 响应
        logger.exception(f"Unexpected error in /api/parse")
        clean_msg = force_clean_error(str(e) if str(e) else "服务器内部错误，请稍后重试")
        raise HTTPException(status_code=400, detail=clean_msg)
