"""Поиск по каталогу: бренды, модели, референции, усложнения, страны.

Каталог небольшой (сотни записей), поэтому поиск идёт в памяти: нормализация,
транслитерация кириллицы («ролекс» → «roleks») и нечёткое сравнение.
"""

from __future__ import annotations

import difflib
import unicodedata

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..api import schemas as S
from ..db.models import Brand, Complication, Country, Movement, Watch

_TRANSLIT = str.maketrans(
    {
        "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e", "ж": "zh", "з": "z", "и": "i",
        "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t",
        "у": "u", "ф": "f", "х": "h", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sch", "ъ": "", "ы": "y", "ь": "",
        "э": "e", "ю": "yu", "я": "ya",
    }
)


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text.lower())
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return " ".join(text.replace("-", " ").replace(".", " ").split())


def _variants(q: str) -> list[str]:
    n = normalize(q)
    t = n.translate(_TRANSLIT)
    # «кс» → «x»: «ролекс» → «rolex», «таг хойер» → «tag hoyer»
    return list(dict.fromkeys([n, t, t.replace("ks", "x")]))


def _token_score(token: str, words: list[str]) -> float:
    best = 0.0
    for word in words:
        if word == token:
            return 1.0
        if word.startswith(token):
            best = max(best, 0.9)
        elif token in word:
            best = max(best, 0.8)
        elif len(token) >= 4:
            r = difflib.SequenceMatcher(None, token, word).ratio()
            if r >= 0.72:
                best = max(best, r * 0.8)
    return best


def _score(queries: list[str], fields: list[str]) -> float:
    """Каждое слово запроса должно найтись в поле (точно, по префиксу или нечётко)."""
    best = 0.0
    for f in fields:
        words = normalize(f).split()
        if not words:
            continue
        for q in queries:
            tokens = q.split()
            scores = [_token_score(t, words) for t in tokens]
            if all(scores):
                best = max(best, sum(scores) / len(scores) + (0.05 if normalize(f) == q else 0))
    return best


def search(s: Session, q: str, limit: int = 24) -> list[S.SearchHit]:
    queries = [v for v in _variants(q) if len(v) >= 2]
    if not queries:
        return []
    hits: list[tuple[float, S.SearchHit]] = []

    for c in s.scalars(select(Country)):
        sc = _score(queries, [c.name, c.name_en])
        if sc:
            hits.append((sc + 0.05, S.SearchHit(kind="country", slug=c.slug, title=c.name, subtitle=c.tagline, url=f"/country/{c.slug}")))

    for b in s.scalars(select(Brand).options(selectinload(Brand.country))):
        sc = _score(queries, [b.name, *b.aliases])
        if sc:
            hits.append((sc + 0.1, S.SearchHit(kind="brand", slug=b.slug, title=b.name, subtitle=f"{b.country.name}, с {b.founded} года", url=f"/brand/{b.slug}")))

    for w in s.scalars(select(Watch).options(selectinload(Watch.brand))):
        fields = [w.name, f"{w.brand.name} {w.name}", w.reference or "", w.collection or "", *w.brand.aliases]
        sc = _score(queries, fields)
        if sc:
            sub = " ".join(x for x in (w.brand.name, w.reference) if x)
            hits.append((sc, S.SearchHit(kind="watch", slug=w.slug, title=f"{w.brand.name} {w.name}", subtitle=sub, url=f"/watch/{w.slug}")))

    for c in s.scalars(select(Complication)):
        sc = _score(queries, [c.name, c.name_en])
        if sc:
            hits.append((sc, S.SearchHit(kind="complication", slug=c.slug, title=c.name, subtitle=c.short, url=f"/complication/{c.slug}")))

    # калибры, на которых работает хотя бы одна модель: «3235», «El Primero», «Spring Drive»
    used = select(Watch.movement_id)
    for m in s.scalars(select(Movement).where(Movement.id.in_(used))):
        fields = [m.caliber, f"{m.maker} {m.caliber}", m.caliber.split()[-1]]
        if m.type == "spring_drive":
            fields.append("Spring Drive")
        sc = _score(queries, fields)
        if sc:
            hits.append((sc - 0.02, S.SearchHit(kind="movement", slug=m.slug, title=f"Калибр {m.caliber}", subtitle=m.maker, url=f"/movement/{m.slug}")))

    hits.sort(key=lambda h: -h[0])
    return [h for _, h in hits[:limit]]
