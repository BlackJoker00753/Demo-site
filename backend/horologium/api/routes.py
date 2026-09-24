"""HTTP-роуты API v1. Тонкий слой: валидация параметров → сервис → ответ."""

from __future__ import annotations

from collections.abc import Iterator
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db.base import session_factory
from ..services import catalog, search as search_service
from . import schemas as S

router = APIRouter(prefix="/api/v1")


def get_session() -> Iterator[Session]:
    session = session_factory()()
    try:
        yield session
    finally:
        session.close()


DB = Annotated[Session, Depends(get_session)]


def _found(obj, what: str):
    if obj is None:
        raise HTTPException(status_code=404, detail=f"{what} not found")
    return obj


@router.get("/stats", response_model=S.SiteStats)
def stats(s: DB):
    return catalog.site_stats(s)


@router.get("/countries", response_model=list[S.CountrySummary])
def countries(s: DB):
    return catalog.list_countries(s)


@router.get("/countries/{slug}", response_model=S.CountryDetail)
def country(slug: str, s: DB):
    return _found(catalog.get_country(s, slug), "country")


@router.get("/brands", response_model=list[S.BrandCard])
def brands(s: DB, country: str | None = None):
    return catalog.list_brands(s, country)


@router.get("/brands/{slug}", response_model=S.BrandDetail)
def brand(slug: str, s: DB):
    return _found(catalog.get_brand(s, slug), "brand")


@router.get("/watches", response_model=list[S.WatchCard])
def watches(
    s: DB,
    brand: str | None = None,
    country: str | None = None,
    type: str | None = Query(default=None, description="automatic | manual | mechanical | quartz | ..."),
    complication: str | None = None,
    icons: bool = False,
    sort: Literal["default", "price_asc", "price_desc", "year", "name"] = "default",
    limit: int = Query(default=500, ge=1, le=1000),
):
    return catalog.list_watches(
        s, brand=brand, country=country, movement_type=type, complication=complication,
        icons_only=icons, sort=sort, limit=limit,
    )


@router.get("/watches/{slug}", response_model=S.WatchDetail)
def watch(slug: str, s: DB):
    return _found(catalog.get_watch(s, slug), "watch")


@router.get("/complications", response_model=list[S.ComplicationOut])
def complications(s: DB):
    return catalog.list_complications(s)


class ComplicationPage(BaseModel):
    complication: S.ComplicationOut
    watches: list[S.WatchCard]


@router.get("/complications/{slug}", response_model=ComplicationPage)
def complication(slug: str, s: DB):
    comp, watches = _found(catalog.get_complication(s, slug), "complication")
    return ComplicationPage(complication=comp, watches=watches)


class MovementPage(BaseModel):
    movement: S.MovementOut
    watches: list[S.WatchCard]


@router.get("/movements/{slug}", response_model=MovementPage)
def movement(slug: str, s: DB):
    mov, watches = _found(catalog.get_movement(s, slug), "movement")
    return MovementPage(movement=mov, watches=watches)


@router.get("/credits", response_model=list[S.Credit])
def credits(s: DB):
    return catalog.credits(s)


@router.get("/search", response_model=list[S.SearchHit])
def search(s: DB, q: str = Query(min_length=1, max_length=80)):
    return search_service.search(s, q)
