"""Чтение и перекрёстная проверка YAML-контента.

Структура папки ``content/``::

    countries.yaml          список стран
    complications.yaml      словарь усложнений
    movements.yaml          общие калибры (ETA, Sellita, Miyota, Seiko NH...)
    brands/<country>/<brand>.yaml   бренд + его калибры + модели
    photos.yaml             настоящие фото моделей (генерирует scripts/photos.py)
    part_photos.yaml        фото деталей для режима разборки
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from pathlib import Path

import yaml
from pydantic import TypeAdapter, ValidationError

from .schema import BrandFile, ContentComplication, ContentCountry, ContentMovement, ContentPhoto


class ContentError(RuntimeError):
    """Ошибка в YAML-контенте с указанием файла."""


@dataclass
class ContentBundle:
    countries: list[ContentCountry]
    complications: list[ContentComplication]
    movements: list[ContentMovement]
    brand_files: list[BrandFile]
    digest: str
    photos: dict[str, list[ContentPhoto]] = field(default_factory=dict)
    part_photos: dict[str, list[ContentPhoto]] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)

    @property
    def watch_count(self) -> int:
        return sum(len(bf.watches) for bf in self.brand_files)


def _load_yaml(path: Path):
    try:
        with path.open(encoding="utf-8") as fh:
            return yaml.safe_load(fh)
    except yaml.YAMLError as exc:  # pragma: no cover - сообщение важнее покрытия
        raise ContentError(f"{path}: invalid YAML: {exc}") from exc


def _validate(adapter: TypeAdapter, data, path: Path):
    try:
        return adapter.validate_python(data)
    except ValidationError as exc:
        raise ContentError(f"{path}:\n{exc}") from exc


def content_files(content_dir: Path) -> list[Path]:
    return sorted(p for p in content_dir.rglob("*.yaml") if p.is_file())


def content_digest(content_dir: Path) -> str:
    """Хеш всего контента: база пересобирается, когда он меняется."""
    h = hashlib.sha256()
    for path in content_files(content_dir):
        h.update(str(path.relative_to(content_dir)).encode())
        h.update(path.read_bytes())
    return h.hexdigest()[:16]


def load_content(content_dir: Path) -> ContentBundle:
    countries = _validate(
        TypeAdapter(list[ContentCountry]), _load_yaml(content_dir / "countries.yaml"), content_dir / "countries.yaml"
    )
    complications = _validate(
        TypeAdapter(list[ContentComplication]),
        _load_yaml(content_dir / "complications.yaml"),
        content_dir / "complications.yaml",
    )
    movements = list(
        _validate(
            TypeAdapter(list[ContentMovement]), _load_yaml(content_dir / "movements.yaml"), content_dir / "movements.yaml"
        )
    )

    brand_adapter = TypeAdapter(BrandFile)
    brand_files: list[BrandFile] = []
    for path in sorted((content_dir / "brands").rglob("*.yaml")):
        bf = _validate(brand_adapter, _load_yaml(path), path)
        if path.parent.name != bf.brand.country:
            raise ContentError(f"{path}: brand.country={bf.brand.country!r} must match folder {path.parent.name!r}")
        brand_files.append(bf)
        movements.extend(bf.movements)

    photo_map = TypeAdapter(dict[str, list[ContentPhoto]])

    def load_photo_map(name: str) -> dict[str, list[ContentPhoto]]:
        path = content_dir / name
        return _validate(photo_map, _load_yaml(path) or {}, path) if path.exists() else {}

    photos = load_photo_map("photos.yaml")
    part_photos = load_photo_map("part_photos.yaml")

    bundle = ContentBundle(
        photos=photos,
        part_photos=part_photos,
        countries=list(countries),
        complications=list(complications),
        movements=movements,
        brand_files=brand_files,
        digest=content_digest(content_dir),
    )
    _cross_check(bundle)
    return bundle


def _dupes(items: list[str]) -> set[str]:
    seen, dup = set(), set()
    for i in items:
        (dup if i in seen else seen).add(i)
    return dup


def _cross_check(bundle: ContentBundle) -> None:
    errors: list[str] = []
    country_slugs = {c.slug for c in bundle.countries}
    comp_slugs = {c.slug for c in bundle.complications}
    mov_slugs = [m.slug for m in bundle.movements]
    brand_slugs = [bf.brand.slug for bf in bundle.brand_files]
    watch_slugs = [w.slug for bf in bundle.brand_files for w in bf.watches]

    for label, values in (("movement", mov_slugs), ("brand", brand_slugs), ("watch", watch_slugs)):
        for d in sorted(_dupes(values)):
            errors.append(f"duplicate {label} slug: {d}")

    mov_set = set(mov_slugs)
    for bf in bundle.brand_files:
        b = bf.brand
        if b.country not in country_slugs:
            errors.append(f"brand {b.slug}: unknown country {b.country}")
        if not bf.watches:
            bundle.warnings.append(f"brand {b.slug}: no watches")
        for w in bf.watches:
            if w.movement not in mov_set:
                errors.append(f"watch {w.slug}: unknown movement {w.movement}")
            for c in w.complications:
                if c not in comp_slugs:
                    errors.append(f"watch {w.slug}: unknown complication {c}")
    known = set(watch_slugs)
    for slug in bundle.photos:
        if slug not in known:
            errors.append(f"photos.yaml: unknown watch {slug}")
    if errors:
        raise ContentError("Content cross-check failed:\n  " + "\n  ".join(errors))
