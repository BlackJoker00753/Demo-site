"""Раздача фронтенда: SPA-шелл с серверными мета-тегами для каждой страницы.

Фронтенд — одностраничное приложение, но для ссылок в мессенджерах и
поисковиков сервер подставляет в ``index.html`` правильные ``<title>``,
description и Open Graph для страны, бренда и модели.
"""

from __future__ import annotations

import html
import re
from functools import lru_cache
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, Response
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from ..config import settings
from ..db.base import session_factory
from ..services import catalog

SPA_ROUTES = re.compile(r"^/(?:$|country/|brand/|watch/|complication/|movement/|glossary|about|search|lab|credits)")


@lru_cache(maxsize=1)
def _shell_cached(mtime: float, path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def _shell() -> str:
    path = settings.frontend_dir / "index.html"
    return _shell_cached(path.stat().st_mtime, str(path))


def _meta_for(path: str, s: Session) -> tuple[str, str]:
    base = f"{settings.site_name}: {settings.site_tagline}"
    default = (
        base,
        "Интерактивный атлас часов: страны, мануфактуры, модели, механизмы и цены. "
        "Разберите часы до последнего винта.",
    )
    parts = [p for p in path.split("/") if p]
    if len(parts) != 2:
        return default
    kind, slug = parts
    if kind == "country" and (c := catalog.get_country(s, slug)):
        return f"{c.name}: часовые бренды | {settings.site_name}", c.tagline
    if kind == "brand" and (b := catalog.get_brand(s, slug)):
        return f"{b.name}: модели, история и цены | {settings.site_name}", b.tagline
    if kind == "watch" and (w := catalog.get_watch(s, slug)):
        return f"{w.brand_name} {w.name} ({w.reference or w.year_introduced}) | {settings.site_name}", w.summary
    return default


def render_shell(path: str) -> str:
    with session_factory()() as s:
        title, description = _meta_for(path, s)
    t, d = html.escape(title), html.escape(description)
    return (
        _shell()
        .replace("<!--SSR:TITLE-->", t)
        .replace("<!--SSR:DESCRIPTION-->", d)
    )


def mount_frontend(app: FastAPI) -> None:
    front = settings.frontend_dir
    for sub in ("css", "js", "assets", "vendor"):
        (front / sub).mkdir(parents=True, exist_ok=True)
        app.mount(f"/{sub}", StaticFiles(directory=front / sub), name=sub)

    @app.middleware("http")
    async def static_cache_headers(request: Request, call_next):
        response = await call_next(request)
        path = request.url.path
        if path.startswith(("/css/", "/js/")):
            # Код фронтенда всегда перепроверяется (ETag), чтобы правки были видны сразу.
            response.headers["Cache-Control"] = "no-cache"
        elif path.startswith(("/assets/", "/vendor/")):
            response.headers["Cache-Control"] = "public, max-age=86400"
        return response

    @app.get("/favicon.svg", include_in_schema=False)
    def favicon():
        return Response((front / "favicon.svg").read_bytes(), media_type="image/svg+xml")

    @app.get("/{full_path:path}", include_in_schema=False, response_class=HTMLResponse)
    def spa(full_path: str, request: Request):
        path = "/" + full_path
        if path.startswith("/api/") or not SPA_ROUTES.match(path):
            return HTMLResponse(render_shell("/404"), status_code=404)
        return HTMLResponse(render_shell(path), headers={"Cache-Control": "no-cache"})
