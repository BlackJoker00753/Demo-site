"""Схема YAML-контента.

YAML в папке ``content/`` является источником истины. Эти модели валидируют
его при сборке базы: опечатка в ключе или неверный тип дают понятную ошибку
с путём до поля, а не «тихо» ломают сайт.

Документация по заполнению: ``docs/CONTENT_GUIDE.md``.
"""

from __future__ import annotations

import datetime as dt
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

SLUG_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"

MovementType = Literal[
    "automatic",  # механика с автоподзаводом
    "manual",  # механика с ручным заводом
    "quartz",  # кварц на батарейке
    "solar",  # кварц со светонакопителем (Eco-Drive, Solar)
    "kinetic",  # кварц с генератором от ротора
    "spring_drive",  # гибрид Seiko: пружина + кварцевый регулятор
    "smart",  # смарт-часы
]

ComplicationCategory = Literal["time", "calendar", "chronograph", "astronomy", "acoustic", "regulation", "display", "tool"]

Tier = Literal["accessible", "mid", "premium", "luxury", "haute"]
PriceKind = Literal["msrp", "market", "estimate"]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


# ---------------------------------------------------------------- reference data


class ContentCity(Strict):
    name: str
    lat: float
    lon: float
    note: str | None = None


class ContentCountry(Strict):
    slug: str = Field(pattern=SLUG_PATTERN)
    name: str
    name_en: str
    iso_a3: str = Field(min_length=3, max_length=3)
    lat: float
    lon: float
    # Высота камеры над глобусом при фокусе на стране (в радиусах Земли).
    altitude: float = 0.9
    tagline: str
    intro: list[str]
    cities: list[ContentCity] = []
    facts: list[ContentFact] = []
    sort: int = 100


class ContentFact(Strict):
    label: str
    value: str


class ContentComplication(Strict):
    slug: str = Field(pattern=SLUG_PATTERN)
    name: str
    name_en: str
    category: ComplicationCategory
    difficulty: int = Field(ge=1, le=5)
    short: str
    description: str
    how_it_works: str
    invented: str | None = None
    tab: bool = True  # показывать отдельной вкладкой в каталоге бренда


class ContentMovement(Strict):
    slug: str = Field(pattern=SLUG_PATTERN)
    caliber: str
    maker: str
    type: MovementType
    in_house: bool
    base: str | None = None  # на чём основан (ETA 2824-2, Sellita SW200-1, Miyota 9015...)
    power_reserve_h: float | None = None
    frequency_vph: int | None = None
    jewels: int | None = None
    year: int | None = None
    diameter_mm: float | None = None
    thickness_mm: float | None = None
    accuracy: str | None = None
    certification: str | None = None
    features: list[str] = []
    description: str | None = None


# ---------------------------------------------------------------- 3D render spec


class RenderCase(Strict):
    shape: Literal["round", "cushion", "octagon", "porthole", "rect", "tonneau", "square", "tv"] = "round"
    material: Literal[
        "steel", "yellow_gold", "rose_gold", "white_gold", "platinum", "titanium", "ceramic_black",
        "ceramic_white", "bronze", "carbon", "resin_black", "resin_white", "two_tone_yellow",
        "two_tone_rose", "aluminium", "sapphire",
    ] = "steel"
    finish: Literal["polished", "brushed", "mixed"] = "mixed"
    lugs: Literal["standard", "twisted", "integrated", "hooded", "wire", "none", "horns"] = "standard"
    crown_guard: bool = False
    pushers: int = Field(default=0, ge=0, le=3)
    crown_side: Literal["right", "left", "top"] = "right"
    display_back: bool = False
    aspect: float = 1.0  # высота/ширина для прямоугольных корпусов


class RenderBezel(Strict):
    type: Literal[
        "none", "smooth", "fluted", "dive", "gmt", "tachymeter", "octagon", "hexagon", "coin", "countdown", "compass",
        "slide_rule", "screws", "digital",
    ] = "smooth"
    color: str | None = None
    color2: str | None = None  # вторая половина GMT-безеля
    text_color: str | None = None  # цвет шкалы (например, золотые цифры)
    material: Literal["metal", "ceramic", "aluminium", "sapphire", "resin"] = "metal"


class RenderDial(Strict):
    color: str = "#16181c"
    color2: str | None = None  # для fume/sector/gradient
    finish: Literal[
        "sunburst", "matte", "lacquer", "tapisserie", "snowflake", "fume", "grained", "linen", "sector",
        "enamel", "skeleton", "stripes", "waffle", "ice", "mother_of_pearl", "guilloche", "clous",
        "textured", "lcd", "screen", "meteorite", "wave",
    ] = "sunburst"
    indices: Literal[
        "dots", "baton", "arabic", "roman", "breguet", "mixed", "explorer", "sticks", "none", "applied_arabic",
        "diamond", "sector", "railway", "california",
    ] = "baton"
    index_color: str = "#e9ecef"
    text_color: str = "#e9ecef"
    lume: bool = True
    lume_color: str = "#dfeee4"
    track: Literal["none", "minutes", "railway", "tachy", "pulsometer"] = "minutes"


class RenderHands(Strict):
    style: Literal[
        "mercedes", "sword", "dauphine", "baton", "alpha", "leaf", "breguet", "snowflake", "arrow", "syringe",
        "pencil", "cathedral", "skeleton", "feuille", "plongeur", "lance", "none",
    ] = "baton"
    color: str = "#e9ecef"
    seconds_color: str | None = None
    lume: bool = True
    seconds: Literal["center", "small", "none"] = "center"
    gmt_color: str | None = None


class RenderSubdial(Strict):
    pos: Literal[3, 6, 9, 12]
    kind: Literal[
        "chrono_min", "chrono_hr", "small_seconds", "power_reserve", "moonphase", "date", "day", "gmt_24",
        "tourbillon", "month", "week", "leap_year", "chrono_sec",
    ]
    color: str | None = None


class RenderStrap(Strict):
    type: Literal[
        "oyster", "jubilee", "president", "integrated", "three_link", "five_link", "leather", "alligator",
        "rubber", "nato", "mesh", "resin", "fabric", "titanium", "none",
    ] = "leather"
    color: str | None = None


class RenderSpec(Strict):
    case: RenderCase = RenderCase()
    bezel: RenderBezel = RenderBezel()
    dial: RenderDial = RenderDial()
    hands: RenderHands = RenderHands()
    subdials: list[RenderSubdial] = []
    date: Literal["none", "3", "6", "4_30", "12", "big_12", "day_date"] = "none"
    cyclops: bool = False
    moonphase: Literal["none", "6", "12", "subdial"] = "none"
    strap: RenderStrap = RenderStrap()
    crystal: Literal["sapphire", "hesalite", "box", "domed"] = "sapphire"
    logo: str | None = None  # текстовая подпись на циферблате (без логотипов-изображений)
    movement_plate: Literal["rhodium", "german_silver", "gilt", "black"] = "rhodium"  # отделка механизма в 3D
    blue_spring: bool = False  # синяя спираль баланса (Rolex Parachrom Blue и т.п.)


# ---------------------------------------------------------------- watches & brands


class ContentPhoto(Strict):
    """Настоящая фотография под свободной лицензией (см. scripts/photos.py)."""

    file: str  # путь без суффикса размера: <slug>/<n>, файлы <n>-480.jpg, -960.jpg, -1600.jpg
    width: int
    height: int
    focus: tuple[float, float] = (0.5, 0.5)  # точка кадрирования (object-position)
    title: str = ""
    caption: str | None = None  # уточнение, если на фото другая версия модели
    author: str
    license: str
    license_url: str = ""
    source_url: str | None = None


class ContentPrice(Strict):
    usd: int = Field(gt=0)
    kind: PriceKind = "msrp"
    source: str
    url: str | None = None
    checked: dt.date
    note: str | None = None


class ContentHistoryEntry(Strict):
    year: int
    ref: str | None = None
    title: str
    text: str


class ContentCaseInfo(Strict):
    diameter_mm: float
    thickness_mm: float | None = None
    material: str
    water_resistance_m: int | None = None
    crystal: str = "Сапфировое стекло"
    lug_width_mm: float | None = None


class ContentWatch(Strict):
    slug: str = Field(pattern=SLUG_PATTERN)
    name: str
    collection: str | None = None
    reference: str | None = None
    year_introduced: int | None = None  # дебют линейки / модели
    year_current: int | None = None  # год выхода актуальной референции
    designer: str | None = None
    status: Literal["current", "discontinued", "limited"] = "current"
    movement: str  # slug механизма
    complications: list[str] = []
    case: ContentCaseInfo
    bracelet: str | None = None
    dial: str | None = None
    price: ContentPrice
    summary: str
    story: list[str] = []
    history: list[ContentHistoryEntry] = []
    highlights: list[str] = []
    icon: bool = False
    render: RenderSpec = RenderSpec()
    sort: int = 100


class ContentMilestone(Strict):
    year: int
    text: str


class ContentBrand(Strict):
    slug: str = Field(pattern=SLUG_PATTERN)
    name: str
    aliases: list[str] = []  # написания для поиска: «ролекс», «омега»...
    country: str  # slug страны
    founded: int
    founder: str
    city: str
    lat: float
    lon: float
    group: str | None = None
    independent: bool = False
    tier: Tier
    tagline: str
    story: list[str]
    manufacture: Literal["full", "partial", "none"] = "partial"
    manufacture_note: str | None = None
    website: str | None = None
    facts: list[ContentFact] = []
    milestones: list[ContentMilestone] = []
    sort: int = 100


class BrandFile(Strict):
    """Один YAML-файл = один бренд, его собственные калибры и модели."""

    brand: ContentBrand
    movements: list[ContentMovement] = []
    watches: list[ContentWatch] = []

    @field_validator("watches")
    @classmethod
    def _unique_watch_slugs(cls, watches: list[ContentWatch]) -> list[ContentWatch]:
        seen: set[str] = set()
        for w in watches:
            if w.slug in seen:
                raise ValueError(f"duplicate watch slug: {w.slug}")
            seen.add(w.slug)
        return watches


ContentCountry.model_rebuild()
