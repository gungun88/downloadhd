import logging
import subprocess
import tempfile
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

import redis.asyncio as aioredis
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, Depends
from fastapi.responses import FileResponse

from core.redis_client import get_redis

logger = logging.getLogger(__name__)

router = APIRouter(tags=["merge"])

# 临时文件存储目录
TEMP_DIR = Path(tempfile.gettempdir()) / "video_merge"
TEMP_DIR.mkdir(exist_ok=True)


def get_ffmpeg_path() -> Optional[str]:
    """获取 FFmpeg 路径"""
    # 尝试常见路径
    possible_paths = [
        "ffmpeg",  # 系统 PATH 中
        r"C:\Users\Administrator\Desktop\ffmpeg-8.0.1-essentials_build\bin\ffmpeg.exe",
        r"C:\ffmpeg\bin\ffmpeg.exe",
    ]

    for path in possible_paths:
        try:
            subprocess.run(
                [path, "-version"],
                capture_output=True,
                check=True,
                timeout=5
            )
            return path
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            continue

    return None


def check_ffmpeg() -> bool:
    """检查 FFmpeg 是否可用"""
    return get_ffmpeg_path() is not None


@router.post("/merge")
async def merge_video_audio(
    video: UploadFile = File(..., description="视频文件"),
    audio: UploadFile = File(..., description="音频文件"),
    output_name: str = Form("output.mp4", description="输出文件名"),
    redis: aioredis.Redis | None = Depends(get_redis)
):
    """
    合并视频和音频文件

    - **video**: 视频文件（mp4, webm, mkv, avi, mov 等）
    - **audio**: 音频文件（mp3, wav, aac, m4a, webm, opus 等）
    - **output_name**: 输出文件名（默认 output.mp4）
    """

    # 检查 FFmpeg
    ffmpeg_path = get_ffmpeg_path()
    if not ffmpeg_path:
        raise HTTPException(
            status_code=500,
            detail="FFmpeg 未安装或不可用。请安装 FFmpeg 后重试。"
        )

    # 生成唯一 ID
    task_id = str(uuid.uuid4())

    # 创建临时文件路径
    video_ext = Path(video.filename).suffix or ".mp4"
    audio_ext = Path(audio.filename).suffix or ".mp3"
    output_ext = Path(output_name).suffix or ".mp4"

    video_path = TEMP_DIR / f"{task_id}_video{video_ext}"
    audio_path = TEMP_DIR / f"{task_id}_audio{audio_ext}"
    output_path = TEMP_DIR / f"{task_id}_output{output_ext}"

    try:
        # 保存上传的文件
        logger.info(f"[Merge] Saving uploaded files for task {task_id}")

        with open(video_path, "wb") as f:
            content = await video.read()
            f.write(content)

        with open(audio_path, "wb") as f:
            content = await audio.read()
            f.write(content)

        logger.info(f"[Merge] Files saved: video={video_path.name}, audio={audio_path.name}")

        # 使用 FFmpeg 合并
        logger.info(f"[Merge] Starting FFmpeg merge for task {task_id}")

        cmd = [
            ffmpeg_path,
            "-i", str(video_path),
            "-i", str(audio_path),
            "-c:v", "copy",  # 复制视频流，不重新编码
            "-c:a", "aac",   # 音频编码为 AAC
            "-strict", "experimental",
            "-y",  # 覆盖输出文件
            str(output_path)
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5 分钟超时
        )

        if result.returncode != 0:
            logger.error(f"[Merge] FFmpeg error: {result.stderr}")
            raise HTTPException(
                status_code=500,
                detail=f"视频合并失败: {result.stderr[:200]}"
            )

        logger.info(f"[Merge] Merge completed successfully for task {task_id}")

        # 记录统计数据
        if redis:
            try:
                today = datetime.now().date().isoformat()
                await redis.incr(f"merge:stats:{today}:total")
                logger.info(f"[Merge] Recorded merge stats")
            except Exception as stats_error:
                logger.warning(f"[Merge] Failed to record stats: {stats_error}")

        # 返回合并后的文件
        return FileResponse(
            path=output_path,
            filename=output_name,
            media_type="video/mp4",
            background=None  # 不自动删除，稍后手动清理
        )

    except subprocess.TimeoutExpired:
        logger.error(f"[Merge] Timeout for task {task_id}")
        raise HTTPException(status_code=500, detail="处理超时，文件可能过大")

    except Exception as e:
        logger.error(f"[Merge] Error for task {task_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"合并失败: {str(e)}")

    finally:
        # 清理临时文件（延迟删除，确保文件已发送）
        # 注意：FileResponse 发送完成后会自动关闭文件，但不会删除
        # 这里我们不立即删除，让系统定期清理临时目录
        pass


@router.get("/merge/check")
async def check_merge_availability():
    """检查音视频合并功能是否可用"""
    ffmpeg_available = check_ffmpeg()

    return {
        "available": ffmpeg_available,
        "message": "FFmpeg 可用" if ffmpeg_available else "FFmpeg 未安装"
    }
