import asyncio
import hashlib
import json
import logging
import subprocess
import time
from datetime import datetime

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
import instaloader

from core.config import settings
from core.limiter import limiter
from core.redis_client import get_redis

logger = logging.getLogger(__name__)

router = APIRouter()


def detect_gallery_platform(url: str) -> str:
    """检测图片平台"""
    url_lower = url.lower()
    if 'instagram.com' in url_lower:
        return 'instagram'
    elif 'pinterest.com' in url_lower:
        return 'pinterest'
    elif 'twitter.com' in url_lower or 'x.com' in url_lower:
        return 'twitter'
    else:
        return 'other'

_last_instagram_request_time = 0
_instagram_request_lock = asyncio.Lock()


async def parse_instagram_with_instaloader(url: str, cookies_file_path: str | None = None) -> dict:
    """
    使用 Instaloader 解析 Instagram 图集
    返回格式与 gallery-dl 一致
    """
    import re
    import os
    from PIL import Image
    import io
    import requests

    def get_image_dimensions(image_url: str) -> tuple[int, int]:
        """获取图片尺寸（同步方式）"""
        try:
            logger.info(f"[INSTALOADER] Getting dimensions for: {image_url[:80]}...")
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Referer': 'https://www.instagram.com/',
            }
            response = requests.get(image_url, headers=headers, timeout=10, stream=True)
            logger.info(f"[INSTALOADER] Response status: {response.status_code}")
            if response.status_code == 200:
                # 只读取前 16KB 来获取图片头部信息
                chunk = response.raw.read(16384)
                logger.info(f"[INSTALOADER] Read {len(chunk)} bytes")
                img = Image.open(io.BytesIO(chunk))
                size = img.size
                logger.info(f"[INSTALOADER] Image dimensions: {size}")
                return size
        except Exception as e:
            logger.warning(f"[INSTALOADER] Failed to get image dimensions: {e}")
        return (0, 0)

    try:
        # 提取 shortcode
        shortcode_match = re.search(r'/p/([A-Za-z0-9_-]+)', url)
        if not shortcode_match:
            raise ValueError("无法从 URL 中提取 Instagram shortcode")

        shortcode = shortcode_match.group(1)
        logger.info(f"[INSTALOADER] Parsing Instagram post: {shortcode}")

        # 创建 Instaloader 实例
        L = instaloader.Instaloader(
            download_videos=False,
            download_video_thumbnails=False,
            download_geotags=False,
            download_comments=False,
            save_metadata=False,
            compress_json=False,
            post_metadata_txt_pattern='',
            quiet=True
        )

        # 如果有 cookies 文件，尝试加载 session
        if cookies_file_path and os.path.exists(cookies_file_path):
            try:
                # Instaloader 使用自己的 session 格式，不能直接使用 Netscape cookies
                # 这里我们跳过 cookies，直接尝试匿名访问
                logger.info("[INSTALOADER] Attempting anonymous access (cookies not supported)")
            except Exception as e:
                logger.warning(f"[INSTALOADER] Failed to load session: {e}")

        # 获取帖子信息
        loop = asyncio.get_running_loop()
        post = await loop.run_in_executor(
            None,
            lambda: instaloader.Post.from_shortcode(L.context, shortcode)
        )

        # 提取图片信息
        images = []

        if post.typename == 'GraphSidecar':
            # 多图帖子
            for node in post.get_sidecar_nodes():
                if node.is_video:
                    continue

                # 获取图片尺寸
                width, height = get_image_dimensions(node.display_url)

                images.append({
                    "url": node.display_url,
                    "filename": f"{shortcode}_{len(images) + 1}",
                    "extension": "jpg",
                    "width": width,
                    "height": height,
                })
        elif post.typename == 'GraphImage':
            # 单图帖子
            width, height = get_image_dimensions(post.url)

            images.append({
                "url": post.url,
                "filename": shortcode,
                "extension": "jpg",
                "width": width,
                "height": height,
            })
        else:
            # 视频帖子
            raise ValueError("这是视频帖子，请使用「视频解析」功能")

        if not images:
            raise ValueError("未找到可下载的图片")

        # 构建返回结果
        result = {
            "title": post.caption[:100] if post.caption else shortcode,
            "author": post.owner_username,
            "images": images,
            "count": len(images)
        }

        logger.info(f"[INSTALOADER] Successfully parsed {len(images)} images")
        return result

    except instaloader.exceptions.InstaloaderException as e:
        error_msg = str(e)
        if "login" in error_msg.lower() or "private" in error_msg.lower():
            raise ValueError("该 Instagram 内容需要登录或为私密内容")
        elif "not found" in error_msg.lower():
            raise ValueError("Instagram 内容不存在或已被删除")
        else:
            raise ValueError(f"Instaloader 解析失败: {error_msg}")
    except ValueError:
        raise
    except Exception as e:
        logger.exception(f"[INSTALOADER] Unexpected error: {e}")
        raise ValueError(f"Instaloader 解析失败: {str(e)}")


class GalleryParseRequest(BaseModel):
    url: str
    cookies: str | None = None  # 可选的 cookies 字符串（Netscape 格式）
    username: str | None = None  # 可选的 Instagram 用户名
    password: str | None = None  # 可选的 Instagram 密码


async def parse_gallery_async(url: str, cookies: str | None = None, username: str | None = None, password: str | None = None) -> dict:
    """
    使用 gallery-dl 解析图集链接（异步版本，支持 cookies 池）
    策略：先不用 cookies 尝试，失败后自动用 cookies 重试
    返回格式：
    {
        "title": "图集标题",
        "author": "作者",
        "images": [
            {
                "url": "图片直链",
                "filename": "文件名",
                "extension": "扩展名",
                "width": 宽度,
                "height": 高度
            }
        ]
    }
    """
    from services.cookies_pool import cookies_pool
    from utils.cookies import get_platform_from_url
    import tempfile
    import os

    cookies_file_path = None
    cookie_id = None
    platform = get_platform_from_url(url)

    # 辅助函数：执行 gallery-dl 命令
    async def _run_gallery_dl(cmd: list[str]) -> subprocess.CompletedProcess:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None,
            lambda: subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30,
                encoding="utf-8"
            )
        )

    # 辅助函数：获取 cookies
    async def _get_cookies() -> tuple[str | None, str | None]:
        nonlocal cookies_file_path, cookie_id

        # 如果用户提供了 cookies，写入临时文件
        if cookies:
            cookies_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt')
            cookies_file.write(cookies)
            cookies_file.close()
            return (cookies_file.name, None)

        # 尝试从 cookies 池获取
        if platform:
            try:
                result = await cookies_pool.get_next_cookies(platform)
                if result:
                    cookie_id_temp, cookies_content = result
                    temp_file = await cookies_pool.create_temp_cookies_file(cookies_content)
                    logger.info(f"Using cookies from pool for {platform}: {cookie_id_temp}")
                    return (str(temp_file), cookie_id_temp)
            except Exception as e:
                logger.warning(f"Failed to get cookies from pool: {e}")

        # 尝试从文件系统获取
        if platform:
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            server_cookie_path = os.path.join(backend_dir, "cookies", f"{platform}.txt")
            if os.path.exists(server_cookie_path):
                logger.info(f"Using server cookie for {platform}: {server_cookie_path}")
                return (server_cookie_path, None)

        return (None, None)

    try:
        # 第一次尝试：不使用 cookies（除非用户提供了用户名密码）
        cmd = ["gallery-dl", "--dump-json"]

        if username and password:
            # 用户提供了用户名密码，直接使用
            cmd.extend(["--username", username, "--password", password])
            logger.info(f"[GALLERY_PARSE_ATTEMPT_1] Using username/password")
        else:
            logger.info(f"[GALLERY_PARSE_ATTEMPT_1] Trying without cookies")

        cmd.append(url)

        # 执行第一次尝试
        result = await _run_gallery_dl(cmd)
        output = result.stdout.strip()
        error_output = result.stderr.strip() if result.stderr else ""

        # 检查是否需要 cookies（第一次失败）
        needs_cookies = False
        if not output or result.returncode != 0:
            # 判断是否是需要登录的错误
            needs_cookies = any(keyword in error_output.lower() for keyword in [
                "login", "authentication", "403", "forbidden",
                "unauthorized", "401", "private", "requires login"
            ])

            if needs_cookies and not username:  # 如果已经用了用户名密码就不重试了
                logger.info(f"[GALLERY_PARSE_RETRY] First attempt failed with auth error, retrying with cookies")
                # 获取 cookies 并重试
                cookies_file_path, cookie_id = await _get_cookies()

                if not cookies_file_path:
                    logger.warning(f"[GALLERY_PARSE_NO_COOKIES] No cookies available for retry")
                    raise ValueError("该内容需要登录才能访问，请在 Cookies 配置页面配置对应平台的 cookies")

                # 重新构建命令（使用 cookies）
                cmd = ["gallery-dl", "--dump-json", "--cookies", cookies_file_path, url]
                logger.info(f"[GALLERY_PARSE_ATTEMPT_2] Retrying with cookies")

                # 执行第二次尝试
                result = await _run_gallery_dl(cmd)
                output = result.stdout.strip()
                error_output = result.stderr.strip() if result.stderr else ""

        # 检查输出内容
        if not output:
            # 标记 cookies 失败（如果使用了 cookies）
            if cookie_id and platform:
                try:
                    await cookies_pool.mark_failure(platform, cookie_id)
                except Exception:
                    pass

            # 清理和友好化错误信息
            if "Unsupported URL" in error_output or "unsupported" in error_output.lower():
                raise ValueError("不支持的链接格式。请确认链接来自支持的平台（Twitter、Instagram、Pinterest 等）")
            elif "401" in error_output or "unauthorized" in error_output.lower():
                if "instagram" in url.lower():
                    # Instagram 401 错误，尝试使用 Instaloader 作为备选方案
                    logger.info("[GALLERY_PARSE_FALLBACK] gallery-dl failed with 401, trying Instaloader")
                    try:
                        return await parse_instagram_with_instaloader(url, cookies_file_path)
                    except ValueError as insta_err:
                        # Instaloader 也失败了，返回综合错误信息
                        raise ValueError(f"Instagram 图片下载失败。gallery-dl 和 Instaloader 均无法访问。建议：1) 如果是视频，请使用「视频解析」功能；2) 尝试其他平台的图集（Twitter、Pinterest 等）。详细错误: {str(insta_err)}")
                raise ValueError("认证失败，请在 Cookies 配置页面重新配置对应平台的 cookies")
            elif "login" in error_output.lower() or "authentication" in error_output.lower():
                raise ValueError("该内容需要登录才能访问。请在 Cookies 配置页面配置对应平台的 cookies")
            elif "404" in error_output or "not found" in error_output.lower():
                raise ValueError("内容不存在或已被删除。请检查链接是否正确")
            elif "403" in error_output or "forbidden" in error_output.lower():
                raise ValueError("访问被拒绝。该内容可能有访问限制或需要登录")
            elif "timeout" in error_output.lower():
                raise ValueError("请求超时，请稍后重试")
            elif "connection" in error_output.lower() or "network" in error_output.lower():
                raise ValueError("网络连接失败，请检查网络或稍后重试")
            else:
                # 通用错误提示，不显示原始日志
                raise ValueError("解析失败，请检查链接是否正确。支持的平台：Twitter、Instagram、Pinterest 等图片社交平台")

        # 标记 cookies 成功
        if cookie_id and platform:
            try:
                await cookies_pool.mark_success(platform, cookie_id)
            except Exception:
                pass

        # 过滤掉日志行（以 [ 开头的是日志）
        json_lines = []
        for line in output.split("\n"):
            line = line.strip()
            if line and not line.startswith("[twitter]") and not line.startswith("[instagram]"):
                json_lines.append(line)

        # 尝试解析为完整的 JSON 数组
        try:
            full_json = "\n".join(json_lines)
            data_list = json.loads(full_json)
        except json.JSONDecodeError:
            # 如果不是完整 JSON，尝试逐行解析
            data_list = []
            for line in json_lines:
                try:
                    data_list.append(json.loads(line))
                except json.JSONDecodeError:
                    continue

        if not data_list:
            raise ValueError("未找到可下载的图片。该链接可能不包含图片内容，或需要登录才能访问")

        images = []
        title = ""
        author = ""

        for data in data_list:
            # gallery-dl 返回格式可能是 [code, data] 或直接是 data
            actual_data = data
            image_url = None

            if isinstance(data, list):
                if len(data) == 2:
                    code, content = data
                    if code == -1:
                        # 错误信息
                        if isinstance(content, dict):
                            error_msg = content.get("message", "")
                            if "login" in error_msg.lower():
                                # 如果是 Instagram 链接，尝试使用 Instaloader
                                if "instagram" in url.lower():
                                    logger.info("[GALLERY_PARSE_FALLBACK] gallery-dl requires login, trying Instaloader")
                                    try:
                                        return await parse_instagram_with_instaloader(url, cookies_file_path)
                                    except ValueError as insta_err:
                                        raise ValueError(f"Instagram 图片下载失败。gallery-dl 和 Instaloader 均无法访问。建议：1) 如果是视频，请使用「视频解析」功能；2) 尝试其他平台的图集（Twitter、Pinterest 等）。详细错误: {str(insta_err)}")
                                raise ValueError("该内容需要登录才能访问，请在 Cookies 配置页面配置对应平台的 cookies")
                            raise ValueError(f"解析失败: {error_msg}")
                    elif code == 2:
                        # 正常数据，code=2 表示元数据
                        actual_data = content
                    else:
                        # 其他代码，跳过
                        continue
                elif len(data) == 3:
                    # Twitter 格式: [3, "图片URL", {metadata}]
                    code, url_str, metadata = data
                    if code == 3 and isinstance(url_str, str):
                        image_url = url_str
                        actual_data = metadata if isinstance(metadata, dict) else {}

            # 确保 actual_data 是字典
            if not isinstance(actual_data, dict):
                continue

            # 提取标题和作者（从第一条记录）
            if not title:
                title = actual_data.get("title", "") or actual_data.get("description", "") or actual_data.get("post_shortcode", "") or actual_data.get("content", "")
            if not author:
                author_obj = actual_data.get("author")
                if isinstance(author_obj, dict):
                    author = author_obj.get("name", "") or author_obj.get("nick", "")
                elif isinstance(author_obj, str):
                    author = author_obj
                if not author:
                    author = actual_data.get("username", "") or actual_data.get("uploader", "") or actual_data.get("owner_username", "")

            # 如果没有从 [3, url, metadata] 格式中提取到 URL，尝试从 actual_data 中获取
            if not image_url:
                image_url = actual_data.get("url", "")

            # 提取图片信息
            if image_url and (image_url.startswith("https://") or image_url.startswith("http://")):
                # 检查是否是图片 URL
                is_image = (
                    any(image_url.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".gif", ".webp"]) or
                    "pbs.twimg.com" in image_url or  # Twitter 图片
                    "cdninstagram.com" in image_url or  # Instagram 图片
                    "scontent" in image_url or  # Facebook/Instagram CDN
                    "format=jpg" in image_url or  # Twitter 图片格式参数
                    "format=png" in image_url or
                    actual_data.get("category") in ["twitter", "instagram", "pinterest"]  # 来自图片平台
                )
                if is_image:
                    images.append({
                        "url": image_url,
                        "filename": actual_data.get("filename", "image"),
                        "extension": actual_data.get("extension", "jpg"),
                        "width": actual_data.get("width", 0),
                        "height": actual_data.get("height", 0),
                    })

        if not images:
            raise ValueError("未找到可下载的图片。该链接可能不包含图片内容，或需要登录才能访问")

        return {
            "title": title or "未知标题",
            "author": author or "未知作者",
            "images": images,
            "count": len(images)
        }

    except subprocess.TimeoutExpired:
        # 标记 cookies 失败
        if cookie_id and platform:
            try:
                await cookies_pool.mark_failure(platform, cookie_id)
            except Exception:
                pass
        raise ValueError("解析超时，请稍后重试")
    except FileNotFoundError:
        raise ValueError("gallery-dl 未安装或未找到")
    except ValueError:
        # 重新抛出 ValueError，保留原始错误信息
        raise
    except Exception as e:
        # 标记 cookies 失败
        if cookie_id and platform:
            try:
                await cookies_pool.mark_failure(platform, cookie_id)
            except Exception:
                pass
        logger.exception("parse_gallery error for url %s", url)
        raise ValueError(f"解析失败: {str(e)}")
    finally:
        # 清理临时 cookies 文件
        if cookies_file_path and os.path.exists(cookies_file_path):
            try:
                os.unlink(cookies_file_path)
            except:
                pass


def parse_gallery(url: str, cookies: str | None = None, username: str | None = None, password: str | None = None) -> dict:
    """
    使用 gallery-dl 解析图集链接
    返回格式：
    {
        "title": "图集标题",
        "author": "作者",
        "images": [
            {
                "url": "图片直链",
                "filename": "文件名",
                "extension": "扩展名",
                "width": 宽度,
                "height": 高度
            }
        ]
    }
    """
    try:
        # 构建命令
        cmd = ["gallery-dl", "--dump-json"]

        # 检测是否是 Instagram 链接
        is_instagram = "instagram.com" in url.lower()

        # 如果用户提供了用户名和密码
        if username and password:
            cmd.extend(["--username", username, "--password", password])
        # 如果用户提供了 cookies，写入临时文件
        elif cookies:
            import tempfile
            import os
            cookies_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt')
            cookies_file.write(cookies)
            cookies_file.close()
            cmd.extend(["--cookies", cookies_file.name])
        # 如果是 Instagram 链接，尝试使用服务器 cookie 文件
        elif is_instagram:
            import os
            # 使用绝对路径
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            server_cookie_path = os.path.join(backend_dir, "cookies", "instagram.txt")
            if os.path.exists(server_cookie_path):
                cmd.extend(["--cookies", server_cookie_path])
                logger.info("Using server Instagram cookie: %s", server_cookie_path)
            else:
                logger.warning("Server Instagram cookie not found at: %s", server_cookie_path)
                raise ValueError("Instagram 图片需要登录才能访问。请联系管理员配置 Instagram cookie")
        else:
            # 其他平台不需要 cookies
            pass

        cmd.append(url)

        # 使用 gallery-dl 的 JSON 输出模式
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30,
            encoding="utf-8"
        )

        # 清理临时 cookies 文件
        if cookies and 'cookies_file' in locals():
            try:
                import os
                os.unlink(cookies_file.name)
            except:
                pass

        # 检查输出内容
        output = result.stdout.strip()

        # 如果输出为空，检查错误信息
        if not output:
            error_output = result.stderr.strip() if result.stderr else ""

            # 清理和友好化错误信息
            if "Unsupported URL" in error_output or "unsupported" in error_output.lower():
                raise ValueError("不支持的链接格式。请确认链接来自支持的平台（Twitter、Instagram、Pinterest 等）")
            elif "login" in error_output.lower() or "authentication" in error_output.lower():
                raise ValueError("该内容需要登录才能访问。请尝试其他公开内容的链接")
            elif "404" in error_output or "not found" in error_output.lower():
                raise ValueError("内容不存在或已被删除。请检查链接是否正确")
            elif "403" in error_output or "forbidden" in error_output.lower():
                raise ValueError("访问被拒绝。该内容可能有访问限制或需要登录")
            elif "timeout" in error_output.lower():
                raise ValueError("请求超时，请稍后重试")
            elif "connection" in error_output.lower() or "network" in error_output.lower():
                raise ValueError("网络连接失败，请检查网络或稍后重试")
            else:
                # 通用错误提示，不显示原始日志
                raise ValueError("解析失败，请检查链接是否正确。支持的平台：Twitter、Instagram、Pinterest 等图片社交平台")

        # 过滤掉日志行（以 [ 开头的是日志）
        json_lines = []
        for line in output.split("\n"):
            line = line.strip()
            if line and not line.startswith("[twitter]") and not line.startswith("[instagram]"):
                json_lines.append(line)

        # 尝试解析为完整的 JSON 数组
        try:
            full_json = "\n".join(json_lines)
            data_list = json.loads(full_json)
        except json.JSONDecodeError:
            # 如果不是完整 JSON，尝试逐行解析
            data_list = []
            for line in json_lines:
                try:
                    data_list.append(json.loads(line))
                except json.JSONDecodeError:
                    continue

        if not data_list:
            raise ValueError("未找到可下载的图片。该链接可能不包含图片内容，或需要登录才能访问")

        images = []
        title = ""
        author = ""

        for data in data_list:
            # gallery-dl 返回格式可能是 [code, data] 或直接是 data
            actual_data = data
            image_url = None

            if isinstance(data, list):
                if len(data) == 2:
                    code, content = data
                    if code == -1:
                        # 错误信息
                        if isinstance(content, dict):
                            error_msg = content.get("message", "")
                            if "login" in error_msg.lower():
                                raise ValueError("Instagram 图片需要登录才能访问。建议：\n1. 如果是视频帖子，请使用「视频解析」功能\n2. 尝试其他平台的图集链接（Twitter、Pinterest 等）")
                            raise ValueError(f"解析失败: {error_msg}")
                    elif code == 2:
                        # 正常数据，code=2 表示元数据
                        actual_data = content
                    else:
                        # 其他代码，跳过
                        continue
                elif len(data) == 3:
                    # Twitter 格式: [3, "图片URL", {metadata}]
                    code, url, metadata = data
                    if code == 3 and isinstance(url, str):
                        image_url = url
                        actual_data = metadata if isinstance(metadata, dict) else {}

            # 确保 actual_data 是字典
            if not isinstance(actual_data, dict):
                continue

            # 提取标题和作者（从第一条记录）
            if not title:
                title = actual_data.get("title", "") or actual_data.get("description", "") or actual_data.get("post_shortcode", "") or actual_data.get("content", "")
            if not author:
                author_obj = actual_data.get("author")
                if isinstance(author_obj, dict):
                    author = author_obj.get("name", "") or author_obj.get("nick", "")
                elif isinstance(author_obj, str):
                    author = author_obj
                if not author:
                    author = actual_data.get("username", "") or actual_data.get("uploader", "") or actual_data.get("owner_username", "")

            # 如果没有从 [3, url, metadata] 格式中提取到 URL，尝试从 actual_data 中获取
            if not image_url:
                image_url = actual_data.get("url", "")

            # 提取图片信息
            if image_url and (image_url.startswith("https://") or image_url.startswith("http://")):
                # 检查是否是图片 URL
                is_image = (
                    any(image_url.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".gif", ".webp"]) or
                    "pbs.twimg.com" in image_url or  # Twitter 图片
                    "cdninstagram.com" in image_url or  # Instagram 图片
                    "scontent" in image_url or  # Facebook/Instagram CDN
                    "format=jpg" in image_url or  # Twitter 图片格式参数
                    "format=png" in image_url or
                    actual_data.get("category") in ["twitter", "instagram", "pinterest"]  # 来自图片平台
                )
                if is_image:
                    images.append({
                        "url": image_url,
                        "filename": actual_data.get("filename", "image"),
                        "extension": actual_data.get("extension", "jpg"),
                        "width": actual_data.get("width", 0),
                        "height": actual_data.get("height", 0),
                    })

        if not images:
            raise ValueError("未找到可下载的图片。该链接可能不包含图片内容，或需要登录才能访问")

        return {
            "title": title or "未知标题",
            "author": author or "未知作者",
            "images": images,
            "count": len(images)
        }

    except subprocess.TimeoutExpired:
        raise ValueError("解析超时，请稍后重试")
    except FileNotFoundError:
        raise ValueError("gallery-dl 未安装或未找到")
    except ValueError:
        # 重新抛出 ValueError，保留原始错误信息
        raise
    except Exception as e:
        logger.exception("parse_gallery error for url %s", url)
        raise ValueError(f"解析失败: {str(e)}")


@router.get("/instagram-cookie-status")
async def check_instagram_cookie_status():
    """
    检查 Instagram cookie 状态
    返回：cookie 是否存在、是否有效
    """
    import os
    import datetime

    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cookie_path = os.path.join(backend_dir, "cookies", "instagram.txt")

    if not os.path.exists(cookie_path):
        return {
            "exists": False,
            "valid": False,
            "message": "Cookie 文件不存在"
        }

    # 检查文件修改时间
    mtime = os.path.getmtime(cookie_path)
    modified_date = datetime.datetime.fromtimestamp(mtime)
    days_old = (datetime.datetime.now() - modified_date).days

    # 简单测试：尝试解析一个公开的 Instagram 帖子
    test_url = "https://www.instagram.com/p/DVgO8v3k4Cq/"
    try:
        result = subprocess.run(
            ["gallery-dl", "--cookies", cookie_path, "--dump-json", test_url],
            capture_output=True,
            text=True,
            timeout=10,
            encoding="utf-8"
        )

        # 检查是否成功解析
        if result.returncode == 0 and result.stdout.strip():
            output = result.stdout.strip()
            # 检查是否包含登录错误
            if "login" in output.lower() or "redirect" in output.lower():
                valid = False
                message = "Cookie 已过期，需要重新导出"
            else:
                valid = True
                message = f"Cookie 有效（已使用 {days_old} 天）"
        else:
            valid = False
            message = "Cookie 可能已过期"
    except Exception as e:
        valid = False
        message = f"检测失败: {str(e)}"

    return {
        "exists": True,
        "valid": valid,
        "days_old": days_old,
        "modified_date": modified_date.isoformat(),
        "message": message
    }


@router.post("/update-instagram-cookie")
async def update_instagram_cookie(request: Request):
    """
    更新 Instagram cookie
    需要管理员权限（可以通过 API key 或其他方式验证）
    """
    import os

    # TODO: 添加身份验证，确保只有管理员可以调用
    # 例如：检查 Authorization header

    try:
        body = await request.json()
        cookie_content = body.get("cookie")

        if not cookie_content:
            raise HTTPException(status_code=400, detail="Cookie 内容不能为空")

        # 验证 cookie 格式（简单检查）
        if not cookie_content.startswith("# Netscape HTTP Cookie File"):
            raise HTTPException(status_code=400, detail="Cookie 格式不正确，请使用 Netscape 格式")

        # 保存 cookie
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        cookie_dir = os.path.join(backend_dir, "cookies")
        os.makedirs(cookie_dir, exist_ok=True)

        cookie_path = os.path.join(cookie_dir, "instagram.txt")

        # 备份旧 cookie
        if os.path.exists(cookie_path):
            backup_path = cookie_path + ".backup"
            import shutil
            shutil.copy2(cookie_path, backup_path)
            logger.info("Backed up old cookie to: %s", backup_path)

        # 写入新 cookie
        with open(cookie_path, 'w', encoding='utf-8') as f:
            f.write(cookie_content)

        logger.info("Instagram cookie updated successfully")

        return {
            "success": True,
            "message": "Cookie 更新成功"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to update Instagram cookie")
        raise HTTPException(status_code=500, detail=f"更新失败: {str(e)}")


@router.get("/gallery-stats")
async def get_gallery_stats(redis: aioredis.Redis | None = Depends(get_redis)):
    """
    获取图片解析统计信息
    返回：今日、昨日、本周、本月的解析次数
    """
    import datetime

    if not redis:
        return {
            "error": "Redis 未配置，无法获取统计信息"
        }

    try:
        today = datetime.date.today()
        yesterday = today - datetime.timedelta(days=1)
        week_start = today - datetime.timedelta(days=today.weekday())
        month_start = today.replace(day=1)

        # 获取各时间段的统计
        today_key = f"gallery:stats:{today.isoformat()}"
        yesterday_key = f"gallery:stats:{yesterday.isoformat()}"

        today_total = await redis.get(f"{today_key}:total") or 0
        today_instagram = await redis.get(f"{today_key}:instagram") or 0
        today_other = await redis.get(f"{today_key}:other") or 0

        yesterday_total = await redis.get(f"{yesterday_key}:total") or 0
        yesterday_instagram = await redis.get(f"{yesterday_key}:instagram") or 0

        # 计算本周统计
        week_total = 0
        week_instagram = 0
        for i in range(7):
            day = week_start + datetime.timedelta(days=i)
            if day > today:
                break
            day_key = f"gallery:stats:{day.isoformat()}"
            week_total += int(await redis.get(f"{day_key}:total") or 0)
            week_instagram += int(await redis.get(f"{day_key}:instagram") or 0)

        # 计算本月统计
        month_total = 0
        month_instagram = 0
        current_day = month_start
        while current_day <= today:
            day_key = f"gallery:stats:{current_day.isoformat()}"
            month_total += int(await redis.get(f"{day_key}:total") or 0)
            month_instagram += int(await redis.get(f"{day_key}:instagram") or 0)
            current_day += datetime.timedelta(days=1)

        return {
            "today": {
                "total": int(today_total),
                "instagram": int(today_instagram),
                "other": int(today_other),
                "date": today.isoformat()
            },
            "yesterday": {
                "total": int(yesterday_total),
                "instagram": int(yesterday_instagram),
                "date": yesterday.isoformat()
            },
            "week": {
                "total": week_total,
                "instagram": week_instagram,
                "start_date": week_start.isoformat(),
                "end_date": today.isoformat()
            },
            "month": {
                "total": month_total,
                "instagram": month_instagram,
                "start_date": month_start.isoformat(),
                "end_date": today.isoformat()
            }
        }

    except Exception as e:
        logger.exception("Failed to get gallery stats")
        raise HTTPException(status_code=500, detail=f"获取统计失败: {str(e)}")


@router.post("/parse-gallery")
@limiter.limit("10/minute")
async def parse_gallery_endpoint(
    request: Request,
    body: GalleryParseRequest,
    redis: aioredis.Redis | None = Depends(get_redis),
):
    key = f"gallery:{hashlib.md5(body.url.encode()).hexdigest()}"

    try:
        # 先查缓存
        if redis:
            try:
                cached = await redis.get(key)
            except Exception as e:
                logger.warning("Redis get failed for key %s: %s", key, e)
                cached = None
            if cached:
                try:
                    return json.loads(cached)
                except Exception as e:
                    logger.warning("Redis cached value decode failed for key %s: %s", key, e)

        # Instagram 请求频率限制（全局锁，确保请求间隔至少 2 秒）
        is_instagram = "instagram.com" in body.url.lower()
        if is_instagram:
            global _last_instagram_request_time
            async with _instagram_request_lock:
                current_time = time.time()
                time_since_last_request = current_time - _last_instagram_request_time
                if time_since_last_request < 2.0:
                    wait_time = 2.0 - time_since_last_request
                    logger.info("Instagram rate limit: waiting %.2f seconds", wait_time)
                    await asyncio.sleep(wait_time)
                _last_instagram_request_time = time.time()

        # 调用 gallery-dl 解析（使用异步版本）
        result = await parse_gallery_async(body.url, body.cookies, body.username, body.password)

        # 记录统计信息
        if redis:
            try:
                import datetime
                today = datetime.date.today().isoformat()
                stats_key = f"gallery:stats:{today}"

                # 增加总数
                await redis.incr(f"{stats_key}:total")
                # 设置过期时间（保留 90 天）
                await redis.expire(f"{stats_key}:total", 90 * 24 * 3600)

                # 根据平台分类统计
                if is_instagram:
                    await redis.incr(f"{stats_key}:instagram")
                    await redis.expire(f"{stats_key}:instagram", 90 * 24 * 3600)
                else:
                    await redis.incr(f"{stats_key}:other")
                    await redis.expire(f"{stats_key}:other", 90 * 24 * 3600)
            except Exception as e:
                logger.warning("Failed to record stats: %s", e)

        # 写入缓存
        if redis:
            try:
                await redis.setex(key, settings.cache_ttl, json.dumps(result))
            except Exception as e:
                logger.warning("Redis setex failed for key %s: %s", key, e)

        return result

    except ValueError as e:
        # 业务错误，返回 400
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # 未预料的错误
        logger.exception("Unexpected error in /api/parse-gallery for url %s", body.url)
        error_msg = str(e) if str(e) else "服务器内部错误，请稍后重试"
        raise HTTPException(status_code=400, detail=error_msg)
