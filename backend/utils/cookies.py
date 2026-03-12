"""
Cookies 管理工具
统一管理各平台的 cookies 文件和 cookies 池
"""
import logging
from pathlib import Path
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# 平台域名到标准平台名的映射
PLATFORM_NAME_MAP = {
    "youtube.com": "youtube",
    "youtu.be": "youtube",
    "instagram.com": "instagram",
    "tiktok.com": "tiktok",
    "facebook.com": "facebook",
    "fb.com": "facebook",
    "twitter.com": "twitter",
    "x.com": "twitter",
    "reddit.com": "reddit",
    "douyin.com": "douyin",
    "kuaishou.com": "kuaishou",
    "xiaohongshu.com": "xiaohongshu",
    "xhslink.com": "xiaohongshu",
}


def get_cookies_dir() -> Path:
    """获取 cookies 目录路径"""
    return Path(__file__).parent.parent / "cookies"


def get_platform_from_url(url: str) -> str | None:
    """
    从 URL 中提取标准平台名
    例如: https://www.instagram.com/p/xxx -> "instagram"
    """
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        # 移除 www. 前缀
        if domain.startswith("www."):
            domain = domain[4:]

        # 返回标准平台名
        return PLATFORM_NAME_MAP.get(domain)
    except Exception as e:
        logger.warning(f"Failed to parse URL {url}: {e}")
        return None


def get_cookies_file_for_url(url: str) -> Path | None:
    """
    根据 URL 获取对应的 cookies 文件路径（从文件系统）
    如果平台不需要 cookies 或文件不存在，返回 None
    这个函数用于从 backend/cookies/ 目录读取管理员配置的 cookies
    """
    platform = get_platform_from_url(url)
    if not platform:
        return None

    cookies_filename = f"{platform}.txt"
    cookies_path = get_cookies_dir() / cookies_filename

    if not cookies_path.exists():
        logger.debug(f"Cookies file not found for {platform}: {cookies_path}")
        return None

    logger.info(f"Using cookies file for {platform}: {cookies_path}")
    return cookies_path


def get_all_cookies_merged() -> Path | None:
    """
    合并所有平台的 cookies 到一个临时文件
    用于需要多平台 cookies 的场景
    """
    import tempfile

    cookies_dir = get_cookies_dir()
    if not cookies_dir.exists():
        return None

    # 收集所有 cookies 文件
    cookie_files = list(cookies_dir.glob("*.txt"))
    if not cookie_files:
        return None

    # 创建临时合并文件
    temp_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt', prefix='merged_cookies_')

    # 写入头部
    temp_file.write("# Netscape HTTP Cookie File\n")
    temp_file.write("# Merged from multiple platform cookies\n\n")

    # 合并所有 cookies
    for cookie_file in cookie_files:
        try:
            with open(cookie_file, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                # 跳过注释行
                for line in lines:
                    if line.strip() and not line.startswith('#'):
                        temp_file.write(line)
        except Exception as e:
            logger.warning(f"Failed to read cookies from {cookie_file}: {e}")

    temp_file.close()
    logger.info(f"Merged cookies file created: {temp_file.name}")
    return Path(temp_file.name)
