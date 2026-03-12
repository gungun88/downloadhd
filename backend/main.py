import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from core.config import settings
from core.limiter import limiter
from routers.parse import router as parse_router
from routers.download import router as download_router
from routers.stream import router as stream_router
from routers.gallery import router as gallery_router
from routers.admin import router as admin_router
from routers.cookies import router as cookies_router
from routers.merge import router as merge_router
from services.ytdlp import _node_path
from services.cookies_pool import cookies_pool

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s  %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="VideoParser API", version="1.0.0")


@app.on_event("startup")
async def _startup_log():
    # 连接 cookies 池
    await cookies_pool.connect()

    cookies_dir = Path(settings.cookies_dir)
    if not cookies_dir.is_absolute():
        cookies_dir = Path(__file__).parent / settings.cookies_dir

    cookies_ok = cookies_dir.exists() and any(cookies_dir.glob("*.txt"))
    node = _node_path()
    logger.info("================================")
    logger.info(f"cookies dir : {cookies_dir}")
    logger.info(f"cookies     : {'OK' if cookies_ok else 'NOT FOUND (some platforms may be restricted)'}")
    if cookies_ok:
        cookie_files = list(cookies_dir.glob("*.txt"))
        logger.info(f"  - Found {len(cookie_files)} platform cookies: {', '.join(f.stem for f in cookie_files)}")
    logger.info(f"node.js     : {node if node else 'NOT FOUND (n-challenge solving disabled)'}")
    logger.info(f"EJS mode    : {'ON (bgutil PO Token + n-challenge)' if node else 'OFF'}")
    logger.info(f"cookies pool: Connected")
    logger.info("================================")


@app.on_event("shutdown")
async def _shutdown():
    # 关闭 cookies 池连接
    await cookies_pool.close()

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(parse_router, prefix="/api")
app.include_router(download_router, prefix="/api")
app.include_router(stream_router, prefix="/api")
app.include_router(gallery_router, prefix="/api")
app.include_router(cookies_router, prefix="/api")
app.include_router(admin_router, prefix="/api/admin")
app.include_router(merge_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
