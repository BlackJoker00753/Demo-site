# Интерактивная мастерская Submariner

`/watch/rolex-submariner#explode`: отдельная мастерская для 124060. Остальные модели продолжают
использовать существующую разборку. Геометрия создаётся в Blender один раз и загружается как GLB;
телефон не строит модель и не рендерит фильм. Все ресурсы локальные, дополнительных CDN в браузере нет.

## Устройство

- `frontend/js/ui/submariner-workshop.js`: доступный интерфейс, этапы, автопоказ, поиск и инспектор.
- `submariner-scene.js`: Three.js, OrbitControls, выбор лучом, камера, материалы и освобождение GPU.
- `submariner-parts.js`: этапы и объяснения назначения деталей, отдельно от кода сцены.
- `frontend/assets/workshop/submariner/`: готовая модель и сведения о сборке.
- `scripts/submariner_audit.mjs`: Chromium, три ширины, реальные кнопки, изоляция детали,
  отсутствие загрузки до входа в секцию, остановка кадров в покое и размонтирование при переходе.

Сцена загружается за 300 px до видимой области. Save-Data требует явного нажатия «Открыть 3D».
Колесо мыши и вертикальный жест оставлены странице; приближение вынесено на кнопки. В покое,
за экраном и в скрытой вкладке нет бесконечного рендера. Длительность переходов задана временем,
а не числом кадров. У `prefers-reduced-motion` этапы переключаются без движения.

## Источники и воспроизведение

Геометрия: существующие `scripts/blender/sub124060.py` и `sub124060_movement.py`. Маски печати:
официальные снимки Rolex, без подмены шрифтов и вымышленных делений:

- https://media.rolex.com/image/upload/f_png/c_limit,w_3840/v1/catalogue/2025/upright-c/m124060-0001
- https://media.rolex.com/image/upload/f_png/c_limit,w_3840/v1/catalogue/2025/raw-dial/m124060-0001

Сохранить их как `upright-c.png` и `raw-dial.png` в `teardown_src/3d/rolex-submariner/`, затем:

```sh
uv run --with opencv-python-headless python scripts/blender/sub124060_textures.py
GLTFPACK=/path/to/gltfpack blender -b --threads 2 --python scripts/blender/export_submariner.py
```

Экспорт проверен с Blender 4.3.2 и gltfpack 1.3 (MIT, meshoptimizer). Для локального просмотра gltfpack необязателен;
публикуемая модель должна пройти тест бюджета 4 МиБ. При оптимизации
он уменьшает геометрию до 75% треугольников и квантует координаты, сохраняя именованные узлы.
Декодер Draco/Meshopt в браузере не требуется. Экспорт содержит WebP; стандартный GLTFLoader той же
версии Three.js и его SkeletonUtils включены в vendor и `fetch_assets.py`. Embedded images загружаются
через TextureLoader, чтобы соблюдать существующую CSP без расширения connect-src.

Барабан дополнен отдельными крышкой, валом и учебной спиралью заводной пружины.
Ограничения перечислены и в самой мастерской: расположение и часть конструкции механизма упрощены.
Это интерактивная учебная модель, не сервисная документация и не заводской CAD.

## Навыки дизайна

Официальные Taste и Impeccable установлены в `.agents/skills/` с исходными лицензиями.
Taste: https://github.com/Leonxlnx/taste-skill . Impeccable: https://github.com/pbakaus/impeccable .
Выбрана композиция True-black flat (seed 879659547) с сохранением шрифтов и палитры проекта:
часы ведут сцену, панель деталей появляется по действию. Это локальное расширение существующей
страницы, не смена визуальной системы. Для Impeccable: `sh scripts/design_tools.sh context`.
Кеш движка в `.impeccable/` игнорируется Git.
