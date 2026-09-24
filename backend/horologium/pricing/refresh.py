"""Обновление цен из сети и отчёт о свежести.

Логика: для каждой модели с ``price.url`` пробуем провайдеров по очереди;
найденную цену пересчитываем в USD и пишем снимок в ``price_snapshots``.
При следующей сборке базы свежий снимок автоматически заменяет цену из YAML.
"""

from __future__ import annotations

import datetime as dt
import logging
import time

import httpx
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..db.base import session_scope
from ..db.build import ensure_database
from ..db.models import Brand, PriceSnapshot, Watch
from .providers import DEFAULT_PROVIDERS, TIMEOUT, FetchBlocked, FxRates

log = logging.getLogger(__name__)


def refresh(*, brand: str | None = None, dry_run: bool = False, limit: int = 0, delay: float = 1.5) -> int:
    ensure_database()
    updated = blocked = missing = 0
    with session_scope() as s, httpx.Client(timeout=TIMEOUT, follow_redirects=True, http2=False) as client:
        fx = FxRates(client)
        q = select(Watch).options(selectinload(Watch.brand)).where(Watch.price_url.is_not(None))
        if brand:
            q = q.join(Watch.brand).where(Brand.slug == brand)
        watches = s.scalars(q).all()
        if limit:
            watches = watches[:limit]
        for w in watches:
            quote = None
            for provider in DEFAULT_PROVIDERS:
                try:
                    quote = provider.quote(client, w.price_url)
                except FetchBlocked as exc:
                    log.warning("blocked: %s (%s)", w.slug, exc)
                    blocked += 1
                    break
                except httpx.HTTPError as exc:
                    log.warning("network error: %s (%s)", w.slug, exc)
                    break
                if quote:
                    break
            if not quote:
                missing += 1
                continue
            usd = round(fx.to_usd(quote.amount, quote.currency))
            delta = usd - w.price_usd
            log.info("%s: %s %s -> $%s (было $%s, %+d)", w.slug, quote.amount, quote.currency, usd, w.price_usd, delta)
            if not dry_run:
                s.add(
                    PriceSnapshot(
                        watch_slug=w.slug, price_usd=usd, amount=quote.amount, currency=quote.currency,
                        kind=w.price_kind, source=quote.source, url=quote.url, fetched_at=dt.datetime.now(),
                    )
                )
                w.price_usd, w.price_source, w.price_checked = usd, quote.source, dt.date.today()
            updated += 1
            time.sleep(delay)  # вежливость к чужим серверам
    print(f"Обновлено: {updated}, закрыто антиботом: {blocked}, цена не найдена: {missing}")
    return 0


def report() -> int:
    ensure_database()
    today = dt.date.today()
    with session_scope() as s:
        rows = s.scalars(select(Brand).options(selectinload(Brand.watches)).order_by(Brand.name)).all()
        print(f"{'Бренд':<24}{'Моделей':>8}{'Старейшая цена':>18}{'Дней':>7}  Источники")
        for b in rows:
            if not b.watches:
                continue
            oldest = min(w.price_checked for w in b.watches)
            sources = sorted({w.price_source for w in b.watches})
            print(f"{b.name:<24}{len(b.watches):>8}{oldest.isoformat():>18}{(today - oldest).days:>7}  {', '.join(sources)}")
    return 0
