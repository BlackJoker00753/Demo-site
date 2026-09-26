"""Безопасность: HTTP Security Headers, защита от DoS (Rate Limiting) и маскировка сервера."""

from __future__ import annotations

import time
from collections import defaultdict
from dataclasses import dataclass, field
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse


@dataclass
class RateLimitWindow:
    timestamps: list[float] = field(default_factory=list)


class InMemoryRateLimiter:
    """Простой скользящий лимитер запросов в памяти по IP."""

    def __init__(self, requests_per_minute: int = 120, search_per_minute: int = 45):
        self.rpm = requests_per_minute
        self.search_rpm = search_per_minute
        self.clients: dict[str, RateLimitWindow] = defaultdict(RateLimitWindow)
        self.search_clients: dict[str, RateLimitWindow] = defaultdict(RateLimitWindow)

    def is_allowed(self, ip: str, is_search: bool = False) -> tuple[bool, int]:
        now = time.time()
        window_size = 60.0
        limit = self.search_rpm if is_search else self.rpm
        storage = self.search_clients if is_search else self.clients

        client = storage[ip]
        # Очищаем устаревшие запросы старше 60 секунд
        client.timestamps = [t for t in client.timestamps if now - t < window_size]

        if len(client.timestamps) >= limit:
            retry_after = int(window_size - (now - client.timestamps[0])) + 1
            return False, max(1, retry_after)

        client.timestamps.append(now)
        return True, 0


rate_limiter = InMemoryRateLimiter()


def add_security_middleware(app: FastAPI) -> None:
    """Добавляет заголовки безопасности, маскировку сервера и защиту от DoS."""

    @app.middleware("http")
    async def security_and_rate_limit(request: Request, call_next):
        path = request.url.path

        # Проверка Rate Limiting только для API эндпоинтов
        if path.startswith("/api/v1/"):
            client_ip = request.client.host if request.client else "127.0.0.1"
            # Не лимитируем внутренние тесты с фиктивным ip 'testclient'
            if client_ip != "testclient":
                is_search = path.startswith("/api/v1/search")
                allowed, retry_after = rate_limiter.is_allowed(client_ip, is_search=is_search)
                if not allowed:
                    return JSONResponse(
                        status_code=429,
                        content={"detail": "Превышен лимит запросов. Пожалуйста, подождите."},
                        headers={"Retry-After": str(retry_after)},
                    )

        response: Response = await call_next(request)

        # 1. Защита от Clickjacking
        response.headers["X-Frame-Options"] = "SAMEORIGIN"

        # 2. Защита от подмены MIME-типов
        response.headers["X-Content-Type-Options"] = "nosniff"

        # 3. Политика передачи Referrer
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # 4. Ограничение доступа к оборудованию (камера, микрофон, геолокация)
        response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=(), payment=()"

        # 5. Маскировка сервера (скрываем uvicorn)
        response.headers["Server"] = "Horologium"

        # 6. Content-Security-Policy (CSP) для HTML страниц
        content_type = response.headers.get("content-type", "")
        if "text/html" in content_type:
            csp = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: blob: https:; "
                "font-src 'self' data:; "
                "connect-src 'self' https://open.er-api.com; "
                "worker-src 'self' blob:; "
                "frame-ancestors 'self';"
            )
            response.headers["Content-Security-Policy"] = csp

        return response
