# Как добавлять контент

Всё содержимое сайта лежит в `content/` (YAML). После любой правки:

```bash
uv run horologium check      # схема и перекрёстные ссылки
uv run pytest                # тесты на реальном контенте
```

Сервер с `--reload` пересобирает SQLite сам, когда меняется YAML.

## Страна

`content/countries.yaml`: `slug`, `name`, `name_en`, `iso_a3` (совпадает с Natural Earth), центр камеры
`lat`/`lon`/`altitude`, `tagline`, `intro` (абзацы), `cities`, `facts`. Для спутникового снимка страны
выполните `uv run python scripts/fetch_assets.py` (шаг countries).

## Бренд и модели

Файл `content/brands/<country>/<brand>.yaml`. Папка обязана совпадать с `brand.country`.
Схема со всеми полями: `backend/horologium/content/schema.py`. Главное:

- `brand`: история, вехи, `manufacture` (свои калибры или покупные), `tier`, сайт.
- `movements`: калибры бренда (общие ETA, Sellita, Miyota лежат в `content/movements.yaml`).
- `watches`: модели. У каждой `price` с `usd`, `kind` (`msrp`, `market`, `estimate`), `source`, `checked`.
  Не выдумывайте цены: лучше `estimate` и честный источник.
- `render`: спека 3D-схемы (корпус, безель, циферблат, стрелки, браслет). Используется только во
  втором режиме разборки, на фото это не влияет.

Стиль текста: русский язык, без длинного тире, двоеточие с пробелом внутри значения в кавычках
(`scripts/yaml_autoquote.py` расставит их сам).

## Фотографии моделей

Только снимки под CC0, Public Domain, CC BY, CC BY-SA. Автор и лицензия показываются на сайте.

```bash
# 1. кандидаты: Commons + Openverse, контактный лист scripts/.cache/photos/<slug>.png
uv run python scripts/photos.py candidates rolex-submariner
uv run python scripts/photos.py candidates --missing          # для всех моделей без фото
uv run python scripts/photos.py candidates <slug> --query "Rolex 14060M"
uv run python scripts/photos.py files <slug> "Имя файла на Commons.jpg"   # если файл уже известен

# 2. посмотреть глазами (сводный лист нескольких моделей)
uv run python scripts/photos.py review rolex-submariner:3,7 omega-speedmaster-moonwatch:0

# 3. выбрать
uv run python scripts/photos.py pick rolex-submariner 3 --caption "Submariner ref. 14060M, предыдущее поколение"
uv run python scripts/photos.py pick <slug> 5 --context --caption "Похожая модель той же линии"
uv run python scripts/pick_batch.py picks.txt   # строки: slug|индекс|подпись|фокус x,y|ctx|кадр x0,y0,x1,y1
uv run python scripts/photos.py drop <slug>     # убрать все фото модели
```

Правила отбора:
- на снимке именно эта модель или её прямой предшественник того же дизайна (это пишется в `caption`);
- снимок другой модели той же линии допустим только с `context: true` (показывается с пометкой
  «Похожая модель» и никогда как основное фото);
- никаких гомажей, реплик («replica», «homage», «fake» в названии), водяных знаков, фото витрин;
- Flickr PDM не берём: так часто помечают чужие пресс-фото.

`focus` (0..1, 0..1) задаёт точку, которая остаётся в кадре при обрезке карточки.

## Фото деталей механизма

Ключи деталей совпадают с `frontend/js/watch3d/parts-info.js`. Запросы в `scripts/photo_queries.yaml`
(ключи `part:<key>`), выбор тем же `pick` со slug `part:<key>`; результат пишется в
`content/part_photos.yaml`. Для мелких деталей используйте кадрирование (шестая колонка `pick_batch`).

## Разборка из настоящих фотографий

`scripts/cutouts.py` описывает источники в `SOURCES` (светлый фон, автоматическая сегментация) и
`SEEDED` (тёмный фон, детали по точкам-семенам, ручная раскладка). Для нового снимка:

1. Сохраните снимок в `content/part_photos.yaml` через `photos.py files` + `pick` (ключ `exploded_*`).
2. Добавьте конфиг в `cutouts.py`, проверьте маску `--preview`, соберите спрайты.
3. Привяжите ключ снимка к названию нарезки в `CUTOUTS` (`frontend/js/views/watch.js`).
