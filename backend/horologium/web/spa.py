"""Раздача фронтенда: SPA-шелл с серверными мета-тегами для каждой страницы.

Фронтенд одностраничный, но для ссылок в мессенджерах и поисковиков сервер подставляет
в ``index.html`` заголовок, описание, canonical, Open Graph, JSON-LD и текст в ``<noscript>``
(см. ``seo.py``), а также отдаёт ``robots.txt`` и ``sitemap.xml``.
"""

from __future__ import annotations

import html
from functools import lru_cache
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse, Response
from fastapi.staticfiles import StaticFiles

from ..config import settings
from ..db.base import session_factory
from . import seo


@lru_cache(maxsize=1)
def _shell_cached(mtime: float, path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def _shell() -> str:
    path = settings.frontend_dir / "index.html"
    return _shell_cached(path.stat().st_mtime, str(path))


def _base(request: Request) -> str:
    """Адрес сайта без слеша в конце: из настройки или из запроса."""
    return settings.site_url or str(request.base_url).rstrip("/")


def render_shell(path: str, base: str = "") -> tuple[str, int]:
    """index.html с мета-тегами страницы и кодом ответа (404 для неизвестных адресов)."""
    with session_factory()() as s:
        page = seo.page_for(path, s)
    t, d = html.escape(page.title), html.escape(page.description)
    out = (
        _shell()
        .replace("<!--SSR:TITLE-->", t)
        .replace("<!--SSR:DESCRIPTION-->", d)
        .replace("<!--SSR:HEAD-->", seo.head_tags(page, path, base))
        .replace("<!--SSR:BODY-->", seo.noscript_body(page))
    )
    return out, page.status


def mount_frontend(app: FastAPI) -> None:
    front = settings.frontend_dir
    for sub in ("css", "js", "assets", "vendor"):
        (front / sub).mkdir(parents=True, exist_ok=True)
        app.mount(f"/{sub}", StaticFiles(directory=front / sub), name=sub)

    @app.middleware("http")
    async def static_cache_headers(request: Request, call_next):
        response = await call_next(request)
        path = request.url.path
        if path.startswith(("/css/", "/js/", "/assets/teardown/")):
            # Код фронтенда и разборки всегда перепроверяются (ETag), чтобы правки были видны сразу.
            response.headers["Cache-Control"] = "no-cache"
        elif path.startswith(("/assets/", "/vendor/")):
            response.headers["Cache-Control"] = "public, max-age=86400"
        return response

    @app.get("/favicon.svg", include_in_schema=False)
    def favicon():
        return Response((front / "favicon.svg").read_bytes(), media_type="image/svg+xml")

    @app.get("/manifest.webmanifest", include_in_schema=False)
    def webmanifest():
        manifest_file = front / "manifest.webmanifest"
        if manifest_file.exists():
            return Response(manifest_file.read_bytes(), media_type="application/manifest+json")
        return Response(status_code=404)

    @app.get("/sw.js", include_in_schema=False)
    def service_worker():
        # из корня, чтобы воркер управлял всем сайтом; всегда перепроверяется
        return Response((front / "sw.js").read_bytes(), media_type="text/javascript",
                        headers={"Cache-Control": "no-cache", "Service-Worker-Allowed": "/"})

    @app.get("/robots.txt", include_in_schema=False)
    def robots_txt(request: Request):
        return PlainTextResponse(seo.robots(_base(request)))

    @app.get("/sitemap.xml", include_in_schema=False)
    def sitemap_xml(request: Request):
        with session_factory()() as s:
            return Response(seo.sitemap(s, _base(request)), media_type="application/xml")

    @app.get("/{full_path:path}", include_in_schema=False, response_class=HTMLResponse)
    def spa(full_path: str, request: Request):
        path = "/" + full_path
        if path.startswith("/api/"):
            return JSONResponse({"detail": "Not Found"}, status_code=404)
        body, status = render_shell(path, _base(request))
        return HTMLResponse(body, status_code=status, headers={"Cache-Control": "no-cache"})
