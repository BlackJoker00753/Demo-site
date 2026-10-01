# Horologium

**Интерактивный атлас часового искусства.** Не магазин, а энциклопедия: глобус со странами, мануфактуры, модели, механизмы, усложнения и цены с источниками. Фотографии часов настоящие: официальные студийные снимки брендов и снимки под свободными лицензиями (авторы на странице «Авторы фотографий»). На странице модели часы разбираются по скроллу: у GMT-Master II, Submariner и Spirit Zulu Time до каждой детали (изображения деталей создал ИИ по официальным фото, это подписано), у остальных 3D-схема и снимки разобранных калибров.

Работает на телефоне и офлайн (PWA), цены показываются в USD, EUR, RUB и KZT по свежему курсу.

Что есть на сайте:

| Адрес | Что там |
|---|---|
| `/` | глобус со странами-производителями |
| `/country/<slug>`, `/brand/<slug>` | страна и мануфактура: история, средняя цена, модели |
| `/watch/<slug>` | модель: фото, характеристики, разборка по скроллу, примерка на запястье, калькулятор владения |
| `/watches` | каталог всех моделей с фильтрами (состояние в адресе) |
| `/movements`, `/movement/<slug>` | калибры, стандарты точности, звук хода спуска |
| `/glossary`, `/complication/<slug>` | 21 усложнение; у репетира, хронографа, календарей, турбийона и мирового времени есть симуляторы |
| `/history` | 500 лет часового дела лентой времени |
| `/timegrapher` | виртуальный виброграф: ход, амплитуда, погрешность по положениям |
| `/tco` | ликвидность и стоимость владения: обслуживание, страховка, вторичный рынок |
| `/worldtime` | мировое время: 24 пояса и система Луи Котье |
| `/compare` | сравнение моделей |

## Быстрый старт

Нужен только [uv](https://docs.astral.sh/uv/) (он сам поставит Python 3.12 и зависимости).

```bash
uv sync
uv run horologium serve
```

Откройте http://127.0.0.1:8765. База SQLite собирается из YAML-контента автоматически при первом запуске и при любом изменении файлов в `content/`.

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
| `uv run python scripts/photos.py ...` | поиск и выбор фотографий (см. docs/CONTENT_GUIDE.md) |
| `uv run python scripts/cutouts.py prim` | нарезать снимок разобранного механизма на детали |
| `uv run python scripts/teardown.py page` | страница заданий для генерации деталей в Nano Banana Pro |
| `uv run --group teardown python scripts/teardown.py import`, `review <slug>`, `build <slug>`, `sheet <slug>` | собрать разборку модели до детали (см. content/teardown/README.md) |
| `uv run python scripts/photos_webp.py` | WebP-копии фото (сайт отдаёт WebP, JPEG запасной) |
| `uv run --with fonttools --with brotli python scripts/brand_assets.py` | превью ссылок и иконки приложения |
| `node scripts/site_audit.mjs http://127.0.0.1:8765` | обойти все страницы в безголовом Chrome: ошибки JS, битые запросы, горизонтальный скролл, «undefined» в тексте (ПК и телефон) |
| `node scripts/teardown_shots.mjs <адрес модели> <префикс>` | кадры 3D-разборки: собраны, по оси, на лотке |

Переменные окружения: `HOROLOGIUM_SITE_URL` (публичный адрес для canonical, Open Graph и sitemap),
`HOROLOGIUM_RATES_LIVE=0` (не ходить в сеть за курсами валют), `HOROLOGIUM_DB`, `HOROLOGIUM_CONTENT`.

API-документация: http://127.0.0.1:8765/api/docs

## Документация

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): устройство системы, потоки данных, решения
- [docs/PROGRESS.md](docs/PROGRESS.md): журнал работ по блокам
- [docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md): как добавить страну, бренд, модель, цену
- [docs/DESIGN.md](docs/DESIGN.md): дизайн-система, анимации, 3D
- [AGENTS.md](AGENTS.md): короткая памятка для ИИ-агентов, продолжающих проект
