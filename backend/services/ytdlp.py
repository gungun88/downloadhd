import shutil
import logging
import yt_dlp
from pathlib import Path

from core.config import settings
from utils.cookies import get_cookies_file_for_url, get_platform_from_url

logger = logging.getLogger(__name__)


def _node_path() -> str | None:
    """返回 node.js 可执行文件路径，优先使用配置项，其次自动检测"""
    configured = settings.node_path
    if configured and configured != "node":
        return configured if Path(configured).exists() else None
    found = shutil.which("node")
    return found


def _pot_available() -> bool:
    """检测 bgutil script-node provider 是否可用（需要 node.js）"""
    return _node_path() is not None


async def _get_cookies_for_url(url: str) -> tuple[Path | None, str | None]:
    """
    获取 URL 对应的 cookies
    返回: (cookies_file_path, cookie_id)
    优先从 cookies 池获取，如果池中没有则从文件系统获取
    """
    from services.cookies_pool import cookies_pool

    platform = get_platform_from_url(url)
    if not platform:
        return (None, None)

    # 1. 尝试从 cookies 池获取
    try:
        result = await cookies_pool.get_next_cookies(platform)
        if result:
            cookie_id, cookies_content = result
            # 创建临时文件
            temp_file = await cookies_pool.create_temp_cookies_file(cookies_content)
            logger.info(f"Using cookies from pool for {platform}: {cookie_id}")
            return (temp_file, cookie_id)
    except Exception as e:
        logger.warning(f"Failed to get cookies from pool: {e}")

    # 2. 如果池中没有，尝试从文件系统获取
    cookies_file = get_cookies_file_for_url(url)
    if cookies_file:
        logger.info(f"Using cookies from file system for {platform}: {cookies_file.name}")
        return (cookies_file, None)

    logger.debug(f"No cookies available for {platform}")
    return (None, None)


def _build_opts(url: str | None = None, cookies_path: Path | None = None) -> dict:
    opts: dict = {
        "quiet": True,
        "no_warnings": True,
    }

    # 使用提供的 cookies 路径
    if cookies_path:
        opts["cookiefile"] = str(cookies_path)
        logger.info(f"Using cookies: {cookies_path.name}")

    # EJS n-challenge 求解 + bgutil PO Token（都依赖 node.js）
    node = _node_path()
    if node:
        opts["js_runtimes"] = {"node": {"path": node}}
        opts["remote_components"] = ["ejs:github"]
        logger.debug("EJS 模式：使用 node 进行 n-challenge 求解")
    else:
        logger.debug("标准模式：node 不可用，部分格式可能受限")

    return opts


async def parse_video(url: str) -> dict:
    logger.info(f"Parsing video: {url}")

    platform = get_platform_from_url(url)
    cookies_path = None
    cookie_id = None

    # 第一次尝试：不使用 cookies
    try:
        logger.info("Attempting parse without cookies")
        opts = _build_opts(url, None)

        with yt_dlp.YoutubeDL(opts) as ydl:
            raw = ydl.extract_info(url, download=False)

            if raw is None:
                logger.error("Extraction returned None")
                raise ValueError("无法解析该视频")

            logger.info("Parse successful without cookies")
            info = ydl.sanitize_info(raw)
    except yt_dlp.utils.DownloadError as e:
        # 第一次失败，检查是否需要 cookies
        msg = str(e)
        clean = msg.split("ERROR:")[-1].strip()

        # 判断是否是需要登录的错误
        needs_cookies = any(keyword in clean.lower() for keyword in [
            "login", "sign in", "private", "403", "forbidden",
            "authentication", "unauthorized", "members only"
        ])

        if needs_cookies:
            logger.info("Auth error detected, retrying with cookies")
            # 获取 cookies 并重试
            cookies_path, cookie_id = await _get_cookies_for_url(url)

            if not cookies_path:
                logger.warning("No cookies available for retry")
                raise ValueError("该内容需要登录才能访问，请在 Cookies 配置页面配置对应平台的 cookies")

            try:
                opts = _build_opts(url, cookies_path)
                with yt_dlp.YoutubeDL(opts) as ydl:
                    logger.info("Retrying with cookies")
                    raw = ydl.extract_info(url, download=False)

                    if raw is None:
                        raise ValueError("无法解析该视频")

                    logger.info("Parse successful with cookies")
                    info = ydl.sanitize_info(raw)
                    # 重试成功，跳过错误处理，继续处理格式
            except yt_dlp.utils.DownloadError as retry_error:
                # 使用 cookies 后仍然失败
                if cookie_id and platform:
                    from services.cookies_pool import cookies_pool
                    try:
                        await cookies_pool.mark_failure(platform, cookie_id)
                    except Exception:
                        pass
                # 继续抛出原始错误进行处理
                e = retry_error
                # 处理错误（重试失败）
                logger.error(f"DownloadError: {repr(str(e)[:200])}")
                msg = str(e)
                clean = msg.split("ERROR:")[-1].strip()

                # 特殊错误消息处理 - 优先匹配，直接返回友好消息
                if "empty media response" in clean.lower() or "empty response" in clean.lower():
                    raise ValueError("内容不可用，该帖子可能需要登录才能访问")
                if "sent an empty" in clean.lower():
                    raise ValueError("平台返回空响应，该内容可能需要登录或已被删除")
                if "unexpected response" in clean.lower() and "webpage" in clean.lower():
                    raise ValueError("平台返回异常响应，请稍后重试")
                if "failed to extract" in clean.lower() and "player response" in clean.lower():
                    raise ValueError("视频解析失败，请稍后重试或检查链接是否正确")
                if "sign in" in clean.lower() or "bot" in clean.lower():
                    raise ValueError("平台检测到异常访问，请稍后重试")
                if "412" in clean or "precondition failed" in clean.lower():
                    raise ValueError("访问受限，请稍后重试")
                if "403" in clean or "forbidden" in clean.lower():
                    raise ValueError("访问被拒绝，该内容可能需要登录或有地区限制")
                if "404" in clean or "not found" in clean.lower():
                    raise ValueError("内容不存在或已被删除")
                if "unavailable" in clean.lower() or "not available" in clean.lower():
                    raise ValueError("视频不可用或已删除")
                if "private" in clean.lower():
                    raise ValueError("该视频为私密视频，无法解析")
                if "geo" in clean.lower() and "block" in clean.lower():
                    raise ValueError("该内容有地区限制，当前地区无法访问")

                # 如果没有匹配到特殊错误，返回通用消息
                raise ValueError("解析失败，请检查链接是否正确或稍后重试")
        else:
            # 第一次失败，但不是需要登录的错误，直接处理
            logger.error(f"DownloadError: {repr(str(e)[:200])}")
            msg = str(e)
            clean = msg.split("ERROR:")[-1].strip()

            # 特殊错误消息处理 - 优先匹配，直接返回友好消息
            if "empty media response" in clean.lower() or "empty response" in clean.lower():
                raise ValueError("内容不可用，该帖子可能需要登录才能访问")
            if "sent an empty" in clean.lower():
                raise ValueError("平台返回空响应，该内容可能需要登录或已被删除")
            if "unexpected response" in clean.lower() and "webpage" in clean.lower():
                raise ValueError("平台返回异常响应，请稍后重试")
            if "failed to extract" in clean.lower() and "player response" in clean.lower():
                raise ValueError("视频解析失败，请稍后重试或检查链接是否正确")
            if "sign in" in clean.lower() or "bot" in clean.lower():
                raise ValueError("平台检测到异常访问，请稍后重试")
            if "412" in clean or "precondition failed" in clean.lower():
                raise ValueError("访问受限，请稍后重试")
            if "403" in clean or "forbidden" in clean.lower():
                raise ValueError("访问被拒绝，该内容可能需要登录或有地区限制")
            if "404" in clean or "not found" in clean.lower():
                raise ValueError("内容不存在或已被删除")
            if "unavailable" in clean.lower() or "not available" in clean.lower():
                raise ValueError("视频不可用或已删除")
            if "private" in clean.lower():
                raise ValueError("该视频为私密视频，无法解析")
            if "geo" in clean.lower() and "block" in clean.lower():
                raise ValueError("该内容有地区限制，当前地区无法访问")

            # 如果没有匹配到特殊错误，返回通用消息
            raise ValueError("解析失败，请检查链接是否正确或稍后重试")
    except ValueError as ve:
        # ValueError 是我们自己抛出的友好错误消息，直接传播
        raise
    except Exception as e:
        # 标记 cookies 失败
        if cookie_id and platform:
            from services.cookies_pool import cookies_pool
            try:
                await cookies_pool.mark_failure(platform, cookie_id)
            except Exception:
                pass

        # 捕获所有其他异常，转换为 ValueError
        logger.error(f"{type(e).__name__}: {repr(str(e)[:200])}")
        logger.exception("Unexpected error in parse_video")
        error_msg = str(e) if str(e) else "解析过程中发生未知错误"

        # 特殊错误处理
        if "failed to extract" in error_msg.lower() and "player response" in error_msg.lower():
            raise ValueError("视频解析失败，请稍后重试或检查链接是否正确")

        # 对于其他未知错误，返回通用消息
        raise ValueError("解析过程中发生错误，请检查链接或稍后重试")

    formats = []
    logger.info(f"Processing {len(info.get('formats', []))} formats")
    try:
        for f in info.get("formats", []):
            if not f.get("url"):
                continue

            vcodec = f.get("vcodec", "none")
            acodec = f.get("acodec", "none")

            formats.append(
                {
                    "format_id": f.get("format_id"),
                    "ext": f.get("ext"),
                    "quality": f.get("height"),
                    "filesize": f.get("filesize") or f.get("filesize_approx"),
                    "vcodec": vcodec,
                    "acodec": acodec,
                    "tbr": f.get("tbr"),
                    "abr": f.get("abr"),  # 音频比特率
                    "vbr": f.get("vbr"),  # 视频比特率
                    "url": f["url"],
                    "has_video": vcodec != "none",
                    "has_audio": acodec != "none",
                    "http_headers": f.get("http_headers", {}),
                }
            )
    except Exception as e:
        logger.error(f"Error processing formats: {str(e)}")
        logger.exception("Error processing formats for url %s", url)
        raise ValueError(f"处理视频格式时出错: {str(e)}")

    # 编码兼容性评分 (越高越好)
    def codec_score(vcodec: str) -> int:
        codec_priority = {
            'h264': 100,    # 最佳兼容性
            'vp9': 80,      # 较好兼容性
            'h265': 60,     # 需要额外编解码器
            'av1': 40,      # 较新，兼容性一般
        }
        return codec_priority.get(vcodec, 0)

    def audio_codec_score(acodec: str) -> int:
        audio_priority = {
            'mp4a': 100,    # AAC - 最佳兼容性
            'opus': 90,     # OPUS - 高质量
            'mp3': 85,      # MP3 - 通用格式
            'vorbis': 70,   # Vorbis - WebM常用
            'aac': 100,     # AAC别名
        }
        return audio_priority.get(acodec, 0)

    def audio_bitrate(fmt: dict) -> int:
        """获取音频比特率，用于音频格式排序"""
        # 优先使用 abr (audio bitrate)
        if fmt.get("abr"):
            return int(fmt["abr"])
        # 其次使用 tbr (total bitrate)，对于纯音频格式这就是音频比特率
        if fmt.get("tbr") and not fmt.get("has_video"):
            return int(fmt["tbr"])
        return 0

    try:
        formats.sort(
            key=lambda x: (
                x["has_video"] and x["has_audio"],  # 优先视频+音频
                codec_score(x["vcodec"]),           # 优先兼容性好的视频编码
                audio_codec_score(x["acodec"]),     # 优先兼容性好的音频编码
                x.get("quality") or 0,              # 视频质量
                audio_bitrate(x),                   # 音频比特率
            ),
            reverse=True,
        )
    except Exception as e:
        logger.warning(f"Error sorting formats: {e}")
        # 排序失败不影响返回结果

    result = {
        "title": info.get("title"),
        "thumbnail": info.get("thumbnail"),
        "duration": info.get("duration"),
        "platform": info.get("extractor_key"),
        "uploader": info.get("uploader"),
        "formats": formats,
    }

    # 标记 cookies 成功
    if cookie_id and platform:
        from services.cookies_pool import cookies_pool
        try:
            await cookies_pool.mark_success(platform, cookie_id)
        except Exception:
            pass

    logger.info(f"Parse complete: {result['title']}, {len(formats)} formats")
    return result
