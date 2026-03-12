from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    redis_url: str = "redis://localhost:6379"
    cookies_dir: str = "./cookies"  # cookies 目录路径
    cache_ttl: int = 1800  # 30 minutes
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    node_path: str = "node"  # node.js 可执行文件路径，Windows 上可设为 C:\Program Files\nodejs\node.exe

    model_config = {"env_file": ".env"}


settings = Settings()
