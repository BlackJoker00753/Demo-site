# Horologium

**Интерактивный атлас часового искусства.** Не магазин, а энциклопедия: глобус со странами, мануфактуры, модели, механизмы, усложнения и актуальные цены. Каждую модель можно покрутить в 3D и разобрать до последнего винта.

## Быстрый старт

Нужен только [uv](https://docs.astral.sh/uv/) (он сам поставит Python 3.12 и зависимости).

```bash
uv sync
uv run horologium serve
```

Откройте http://127.0.0.1:8000. База SQLite собирается из YAML-контента автоматически при первом запуске и при любом изменении файлов в `content/`.

## Команды

| Команда | Что делает |
|---|---|
| `uv run horologium serve [--reload]` | запустить сайт |
| `uv run horologium check` | проверить YAML-контент (схема и перекрёстные ссылки) |
| `uv run horologium build-db` | принудительно пересобрать SQLite |
| `uv run horologium prices report` | свежесть цен по брендам |
| `uv run horologium prices refresh [--brand rolex] [--dry-run]` | обновить цены с сайтов, где они доступны |
| `uv run pytest` | тесты |
| `uv run python scripts/fetch_assets.py` | заново скачать библиотеки, шрифты, текстуры и спутниковые снимки |

API-документация: http://127.0.0.1:8000/api/docs

## Документация

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): устройство системы, потоки данных, решения
- [docs/PROGRESS.md](docs/PROGRESS.md): журнал работ по блокам
- [docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md): как добавить страну, бренд, модель, цену
- [docs/DESIGN.md](docs/DESIGN.md): дизайн-система, анимации, 3D
- [AGENTS.md](AGENTS.md): короткая памятка для ИИ-агентов, продолжающих проект
