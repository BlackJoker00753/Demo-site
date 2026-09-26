"""Курсы валют для пересчёта цен из долларов (EUR, RUB, KZT).

Цены в атласе хранятся в USD. Для показа в других валютах сервер раз в сутки берёт курсы у
open.er-api.com (без ключа) и кладёт их в ``data/rates.json``. Запрос к источнику идёт в фоне:
посетитель всегда сразу получает последние известные курсы, а без сети работают запасные.
"""

from __future__ import annotations

import json
import os
import threading
import time
from datetime import datetime, timezone

import httpx

from ..config import settings

SOURCE = "https://open.er-api.com/v6/latest/USD"
CODES = ("USD", "EUR", "RUB", "KZT")
MAX_AGE = 12 * 3600  # секунд между обновлениями

# Запасные курсы (open.er-api.com на 26.09.2026), если источник недоступен.
FALLBACK = {"base": "USD", "date": "2026-09-26", "source": "open.er-api.com",
            "rates": {"USD": 1.0, "EUR": 0.8773, "RUB": 84.28, "KZT": 443.05}}

_lock = threading.Lock()
_refreshing = False


def _path():
    return settings.data_dir / "rates.json"


def _read() -> dict | None:
    try:
        data = json.loads(_path().read_text(encoding="utf-8"))
        return data if set(CODES) <= set(data.get("rates", {})) else None
    except (OSError, ValueError):
        return None


def fetch() -> dict:
    """Свежие курсы у источника (бросает исключение при ошибке)."""
    r = httpx.get(SOURCE, timeout=httpx.Timeout(8.0, connect=4.0))
    r.raise_for_status()
    d = r.json()
    if d.get("result") != "success":
        raise ValueError("источник курсов вернул ошибку")
    day = datetime.fromtimestamp(d["time_last_update_unix"], tz=timezone.utc).date().isoformat()
    return {"base": "USD", "date": day, "source": "open.er-api.com",
            "rates": {c: round(float(d["rates"][c]), 4) for c in CODES}}


def _refresh() -> None:
    global _refreshing
    try:
        data = fetch()
        settings.data_dir.mkdir(parents=True, exist_ok=True)
        tmp = _path().with_suffix(".tmp")
        tmp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        tmp.replace(_path())
    except Exception:  # noqa: BLE001 — без сети остаются прежние курсы
        pass
    finally:
        with _lock:
            _refreshing = False


def current() -> dict:
    """Последние известные курсы; устаревшие обновляются в фоновом потоке."""
    global _refreshing
    data = _read()
    stale = data is None or time.time() - _path().stat().st_mtime > MAX_AGE
    live = os.environ.get("HOROLOGIUM_RATES_LIVE", "1") != "0"
    if stale and live:
        with _lock:
            start = not _refreshing
            _refreshing = True
        if start:
            threading.Thread(target=_refresh, name="rates", daemon=True).start()
    return data or FALLBACK
