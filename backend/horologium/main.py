"""Точка входа FastAPI: ``uvicorn horologium.main:app``."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware

from .api.routes import router
from .config import settings
from .db.build import ensure_database
from .web.security import add_security_middleware
from .web.spa import mount_frontend

log = logging.getLogger("horologium")


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.auto_rebuild and ensure_database():
        log.info("content changed: SQLite rebuilt at %s", settings.db_path)
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=f"{settings.site_name} API",
        description="Каталог часов: страны, бренды, модели, механизмы, усложнения и цены.",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/api/docs",
        redoc_url=None,
        openapi_url="/api/openapi.json",
    )
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    add_security_middleware(app)
    app.include_router(router)
    mount_frontend(app)
    return app



app = create_app()
