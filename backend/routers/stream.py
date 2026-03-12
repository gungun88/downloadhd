import asyncio
import queue
import subprocess
import sys
import threading
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from core.config import settings
from core.limiter import limiter
from services.ytdlp import _node_path
from utils.cookies import get_cookies_file_for_url

router = APIRouter()


def _build_ytdlp_cmd(source_url: str, format_id: str) -> list[str]:
    """构建 yt-dlp 命令，输出到 stdout（-o -）"""
    cmd = [
        sys.executable, "-u",  # unbuffered stdout
        "-m", "yt_dlp",
        "--no-playlist",
        "--no-warnings",
        "-f", format_id,
        "-o", "-",  # 输出到 stdout
    ]

    # 根据 URL 自动选择对应平台的 cookies 文件
    cookies_path = get_cookies_file_for_url(source_url)
    if cookies_path:
        cmd += ["--cookies", str(cookies_path)]

    node = _node_path()
    if node:
        cmd += ["--js-runtimes", f"node:{node}"]
        cmd += ["--remote-components", "ejs:github"]

    cmd.append(source_url)
    return cmd


def _run_download(cmd: list[str], data_queue: "queue.Queue[bytes | None]") -> None:
    """在线程中运行 yt-dlp subprocess，把数据块放入队列"""
    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )
    try:
        while True:
            chunk = proc.stdout.read(65536)
            if not chunk:
                break
            data_queue.put(chunk)
    finally:
        try:
            proc.kill()
        except Exception:
            pass
        proc.wait()
    data_queue.put(None)  # sentinel: 下载结束


@router.get("/stream")
@limiter.limit("10/minute")
async def stream_download(
    request: Request,
    url: str,
    format_id: str = "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
    filename: str = "video",
    ext: str = "mp4",
):
    """
    通过 yt-dlp stdout 管道流式下载视频，不存储文件。
    适用于 TikTok 等 CDN 直链无法直接代理的平台。
    使用线程池运行 subprocess，兼容 Windows SelectorEventLoop。
    """
    if not url.startswith(("https://", "http://")):
        raise HTTPException(status_code=400, detail="Invalid URL")

    cmd = _build_ytdlp_cmd(url, format_id)
    safe_filename = filename.replace('"', "'").encode("ascii", "ignore").decode("ascii")[:80] or "video"
    disposition = f'attachment; filename="{safe_filename}.{ext}"'

    data_queue: queue.Queue[bytes | None] = queue.Queue(maxsize=8)

    def _start_download():
        thread = threading.Thread(
            target=_run_download,
            args=(cmd, data_queue),
            daemon=True,
        )
        thread.start()

    async def _stream():
        loop = asyncio.get_running_loop()
        # 启动下载线程
        await loop.run_in_executor(None, _start_download)
        # 从队列读取数据块并 yield
        while True:
            chunk = await loop.run_in_executor(None, data_queue.get)
            if chunk is None:
                break
            yield chunk

    return StreamingResponse(
        _stream(),
        media_type=f"video/{ext}",
        headers={"Content-Disposition": disposition},
    )
