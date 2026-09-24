"""Пути и настройки приложения.

Все пути вычисляются от корня репозитория, поэтому приложение можно запускать
из любой рабочей директории. Любую настройку можно переопределить переменной
окружения с префиксом ``HOROLOGIUM_``.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]


def _env_path(name: str, default: Path) -> Path:
    value = os.environ.get(name)
    return Path(value).expanduser().resolve() if value else default


@dataclass(frozen=True)
class Settings:
    root_dir: Path = ROOT_DIR
    content_dir: Path = field(default_factory=lambda: _env_path("HOROLOGIUM_CONTENT", ROOT_DIR / "content"))
    frontend_dir: Path = field(default_factory=lambda: _env_path("HOROLOGIUM_FRONTEND", ROOT_DIR / "frontend"))
    data_dir: Path = field(default_factory=lambda: _env_path("HOROLOGIUM_DATA", ROOT_DIR / "data"))
    site_name: str = "Horologium"
    site_tagline: str = "Атлас часового искусства"
    # Перестраивать SQLite при старте, если YAML-контент изменился.
    auto_rebuild: bool = field(default_factory=lambda: os.environ.get("HOROLOGIUM_AUTO_REBUILD", "1") != "0")

    @property
    def db_path(self) -> Path:
        return _env_path("HOROLOGIUM_DB", self.data_dir / "horologium.sqlite3")

    @property
    def db_url(self) -> str:
        return f"sqlite:///{self.db_path}"


settings = Settings()
