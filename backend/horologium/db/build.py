"""Сборка SQLite из YAML-контента.

Пересоздаются все таблицы каталога. ``price_snapshots`` сохраняется: туда
пишет обновлялка цен, и если там есть цена новее, чем в YAML, в каталог
попадает именно она.
"""

from __future__ import annotations

import datetime as dt
import logging

from sqlalchemy import Engine, select
from sqlalchemy.orm import Session

from ..content.loader import ContentBundle, content_digest, load_content
from ..config import settings
from .base import get_engine
from .models import Base, Brand, Complication, Country, Meta, Movement, PartPhoto, PriceSnapshot, Watch

log = logging.getLogger(__name__)

CATALOG_TABLES = [t for name, t in Base.metadata.tables.items() if name != "price_snapshots"]


def stored_digest(engine: Engine) -> str | None:
    try:
        with Session(engine) as s:
            row = s.get(Meta, "content_digest")
            return row.value if row else None
    except Exception:  # таблицы ещё нет
        return None


def ensure_database(engine: Engine | None = None, *, force: bool = False) -> bool:
    """Пересобирает базу, если контент изменился. Возвращает True, если собирал."""
    engine = engine or get_engine()
    digest = content_digest(settings.content_dir)
    if not force and stored_digest(engine) == digest:
        return False
    build_database(load_content(settings.content_dir), engine)
    return True


def build_database(bundle: ContentBundle, engine: Engine | None = None) -> None:
    engine = engine or get_engine()
    Base.metadata.drop_all(engine, tables=CATALOG_TABLES)
    Base.metadata.create_all(engine)

    with Session(engine) as s:
        countries = {}
        for c in bundle.countries:
            obj = Country(
                slug=c.slug, name=c.name, name_en=c.name_en, iso_a3=c.iso_a3, lat=c.lat, lon=c.lon,
                altitude=c.altitude, tagline=c.tagline, intro=list(c.intro),
                cities=[x.model_dump() for x in c.cities], facts=[f.model_dump() for f in c.facts], sort=c.sort,
            )
            s.add(obj)
            countries[c.slug] = obj

        complications = {}
        for c in bundle.complications:
            obj = Complication(**c.model_dump())
            s.add(obj)
            complications[c.slug] = obj

        movements = {}
        for m in bundle.movements:
            obj = Movement(**{**m.model_dump(), "features": list(m.features)})
            s.add(obj)
            movements[m.slug] = obj

        for bf in bundle.brand_files:
            b = bf.brand
            brand = Brand(
                **b.model_dump(exclude={"country", "facts", "milestones", "story", "aliases"}),
                aliases=list(b.aliases),
                country=countries[b.country],
                story=list(b.story),
                facts=[f.model_dump() for f in b.facts],
                milestones=[m.model_dump() for m in b.milestones],
            )
            s.add(brand)
            for w in bf.watches:
                s.add(
                    Watch(
                        slug=w.slug, brand=brand, movement=movements[w.movement], name=w.name,
                        collection=w.collection, reference=w.reference, year_introduced=w.year_introduced,
                        year_current=w.year_current, designer=w.designer, status=w.status,
                        case=w.case.model_dump(), bracelet=w.bracelet, dial=w.dial,
                        price_usd=w.price.usd, price_kind=w.price.kind, price_source=w.price.source,
                        price_url=w.price.url, price_checked=w.price.checked, price_note=w.price.note,
                        summary=w.summary, story=list(w.story), history=[h.model_dump() for h in w.history],
                        highlights=list(w.highlights), icon=w.icon, render=w.render.model_dump(), sort=w.sort,
                        photos=[ph.model_dump() for ph in sorted(bundle.photos.get(w.slug, []), key=lambda ph: ph.context)],
                        complications=[complications[c] for c in w.complications],
                    )
                )
        for key, photos in bundle.part_photos.items():
            s.add(PartPhoto(key=key, photos=[ph.model_dump() for ph in photos]))
        s.flush()
        _sync_snapshots(s, bundle)
        s.merge(Meta(key="content_digest", value=bundle.digest))
        s.merge(Meta(key="built_at", value=dt.datetime.now(dt.UTC).isoformat(timespec="seconds")))
        s.commit()
    log.info("database built: %s brands, %s watches", len(bundle.brand_files), bundle.watch_count)


def _sync_snapshots(s: Session, bundle: ContentBundle) -> None:
    """Кладёт цены из YAML в историю и применяет более свежие цены из обновлялки."""
    for bf in bundle.brand_files:
        for w in bf.watches:
            checked = dt.datetime.combine(w.price.checked, dt.time())
            exists = s.scalar(
                select(PriceSnapshot.id).where(
                    PriceSnapshot.watch_slug == w.slug,
                    PriceSnapshot.fetched_at == checked,
                    PriceSnapshot.source == w.price.source,
                )
            )
            if not exists:
                s.add(
                    PriceSnapshot(
                        watch_slug=w.slug, price_usd=w.price.usd, amount=w.price.usd, currency="USD",
                        kind=w.price.kind, source=w.price.source, url=w.price.url, fetched_at=checked,
                    )
                )
    s.flush()

    for watch in s.scalars(select(Watch)):
        latest = s.scalars(
            select(PriceSnapshot)
            .where(PriceSnapshot.watch_slug == watch.slug, PriceSnapshot.kind == watch.price_kind)
            .order_by(PriceSnapshot.fetched_at.desc())
            .limit(1)
        ).first()
        if latest and latest.fetched_at.date() > watch.price_checked:
            watch.price_usd = latest.price_usd
            watch.price_source = latest.source
            watch.price_url = latest.url or watch.price_url
            watch.price_checked = latest.fetched_at.date()
