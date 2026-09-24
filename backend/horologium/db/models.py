"""ORM-модели SQLite.

База — производная от YAML-контента (см. ``db/build.py``), кроме таблицы
``price_snapshots``: туда пишет обновлялка цен, и она переживает пересборку.
"""

from __future__ import annotations

import datetime as dt
from typing import Any

from sqlalchemy import JSON, Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Table, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    type_annotation_map = {dict[str, Any]: JSON, list[Any]: JSON}


watch_complications = Table(
    "watch_complications",
    Base.metadata,
    Column("watch_id", ForeignKey("watches.id", ondelete="CASCADE"), primary_key=True),
    Column("complication_id", ForeignKey("complications.id", ondelete="CASCADE"), primary_key=True),
)


class Meta(Base):
    __tablename__ = "meta"
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str] = mapped_column(Text)


class Country(Base):
    __tablename__ = "countries"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128))
    name_en: Mapped[str] = mapped_column(String(128))
    iso_a3: Mapped[str] = mapped_column(String(3), index=True)
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    altitude: Mapped[float] = mapped_column(Float)
    tagline: Mapped[str] = mapped_column(Text)
    intro: Mapped[list[Any]] = mapped_column(JSON, default=list)
    cities: Mapped[list[Any]] = mapped_column(JSON, default=list)
    facts: Mapped[list[Any]] = mapped_column(JSON, default=list)
    sort: Mapped[int] = mapped_column(Integer, default=100)

    brands: Mapped[list[Brand]] = relationship(back_populates="country", order_by="Brand.sort")


class Brand(Base):
    __tablename__ = "brands"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128))
    aliases: Mapped[list[Any]] = mapped_column(JSON, default=list)
    country_id: Mapped[int] = mapped_column(ForeignKey("countries.id"), index=True)
    founded: Mapped[int] = mapped_column(Integer)
    founder: Mapped[str] = mapped_column(String(256))
    city: Mapped[str] = mapped_column(String(128))
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    group: Mapped[str | None] = mapped_column(String(128))
    independent: Mapped[bool] = mapped_column(Boolean, default=False)
    tier: Mapped[str] = mapped_column(String(16))
    tagline: Mapped[str] = mapped_column(Text)
    story: Mapped[list[Any]] = mapped_column(JSON, default=list)
    manufacture: Mapped[str] = mapped_column(String(16))
    manufacture_note: Mapped[str | None] = mapped_column(Text)
    website: Mapped[str | None] = mapped_column(String(256))
    facts: Mapped[list[Any]] = mapped_column(JSON, default=list)
    milestones: Mapped[list[Any]] = mapped_column(JSON, default=list)
    sort: Mapped[int] = mapped_column(Integer, default=100)

    country: Mapped[Country] = relationship(back_populates="brands")
    watches: Mapped[list[Watch]] = relationship(back_populates="brand", order_by="Watch.sort")


class Complication(Base):
    __tablename__ = "complications"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128))
    name_en: Mapped[str] = mapped_column(String(128))
    category: Mapped[str] = mapped_column(String(32))
    difficulty: Mapped[int] = mapped_column(Integer)
    short: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    how_it_works: Mapped[str] = mapped_column(Text)
    invented: Mapped[str | None] = mapped_column(Text)
    tab: Mapped[bool] = mapped_column(Boolean, default=True)


class Movement(Base):
    __tablename__ = "movements"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    caliber: Mapped[str] = mapped_column(String(128))
    maker: Mapped[str] = mapped_column(String(128))
    type: Mapped[str] = mapped_column(String(16), index=True)
    in_house: Mapped[bool] = mapped_column(Boolean)
    base: Mapped[str | None] = mapped_column(String(128))
    power_reserve_h: Mapped[float | None] = mapped_column(Float)
    frequency_vph: Mapped[int | None] = mapped_column(Integer)
    jewels: Mapped[int | None] = mapped_column(Integer)
    year: Mapped[int | None] = mapped_column(Integer)
    diameter_mm: Mapped[float | None] = mapped_column(Float)
    thickness_mm: Mapped[float | None] = mapped_column(Float)
    accuracy: Mapped[str | None] = mapped_column(String(128))
    certification: Mapped[str | None] = mapped_column(String(128))
    features: Mapped[list[Any]] = mapped_column(JSON, default=list)
    description: Mapped[str | None] = mapped_column(Text)

    watches: Mapped[list[Watch]] = relationship(back_populates="movement")


class Watch(Base):
    __tablename__ = "watches"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(96), unique=True, index=True)
    brand_id: Mapped[int] = mapped_column(ForeignKey("brands.id"), index=True)
    movement_id: Mapped[int] = mapped_column(ForeignKey("movements.id"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    collection: Mapped[str | None] = mapped_column(String(128))
    reference: Mapped[str | None] = mapped_column(String(64))
    year_introduced: Mapped[int | None] = mapped_column(Integer)
    year_current: Mapped[int | None] = mapped_column(Integer)
    designer: Mapped[str | None] = mapped_column(String(256))
    status: Mapped[str] = mapped_column(String(16))
    case: Mapped[dict[str, Any]] = mapped_column(JSON)
    bracelet: Mapped[str | None] = mapped_column(String(256))
    dial: Mapped[str | None] = mapped_column(String(256))
    price_usd: Mapped[int] = mapped_column(Integer, index=True)
    price_kind: Mapped[str] = mapped_column(String(16))
    price_source: Mapped[str] = mapped_column(String(128))
    price_url: Mapped[str | None] = mapped_column(String(512))
    price_checked: Mapped[dt.date] = mapped_column(Date)
    price_note: Mapped[str | None] = mapped_column(Text)
    summary: Mapped[str] = mapped_column(Text)
    story: Mapped[list[Any]] = mapped_column(JSON, default=list)
    history: Mapped[list[Any]] = mapped_column(JSON, default=list)
    highlights: Mapped[list[Any]] = mapped_column(JSON, default=list)
    icon: Mapped[bool] = mapped_column(Boolean, default=False)
    render: Mapped[dict[str, Any]] = mapped_column(JSON)
    sort: Mapped[int] = mapped_column(Integer, default=100)

    brand: Mapped[Brand] = relationship(back_populates="watches")
    movement: Mapped[Movement] = relationship(back_populates="watches")
    complications: Mapped[list[Complication]] = relationship(secondary=watch_complications, order_by="Complication.difficulty")


class PriceSnapshot(Base):
    """История цен. Ключ — slug часов, чтобы переживать пересборку каталога."""

    __tablename__ = "price_snapshots"
    id: Mapped[int] = mapped_column(primary_key=True)
    watch_slug: Mapped[str] = mapped_column(String(96), index=True)
    price_usd: Mapped[int] = mapped_column(Integer)
    amount: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(3))
    kind: Mapped[str] = mapped_column(String(16))
    source: Mapped[str] = mapped_column(String(128))
    url: Mapped[str | None] = mapped_column(String(512))
    fetched_at: Mapped[dt.datetime] = mapped_column(DateTime)
