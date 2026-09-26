"""Запросы каталога и агрегаты (средняя цена, диапазоны, фасеты).

Слой сервисов ничего не знает про HTTP: принимает ``Session`` и возвращает
Pydantic-модели из ``api/schemas.py``.
"""

from __future__ import annotations

import statistics
from collections import Counter
from collections.abc import Iterable

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..api import schemas as S
from ..config import settings
from ..db.models import Brand, Complication, Country, Meta, Movement, PartPhoto, PriceSnapshot, Watch

MOVEMENT_LABELS = {
    "automatic": "Автоподзавод",
    "manual": "Ручной завод",
    "quartz": "Кварц",
    "solar": "Солнечная энергия",
    "kinetic": "Kinetic",
    "spring_drive": "Spring Drive",
    "smart": "Смарт-часы",
}
MECHANICAL = {"automatic", "manual"}

_WATCH_LOAD = (
    selectinload(Watch.brand).selectinload(Brand.country),
    selectinload(Watch.movement),
    selectinload(Watch.complications),
)


# ---------------------------------------------------------------- helpers


def price_stats(prices: Iterable[int]) -> S.PriceStats:
    values = sorted(prices)
    if not values:
        return S.PriceStats(count=0, avg=None, median=None, min=None, max=None)
    return S.PriceStats(
        count=len(values),
        avg=round(statistics.fmean(values)),
        median=round(statistics.median(values)),
        min=values[0],
        max=values[-1],
    )


def _price(w: Watch) -> S.Price:
    return S.Price(
        usd=w.price_usd, kind=w.price_kind, source=w.price_source, url=w.price_url,
        checked=w.price_checked, note=w.price_note,
    )


def has_teardown(slug: str) -> bool:
    """Собрана ли для модели разборка до детали (scripts/teardown.py build)."""
    return (settings.frontend_dir / "assets" / "teardown" / slug / "manifest.json").is_file()


def watch_card(w: Watch) -> S.WatchCard:
    return S.WatchCard(
        slug=w.slug, name=w.name, brand=w.brand.slug, brand_name=w.brand.name, collection=w.collection,
        reference=w.reference, year_introduced=w.year_introduced, status=w.status,
        movement_type=w.movement.type, in_house=w.movement.in_house, caliber=w.movement.caliber,
        diameter_mm=w.case["diameter_mm"], thickness_mm=w.case.get("thickness_mm"),
        frequency_vph=w.movement.frequency_vph, price=_price(w),
        complications=[S.ComplicationRef.model_validate(c) for c in w.complications],
        icon=w.icon, render=w.render,
        photo=_card_photo(w),
        teardown=has_teardown(w.slug),
    )


def _main_photo(w: Watch) -> S.Photo | None:
    """Первое фото самой модели (снимки родственных моделей с context=True не годятся)."""
    main = next((p for p in (w.photos or []) if not p.get("context")), None)
    return S.Photo(**main) if main else None


def _card_photo(w: Watch) -> S.Photo | None:
    """Для карточки: своё фото, а если его нет, снимок родственной модели (помечен context)."""
    if main := _main_photo(w):
        return main
    return S.Photo(**w.photos[0]) if w.photos else None


def _hero_watch(b: Brand) -> Watch | None:
    """Главная модель бренда: культовая с фото, иначе любая с фото, иначе первая."""
    ranked = sorted(b.watches, key=lambda w: (_main_photo(w) is None, not w.photos, not w.icon, w.sort))
    return ranked[0] if ranked else None


def brand_card(b: Brand) -> S.BrandCard:
    hero = _hero_watch(b)
    return S.BrandCard(
        slug=b.slug, name=b.name, country=b.country.slug, founded=b.founded, city=b.city, lat=b.lat, lon=b.lon,
        tier=b.tier, tagline=b.tagline, group=b.group, independent=b.independent, manufacture=b.manufacture,
        watch_count=len(b.watches), prices=price_stats(w.price_usd for w in b.watches),
        hero_render=hero.render if hero else None,
        hero_photo=_card_photo(hero) if hero else None,
        hero_slug=hero.slug if hero else None,
        hero_name=hero.name if hero else None,
    )


def _facets(watches: list[Watch]) -> list[S.Facet]:
    facets = [S.Facet(key="all", label="Все", count=len(watches), kind="all")]
    types = Counter(w.movement.type for w in watches)
    mech = types["automatic"] + types["manual"]
    if types["automatic"] and types["manual"]:
        facets.append(S.Facet(key="mechanical", label="Механические", count=mech, kind="group"))
    for key in MOVEMENT_LABELS:
        if types[key]:
            facets.append(S.Facet(key=key, label=MOVEMENT_LABELS[key], count=types[key], kind="movement"))
    comps: Counter[str] = Counter()
    labels: dict[str, str] = {}
    for w in watches:
        for c in w.complications:
            if c.tab:
                comps[c.slug] += 1
                labels[c.slug] = c.name
    for slug, count in comps.most_common():
        facets.append(S.Facet(key=slug, label=labels[slug], count=count, kind="complication"))
    return facets


# ---------------------------------------------------------------- countries


def _country_summary(c: Country) -> S.CountrySummary:
    watches = [w for b in c.brands for w in b.watches]
    return S.CountrySummary(
        slug=c.slug, name=c.name, name_en=c.name_en, iso_a3=c.iso_a3, lat=c.lat, lon=c.lon, altitude=c.altitude,
        tagline=c.tagline, brand_count=len(c.brands), watch_count=len(watches),
        prices=price_stats(w.price_usd for w in watches),
    )


def list_countries(s: Session) -> list[S.CountrySummary]:
    rows = s.scalars(
        select(Country).options(selectinload(Country.brands).selectinload(Brand.watches)).order_by(Country.sort)
    )
    return [_country_summary(c) for c in rows]


def get_country(s: Session, slug: str) -> S.CountryDetail | None:
    c = s.scalars(
        select(Country)
        .where(Country.slug == slug)
        .options(selectinload(Country.brands).selectinload(Brand.watches).selectinload(Watch.movement))
    ).first()
    if not c:
        return None
    return S.CountryDetail(
        **_country_summary(c).model_dump(),
        intro=c.intro,
        cities=[S.City(**x) for x in c.cities],
        facts=[S.Fact(**f) for f in c.facts],
        brands=[brand_card(b) for b in c.brands],
    )


# ---------------------------------------------------------------- brands


def list_brands(s: Session, country: str | None = None) -> list[S.BrandCard]:
    q = select(Brand).options(selectinload(Brand.watches), selectinload(Brand.country)).order_by(Brand.sort, Brand.name)
    if country:
        q = q.join(Brand.country).where(Country.slug == country)
    return [brand_card(b) for b in s.scalars(q)]


def get_brand(s: Session, slug: str) -> S.BrandDetail | None:
    b = s.scalars(
        select(Brand)
        .where(Brand.slug == slug)
        .options(selectinload(Brand.country), selectinload(Brand.watches).options(*_WATCH_LOAD))
    ).first()
    if not b:
        return None
    return S.BrandDetail(
        **brand_card(b).model_dump(),
        founder=b.founder, story=b.story, manufacture_note=b.manufacture_note, website=b.website,
        facts=[S.Fact(**f) for f in b.facts], milestones=[S.Milestone(**m) for m in b.milestones],
        country_name=b.country.name, facets=_facets(b.watches), watches=[watch_card(w) for w in b.watches],
    )


# ---------------------------------------------------------------- watches


def list_watches(
    s: Session,
    *,
    brand: str | None = None,
    country: str | None = None,
    movement_type: str | None = None,
    complication: str | None = None,
    icons_only: bool = False,
    sort: str = "default",
    limit: int = 500,
) -> list[S.WatchCard]:
    q = select(Watch).options(*_WATCH_LOAD).join(Watch.brand).join(Watch.movement)
    if brand:
        q = q.where(Brand.slug == brand)
    if country:
        q = q.join(Brand.country).where(Country.slug == country)
    if movement_type == "mechanical":
        q = q.where(Movement.type.in_(MECHANICAL))
    elif movement_type:
        q = q.where(Movement.type == movement_type)
    if complication:
        q = q.where(Watch.complications.any(Complication.slug == complication))
    if icons_only:
        q = q.where(Watch.icon.is_(True))
    order = {
        "price_asc": (Watch.price_usd.asc(),),
        "price_desc": (Watch.price_usd.desc(),),
        "year": (Watch.year_introduced.asc(),),
        "name": (Watch.name.asc(),),
    }.get(sort, (Brand.sort, Watch.sort, Watch.name))
    return [watch_card(w) for w in s.scalars(q.order_by(*order).limit(limit))]


def get_watch(s: Session, slug: str) -> S.WatchDetail | None:
    w = s.scalars(select(Watch).where(Watch.slug == slug).options(*_WATCH_LOAD)).first()
    if not w:
        return None
    siblings = s.scalars(
        select(Watch).where(Watch.brand_id == w.brand_id, Watch.id != w.id).options(*_WATCH_LOAD).order_by(Watch.sort)
    ).all()
    history = s.scalars(
        select(PriceSnapshot).where(PriceSnapshot.watch_slug == w.slug).order_by(PriceSnapshot.fetched_at)
    ).all()
    brand_prices = s.scalars(select(Watch.price_usd).where(Watch.brand_id == w.brand_id)).all()
    return S.WatchDetail(
        **watch_card(w).model_dump(),
        country=w.brand.country.slug, country_name=w.brand.country.name, year_current=w.year_current,
        designer=w.designer, case=S.CaseInfo(**w.case), bracelet=w.bracelet, dial=w.dial, summary=w.summary,
        story=w.story, history=[S.HistoryEntry(**h) for h in w.history], highlights=w.highlights,
        movement=S.MovementOut.model_validate(w.movement),
        complications_full=[S.ComplicationOut.model_validate(c) for c in w.complications],
        price_history=[
            S.PricePoint(usd=p.price_usd, source=p.source, kind=p.kind, fetched_at=p.fetched_at) for p in history
        ],
        brand_prices=price_stats(brand_prices),
        siblings=[watch_card(x) for x in siblings[:8]],
        photos=[S.Photo(**p) for p in w.photos],
    )


# ---------------------------------------------------------------- reference


def list_complications(s: Session) -> list[S.ComplicationOut]:
    rows = s.scalars(select(Complication).order_by(Complication.difficulty, Complication.name))
    return [S.ComplicationOut.model_validate(c) for c in rows]


def get_complication(s: Session, slug: str) -> tuple[S.ComplicationOut, list[S.WatchCard]] | None:
    c = s.scalars(select(Complication).where(Complication.slug == slug)).first()
    if not c:
        return None
    return S.ComplicationOut.model_validate(c), list_watches(s, complication=slug, sort="price_asc")


def get_movement(s: Session, slug: str) -> tuple[S.MovementOut, list[S.WatchCard]] | None:
    m = s.scalars(select(Movement).where(Movement.slug == slug)).first()
    if not m:
        return None
    watches = s.scalars(select(Watch).where(Watch.movement_id == m.id).options(*_WATCH_LOAD)).all()
    return S.MovementOut.model_validate(m), [watch_card(w) for w in watches]


def movement_slugs(s: Session) -> list[str]:
    """Калибры, на которых работает хотя бы одна модель атласа (для sitemap)."""
    return list(s.scalars(select(Movement.slug).where(Movement.id.in_(select(Watch.movement_id))).order_by(Movement.slug)))


def part_photos(s: Session) -> dict[str, list[S.Photo]]:
    return {row.key: [S.Photo(**p) for p in row.photos] for row in s.scalars(select(PartPhoto))}


def credits(s: Session) -> list[S.Credit]:
    """Авторы и лицензии всех фотографий на сайте."""
    rows = s.scalars(select(Watch).options(selectinload(Watch.brand)).order_by(Watch.slug))
    out = [
        S.Credit(subject=f"{w.brand.name} {w.name}", href=f"/watch/{w.slug}", photo=S.Photo(**p))
        for w in rows for p in (w.photos or [])
    ]
    for row in s.scalars(select(PartPhoto).order_by(PartPhoto.key)):
        subject = "Разобранный механизм" if row.key.startswith("exploded") else "Деталь механизма"
        out += [S.Credit(subject=subject, photo=S.Photo(**p)) for p in row.photos]
    return out


def site_stats(s: Session) -> S.SiteStats:
    watches = s.scalars(select(Watch).options(selectinload(Watch.movement))).all()
    in_house = sum(1 for w in watches if w.movement.in_house)
    meta = {m.key: m.value for m in s.scalars(select(Meta))}
    return S.SiteStats(
        countries=s.scalar(select(func.count(Country.id))) or 0,
        brands=s.scalar(select(func.count(Brand.id))) or 0,
        watches=len(watches),
        movements=s.scalar(select(func.count(Movement.id))) or 0,
        complications=s.scalar(select(func.count(Complication.id))) or 0,
        in_house_share=round(in_house / len(watches), 3) if watches else 0.0,
        prices=price_stats(w.price_usd for w in watches),
        content_digest=meta.get("content_digest"),
        built_at=meta.get("built_at"),
    )
