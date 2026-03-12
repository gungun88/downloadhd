import base64
import json
import urllib.parse

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from core.limiter import limiter

router = APIRouter()


def _content_disposition(filename: str, ext: str) -> str:
    """构建 RFC 5987 兼容的 Content-Disposition 头，支持中文文件名"""
    safe = f"{filename}.{ext}"
    # ASCII fallback（去掉非 ASCII 字符）
    ascii_fallback = safe.encode("ascii", "ignore").decode("ascii").replace('"', "'") or f"video.{ext}"
    # UTF-8 编码版本（RFC 5987）
    utf8_encoded = urllib.parse.quote(safe, safe="")
    return f'attachment; filename="{ascii_fallback}"; filename*=UTF-8\'\'{utf8_encoded}'


@router.get("/download")
@limiter.limit("30/minute")
async def proxy_download(
    request: Request,
    url: str,
    headers: str = "",
    filename: str = "video",
    ext: str = "mp4",
):
    """
    流式代理下载端点。
    - url: 视频直链（FastAPI 自动解码一次，无需手动 unquote）
    - headers: base64(json) 格式的请求头，来自 yt-dlp 返回的 http_headers
    - filename: 下载文件名（不含扩展名）
    - ext: 文件扩展名
    """
    # FastAPI 已自动对 query param 做一次 URL 解码
    # 若前端用了 encodeURIComponent 再放入 URLSearchParams，则需再 unquote 一次
    target_url = url
    if not target_url.startswith("https://"):
        target_url = urllib.parse.unquote(target_url)
    if not target_url.startswith(("https://", "http://")):
        raise HTTPException(status_code=400, detail="Invalid URL")

    req_headers = {}
    if headers:
        try:
            req_headers = json.loads(base64.b64decode(headers).decode())
        except Exception:
            pass

    disposition = _content_disposition(filename[:100], ext)

    async def _stream():
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=httpx.Timeout(15.0, read=300.0),
        ) as client:
            async with client.stream("GET", target_url, headers=req_headers) as resp:
                if resp.status_code >= 400:
                    yield b""  # flush headers first
                    return
                async for chunk in resp.aiter_bytes(chunk_size=65536):
                    yield chunk

    # Get content length from the source
    response_headers = {"Content-Disposition": disposition}
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=httpx.Timeout(10.0)) as client:
            head_resp = await client.head(target_url, headers=req_headers)
            if head_resp.status_code < 400 and "content-length" in head_resp.headers:
                response_headers["Content-Length"] = head_resp.headers["content-length"]
    except Exception:
        # If HEAD request fails, continue without Content-Length
        pass

    return StreamingResponse(
        _stream(),
        media_type=f"video/{ext}",
        headers=response_headers,
    )
