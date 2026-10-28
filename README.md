# Horologium

**Интерактивный атлас часового искусства.** Не магазин, а энциклопедия: глобус со странами, мануфактуры, модели, механизмы, усложнения и цены с источниками. Фотографии часов настоящие: официальные студийные снимки брендов и снимки под свободными лицензиями (авторы на странице «Авторы фотографий»).

У Submariner 124060 отдельная объёмная мастерская: плавная разборка и сборка, движение крепежа,
крупные планы узлов и объяснения по выбору детали. Геометрия восстановлена по официальным фото,
внутренний механизм учебный, упрощения подписаны. У GMT-Master II и Spirit Zulu Time сохраняется
разборка по скроллу до каждой детали (изображения создал ИИ по официальным фото, это подписано),
у остальных моделей 3D-схема и снимки разобранных калибров.

Работает на телефоне и офлайн (PWA), цены показываются в USD, EUR, RUB и KZT по свежему курсу.
Светлая и тёмная темы переключаются в шапке; выбор сохраняется. Стол мастерской светло-серый
в обеих темах, чтобы были видны тёмные детали.

Что есть на сайте:

| Адрес | Что там |
|---|---|
| `/` | глобус со странами-производителями |
| `/country/<slug>`, `/brand/<slug>` | страна и мануфактура: история, средняя цена, модели |
| `/watch/<slug>` | модель: фото, характеристики, интерактивная разборка, примерка на запястье, калькулятор владения |
| `/watches` | поиск, карточки порциями по 12, раскрываемые фильтры (состояние и объём выдачи в адресе) |
| `/movements`, `/movement/<slug>` | калибры, стандарты точности, звук хода спуска |
| `/glossary`, `/complication/<slug>` | 21 усложнение; у репетира, хронографа, календарей, турбийона и мирового времени есть симуляторы |
| `/history` | 500 лет часового дела лентой времени |
| `/timegrapher` | виртуальный виброграф: ход, амплитуда, погрешность по положениям |
| `/tco` | учебный сценарий стоимости владения: покупка, обслуживание, страховка и условная продажа |
| `/learn` | пять шагов знакомства с механизмом и ссылки к нужным этапам мастерской |
| `/methodology` | источники цен, формулы и ограничения учебных оценок |
| `/worldtime` | мировое время: 24 пояса и система Луи Котье |
| `/compare` | сравнение моделей |

## Быстрый старт

Нужен только [uv](https://docs.astral.sh/uv/) (он сам поставит Python 3.12 и зависимости).

```bash
uv sync
uv run horologium serve
```

Откройте http://127.0.0.1:8765. База SQLite собирается из YAML-контента автоматически при первом запуске и при любом изменении файлов в `content/`.

Размещение в интернете: [Deploy to Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2FBlackJoker00753%2FDemo-site%2Ftree%2Ffeat%2Fsubmariner-workshop).
Конфигурация в `render.yaml`: текущая ветка мастерской, Docker и автоматическое обновление после пуша.
Порядок подключения аккаунта, домен и проверка контейнера: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

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
| `node scripts/submariner_audit.mjs http://127.0.0.1:8765` | мастерская на ПК, планшете и телефоне: движение крепежа, связи деталей, камера, раскладка, управление и простой |
| `node scripts/theme_audit.mjs http://127.0.0.1:8765` | обе темы, сохранение выбора, контраст, длинные варианты калькулятора и шапка на 320/390/768/1440 px |
| `node scripts/tco.test.mjs`, `node scripts/compare.test.mjs` | согласованность расходов и страховки, сохранение четырёх выбранных моделей |
| `node scripts/ux_audit.mjs http://127.0.0.1:8765` | пресеты и возврат к расчёту, каталог, обучение, мобильная вёрстка и клавиатура |
| `uv run python scripts/check_public_startup.py` | несколько последовательных HTTP-замеров Render; первый запуск проверяют после естественного простоя |
| `node scripts/perf_audit.mjs http://127.0.0.1:8765` | скорость страниц как на слабом ноутбуке: вес, FCP/LCP, блокировка потока, фоновая активность, плавность прокрутки |
| `uv run --with fonttools --with brotli python scripts/icons_subset.py` | шрифт иконок только с иконками из кода (после новой иконки `ph-*`) |
| `node scripts/teardown_shots.mjs <адрес модели> <префикс>` | кадры 3D-разборки: собраны, по оси, на лотке |
| `uv run --with opencv-python-headless python scripts/blender/sub124060_textures.py` | маски текстур Submariner с официальных снимков Rolex |
| Blender: `exec(open("scripts/blender/sub124060_scene.py").read(), G); G["make"](root)`, затем `Blender -b … -a` | модель, механизм, свет и анимация фильма-разборки; рендер кадров |
| `uv run python scripts/teardown_film.py rolex-submariner` | кадры фильма → WebP для сайта и `film.json` с главами |

Переменные окружения: `HOROLOGIUM_SITE_URL` (публичный адрес для canonical, Open Graph и sitemap;
на Render автоматически используется `RENDER_EXTERNAL_URL`),
`HOROLOGIUM_RATES_LIVE=0` (не ходить в сеть за курсами валют), `HOROLOGIUM_DB`, `HOROLOGIUM_CONTENT`.

API-документация: http://127.0.0.1:8765/api/docs

## Документация

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): устройство системы, потоки данных, решения
- [docs/PROGRESS.md](docs/PROGRESS.md): журнал работ по блокам
- [docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md): как добавить страну, бренд, модель, цену
- [docs/DESIGN.md](docs/DESIGN.md): дизайн-система, анимации, 3D
- [docs/IMPROVEMENT_PLAN.md](docs/IMPROVEMENT_PLAN.md): план и статус улучшений после аудита
- [docs/USABILITY_TEST.md](docs/USABILITY_TEST.md): протокол трёх сценариев для настоящих участников
- [AGENTS.md](AGENTS.md): короткая памятка для ИИ-агентов, продолжающих проект
