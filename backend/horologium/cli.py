"""CLI: ``horologium serve | build-db | check | prices``.

Примеры::

    uv run horologium serve            # сайт на http://127.0.0.1:8000
    uv run horologium check            # валидировать YAML-контент
    uv run horologium build-db         # принудительно пересобрать SQLite
    uv run horologium prices report    # свежесть цен по брендам
    uv run horologium prices refresh   # попытаться обновить цены из сети
"""

from __future__ import annotations

import argparse
import logging
import sys

from .config import settings


def _cmd_serve(args: argparse.Namespace) -> int:
    import uvicorn

    from .db.build import ensure_database

    ensure_database()
    uvicorn.run(
        "horologium.main:app", host=args.host, port=args.port, reload=args.reload,
        reload_dirs=[str(settings.root_dir / "backend"), str(settings.content_dir)] if args.reload else None,
    )
    return 0


def _cmd_check(_: argparse.Namespace) -> int:
    from .content.loader import ContentError, load_content

    try:
        bundle = load_content(settings.content_dir)
    except ContentError as exc:
        print(exc, file=sys.stderr)
        return 1
    print(
        f"OK: {len(bundle.countries)} стран, {len(bundle.brand_files)} брендов, "
        f"{bundle.watch_count} моделей, {len(bundle.movements)} калибров, "
        f"{len(bundle.complications)} усложнений (digest {bundle.digest})"
    )
    for w in bundle.warnings:
        print("warning:", w)
    return 0


def _cmd_build(_: argparse.Namespace) -> int:
    from .db.build import ensure_database

    ensure_database(force=True)
    print(f"SQLite собрана: {settings.db_path}")
    return 0


def _cmd_prices(args: argparse.Namespace) -> int:
    from .pricing import refresh

    if args.action == "report":
        return refresh.report()
    return refresh.refresh(brand=args.brand, dry_run=args.dry_run, limit=args.limit)


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    parser = argparse.ArgumentParser(prog="horologium", description="Horologium: атлас часов")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("serve", help="запустить сайт")
    p.add_argument("--host", default="127.0.0.1")
    p.add_argument("--port", type=int, default=8000)
    p.add_argument("--reload", action="store_true", help="перезапуск при изменении кода/контента")
    p.set_defaults(func=_cmd_serve)

    sub.add_parser("check", help="проверить YAML-контент").set_defaults(func=_cmd_check)
    sub.add_parser("build-db", help="пересобрать SQLite").set_defaults(func=_cmd_build)

    p = sub.add_parser("prices", help="цены: отчёт и обновление")
    p.add_argument("action", choices=["report", "refresh"])
    p.add_argument("--brand", help="только один бренд (slug)")
    p.add_argument("--limit", type=int, default=0)
    p.add_argument("--dry-run", action="store_true")
    p.set_defaults(func=_cmd_prices)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
