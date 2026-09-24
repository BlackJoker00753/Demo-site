"""Pydantic-модели ответов API (контракт между бэкендом и фронтендом)."""

from __future__ import annotations

import datetime as dt
from typing import Any

from pydantic import BaseModel, ConfigDict


class Out(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class PriceStats(Out):
    count: int
    avg: int | None
    median: int | None
    min: int | None
    max: int | None


class Price(Out):
    usd: int
    kind: str
    source: str
    url: str | None
    checked: dt.date
    note: str | None = None


class PricePoint(Out):
    usd: int
    source: str
    kind: str
    fetched_at: dt.datetime


class Photo(Out):
    file: str
    width: int
    height: int
    focus: tuple[float, float]
    title: str
    caption: str | None = None
    author: str
    license: str
    license_url: str
    source_url: str | None = None


class Fact(Out):
    label: str
    value: str


class City(Out):
    name: str
    lat: float
    lon: float
    note: str | None = None


# ---------------------------------------------------------------- countries


class CountrySummary(Out):
    slug: str
    name: str
    name_en: str
    iso_a3: str
    lat: float
    lon: float
    altitude: float
    tagline: str
    brand_count: int
    watch_count: int
    prices: PriceStats


class BrandCard(Out):
    slug: str
    name: str
    country: str
    founded: int
    city: str
    lat: float
    lon: float
    tier: str
    tagline: str
    group: str | None
    independent: bool
    manufacture: str
    watch_count: int
    prices: PriceStats
    hero_render: dict[str, Any] | None = None
    hero_photo: Photo | None = None
    hero_slug: str | None = None
    hero_name: str | None = None


class CountryDetail(CountrySummary):
    intro: list[str]
    cities: list[City]
    facts: list[Fact]
    brands: list[BrandCard]


# ---------------------------------------------------------------- catalog


class MovementOut(Out):
    slug: str
    caliber: str
    maker: str
    type: str
    in_house: bool
    base: str | None
    power_reserve_h: float | None
    frequency_vph: int | None
    jewels: int | None
    year: int | None
    diameter_mm: float | None
    thickness_mm: float | None
    accuracy: str | None
    certification: str | None
    features: list[str]
    description: str | None


class ComplicationOut(Out):
    slug: str
    name: str
    name_en: str
    category: str
    difficulty: int
    short: str
    description: str
    how_it_works: str
    invented: str | None
    tab: bool


class ComplicationRef(Out):
    slug: str
    name: str
    category: str


class WatchCard(Out):
    slug: str
    name: str
    brand: str
    brand_name: str
    collection: str | None
    reference: str | None
    year_introduced: int | None
    status: str
    movement_type: str
    in_house: bool
    caliber: str
    diameter_mm: float
    thickness_mm: float | None = None
    frequency_vph: int | None = None
    price: Price
    complications: list[ComplicationRef]
    icon: bool
    render: dict[str, Any]
    photo: Photo | None = None


class Facet(Out):
    key: str
    label: str
    count: int
    kind: str  # "all" | "movement" | "complication"


class Milestone(Out):
    year: int
    text: str


class BrandDetail(BrandCard):
    founder: str
    story: list[str]
    manufacture_note: str | None
    website: str | None
    facts: list[Fact]
    milestones: list[Milestone]
    country_name: str
    facets: list[Facet]
    watches: list[WatchCard]


class HistoryEntry(Out):
    year: int
    ref: str | None
    title: str
    text: str


class CaseInfo(Out):
    diameter_mm: float
    thickness_mm: float | None
    material: str
    water_resistance_m: int | None
    crystal: str
    lug_width_mm: float | None


class WatchDetail(WatchCard):
    country: str
    country_name: str
    year_current: int | None
    designer: str | None
    case: CaseInfo
    bracelet: str | None
    dial: str | None
    summary: str
    story: list[str]
    history: list[HistoryEntry]
    highlights: list[str]
    movement: MovementOut
    complications_full: list[ComplicationOut]
    price_history: list[PricePoint]
    brand_prices: PriceStats
    siblings: list[WatchCard]
    photos: list[Photo]


# ---------------------------------------------------------------- misc


class SearchHit(Out):
    kind: str  # brand | watch | complication | country
    slug: str
    title: str
    subtitle: str
    url: str


class Credit(Out):
    watch: str
    watch_name: str
    photo: Photo


class SiteStats(Out):
    countries: int
    brands: int
    watches: int
    movements: int
    complications: int
    in_house_share: float
    prices: PriceStats
    content_digest: str | None
    built_at: str | None
