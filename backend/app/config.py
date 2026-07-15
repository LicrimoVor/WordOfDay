from __future__ import annotations

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    admin_secret_key: str = os.getenv("ADMIN_SECRET_KEY", "dev-secret-change-me")
    room_ttl_seconds: int = int(os.getenv("ROOM_TTL_SECONDS", str(3 * 24 * 60 * 60)))
    active_user_window_seconds: int = int(os.getenv("ACTIVE_USER_WINDOW_SECONDS", "300"))

    @property
    def cors_origins(self) -> list[str]:
        raw_value = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
        values = [origin.strip() for origin in raw_value.split(",") if origin.strip()]
        return values or ["*"]


settings = Settings()
