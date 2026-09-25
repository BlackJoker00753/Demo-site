# Задание для Gemini 3 Pro Image (Nano Banana Pro): детали часов для разборки

Сгенерировано `scripts/teardown.py tasks` из `content/teardown/`. Не правьте вручную.

Всего уникальных листов: **102** (ориентировочно $24 по цене 4K в Gemini API).
## Как выполнять

1. Модель: **Gemini 3 Pro Image** (Nano Banana Pro). Размер **4K**, соотношение сторон **16:9**
   (для листов `assembled_*` можно 1:1).
2. К каждому листу модели приложите указанные референсы (официальные фото модели).
3. Вставьте промпт целиком. Одна картинка = один лист. Если детали налезают друг на друга,
   есть подписи, тени или обрезаны края, сгенерируйте заново.
4. Сохраните PNG ровно по указанному пути (папка `teardown_src/` в корне проекта).
5. Механизмы общие для моделей с одним калибром: лист `movements/...` делается один раз.
6. Затем: `uv run python scripts/teardown.py build <slug>` и `review <slug>` для проверки подписей.

Фон везде однородный светло-серый #d6d6d6: по нему скрипт вырезает детали. Порядок деталей в
сетке даёт им названия на сайте, поэтому порядок важен, а подписи на картинке запрещены.

## longines-master-collection-moonphase

### `teardown_src/watches/longines-master-collection-moonphase/exterior.png`

Корпус, безель, стекло, крышка, деталей: 10, сетка 4×2. Референсы: `frontend/assets/photos/longines-master-collection-moonphase/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Longines Master Collection Moonphase 40 mm: polished stainless steel case, silvered barleycorn dial with blued hands, moon phase at 6 with date hand around, alligator strap. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 8 separate items, one of each, arranged in a grid of 4 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. 40 mm stainless steel case middle with lugs, polished and brushed, no crown
2. slim polished bezel, stainless steel
3. domed sapphire crystal with antireflective coating
4. screw-down fluted winding crown with engraved emblem area
5. crown tube
6. black O-ring gaskets
7. screw-down caseback with sapphire display window
8. caseback gasket ring
Nothing else in the image.
```

### `teardown_src/watches/longines-master-collection-moonphase/dial.png`

Циферблат и стрелки, деталей: 5, сетка 3×2. Референсы: `frontend/assets/photos/longines-master-collection-moonphase/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Longines Master Collection Moonphase 40 mm: polished stainless steel case, silvered barleycorn dial with blued hands, moon phase at 6 with date hand around, alligator strap. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 5 separate items, one of each, arranged in a grid of 3 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. silvered dial with barleycorn pattern centre, painted Arabic numerals, moon phase aperture at 6
2. blued steel leaf hour hand
3. blued steel leaf minute hand
4. thin blued seconds hand
5. red-tipped date hand with crescent end
Nothing else in the image.
```

### `teardown_src/watches/longines-master-collection-moonphase/strap.png`

Ремешок, деталей: 5, сетка 3×2. Референсы: `frontend/assets/photos/longines-master-collection-moonphase/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Longines Master Collection Moonphase 40 mm: polished stainless steel case, silvered barleycorn dial with blued hands, moon phase at 6 with date hand around, alligator strap. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 4 separate items, one of each, arranged in a grid of 3 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. black alligator leather strap, long piece with holes, seen from above
2. black alligator leather strap, short piece with keeper
3. folding or pin buckle, stainless steel
4. spring bar
Nothing else in the image.
```

### `teardown_src/movements/longines-a31-l899/movement_top.png`

Автоподзавод и мосты, деталей: 9, сетка 4×2. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Swiss automatic calibre (ETA-made exclusive for Longines), rhodium-plated bridges with Côtes de Genève and perlage, gilded engravings, red ruby jewels, dark silicon hairspring, gold-coloured wheels, blued screws on the rotor..
Show EXACTLY 8 separate items, one of each, arranged in a grid of 4 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. oscillating weight with Côtes de Genève and engraved winged-hourglass style emblem area (no readable text)
2. automatic winding bridge
3. reversing wheel
4. balance cock with shock protection
5. barrel bridge with perlage and Côtes de Genève
6. train wheel bridge with ruby jewels
7. ratchet wheel, sunburst finish
8. crown wheel
Nothing else in the image.
```

### `teardown_src/movements/longines-a31-l899/movement_train.png`

Энергия, передача и спуск, деталей: 13, сетка 5×3. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Swiss automatic calibre (ETA-made exclusive for Longines), rhodium-plated bridges with Côtes de Genève and perlage, gilded engravings, red ruby jewels, dark silicon hairspring, gold-coloured wheels, blued screws on the rotor..
Show EXACTLY 11 separate items, one of each, arranged in a grid of 5 columns and 3 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. closed mainspring barrel
2. long mainspring for 72 hours out of the barrel, relaxed steel spiral
3. centre wheel
4. third wheel
5. fourth wheel
6. escape wheel
7. pallet fork with ruby pallet stones
8. balance wheel with dark silicon hairspring
9. shock protection setting with lyre spring
10. winding pinion and sliding pinion
11. winding stem
Nothing else in the image.
```

### `teardown_src/movements/longines-a31-l899/movement_dial.png`

Сторона циферблата, деталей: 30, сетка 5×3. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Swiss automatic calibre (ETA-made exclusive for Longines), rhodium-plated bridges with Côtes de Genève and perlage, gilded engravings, red ruby jewels, dark silicon hairspring, gold-coloured wheels, blued screws on the rotor..
Show EXACTLY 11 separate items, one of each, arranged in a grid of 5 columns and 3 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. mainplate seen from the dial side, perlage
2. cannon pinion and minute wheel
3. hour wheel
4. setting lever, yoke and springs
5. date disc printed 1 to 31
6. date driving wheel and date jumper
7. moon phase disc with two gold moons on dark blue, 59 teeth
8. moon phase driving wheel and jumper
9. steel screw (blued on rotor)
10. synthetic ruby jewel
11. movement holder ring
Nothing else in the image.
```

### `teardown_src/watches/longines-master-collection-moonphase/assembled_front.png`

Собранные часы. Референсы: `frontend/assets/photos/longines-master-collection-moonphase/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Subject: the complete watch head (case, bezel, dial, hands, crown) WITHOUT bracelet or strap, seen exactly from above, centred, same lighting and background. The watch: Longines Master Collection Moonphase 40 mm: polished stainless steel case, silvered barleycorn dial with blued hands, moon phase at 6 with date hand around, alligator strap. Match the reference photos exactly (proportions, colours, dial layout, bezel). Seamless uniform light-grey background (#d6d6d6), shadowless light, the watch fills about 70% of the frame height.
```


## longines-spirit-flyback

### `teardown_src/watches/longines-spirit-flyback/exterior.png`

Корпус, безель, стекло, крышка, деталей: 13, сетка 5×2. Референсы: `frontend/assets/photos/longines-spirit-flyback/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Longines Spirit Flyback 42 mm: stainless steel case with two chronograph pushers, ceramic 60-minute bezel, black dial with three counters, date, leather strap. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 10 separate items, one of each, arranged in a grid of 5 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. 39.5 mm stainless steel case middle with lugs, polished and brushed, no crown
2. rotating bezel ring, stainless steel
3. black ceramic 60-minute bezel insert
4. domed sapphire crystal with antireflective coating
5. screw-down fluted winding crown with engraved emblem area
6. crown tube
7. black O-ring gaskets
8. screw-down stainless steel caseback with engraved decoration
9. caseback gasket ring
10. chronograph pusher
Nothing else in the image.
```

### `teardown_src/watches/longines-spirit-flyback/dial.png`

Циферблат и стрелки, деталей: 7, сетка 3×2. Референсы: `frontend/assets/photos/longines-spirit-flyback/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Longines Spirit Flyback 42 mm: stainless steel case with two chronograph pushers, ceramic 60-minute bezel, black dial with three counters, date, leather strap. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 5 separate items, one of each, arranged in a grid of 3 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. black matt chronograph dial with three counters, applied Arabic numerals, luminescent indices, date window
2. sword hour hand with lume
3. sword minute hand with lume
4. central chronograph seconds hand
5. small counter hands
Nothing else in the image.
```

### `teardown_src/watches/longines-spirit-flyback/strap.png`

Ремешок, деталей: 5, сетка 3×2. Референсы: `frontend/assets/photos/longines-spirit-flyback/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Longines Spirit Flyback 42 mm: stainless steel case with two chronograph pushers, ceramic 60-minute bezel, black dial with three counters, date, leather strap. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 4 separate items, one of each, arranged in a grid of 3 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. brown calf leather strap, long piece with holes, seen from above
2. brown calf leather strap, short piece with keeper
3. folding or pin buckle, stainless steel
4. spring bar
Nothing else in the image.
```

### `teardown_src/movements/longines-l791-l791/movement_top.png`

Автоподзавод и мосты, деталей: 8, сетка 4×2. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Swiss automatic column-wheel flyback chronograph calibre, rhodium-plated bridges with Côtes de Genève, polished steel chronograph levers, blued column wheel, red ruby jewels, dark silicon hairspring..
Show EXACTLY 7 separate items, one of each, arranged in a grid of 4 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. oscillating weight with Côtes de Genève
2. automatic winding bridge
3. reversing wheel
4. balance cock
5. barrel bridge
6. chronograph bridge
7. ratchet wheel
Nothing else in the image.
```

### `teardown_src/movements/longines-l791-l791/movement_chrono.png`

Хронограф флайбэк, деталей: 14, сетка 5×2. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Swiss automatic column-wheel flyback chronograph calibre, rhodium-plated bridges with Côtes de Genève, polished steel chronograph levers, blued column wheel, red ruby jewels, dark silicon hairspring..
Show EXACTLY 10 separate items, one of each, arranged in a grid of 5 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. blued steel column wheel with 7 columns
2. horizontal coupling clutch lever with coupling wheel
3. chronograph seconds wheel with fine teeth
4. 30-minute counter wheel
5. 12-hour counter wheel
6. flyback operating lever, polished steel
7. reset hammer
8. heart-shaped reset cams
9. chronograph brake
10. thin steel lever springs
Nothing else in the image.
```

### `teardown_src/movements/longines-l791-l791/movement_train.png`

Энергия, передача и спуск, деталей: 11, сетка 4×2. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Swiss automatic column-wheel flyback chronograph calibre, rhodium-plated bridges with Côtes de Genève, polished steel chronograph levers, blued column wheel, red ruby jewels, dark silicon hairspring..
Show EXACTLY 8 separate items, one of each, arranged in a grid of 4 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. closed mainspring barrel
2. mainspring out of the barrel
3. centre, third and fourth wheels
4. escape wheel
5. pallet fork
6. balance wheel with dark silicon hairspring
7. winding pinion and sliding pinion
8. winding stem
Nothing else in the image.
```

### `teardown_src/movements/longines-l791-l791/movement_dial.png`

Сторона циферблата, деталей: 20, сетка 4×2. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Swiss automatic column-wheel flyback chronograph calibre, rhodium-plated bridges with Côtes de Genève, polished steel chronograph levers, blued column wheel, red ruby jewels, dark silicon hairspring..
Show EXACTLY 8 separate items, one of each, arranged in a grid of 4 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. mainplate seen from the dial side, perlage
2. cannon pinion and minute wheel
3. hour wheel
4. setting lever and yoke
5. date disc printed 1 to 31
6. date driving wheel and jumper
7. steel screw
8. movement holder ring
Nothing else in the image.
```

### `teardown_src/watches/longines-spirit-flyback/assembled_front.png`

Собранные часы. Референсы: `frontend/assets/photos/longines-spirit-flyback/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Subject: the complete watch head (case, bezel, dial, hands, crown) WITHOUT bracelet or strap, seen exactly from above, centred, same lighting and background. The watch: Longines Spirit Flyback 42 mm: stainless steel case with two chronograph pushers, ceramic 60-minute bezel, black dial with three counters, date, leather strap. Match the reference photos exactly (proportions, colours, dial layout, bezel). Seamless uniform light-grey background (#d6d6d6), shadowless light, the watch fills about 70% of the frame height.
```


## longines-spirit-pilot

### `teardown_src/watches/longines-spirit-pilot/exterior.png`

Корпус, безель, стекло, крышка, деталей: 10, сетка 4×2. Референсы: `frontend/assets/photos/longines-spirit-pilot/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Longines Spirit 40 mm (ref. L3.809.4.93.9 style): stainless steel case, smooth bezel, black matt dial with applied Arabic numerals and luminescent indices, date, brown leather strap. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 8 separate items, one of each, arranged in a grid of 4 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. 39 mm stainless steel case middle with lugs, polished and brushed, no crown
2. smooth polished bezel, stainless steel
3. domed sapphire crystal with antireflective coating
4. screw-down fluted winding crown with engraved emblem area
5. crown tube
6. black O-ring gaskets
7. screw-down stainless steel caseback with engraved decoration
8. caseback gasket ring
Nothing else in the image.
```

### `teardown_src/watches/longines-spirit-pilot/dial.png`

Циферблат и стрелки, деталей: 4, сетка 3×2. Референсы: `frontend/assets/photos/longines-spirit-pilot/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Longines Spirit 40 mm (ref. L3.809.4.93.9 style): stainless steel case, smooth bezel, black matt dial with applied Arabic numerals and luminescent indices, date, brown leather strap. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 4 separate items, one of each, arranged in a grid of 3 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. black matt dial with applied Arabic numerals and luminescent indices, date window
2. sword hour hand with lume
3. sword minute hand with lume
4. thin seconds hand
Nothing else in the image.
```

### `teardown_src/watches/longines-spirit-pilot/strap.png`

Ремешок, деталей: 5, сетка 3×2. Референсы: `frontend/assets/photos/longines-spirit-pilot/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Longines Spirit 40 mm (ref. L3.809.4.93.9 style): stainless steel case, smooth bezel, black matt dial with applied Arabic numerals and luminescent indices, date, brown leather strap. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 4 separate items, one of each, arranged in a grid of 3 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. brown calf leather strap, long piece with holes, seen from above
2. brown calf leather strap, short piece with keeper
3. folding or pin buckle, stainless steel
4. spring bar
Nothing else in the image.
```

### `teardown_src/movements/longines-a31-l888/movement_top.png`

Автоподзавод и мосты, деталей: 9, сетка 4×2. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Swiss automatic calibre (ETA-made exclusive for Longines), rhodium-plated bridges with Côtes de Genève and perlage, gilded engravings, red ruby jewels, dark silicon hairspring, gold-coloured wheels, blued screws on the rotor..
Show EXACTLY 8 separate items, one of each, arranged in a grid of 4 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. oscillating weight with Côtes de Genève and engraved winged-hourglass style emblem area (no readable text)
2. automatic winding bridge
3. reversing wheel
4. balance cock with shock protection
5. barrel bridge with perlage and Côtes de Genève
6. train wheel bridge with ruby jewels
7. ratchet wheel, sunburst finish
8. crown wheel
Nothing else in the image.
```

### `teardown_src/movements/longines-a31-l888/movement_train.png`

Энергия, передача и спуск, деталей: 13, сетка 5×3. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Swiss automatic calibre (ETA-made exclusive for Longines), rhodium-plated bridges with Côtes de Genève and perlage, gilded engravings, red ruby jewels, dark silicon hairspring, gold-coloured wheels, blued screws on the rotor..
Show EXACTLY 11 separate items, one of each, arranged in a grid of 5 columns and 3 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. closed mainspring barrel
2. long mainspring for 72 hours out of the barrel, relaxed steel spiral
3. centre wheel
4. third wheel
5. fourth wheel
6. escape wheel
7. pallet fork with ruby pallet stones
8. balance wheel with dark silicon hairspring
9. shock protection setting with lyre spring
10. winding pinion and sliding pinion
11. winding stem
Nothing else in the image.
```

### `teardown_src/movements/longines-a31-l888/movement_dial.png`

Сторона циферблата, деталей: 27, сетка 4×3. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Swiss automatic calibre (ETA-made exclusive for Longines), rhodium-plated bridges with Côtes de Genève and perlage, gilded engravings, red ruby jewels, dark silicon hairspring, gold-coloured wheels, blued screws on the rotor..
Show EXACTLY 9 separate items, one of each, arranged in a grid of 4 columns and 3 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. mainplate seen from the dial side, perlage
2. cannon pinion and minute wheel
3. hour wheel
4. setting lever, yoke and springs
5. date disc printed 1 to 31
6. date driving wheel and date jumper
7. steel screw (blued on rotor)
8. synthetic ruby jewel
9. movement holder ring
Nothing else in the image.
```

### `teardown_src/watches/longines-spirit-pilot/assembled_front.png`

Собранные часы. Референсы: `frontend/assets/photos/longines-spirit-pilot/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Subject: the complete watch head (case, bezel, dial, hands, crown) WITHOUT bracelet or strap, seen exactly from above, centred, same lighting and background. The watch: Longines Spirit 40 mm (ref. L3.809.4.93.9 style): stainless steel case, smooth bezel, black matt dial with applied Arabic numerals and luminescent indices, date, brown leather strap. Match the reference photos exactly (proportions, colours, dial layout, bezel). Seamless uniform light-grey background (#d6d6d6), shadowless light, the watch fills about 70% of the frame height.
```


## longines-spirit-zulu-time

### `teardown_src/watches/longines-spirit-zulu-time/exterior.png`

Корпус, безель, стекло, крышка, деталей: 12, сетка 5×2. Референсы: `frontend/assets/photos/longines-spirit-zulu-time/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Longines Spirit Zulu Time 42 mm ref. L3.812.4.50.6: stainless steel case, bidirectional black ceramic 24-hour bezel, black sunray dial with applied Arabic numerals and luminescent indices, gold-coloured GMT hand, date at 3, three-link steel bracelet. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 10 separate items, one of each, arranged in a grid of 5 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. 42 mm stainless steel case middle with lugs, polished and brushed, no crown
2. bidirectional rotating bezel ring with grooved edge, stainless steel
3. black ceramic 24-hour bezel insert with engraved white numerals
4. bezel click spring
5. domed sapphire crystal with antireflective coating
6. screw-down fluted winding crown with engraved emblem area
7. crown tube
8. black O-ring gaskets
9. screw-down stainless steel caseback with engraved decoration
10. caseback gasket ring
Nothing else in the image.
```

### `teardown_src/watches/longines-spirit-zulu-time/dial.png`

Циферблат и стрелки, деталей: 5, сетка 3×2. Референсы: `frontend/assets/photos/longines-spirit-zulu-time/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Longines Spirit Zulu Time 42 mm ref. L3.812.4.50.6: stainless steel case, bidirectional black ceramic 24-hour bezel, black sunray dial with applied Arabic numerals and luminescent indices, gold-coloured GMT hand, date at 3, three-link steel bracelet. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 5 separate items, one of each, arranged in a grid of 3 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. black sunray dial with applied polished Arabic numerals 12, 3, 6, 9 and luminescent indices, date window at 3, printed text lines
2. polished sword hour hand with lume
3. polished sword minute hand with lume
4. thin seconds hand with lume tip
5. gold-coloured GMT hand with arrow tip
Nothing else in the image.
```

### `teardown_src/watches/longines-spirit-zulu-time/bracelet.png`

Браслет, деталей: 27, сетка 3×2. Референсы: `frontend/assets/photos/longines-spirit-zulu-time/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Longines Spirit Zulu Time 42 mm ref. L3.812.4.50.6: stainless steel case, bidirectional black ceramic 24-hour bezel, black sunray dial with applied Arabic numerals and luminescent indices, gold-coloured GMT hand, date at 3, three-link steel bracelet. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 5 separate items, one of each, arranged in a grid of 3 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. bracelet end link, stainless steel
2. single three-piece bracelet link, brushed with polished centre, stainless steel
3. folding clasp with push buttons, opened, stainless steel
4. link pin
5. spring bar
Nothing else in the image.
```

### `teardown_src/movements/longines-a31-l844/movement_top.png`

Автоподзавод и мосты, деталей: 9, сетка 4×2. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Swiss automatic calibre (ETA-made exclusive for Longines), rhodium-plated bridges with Côtes de Genève and perlage, gilded engravings, red ruby jewels, dark silicon hairspring, gold-coloured wheels, blued screws on the rotor..
Show EXACTLY 8 separate items, one of each, arranged in a grid of 4 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. oscillating weight with Côtes de Genève and engraved winged-hourglass style emblem area (no readable text)
2. automatic winding bridge
3. reversing wheel
4. balance cock with shock protection
5. barrel bridge with perlage and Côtes de Genève
6. train wheel bridge with ruby jewels
7. ratchet wheel, sunburst finish
8. crown wheel
Nothing else in the image.
```

### `teardown_src/movements/longines-a31-l844/movement_train.png`

Энергия, передача и спуск, деталей: 13, сетка 5×3. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Swiss automatic calibre (ETA-made exclusive for Longines), rhodium-plated bridges with Côtes de Genève and perlage, gilded engravings, red ruby jewels, dark silicon hairspring, gold-coloured wheels, blued screws on the rotor..
Show EXACTLY 11 separate items, one of each, arranged in a grid of 5 columns and 3 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. closed mainspring barrel
2. long mainspring for 72 hours out of the barrel, relaxed steel spiral
3. centre wheel
4. third wheel
5. fourth wheel
6. escape wheel
7. pallet fork with ruby pallet stones
8. balance wheel with dark silicon hairspring
9. shock protection setting with lyre spring
10. winding pinion and sliding pinion
11. winding stem
Nothing else in the image.
```

### `teardown_src/movements/longines-a31-l844/movement_dial.png`

Сторона циферблата, деталей: 30, сетка 5×3. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Swiss automatic calibre (ETA-made exclusive for Longines), rhodium-plated bridges with Côtes de Genève and perlage, gilded engravings, red ruby jewels, dark silicon hairspring, gold-coloured wheels, blued screws on the rotor..
Show EXACTLY 11 separate items, one of each, arranged in a grid of 5 columns and 3 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. mainplate seen from the dial side, perlage
2. cannon pinion and minute wheel
3. hour wheel
4. setting lever, yoke and springs
5. date disc printed 1 to 31
6. date driving wheel and date jumper
7. 24-hour GMT wheel with tube
8. jumping hour star wheel and jumper
9. steel screw (blued on rotor)
10. synthetic ruby jewel
11. movement holder ring
Nothing else in the image.
```

### `teardown_src/watches/longines-spirit-zulu-time/assembled_front.png`

Собранные часы. Референсы: `frontend/assets/photos/longines-spirit-zulu-time/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Subject: the complete watch head (case, bezel, dial, hands, crown) WITHOUT bracelet or strap, seen exactly from above, centred, same lighting and background. The watch: Longines Spirit Zulu Time 42 mm ref. L3.812.4.50.6: stainless steel case, bidirectional black ceramic 24-hour bezel, black sunray dial with applied Arabic numerals and luminescent indices, gold-coloured GMT hand, date at 3, three-link steel bracelet. Match the reference photos exactly (proportions, colours, dial layout, bezel). Seamless uniform light-grey background (#d6d6d6), shadowless light, the watch fills about 70% of the frame height.
```


## rolex-1908

### `teardown_src/watches/rolex-1908/exterior.png`

Корпус, безель, стекло, крышка, деталей: 12, сетка 5×2. Референсы: `frontend/assets/photos/rolex-1908/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex Perpetual 1908 ref. 52508: 39 mm 18 ct yellow gold thin case with domed and fluted bezel, white dial with Arabic 3, 9, 12 and small seconds at 6, sapphire display caseback, brown alligator strap. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 10 separate items, one of each, arranged in a grid of 5 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. 39 mm Oyster case middle with lugs, 18 ct yellow gold, polished and satin-brushed surfaces, no crown
2. domed and finely fluted bezel, 18 ct yellow gold
3. flat sapphire crystal, transparent with antireflective tint, seen from above
4. screw-down winding crown with fluted edge and embossed coronet on top, 18 ct yellow gold
5. crown tube (small threaded steel tube)
6. set of tiny black O-ring gaskets of the crown
7. screw-down caseback with sapphire display window, 18 ct yellow gold
8. black caseback O-ring gasket, thin ring
9. crystal gasket, thin ring
10. inner bezel ring (rehaut) with engraved text-like pattern around (no readable text), 18 ct yellow gold
Nothing else in the image.
```

### `teardown_src/watches/rolex-1908/dial.png`

Циферблат и стрелки, деталей: 4, сетка 3×2. Референсы: `frontend/assets/photos/rolex-1908/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex Perpetual 1908 ref. 52508: 39 mm 18 ct yellow gold thin case with domed and fluted bezel, white dial with Arabic 3, 9, 12 and small seconds at 6, sapphire display caseback, brown alligator strap. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 4 separate items, one of each, arranged in a grid of 3 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. white intense dial with gold Arabic numerals 3, 9, 12, faceted indices, railway minute track, small seconds subdial at 6
2. baton hour hand, 18 ct yellow gold
3. baton minute hand, 18 ct yellow gold
4. tiny small-seconds hand
Nothing else in the image.
```

### `teardown_src/watches/rolex-1908/strap.png`

Ремешок, деталей: 5, сетка 3×2. Референсы: `frontend/assets/photos/rolex-1908/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex Perpetual 1908 ref. 52508: 39 mm 18 ct yellow gold thin case with domed and fluted bezel, white dial with Arabic 3, 9, 12 and small seconds at 6, sapphire display caseback, brown alligator strap. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 4 separate items, one of each, arranged in a grid of 3 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. brown alligator leather strap, long piece with holes, seen from above
2. brown alligator leather strap, short piece with keeper
3. folding or pin buckle, 18 ct yellow gold
4. spring bar
Nothing else in the image.
```

### `teardown_src/movements/rolex-71xx-7140/movement_top.png`

Автоподзавод и мосты, деталей: 9, сетка 4×2. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: thin Rolex manufacture automatic calibre, bridges with Rolex Côtes de Genève (wide stripes), polished bevels, skeletonised 18 ct gold rotor, silicon Syloxi hairspring (dark grey-blue), red ruby jewels..
Show EXACTLY 8 separate items, one of each, arranged in a grid of 4 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. openworked 18 ct gold oscillating weight with central bearing
2. automatic winding bridge
3. reversing wheel
4. traversing balance bridge
5. barrel bridge, Rolex Côtes de Genève
6. train wheel bridge with ruby jewels
7. ratchet wheel, sunburst finish
8. crown wheel
Nothing else in the image.
```

### `teardown_src/movements/rolex-71xx-7140/movement_train.png`

Энергия, передача и спуск, деталей: 13, сетка 4×3. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: thin Rolex manufacture automatic calibre, bridges with Rolex Côtes de Genève (wide stripes), polished bevels, skeletonised 18 ct gold rotor, silicon Syloxi hairspring (dark grey-blue), red ruby jewels..
Show EXACTLY 9 separate items, one of each, arranged in a grid of 4 columns and 3 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. thin closed mainspring barrel
2. mainspring out of the barrel
3. centre, third and fourth wheels
4. escape wheel (Chronergy on 7140, silicon Dynapulse wheels on 7135)
5. pallet fork with ruby pallet stones
6. balance wheel with silicon Syloxi hairspring (grey-blue), gold Microstella nuts
7. Paraflex shock absorber
8. winding pinion and sliding pinion
9. winding stem
Nothing else in the image.
```

### `teardown_src/movements/rolex-71xx-7140/movement_dial.png`

Сторона циферблата, деталей: 24, сетка 4×2. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: thin Rolex manufacture automatic calibre, bridges with Rolex Côtes de Genève (wide stripes), polished bevels, skeletonised 18 ct gold rotor, silicon Syloxi hairspring (dark grey-blue), red ruby jewels..
Show EXACTLY 7 separate items, one of each, arranged in a grid of 4 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. thin mainplate seen from the dial side, perlage
2. cannon pinion and minute wheel
3. hour wheel
4. setting lever, yoke and yoke spring
5. polished steel screw
6. synthetic ruby jewel
7. movement holder ring
Nothing else in the image.
```

### `teardown_src/watches/rolex-1908/assembled_front.png`

Собранные часы. Референсы: `frontend/assets/photos/rolex-1908/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Subject: the complete watch head (case, bezel, dial, hands, crown) WITHOUT bracelet or strap, seen exactly from above, centred, same lighting and background. The watch: Rolex Perpetual 1908 ref. 52508: 39 mm 18 ct yellow gold thin case with domed and fluted bezel, white dial with Arabic 3, 9, 12 and small seconds at 6, sapphire display caseback, brown alligator strap. Match the reference photos exactly (proportions, colours, dial layout, bezel). Seamless uniform light-grey background (#d6d6d6), shadowless light, the watch fills about 70% of the frame height.
```


## rolex-cosmograph-daytona

### `teardown_src/watches/rolex-cosmograph-daytona/exterior.png`

Корпус, безель, стекло, крышка, деталей: 15, сетка 5×3. Референсы: `frontend/assets/photos/rolex-cosmograph-daytona/1-1600.jpg`, `frontend/assets/photos/rolex-cosmograph-daytona/2-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex Cosmograph Daytona ref. 126500LN: 40 mm Oystersteel case with screw-down chronograph pushers, black Cerachrom tachymeter bezel, white dial with three black counters (panda), Oyster bracelet. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 12 separate items, one of each, arranged in a grid of 5 columns and 3 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. 40 mm Oyster case middle with lugs, integrated crown guards, Oystersteel, polished and satin-brushed surfaces, no crown
2. fixed bezel ring, Oystersteel
3. black Cerachrom tachymeter scale insert with engraved numerals up to 400
4. screw-down chronograph pusher with threaded collar
5. flat sapphire crystal, transparent with antireflective tint, seen from above
6. screw-down winding crown with fluted edge and embossed coronet on top, Oystersteel
7. crown tube (small threaded steel tube)
8. set of tiny black O-ring gaskets of the crown
9. screw-down Oyster caseback with fine fluted edge, Oystersteel, plain polished centre
10. black caseback O-ring gasket, thin ring
11. crystal gasket, thin ring
12. inner bezel ring (rehaut) with engraved text-like pattern around (no readable text), Oystersteel
Nothing else in the image.
```

### `teardown_src/watches/rolex-cosmograph-daytona/dial.png`

Циферблат и стрелки, деталей: 8, сетка 4×2. Референсы: `frontend/assets/photos/rolex-cosmograph-daytona/1-1600.jpg`, `frontend/assets/photos/rolex-cosmograph-daytona/2-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex Cosmograph Daytona ref. 126500LN: 40 mm Oystersteel case with screw-down chronograph pushers, black Cerachrom tachymeter bezel, white dial with three black counters (panda), Oyster bracelet. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 6 separate items, one of each, arranged in a grid of 4 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. white dial with three black recessed chronograph counters (30 minutes, 12 hours, small seconds), applied white gold indices, printed tachymeter-free outer scale
2. baton hour hand, white gold with lume
3. baton minute hand, white gold with lume
4. thin seconds hand
5. three small white counter hands
6. long thin central chronograph seconds hand
Nothing else in the image.
```

### `teardown_src/watches/rolex-cosmograph-daytona/bracelet.png`

Браслет Oyster, деталей: 28, сетка 4×2. Референсы: `frontend/assets/photos/rolex-cosmograph-daytona/1-1600.jpg`, `frontend/assets/photos/rolex-cosmograph-daytona/2-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex Cosmograph Daytona ref. 126500LN: 40 mm Oystersteel case with screw-down chronograph pushers, black Cerachrom tachymeter bezel, white dial with three black counters (panda), Oyster bracelet. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 6 separate items, one of each, arranged in a grid of 4 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. Oyster bracelet end link (solid, curved to fit the case), Oystersteel
2. single three-piece Oyster bracelet link (flat, brushed outer, polished edges), Oystersteel
3. Oysterlock with Easylink folding clasp with cover, opened and seen from above, Oystersteel
4. Easylink 5 mm comfort extension link
5. tiny threaded link screw pin
6. spring bar (thin steel tube with pins)
Nothing else in the image.
```

### `teardown_src/movements/rolex-4131-4131/movement_top.png`

Автоподзавод и мосты, деталей: 10, сетка 4×3. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex manufacture automatic chronograph calibre, bridges with Rolex Côtes de Genève stripes and polished bevels, skeletonised 18 ct yellow gold rotor, red ruby jewels, blue Parachrom hairspring, polished steel chronograph levers..
Show EXACTLY 9 separate items, one of each, arranged in a grid of 4 columns and 3 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. skeletonised 18 ct yellow gold oscillating weight with central bearing
2. automatic winding bridge with reversing wheels
3. reversing wheel (small gold wheel with pinion)
4. traversing balance bridge fixed at two points
5. barrel bridge, Côtes de Genève
6. chronograph bridge with jewels, Côtes de Genève
7. train wheel bridge with ruby jewels
8. ratchet wheel, sunburst finish
9. crown wheel
Nothing else in the image.
```

### `teardown_src/movements/rolex-4131-4131/movement_chrono.png`

Хронограф, деталей: 14, сетка 5×2. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex manufacture automatic chronograph calibre, bridges with Rolex Côtes de Genève stripes and polished bevels, skeletonised 18 ct yellow gold rotor, red ruby jewels, blue Parachrom hairspring, polished steel chronograph levers..
Show EXACTLY 10 separate items, one of each, arranged in a grid of 5 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. column wheel of the chronograph (castle-like wheel with 6 columns and ratchet teeth)
2. vertical clutch (friction disc clutch assembly)
3. chronograph centre seconds wheel
4. 30-minute counter wheel
5. 12-hour counter wheel
6. start/stop operating lever, polished steel
7. reset hammer, polished steel with multiple heart-cam faces
8. heart-shaped reset cams
9. chronograph brake lever
10. thin steel lever spring
Nothing else in the image.
```

### `teardown_src/movements/rolex-4131-4131/movement_train.png`

Энергия, передача и спуск, деталей: 13, сетка 5×3. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex manufacture automatic chronograph calibre, bridges with Rolex Côtes de Genève stripes and polished bevels, skeletonised 18 ct yellow gold rotor, red ruby jewels, blue Parachrom hairspring, polished steel chronograph levers..
Show EXACTLY 11 separate items, one of each, arranged in a grid of 5 columns and 3 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. closed mainspring barrel, gold-coloured
2. mainspring out of the barrel, relaxed steel spiral
3. centre wheel
4. third wheel
5. fourth wheel
6. Chronergy escape wheel, skeletonised nickel-phosphorus
7. Chronergy pallet fork with ruby pallet stones
8. balance wheel with blue Parachrom hairspring and gold Microstella nuts
9. Paraflex shock absorber
10. winding pinion and sliding pinion
11. winding stem
Nothing else in the image.
```

### `teardown_src/movements/rolex-4131-4131/movement_dial.png`

Сторона циферблата, деталей: 23, сетка 4×2. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex manufacture automatic chronograph calibre, bridges with Rolex Côtes de Genève stripes and polished bevels, skeletonised 18 ct yellow gold rotor, red ruby jewels, blue Parachrom hairspring, polished steel chronograph levers..
Show EXACTLY 8 separate items, one of each, arranged in a grid of 4 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. mainplate seen from the dial side, perlage
2. cannon pinion
3. minute wheel
4. hour wheel
5. setting lever and yoke, polished steel
6. polished steel screw
7. synthetic ruby jewel
8. movement holder ring
Nothing else in the image.
```

### `teardown_src/watches/rolex-cosmograph-daytona/assembled_front.png`

Собранные часы. Референсы: `frontend/assets/photos/rolex-cosmograph-daytona/1-1600.jpg`, `frontend/assets/photos/rolex-cosmograph-daytona/2-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Subject: the complete watch head (case, bezel, dial, hands, crown) WITHOUT bracelet or strap, seen exactly from above, centred, same lighting and background. The watch: Rolex Cosmograph Daytona ref. 126500LN: 40 mm Oystersteel case with screw-down chronograph pushers, black Cerachrom tachymeter bezel, white dial with three black counters (panda), Oyster bracelet. Match the reference photos exactly (proportions, colours, dial layout, bezel). Seamless uniform light-grey background (#d6d6d6), shadowless light, the watch fills about 70% of the frame height.
```


## rolex-datejust-41

### `teardown_src/watches/rolex-datejust-41/exterior.png`

Корпус, безель, стекло, крышка, деталей: 12, сетка 5×2. Референсы: `frontend/assets/photos/rolex-datejust-41/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex Datejust 41 ref. 126334: 41 mm Oystersteel case with fluted 18 ct white gold bezel, blue sunray dial with baton indices, date at 3 with Cyclops, Jubilee bracelet. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 10 separate items, one of each, arranged in a grid of 5 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. 41 mm Oyster case middle with lugs, Oystersteel, polished and satin-brushed surfaces, no crown
2. fluted bezel in 18 ct white gold, sharp polished flutes
3. flat sapphire crystal with Cyclops lens at 3 o'clock, transparent with antireflective tint, seen from above
4. screw-down winding crown with fluted edge and embossed coronet on top, Oystersteel
5. crown tube (small threaded steel tube)
6. set of tiny black O-ring gaskets of the crown
7. screw-down Oyster caseback with fine fluted edge, Oystersteel, plain polished centre
8. black caseback O-ring gasket, thin ring
9. crystal gasket, thin ring
10. inner bezel ring (rehaut) with engraved text-like pattern around (no readable text), Oystersteel
Nothing else in the image.
```

### `teardown_src/watches/rolex-datejust-41/dial.png`

Циферблат и стрелки, деталей: 4, сетка 3×2. Референсы: `frontend/assets/photos/rolex-datejust-41/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex Datejust 41 ref. 126334: 41 mm Oystersteel case with fluted 18 ct white gold bezel, blue sunray dial with baton indices, date at 3 with Cyclops, Jubilee bracelet. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 4 separate items, one of each, arranged in a grid of 3 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. blue sunray dial with applied white gold baton indices, date aperture at 3
2. baton hour hand, white gold with lume
3. baton minute hand, white gold with lume
4. thin seconds hand
Nothing else in the image.
```

### `teardown_src/watches/rolex-datejust-41/bracelet.png`

Браслет Jubilee, деталей: 46, сетка 4×2. Референсы: `frontend/assets/photos/rolex-datejust-41/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex Datejust 41 ref. 126334: 41 mm Oystersteel case with fluted 18 ct white gold bezel, blue sunray dial with baton indices, date at 3 with Cyclops, Jubilee bracelet. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 6 separate items, one of each, arranged in a grid of 4 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. Jubilee bracelet end link, Oystersteel with polished white-gold-look centre links
2. Jubilee outer link piece (brushed), Oystersteel with polished white-gold-look centre links
3. small polished Jubilee centre link piece, Oystersteel with polished white-gold-look centre links
4. concealed folding Crownclasp / Oysterclasp, opened, Oystersteel with polished white-gold-look centre links
5. tiny threaded link screw pin
6. spring bar
Nothing else in the image.
```

### `teardown_src/movements/rolex-32xx-3235/movement_top.png`

Автоподзавод и мосты, деталей: 12, сетка 5×2. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex manufacture automatic calibre, rhodium-plated nickel silver bridges with Côtes de Genève stripes and polished bevels, mainplate with perlage (circular graining), red synthetic ruby jewels, gold-coloured gear wheels, blue Parachrom hairspring, satin-finished rotor, blued steel screws are NOT used (Rolex uses polished steel screws)..
Show EXACTLY 10 separate items, one of each, arranged in a grid of 5 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. oscillating weight (rotor), half-moon shape, satin finish with Côtes de Genève, central ball bearing
2. automatic winding bridge (reverser bridge), polished bevels
3. reversing wheel of the automatic winding (small gold wheel with pinion)
4. automatic winding intermediate wheel
5. traversing balance bridge fixed at two points, with regulating stud carrier, Côtes de Genève
6. barrel bridge with jewel settings, Côtes de Genève stripes, polished bevels
7. train wheel bridge with red ruby jewels, Côtes de Genève stripes
8. ratchet wheel with sunburst (soleil) finish, large flat steel wheel
9. crown wheel, small steel wheel with sunburst finish
10. pallet bridge, small polished bridge with one ruby jewel
Nothing else in the image.
```

### `teardown_src/movements/rolex-32xx-3235/movement_train.png`

Энергия, передача и спуск, деталей: 14, сетка 5×3. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex manufacture automatic calibre, rhodium-plated nickel silver bridges with Côtes de Genève stripes and polished bevels, mainplate with perlage (circular graining), red synthetic ruby jewels, gold-coloured gear wheels, blue Parachrom hairspring, satin-finished rotor, blued steel screws are NOT used (Rolex uses polished steel screws)..
Show EXACTLY 13 separate items, one of each, arranged in a grid of 5 columns and 3 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. closed mainspring barrel with toothed rim, gold-coloured
2. mainspring removed from barrel, relaxed spiral of thin polished steel ribbon
3. barrel arbor (small steel shaft with hook)
4. centre wheel with long pinion arbor, gold-coloured
5. third wheel, gold-coloured with steel pinion
6. fourth wheel (seconds wheel) with long arbor
7. Chronergy escape wheel, skeletonised, nickel-phosphorus, grey metallic
8. Chronergy pallet fork with two red ruby pallet stones
9. balance wheel with blue Parachrom hairspring with Breguet overcoil and gold Microstella nuts
10. Paraflex shock absorber assembly (tiny spring and jewel setting)
11. winding pinion (small steel gear)
12. sliding pinion / clutch wheel (steel, teeth on both ends)
13. winding stem (long thin steel rod with square section)
Nothing else in the image.
```

### `teardown_src/movements/rolex-32xx-3235/movement_dial.png`

Сторона циферблата, деталей: 11, сетка 5×2. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex manufacture automatic calibre, rhodium-plated nickel silver bridges with Côtes de Genève stripes and polished bevels, mainplate with perlage (circular graining), red synthetic ruby jewels, gold-coloured gear wheels, blue Parachrom hairspring, satin-finished rotor, blued steel screws are NOT used (Rolex uses polished steel screws)..
Show EXACTLY 10 separate items, one of each, arranged in a grid of 5 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. mainplate (pillar plate) seen from the dial side, perlage finish, jewel holes, 28.5 mm round
2. cannon pinion (tube with small gear)
3. minute wheel with pinion
4. hour wheel with tube
5. setting lever, flat polished steel
6. yoke (clutch lever), flat polished steel
7. yoke spring and setting lever jumper, thin steel springs
8. date disc, thin ring printed with numbers 1 to 31, internal teeth
9. instantaneous date driving wheel with finger
10. date jumper spring (flat steel spring)
Nothing else in the image.
```

### `teardown_src/movements/rolex-32xx-3235/movement_screws.png`

Винты и мелочь, деталей: 19, сетка 4×2. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex manufacture automatic calibre, rhodium-plated nickel silver bridges with Côtes de Genève stripes and polished bevels, mainplate with perlage (circular graining), red synthetic ruby jewels, gold-coloured gear wheels, blue Parachrom hairspring, satin-finished rotor, blued steel screws are NOT used (Rolex uses polished steel screws)..
Show EXACTLY 6 separate items, one of each, arranged in a grid of 4 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. polished steel bridge screw with slotted head
2. rotor screw with slotted head
3. ratchet wheel screw, large flat head
4. single synthetic ruby jewel bearing (tiny red disc with hole)
5. movement holder ring (spacer ring), thin steel ring
6. casing clamp screw with flat clamp
Nothing else in the image.
```

### `teardown_src/watches/rolex-datejust-41/assembled_front.png`

Собранные часы. Референсы: `frontend/assets/photos/rolex-datejust-41/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Subject: the complete watch head (case, bezel, dial, hands, crown) WITHOUT bracelet or strap, seen exactly from above, centred, same lighting and background. The watch: Rolex Datejust 41 ref. 126334: 41 mm Oystersteel case with fluted 18 ct white gold bezel, blue sunray dial with baton indices, date at 3 with Cyclops, Jubilee bracelet. Match the reference photos exactly (proportions, colours, dial layout, bezel). Seamless uniform light-grey background (#d6d6d6), shadowless light, the watch fills about 70% of the frame height.
```


## rolex-day-date-40

### `teardown_src/watches/rolex-day-date-40/exterior.png`

Корпус, безель, стекло, крышка, деталей: 12, сетка 5×2. Референсы: `frontend/assets/photos/rolex-day-date-40/1-1600.jpg`, `frontend/assets/photos/rolex-day-date-40/2-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex Day-Date 40 ref. 228238: 40 mm 18 ct yellow gold case, fluted bezel, champagne dial with Roman numerals, day window arc at 12, date at 3 with Cyclops, President bracelet. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 10 separate items, one of each, arranged in a grid of 5 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. 40 mm Oyster case middle with lugs, 18 ct yellow gold, polished and satin-brushed surfaces, no crown
2. fluted bezel in 18 ct yellow gold
3. flat sapphire crystal with Cyclops lens at 3 o'clock, transparent with antireflective tint, seen from above
4. screw-down winding crown with fluted edge and embossed coronet on top, 18 ct yellow gold
5. crown tube (small threaded steel tube)
6. set of tiny black O-ring gaskets of the crown
7. screw-down Oyster caseback with fine fluted edge, 18 ct yellow gold, plain polished centre
8. black caseback O-ring gasket, thin ring
9. crystal gasket, thin ring
10. inner bezel ring (rehaut) with engraved text-like pattern around (no readable text), 18 ct yellow gold
Nothing else in the image.
```

### `teardown_src/watches/rolex-day-date-40/dial.png`

Циферблат и стрелки, деталей: 4, сетка 3×2. Референсы: `frontend/assets/photos/rolex-day-date-40/1-1600.jpg`, `frontend/assets/photos/rolex-day-date-40/2-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex Day-Date 40 ref. 228238: 40 mm 18 ct yellow gold case, fluted bezel, champagne dial with Roman numerals, day window arc at 12, date at 3 with Cyclops, President bracelet. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 4 separate items, one of each, arranged in a grid of 3 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. champagne sunray dial with applied yellow gold Roman numerals, arched day-of-week window at 12, date aperture at 3
2. baton hour hand, 18 ct yellow gold
3. baton minute hand, 18 ct yellow gold
4. thin seconds hand
Nothing else in the image.
```

### `teardown_src/watches/rolex-day-date-40/bracelet.png`

Браслет President, деталей: 27, сетка 3×2. Референсы: `frontend/assets/photos/rolex-day-date-40/1-1600.jpg`, `frontend/assets/photos/rolex-day-date-40/2-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex Day-Date 40 ref. 228238: 40 mm 18 ct yellow gold case, fluted bezel, champagne dial with Roman numerals, day window arc at 12, date at 3 with Cyclops, President bracelet. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 5 separate items, one of each, arranged in a grid of 3 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. President bracelet end link, 18 ct yellow gold
2. President bracelet semi-circular three-piece link, 18 ct yellow gold
3. concealed Crownclasp, opened, 18 ct yellow gold
4. link screw pin
5. spring bar
Nothing else in the image.
```

### `teardown_src/movements/rolex-32xx-3255/movement_top.png`

Автоподзавод и мосты, деталей: 12, сетка 5×2. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex manufacture automatic calibre, rhodium-plated nickel silver bridges with Côtes de Genève stripes and polished bevels, mainplate with perlage (circular graining), red synthetic ruby jewels, gold-coloured gear wheels, blue Parachrom hairspring, satin-finished rotor, blued steel screws are NOT used (Rolex uses polished steel screws)..
Show EXACTLY 10 separate items, one of each, arranged in a grid of 5 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. oscillating weight (rotor), half-moon shape, satin finish with Côtes de Genève, central ball bearing
2. automatic winding bridge (reverser bridge), polished bevels
3. reversing wheel of the automatic winding (small gold wheel with pinion)
4. automatic winding intermediate wheel
5. traversing balance bridge fixed at two points, with regulating stud carrier, Côtes de Genève
6. barrel bridge with jewel settings, Côtes de Genève stripes, polished bevels
7. train wheel bridge with red ruby jewels, Côtes de Genève stripes
8. ratchet wheel with sunburst (soleil) finish, large flat steel wheel
9. crown wheel, small steel wheel with sunburst finish
10. pallet bridge, small polished bridge with one ruby jewel
Nothing else in the image.
```

### `teardown_src/movements/rolex-32xx-3255/movement_train.png`

Энергия, передача и спуск, деталей: 14, сетка 5×3. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex manufacture automatic calibre, rhodium-plated nickel silver bridges with Côtes de Genève stripes and polished bevels, mainplate with perlage (circular graining), red synthetic ruby jewels, gold-coloured gear wheels, blue Parachrom hairspring, satin-finished rotor, blued steel screws are NOT used (Rolex uses polished steel screws)..
Show EXACTLY 13 separate items, one of each, arranged in a grid of 5 columns and 3 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. closed mainspring barrel with toothed rim, gold-coloured
2. mainspring removed from barrel, relaxed spiral of thin polished steel ribbon
3. barrel arbor (small steel shaft with hook)
4. centre wheel with long pinion arbor, gold-coloured
5. third wheel, gold-coloured with steel pinion
6. fourth wheel (seconds wheel) with long arbor
7. Chronergy escape wheel, skeletonised, nickel-phosphorus, grey metallic
8. Chronergy pallet fork with two red ruby pallet stones
9. balance wheel with blue Parachrom hairspring with Breguet overcoil and gold Microstella nuts
10. Paraflex shock absorber assembly (tiny spring and jewel setting)
11. winding pinion (small steel gear)
12. sliding pinion / clutch wheel (steel, teeth on both ends)
13. winding stem (long thin steel rod with square section)
Nothing else in the image.
```

### `teardown_src/movements/rolex-32xx-3255/movement_dial.png`

Сторона циферблата, деталей: 12, сетка 5×3. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex manufacture automatic calibre, rhodium-plated nickel silver bridges with Côtes de Genève stripes and polished bevels, mainplate with perlage (circular graining), red synthetic ruby jewels, gold-coloured gear wheels, blue Parachrom hairspring, satin-finished rotor, blued steel screws are NOT used (Rolex uses polished steel screws)..
Show EXACTLY 11 separate items, one of each, arranged in a grid of 5 columns and 3 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. mainplate (pillar plate) seen from the dial side, perlage finish, jewel holes, 28.5 mm round
2. cannon pinion (tube with small gear)
3. minute wheel with pinion
4. hour wheel with tube
5. setting lever, flat polished steel
6. yoke (clutch lever), flat polished steel
7. yoke spring and setting lever jumper, thin steel springs
8. instantaneous date driving wheel with finger
9. date jumper spring (flat steel spring)
10. day-of-week disc (ring printed with day names)
11. day star wheel with 14 teeth
Nothing else in the image.
```

### `teardown_src/movements/rolex-32xx-3255/movement_screws.png`

Винты и мелочь, деталей: 19, сетка 4×2. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex manufacture automatic calibre, rhodium-plated nickel silver bridges with Côtes de Genève stripes and polished bevels, mainplate with perlage (circular graining), red synthetic ruby jewels, gold-coloured gear wheels, blue Parachrom hairspring, satin-finished rotor, blued steel screws are NOT used (Rolex uses polished steel screws)..
Show EXACTLY 6 separate items, one of each, arranged in a grid of 4 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. polished steel bridge screw with slotted head
2. rotor screw with slotted head
3. ratchet wheel screw, large flat head
4. single synthetic ruby jewel bearing (tiny red disc with hole)
5. movement holder ring (spacer ring), thin steel ring
6. casing clamp screw with flat clamp
Nothing else in the image.
```

### `teardown_src/watches/rolex-day-date-40/assembled_front.png`

Собранные часы. Референсы: `frontend/assets/photos/rolex-day-date-40/1-1600.jpg`, `frontend/assets/photos/rolex-day-date-40/2-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Subject: the complete watch head (case, bezel, dial, hands, crown) WITHOUT bracelet or strap, seen exactly from above, centred, same lighting and background. The watch: Rolex Day-Date 40 ref. 228238: 40 mm 18 ct yellow gold case, fluted bezel, champagne dial with Roman numerals, day window arc at 12, date at 3 with Cyclops, President bracelet. Match the reference photos exactly (proportions, colours, dial layout, bezel). Seamless uniform light-grey background (#d6d6d6), shadowless light, the watch fills about 70% of the frame height.
```


## rolex-explorer-40

### `teardown_src/watches/rolex-explorer-40/exterior.png`

Корпус, безель, стекло, крышка, деталей: 12, сетка 5×2. Референсы: `frontend/assets/photos/rolex-explorer-40/1-1600.jpg`, `frontend/assets/photos/rolex-explorer-40/2-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex Explorer 40 ref. 224270: 40 mm Oystersteel case, smooth bezel, black dial with luminescent 3, 6, 9 Arabic numerals, no date, Oyster bracelet. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 10 separate items, one of each, arranged in a grid of 5 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. 40 mm Oyster case middle with lugs, Oystersteel, polished and satin-brushed surfaces, no crown
2. smooth polished bezel, Oystersteel
3. flat sapphire crystal, transparent with antireflective tint, seen from above
4. screw-down winding crown with fluted edge and embossed coronet on top, Oystersteel
5. crown tube (small threaded steel tube)
6. set of tiny black O-ring gaskets of the crown
7. screw-down Oyster caseback with fine fluted edge, Oystersteel, plain polished centre
8. black caseback O-ring gasket, thin ring
9. crystal gasket, thin ring
10. inner bezel ring (rehaut) with engraved text-like pattern around (no readable text), Oystersteel
Nothing else in the image.
```

### `teardown_src/watches/rolex-explorer-40/dial.png`

Циферблат и стрелки, деталей: 4, сетка 3×2. Референсы: `frontend/assets/photos/rolex-explorer-40/1-1600.jpg`, `frontend/assets/photos/rolex-explorer-40/2-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex Explorer 40 ref. 224270: 40 mm Oystersteel case, smooth bezel, black dial with luminescent 3, 6, 9 Arabic numerals, no date, Oyster bracelet. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 4 separate items, one of each, arranged in a grid of 3 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. black lacquer dial with luminescent applied Arabic numerals 3, 6, 9 and baton indices, no date
2. Mercedes-style hour hand, white gold with Chromalight luminescent fill
3. sword minute hand, white gold with luminescent fill
4. thin seconds hand with round lume dot and counterweight
Nothing else in the image.
```

### `teardown_src/watches/rolex-explorer-40/bracelet.png`

Браслет Oyster, деталей: 28, сетка 4×2. Референсы: `frontend/assets/photos/rolex-explorer-40/1-1600.jpg`, `frontend/assets/photos/rolex-explorer-40/2-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex Explorer 40 ref. 224270: 40 mm Oystersteel case, smooth bezel, black dial with luminescent 3, 6, 9 Arabic numerals, no date, Oyster bracelet. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 6 separate items, one of each, arranged in a grid of 4 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. Oyster bracelet end link (solid, curved to fit the case), Oystersteel
2. single three-piece Oyster bracelet link (flat, brushed outer, polished edges), Oystersteel
3. Oysterlock with Easylink folding clasp with cover, opened and seen from above, Oystersteel
4. Easylink 5 mm comfort extension link
5. tiny threaded link screw pin
6. spring bar (thin steel tube with pins)
Nothing else in the image.
```

### `teardown_src/movements/rolex-32xx-3230/movement_top.png`

Автоподзавод и мосты, деталей: 12, сетка 5×2. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex manufacture automatic calibre, rhodium-plated nickel silver bridges with Côtes de Genève stripes and polished bevels, mainplate with perlage (circular graining), red synthetic ruby jewels, gold-coloured gear wheels, blue Parachrom hairspring, satin-finished rotor, blued steel screws are NOT used (Rolex uses polished steel screws)..
Show EXACTLY 10 separate items, one of each, arranged in a grid of 5 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. oscillating weight (rotor), half-moon shape, satin finish with Côtes de Genève, central ball bearing
2. automatic winding bridge (reverser bridge), polished bevels
3. reversing wheel of the automatic winding (small gold wheel with pinion)
4. automatic winding intermediate wheel
5. traversing balance bridge fixed at two points, with regulating stud carrier, Côtes de Genève
6. barrel bridge with jewel settings, Côtes de Genève stripes, polished bevels
7. train wheel bridge with red ruby jewels, Côtes de Genève stripes
8. ratchet wheel with sunburst (soleil) finish, large flat steel wheel
9. crown wheel, small steel wheel with sunburst finish
10. pallet bridge, small polished bridge with one ruby jewel
Nothing else in the image.
```

### `teardown_src/movements/rolex-32xx-3230/movement_train.png`

Энергия, передача и спуск, деталей: 14, сетка 5×3. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex manufacture automatic calibre, rhodium-plated nickel silver bridges with Côtes de Genève stripes and polished bevels, mainplate with perlage (circular graining), red synthetic ruby jewels, gold-coloured gear wheels, blue Parachrom hairspring, satin-finished rotor, blued steel screws are NOT used (Rolex uses polished steel screws)..
Show EXACTLY 13 separate items, one of each, arranged in a grid of 5 columns and 3 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. closed mainspring barrel with toothed rim, gold-coloured
2. mainspring removed from barrel, relaxed spiral of thin polished steel ribbon
3. barrel arbor (small steel shaft with hook)
4. centre wheel with long pinion arbor, gold-coloured
5. third wheel, gold-coloured with steel pinion
6. fourth wheel (seconds wheel) with long arbor
7. Chronergy escape wheel, skeletonised, nickel-phosphorus, grey metallic
8. Chronergy pallet fork with two red ruby pallet stones
9. balance wheel with blue Parachrom hairspring with Breguet overcoil and gold Microstella nuts
10. Paraflex shock absorber assembly (tiny spring and jewel setting)
11. winding pinion (small steel gear)
12. sliding pinion / clutch wheel (steel, teeth on both ends)
13. winding stem (long thin steel rod with square section)
Nothing else in the image.
```

### `teardown_src/movements/rolex-32xx-3230/movement_dial.png`

Сторона циферблата, деталей: 8, сетка 4×2. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex manufacture automatic calibre, rhodium-plated nickel silver bridges with Côtes de Genève stripes and polished bevels, mainplate with perlage (circular graining), red synthetic ruby jewels, gold-coloured gear wheels, blue Parachrom hairspring, satin-finished rotor, blued steel screws are NOT used (Rolex uses polished steel screws)..
Show EXACTLY 7 separate items, one of each, arranged in a grid of 4 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. mainplate (pillar plate) seen from the dial side, perlage finish, jewel holes, 28.5 mm round
2. cannon pinion (tube with small gear)
3. minute wheel with pinion
4. hour wheel with tube
5. setting lever, flat polished steel
6. yoke (clutch lever), flat polished steel
7. yoke spring and setting lever jumper, thin steel springs
Nothing else in the image.
```

### `teardown_src/movements/rolex-32xx-3230/movement_screws.png`

Винты и мелочь, деталей: 19, сетка 4×2. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex manufacture automatic calibre, rhodium-plated nickel silver bridges with Côtes de Genève stripes and polished bevels, mainplate with perlage (circular graining), red synthetic ruby jewels, gold-coloured gear wheels, blue Parachrom hairspring, satin-finished rotor, blued steel screws are NOT used (Rolex uses polished steel screws)..
Show EXACTLY 6 separate items, one of each, arranged in a grid of 4 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. polished steel bridge screw with slotted head
2. rotor screw with slotted head
3. ratchet wheel screw, large flat head
4. single synthetic ruby jewel bearing (tiny red disc with hole)
5. movement holder ring (spacer ring), thin steel ring
6. casing clamp screw with flat clamp
Nothing else in the image.
```

### `teardown_src/watches/rolex-explorer-40/assembled_front.png`

Собранные часы. Референсы: `frontend/assets/photos/rolex-explorer-40/1-1600.jpg`, `frontend/assets/photos/rolex-explorer-40/2-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Subject: the complete watch head (case, bezel, dial, hands, crown) WITHOUT bracelet or strap, seen exactly from above, centred, same lighting and background. The watch: Rolex Explorer 40 ref. 224270: 40 mm Oystersteel case, smooth bezel, black dial with luminescent 3, 6, 9 Arabic numerals, no date, Oyster bracelet. Match the reference photos exactly (proportions, colours, dial layout, bezel). Seamless uniform light-grey background (#d6d6d6), shadowless light, the watch fills about 70% of the frame height.
```


## rolex-gmt-master-ii-pepsi

### `teardown_src/watches/rolex-gmt-master-ii-pepsi/exterior.png`

Корпус, безель, стекло, крышка, деталей: 14, сетка 5×3. Референсы: `frontend/assets/photos/rolex-gmt-master-ii-pepsi/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex GMT-Master II ref. 126710BLRO: 40 mm Oystersteel case with crown guards, bidirectional rotatable 24-hour bezel with two-colour Cerachrom ceramic insert (upper half blue from 18 through 24 to 6, lower half red from 6 to 18) and platinum-coated numerals, black lacquer dial with round Chromalight hour markers, date window at 3 with Cyclops lens, red GMT hand with triangle tip, Jubilee five-piece bracelet. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 12 separate items, one of each, arranged in a grid of 5 columns and 3 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. 40 mm Oyster case middle with lugs, integrated crown guards, Oystersteel, polished and satin-brushed surfaces, no crown
2. rotating bezel ring with knurled (serrated) edge, Oystersteel
3. 24-hour Cerachrom bezel insert, top half blue and bottom half red, engraved platinum-coated numerals 2 to 22 and triangle at 24
4. bezel click spring (thin wavy steel wire ring)
5. flat sapphire crystal with Cyclops magnifying lens over the date at 3 o'clock, transparent with antireflective tint, seen from above
6. screw-down winding crown with fluted edge and embossed coronet on top, Oystersteel
7. crown tube (small threaded steel tube)
8. set of tiny black O-ring gaskets of the crown
9. screw-down Oyster caseback with fine fluted edge, Oystersteel, plain polished centre
10. black caseback O-ring gasket, thin ring
11. crystal gasket, thin ring
12. inner bezel ring (rehaut) with engraved text-like pattern around (no readable text), Oystersteel
Nothing else in the image.
```

### `teardown_src/watches/rolex-gmt-master-ii-pepsi/dial.png`

Циферблат и стрелки, деталей: 5, сетка 3×2. Референсы: `frontend/assets/photos/rolex-gmt-master-ii-pepsi/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex GMT-Master II ref. 126710BLRO: 40 mm Oystersteel case with crown guards, bidirectional rotatable 24-hour bezel with two-colour Cerachrom ceramic insert (upper half blue from 18 through 24 to 6, lower half red from 6 to 18) and platinum-coated numerals, black lacquer dial with round Chromalight hour markers, date window at 3 with Cyclops lens, red GMT hand with triangle tip, Jubilee five-piece bracelet. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 5 separate items, one of each, arranged in a grid of 3 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. black lacquer dial with round white luminescent hour markers in white gold surrounds, triangle at 12, rectangles at 6 and 9, date aperture at 3, printed text lines, seen perfectly from above
2. Mercedes-style hour hand, white gold with Chromalight luminescent fill
3. sword minute hand, white gold with luminescent fill
4. thin seconds hand with round lume dot and counterweight
5. red 24-hour GMT hand with large triangular luminescent tip
Nothing else in the image.
```

### `teardown_src/watches/rolex-gmt-master-ii-pepsi/bracelet.png`

Браслет Jubilee, деталей: 46, сетка 4×2. Референсы: `frontend/assets/photos/rolex-gmt-master-ii-pepsi/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex GMT-Master II ref. 126710BLRO: 40 mm Oystersteel case with crown guards, bidirectional rotatable 24-hour bezel with two-colour Cerachrom ceramic insert (upper half blue from 18 through 24 to 6, lower half red from 6 to 18) and platinum-coated numerals, black lacquer dial with round Chromalight hour markers, date window at 3 with Cyclops lens, red GMT hand with triangle tip, Jubilee five-piece bracelet. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 6 separate items, one of each, arranged in a grid of 4 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. Jubilee bracelet end link, Oystersteel
2. Jubilee outer link piece (brushed), Oystersteel
3. small polished Jubilee centre link piece, Oystersteel
4. concealed folding Crownclasp / Oysterclasp, opened, Oystersteel
5. tiny threaded link screw pin
6. spring bar
Nothing else in the image.
```

### `teardown_src/movements/rolex-32xx-3285/movement_top.png`

Автоподзавод и мосты, деталей: 12, сетка 5×2. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex manufacture automatic calibre, rhodium-plated nickel silver bridges with Côtes de Genève stripes and polished bevels, mainplate with perlage (circular graining), red synthetic ruby jewels, gold-coloured gear wheels, blue Parachrom hairspring, satin-finished rotor, blued steel screws are NOT used (Rolex uses polished steel screws)..
Show EXACTLY 10 separate items, one of each, arranged in a grid of 5 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. oscillating weight (rotor), half-moon shape, satin finish with Côtes de Genève, central ball bearing
2. automatic winding bridge (reverser bridge), polished bevels
3. reversing wheel of the automatic winding (small gold wheel with pinion)
4. automatic winding intermediate wheel
5. traversing balance bridge fixed at two points, with regulating stud carrier, Côtes de Genève
6. barrel bridge with jewel settings, Côtes de Genève stripes, polished bevels
7. train wheel bridge with red ruby jewels, Côtes de Genève stripes
8. ratchet wheel with sunburst (soleil) finish, large flat steel wheel
9. crown wheel, small steel wheel with sunburst finish
10. pallet bridge, small polished bridge with one ruby jewel
Nothing else in the image.
```

### `teardown_src/movements/rolex-32xx-3285/movement_train.png`

Энергия, передача и спуск, деталей: 14, сетка 5×3. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex manufacture automatic calibre, rhodium-plated nickel silver bridges with Côtes de Genève stripes and polished bevels, mainplate with perlage (circular graining), red synthetic ruby jewels, gold-coloured gear wheels, blue Parachrom hairspring, satin-finished rotor, blued steel screws are NOT used (Rolex uses polished steel screws)..
Show EXACTLY 13 separate items, one of each, arranged in a grid of 5 columns and 3 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. closed mainspring barrel with toothed rim, gold-coloured
2. mainspring removed from barrel, relaxed spiral of thin polished steel ribbon
3. barrel arbor (small steel shaft with hook)
4. centre wheel with long pinion arbor, gold-coloured
5. third wheel, gold-coloured with steel pinion
6. fourth wheel (seconds wheel) with long arbor
7. Chronergy escape wheel, skeletonised, nickel-phosphorus, grey metallic
8. Chronergy pallet fork with two red ruby pallet stones
9. balance wheel with blue Parachrom hairspring with Breguet overcoil and gold Microstella nuts
10. Paraflex shock absorber assembly (tiny spring and jewel setting)
11. winding pinion (small steel gear)
12. sliding pinion / clutch wheel (steel, teeth on both ends)
13. winding stem (long thin steel rod with square section)
Nothing else in the image.
```

### `teardown_src/movements/rolex-32xx-3285/movement_dial.png`

Сторона циферблата, деталей: 14, сетка 5×3. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex manufacture automatic calibre, rhodium-plated nickel silver bridges with Côtes de Genève stripes and polished bevels, mainplate with perlage (circular graining), red synthetic ruby jewels, gold-coloured gear wheels, blue Parachrom hairspring, satin-finished rotor, blued steel screws are NOT used (Rolex uses polished steel screws)..
Show EXACTLY 12 separate items, one of each, arranged in a grid of 5 columns and 3 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. mainplate (pillar plate) seen from the dial side, perlage finish, jewel holes, 28.5 mm round
2. cannon pinion (tube with small gear)
3. minute wheel with pinion
4. hour wheel with tube
5. setting lever, flat polished steel
6. yoke (clutch lever), flat polished steel
7. yoke spring and setting lever jumper, thin steel springs
8. date disc, thin ring printed with numbers 1 to 31, internal teeth
9. instantaneous date driving wheel with finger
10. date jumper spring (flat steel spring)
11. 24-hour GMT wheel with tube for the GMT hand
12. jumping hour star wheel and jumper of the independent hour hand
Nothing else in the image.
```

### `teardown_src/movements/rolex-32xx-3285/movement_screws.png`

Винты и мелочь, деталей: 19, сетка 4×2. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex manufacture automatic calibre, rhodium-plated nickel silver bridges with Côtes de Genève stripes and polished bevels, mainplate with perlage (circular graining), red synthetic ruby jewels, gold-coloured gear wheels, blue Parachrom hairspring, satin-finished rotor, blued steel screws are NOT used (Rolex uses polished steel screws)..
Show EXACTLY 6 separate items, one of each, arranged in a grid of 4 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. polished steel bridge screw with slotted head
2. rotor screw with slotted head
3. ratchet wheel screw, large flat head
4. single synthetic ruby jewel bearing (tiny red disc with hole)
5. movement holder ring (spacer ring), thin steel ring
6. casing clamp screw with flat clamp
Nothing else in the image.
```

### `teardown_src/watches/rolex-gmt-master-ii-pepsi/assembled_front.png`

Собранные часы. Референсы: `frontend/assets/photos/rolex-gmt-master-ii-pepsi/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Subject: the complete watch head (case, bezel, dial, hands, crown) WITHOUT bracelet or strap, seen exactly from above, centred, same lighting and background. The watch: Rolex GMT-Master II ref. 126710BLRO: 40 mm Oystersteel case with crown guards, bidirectional rotatable 24-hour bezel with two-colour Cerachrom ceramic insert (upper half blue from 18 through 24 to 6, lower half red from 6 to 18) and platinum-coated numerals, black lacquer dial with round Chromalight hour markers, date window at 3 with Cyclops lens, red GMT hand with triangle tip, Jubilee five-piece bracelet. Match the reference photos exactly (proportions, colours, dial layout, bezel). Seamless uniform light-grey background (#d6d6d6), shadowless light, the watch fills about 70% of the frame height.
```


## rolex-land-dweller-40

### `teardown_src/watches/rolex-land-dweller-40/exterior.png`

Корпус, безель, стекло, крышка, деталей: 12, сетка 5×2. Референсы: `frontend/assets/photos/rolex-land-dweller-40/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex Land-Dweller 40 ref. 127334: 40 mm Oystersteel case with fluted white gold bezel, white dial with honeycomb motif, integrated Flat Jubilee bracelet, sapphire display caseback. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 10 separate items, one of each, arranged in a grid of 5 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. 40 mm Oyster case middle with lugs, Oystersteel, polished and satin-brushed surfaces, no crown
2. fluted bezel in 18 ct white gold
3. flat sapphire crystal, transparent with antireflective tint, seen from above
4. screw-down winding crown with fluted edge and embossed coronet on top, Oystersteel
5. crown tube (small threaded steel tube)
6. set of tiny black O-ring gaskets of the crown
7. screw-down caseback with sapphire display window, Oystersteel
8. black caseback O-ring gasket, thin ring
9. crystal gasket, thin ring
10. inner bezel ring (rehaut) with engraved text-like pattern around (no readable text), Oystersteel
Nothing else in the image.
```

### `teardown_src/watches/rolex-land-dweller-40/dial.png`

Циферблат и стрелки, деталей: 4, сетка 3×2. Референсы: `frontend/assets/photos/rolex-land-dweller-40/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex Land-Dweller 40 ref. 127334: 40 mm Oystersteel case with fluted white gold bezel, white dial with honeycomb motif, integrated Flat Jubilee bracelet, sapphire display caseback. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 4 separate items, one of each, arranged in a grid of 3 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. white dial with laser-engraved honeycomb pattern, applied white gold indices
2. baton hour hand, white gold
3. baton minute hand, white gold
4. thin seconds hand
Nothing else in the image.
```

### `teardown_src/watches/rolex-land-dweller-40/bracelet.png`

Браслет Flat Jubilee, деталей: 25, сетка 3×2. Референсы: `frontend/assets/photos/rolex-land-dweller-40/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex Land-Dweller 40 ref. 127334: 40 mm Oystersteel case with fluted white gold bezel, white dial with honeycomb motif, integrated Flat Jubilee bracelet, sapphire display caseback. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 4 separate items, one of each, arranged in a grid of 3 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. integrated bracelet end piece, Oystersteel
2. flat Jubilee five-piece link, satin and polished, Oystersteel
3. concealed folding clasp, opened, Oystersteel
4. link screw pin
Nothing else in the image.
```

### `teardown_src/movements/rolex-71xx-7135/movement_top.png`

Автоподзавод и мосты, деталей: 9, сетка 4×2. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: thin Rolex manufacture automatic calibre, bridges with Rolex Côtes de Genève (wide stripes), polished bevels, skeletonised 18 ct gold rotor, silicon Syloxi hairspring (dark grey-blue), red ruby jewels..
Show EXACTLY 8 separate items, one of each, arranged in a grid of 4 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. openworked 18 ct gold oscillating weight with central bearing
2. automatic winding bridge
3. reversing wheel
4. traversing balance bridge
5. barrel bridge, Rolex Côtes de Genève
6. train wheel bridge with ruby jewels
7. ratchet wheel, sunburst finish
8. crown wheel
Nothing else in the image.
```

### `teardown_src/movements/rolex-71xx-7135/movement_train.png`

Энергия, передача и спуск, деталей: 14, сетка 4×2. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: thin Rolex manufacture automatic calibre, bridges with Rolex Côtes de Genève (wide stripes), polished bevels, skeletonised 18 ct gold rotor, silicon Syloxi hairspring (dark grey-blue), red ruby jewels..
Show EXACTLY 8 separate items, one of each, arranged in a grid of 4 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. thin closed mainspring barrel
2. mainspring out of the barrel
3. centre, third and fourth wheels
4. Dynapulse escapement: two silicon escape wheels with a small silicon impulse lever
5. balance wheel with silicon Syloxi hairspring (grey-blue), gold Microstella nuts
6. Paraflex shock absorber
7. winding pinion and sliding pinion
8. winding stem
Nothing else in the image.
```

### `teardown_src/movements/rolex-71xx-7135/movement_dial.png`

Сторона циферблата, деталей: 24, сетка 4×2. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: thin Rolex manufacture automatic calibre, bridges with Rolex Côtes de Genève (wide stripes), polished bevels, skeletonised 18 ct gold rotor, silicon Syloxi hairspring (dark grey-blue), red ruby jewels..
Show EXACTLY 7 separate items, one of each, arranged in a grid of 4 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. thin mainplate seen from the dial side, perlage
2. cannon pinion and minute wheel
3. hour wheel
4. setting lever, yoke and yoke spring
5. polished steel screw
6. synthetic ruby jewel
7. movement holder ring
Nothing else in the image.
```

### `teardown_src/watches/rolex-land-dweller-40/assembled_front.png`

Собранные часы. Референсы: `frontend/assets/photos/rolex-land-dweller-40/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Subject: the complete watch head (case, bezel, dial, hands, crown) WITHOUT bracelet or strap, seen exactly from above, centred, same lighting and background. The watch: Rolex Land-Dweller 40 ref. 127334: 40 mm Oystersteel case with fluted white gold bezel, white dial with honeycomb motif, integrated Flat Jubilee bracelet, sapphire display caseback. Match the reference photos exactly (proportions, colours, dial layout, bezel). Seamless uniform light-grey background (#d6d6d6), shadowless light, the watch fills about 70% of the frame height.
```


## rolex-oyster-perpetual-41

### `teardown_src/watches/rolex-oyster-perpetual-41/exterior.png`

Корпус, безель, стекло, крышка, деталей: 12, сетка 5×2. Референсы: `frontend/assets/photos/rolex-oyster-perpetual-41/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex Oyster Perpetual 41 ref. 134300: 41 mm Oystersteel case, smooth domed polished bezel, green sunray dial with baton indices, no date, Oyster bracelet. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 10 separate items, one of each, arranged in a grid of 5 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. 41 mm Oyster case middle with lugs, Oystersteel, polished and satin-brushed surfaces, no crown
2. smooth domed polished bezel ring, Oystersteel
3. flat sapphire crystal, transparent with antireflective tint, seen from above
4. screw-down winding crown with fluted edge and embossed coronet on top, Oystersteel
5. crown tube (small threaded steel tube)
6. set of tiny black O-ring gaskets of the crown
7. screw-down Oyster caseback with fine fluted edge, Oystersteel, plain polished centre
8. black caseback O-ring gasket, thin ring
9. crystal gasket, thin ring
10. inner bezel ring (rehaut) with engraved text-like pattern around (no readable text), Oystersteel
Nothing else in the image.
```

### `teardown_src/watches/rolex-oyster-perpetual-41/dial.png`

Циферблат и стрелки, деталей: 4, сетка 3×2. Референсы: `frontend/assets/photos/rolex-oyster-perpetual-41/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex Oyster Perpetual 41 ref. 134300: 41 mm Oystersteel case, smooth domed polished bezel, green sunray dial with baton indices, no date, Oyster bracelet. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 4 separate items, one of each, arranged in a grid of 3 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. green sunray-finish dial with applied white gold baton indices and luminescent dots, no date
2. baton hour hand, white gold with lume
3. baton minute hand, white gold with lume
4. thin seconds hand
Nothing else in the image.
```

### `teardown_src/watches/rolex-oyster-perpetual-41/bracelet.png`

Браслет Oyster, деталей: 28, сетка 4×2. Референсы: `frontend/assets/photos/rolex-oyster-perpetual-41/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex Oyster Perpetual 41 ref. 134300: 41 mm Oystersteel case, smooth domed polished bezel, green sunray dial with baton indices, no date, Oyster bracelet. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 6 separate items, one of each, arranged in a grid of 4 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. Oyster bracelet end link (solid, curved to fit the case), Oystersteel
2. single three-piece Oyster bracelet link (flat, brushed outer, polished edges), Oystersteel
3. Oysterclasp folding clasp with cover, opened and seen from above, Oystersteel
4. Easylink 5 mm comfort extension link
5. tiny threaded link screw pin
6. spring bar (thin steel tube with pins)
Nothing else in the image.
```

- `movements/rolex-32xx-3230/movement_top.png`: уже описан выше (общий механизм).
- `movements/rolex-32xx-3230/movement_train.png`: уже описан выше (общий механизм).
- `movements/rolex-32xx-3230/movement_dial.png`: уже описан выше (общий механизм).
- `movements/rolex-32xx-3230/movement_screws.png`: уже описан выше (общий механизм).
### `teardown_src/watches/rolex-oyster-perpetual-41/assembled_front.png`

Собранные часы. Референсы: `frontend/assets/photos/rolex-oyster-perpetual-41/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Subject: the complete watch head (case, bezel, dial, hands, crown) WITHOUT bracelet or strap, seen exactly from above, centred, same lighting and background. The watch: Rolex Oyster Perpetual 41 ref. 134300: 41 mm Oystersteel case, smooth domed polished bezel, green sunray dial with baton indices, no date, Oyster bracelet. Match the reference photos exactly (proportions, colours, dial layout, bezel). Seamless uniform light-grey background (#d6d6d6), shadowless light, the watch fills about 70% of the frame height.
```


## rolex-sky-dweller

### `teardown_src/watches/rolex-sky-dweller/exterior.png`

Корпус, безель, стекло, крышка, деталей: 13, сетка 5×3. Референсы: `frontend/assets/photos/rolex-sky-dweller/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex Sky-Dweller ref. 336934: 42 mm Oystersteel case, rotatable fluted 18 ct white gold Ring Command bezel, blue sunray dial with off-centre 24-hour disc and 12 month windows around the edge, date at 3 with Cyclops, Jubilee bracelet. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 11 separate items, one of each, arranged in a grid of 5 columns and 3 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. 42 mm Oyster case middle with lugs, Oystersteel, polished and satin-brushed surfaces, no crown
2. rotatable fluted Ring Command bezel in 18 ct white gold
3. bezel spring ring
4. flat sapphire crystal with Cyclops lens at 3 o'clock, transparent with antireflective tint, seen from above
5. screw-down winding crown with fluted edge and embossed coronet on top, Oystersteel
6. crown tube (small threaded steel tube)
7. set of tiny black O-ring gaskets of the crown
8. screw-down Oyster caseback with fine fluted edge, Oystersteel, plain polished centre
9. black caseback O-ring gasket, thin ring
10. crystal gasket, thin ring
11. inner bezel ring (rehaut) with engraved text-like pattern around (no readable text), Oystersteel
Nothing else in the image.
```

### `teardown_src/watches/rolex-sky-dweller/dial.png`

Циферблат и стрелки, деталей: 4, сетка 3×2. Референсы: `frontend/assets/photos/rolex-sky-dweller/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex Sky-Dweller ref. 336934: 42 mm Oystersteel case, rotatable fluted 18 ct white gold Ring Command bezel, blue sunray dial with off-centre 24-hour disc and 12 month windows around the edge, date at 3 with Cyclops, Jubilee bracelet. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 4 separate items, one of each, arranged in a grid of 3 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. blue sunray dial with applied baton indices, 12 small month apertures around the edge, off-centre 24-hour ring at 6 with red triangle, date at 3
2. baton hour hand, white gold
3. baton minute hand, white gold
4. thin seconds hand
Nothing else in the image.
```

### `teardown_src/watches/rolex-sky-dweller/bracelet.png`

Браслет Jubilee, деталей: 46, сетка 4×2. Референсы: `frontend/assets/photos/rolex-sky-dweller/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex Sky-Dweller ref. 336934: 42 mm Oystersteel case, rotatable fluted 18 ct white gold Ring Command bezel, blue sunray dial with off-centre 24-hour disc and 12 month windows around the edge, date at 3 with Cyclops, Jubilee bracelet. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 6 separate items, one of each, arranged in a grid of 4 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. Jubilee bracelet end link, Oystersteel
2. Jubilee outer link piece (brushed), Oystersteel
3. small polished Jubilee centre link piece, Oystersteel
4. concealed folding Crownclasp / Oysterclasp, opened, Oystersteel
5. tiny threaded link screw pin
6. spring bar
Nothing else in the image.
```

### `teardown_src/movements/rolex-9002-9002/movement_top.png`

Автоподзавод и мосты, деталей: 9, сетка 4×2. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex manufacture automatic calibre with annual calendar, rhodium-plated bridges with Côtes de Genève, red ruby jewels, blue Parachrom hairspring, gold-coloured wheels..
Show EXACTLY 8 separate items, one of each, arranged in a grid of 4 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. oscillating weight with central bearing, satin finish
2. automatic winding bridge
3. reversing wheel
4. traversing balance bridge
5. barrel bridge, Côtes de Genève
6. train wheel bridge with ruby jewels
7. ratchet wheel, sunburst finish
8. crown wheel
Nothing else in the image.
```

### `teardown_src/movements/rolex-9002-9002/movement_train.png`

Энергия, передача и спуск, деталей: 13, сетка 4×3. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex manufacture automatic calibre with annual calendar, rhodium-plated bridges with Côtes de Genève, red ruby jewels, blue Parachrom hairspring, gold-coloured wheels..
Show EXACTLY 9 separate items, one of each, arranged in a grid of 4 columns and 3 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. closed mainspring barrel
2. mainspring out of the barrel
3. centre, third and fourth wheels
4. Chronergy escape wheel
5. Chronergy pallet fork
6. balance wheel with blue Parachrom hairspring
7. Paraflex shock absorber
8. winding pinion and sliding pinion
9. winding stem
Nothing else in the image.
```

### `teardown_src/movements/rolex-9002-9002/movement_calendar.png`

Календарь Saros и второй пояс, деталей: 26, сетка 5×3. Референсы: нет.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex manufacture automatic calibre with annual calendar, rhodium-plated bridges with Côtes de Genève, red ruby jewels, blue Parachrom hairspring, gold-coloured wheels..
Show EXACTLY 12 separate items, one of each, arranged in a grid of 5 columns and 3 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. mainplate seen from the dial side, perlage
2. Saros annual calendar satellite gear wheel
3. small annual calendar wheels
4. months ring (12 small windows around dial edge), thin ring
5. date disc printed 1 to 31
6. 24-hour reference time disc (off-centre rotating disc)
7. Ring Command selector lever and wheels linked to the bezel
8. cannon pinion and minute wheel
9. hour wheel
10. setting lever and yoke
11. polished steel screw
12. movement holder ring
Nothing else in the image.
```

### `teardown_src/watches/rolex-sky-dweller/assembled_front.png`

Собранные часы. Референсы: `frontend/assets/photos/rolex-sky-dweller/1-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Subject: the complete watch head (case, bezel, dial, hands, crown) WITHOUT bracelet or strap, seen exactly from above, centred, same lighting and background. The watch: Rolex Sky-Dweller ref. 336934: 42 mm Oystersteel case, rotatable fluted 18 ct white gold Ring Command bezel, blue sunray dial with off-centre 24-hour disc and 12 month windows around the edge, date at 3 with Cyclops, Jubilee bracelet. Match the reference photos exactly (proportions, colours, dial layout, bezel). Seamless uniform light-grey background (#d6d6d6), shadowless light, the watch fills about 70% of the frame height.
```


## rolex-submariner

### `teardown_src/watches/rolex-submariner/exterior.png`

Корпус, безель, стекло, крышка, деталей: 14, сетка 5×3. Референсы: `frontend/assets/photos/rolex-submariner/1-1600.jpg`, `frontend/assets/photos/rolex-submariner/2-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex Submariner ref. 124060 (no date): 41 mm Oystersteel case with crown guards, unidirectional 60-minute black Cerachrom bezel with platinum-coated graduations, black lacquer dial with Chromalight markers, no date, Oyster bracelet with Glidelock clasp. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 12 separate items, one of each, arranged in a grid of 5 columns and 3 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. 41 mm Oyster case middle with lugs, integrated crown guards, Oystersteel, polished and satin-brushed surfaces, no crown
2. rotating bezel ring with knurled (serrated) edge, Oystersteel
3. black Cerachrom 60-minute diving bezel insert with platinum-coated graduations and triangle at 12
4. bezel click spring (thin wavy steel wire ring)
5. flat sapphire crystal, transparent with antireflective tint, seen from above
6. screw-down winding crown with fluted edge and embossed coronet on top, Oystersteel
7. crown tube (small threaded steel tube)
8. set of tiny black O-ring gaskets of the crown
9. screw-down Oyster caseback with fine fluted edge, Oystersteel, plain polished centre
10. black caseback O-ring gasket, thin ring
11. crystal gasket, thin ring
12. inner bezel ring (rehaut) with engraved text-like pattern around (no readable text), Oystersteel
Nothing else in the image.
```

### `teardown_src/watches/rolex-submariner/dial.png`

Циферблат и стрелки, деталей: 4, сетка 3×2. Референсы: `frontend/assets/photos/rolex-submariner/1-1600.jpg`, `frontend/assets/photos/rolex-submariner/2-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex Submariner ref. 124060 (no date): 41 mm Oystersteel case with crown guards, unidirectional 60-minute black Cerachrom bezel with platinum-coated graduations, black lacquer dial with Chromalight markers, no date, Oyster bracelet with Glidelock clasp. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 4 separate items, one of each, arranged in a grid of 3 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. black lacquer dial with round, rectangular and triangular luminescent hour markers in white gold surrounds, no date, printed text lines
2. Mercedes-style hour hand, white gold with Chromalight luminescent fill
3. sword minute hand, white gold with luminescent fill
4. thin seconds hand with round lume dot and counterweight
Nothing else in the image.
```

### `teardown_src/watches/rolex-submariner/bracelet.png`

Браслет Oyster, деталей: 28, сетка 4×2. Референсы: `frontend/assets/photos/rolex-submariner/1-1600.jpg`, `frontend/assets/photos/rolex-submariner/2-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex Submariner ref. 124060 (no date): 41 mm Oystersteel case with crown guards, unidirectional 60-minute black Cerachrom bezel with platinum-coated graduations, black lacquer dial with Chromalight markers, no date, Oyster bracelet with Glidelock clasp. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 6 separate items, one of each, arranged in a grid of 4 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. Oyster bracelet end link (solid, curved to fit the case), Oystersteel
2. single three-piece Oyster bracelet link (flat, brushed outer, polished edges), Oystersteel
3. Oysterlock with Glidelock folding clasp with cover, opened and seen from above, Oystersteel
4. Easylink 5 mm comfort extension link
5. tiny threaded link screw pin
6. spring bar (thin steel tube with pins)
Nothing else in the image.
```

- `movements/rolex-32xx-3230/movement_top.png`: уже описан выше (общий механизм).
- `movements/rolex-32xx-3230/movement_train.png`: уже описан выше (общий механизм).
- `movements/rolex-32xx-3230/movement_dial.png`: уже описан выше (общий механизм).
- `movements/rolex-32xx-3230/movement_screws.png`: уже описан выше (общий механизм).
### `teardown_src/watches/rolex-submariner/assembled_front.png`

Собранные часы. Референсы: `frontend/assets/photos/rolex-submariner/1-1600.jpg`, `frontend/assets/photos/rolex-submariner/2-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Subject: the complete watch head (case, bezel, dial, hands, crown) WITHOUT bracelet or strap, seen exactly from above, centred, same lighting and background. The watch: Rolex Submariner ref. 124060 (no date): 41 mm Oystersteel case with crown guards, unidirectional 60-minute black Cerachrom bezel with platinum-coated graduations, black lacquer dial with Chromalight markers, no date, Oyster bracelet with Glidelock clasp. Match the reference photos exactly (proportions, colours, dial layout, bezel). Seamless uniform light-grey background (#d6d6d6), shadowless light, the watch fills about 70% of the frame height.
```


## rolex-submariner-date

### `teardown_src/watches/rolex-submariner-date/exterior.png`

Корпус, безель, стекло, крышка, деталей: 14, сетка 5×3. Референсы: `frontend/assets/photos/rolex-submariner-date/1-1600.jpg`, `frontend/assets/photos/rolex-submariner-date/2-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex Submariner Date ref. 126610LN: 41 mm Oystersteel case with crown guards, black Cerachrom unidirectional bezel, black lacquer dial with Chromalight markers, date at 3 with Cyclops lens, Oyster bracelet with Glidelock. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 12 separate items, one of each, arranged in a grid of 5 columns and 3 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. 41 mm Oyster case middle with lugs, integrated crown guards, Oystersteel, polished and satin-brushed surfaces, no crown
2. rotating bezel ring with knurled (serrated) edge, Oystersteel
3. black Cerachrom 60-minute diving bezel insert with platinum-coated graduations
4. bezel click spring (thin wavy steel wire ring)
5. flat sapphire crystal with Cyclops magnifying lens at 3 o'clock, transparent with antireflective tint, seen from above
6. screw-down winding crown with fluted edge and embossed coronet on top, Oystersteel
7. crown tube (small threaded steel tube)
8. set of tiny black O-ring gaskets of the crown
9. screw-down Oyster caseback with fine fluted edge, Oystersteel, plain polished centre
10. black caseback O-ring gasket, thin ring
11. crystal gasket, thin ring
12. inner bezel ring (rehaut) with engraved text-like pattern around (no readable text), Oystersteel
Nothing else in the image.
```

### `teardown_src/watches/rolex-submariner-date/dial.png`

Циферблат и стрелки, деталей: 4, сетка 3×2. Референсы: `frontend/assets/photos/rolex-submariner-date/1-1600.jpg`, `frontend/assets/photos/rolex-submariner-date/2-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex Submariner Date ref. 126610LN: 41 mm Oystersteel case with crown guards, black Cerachrom unidirectional bezel, black lacquer dial with Chromalight markers, date at 3 with Cyclops lens, Oyster bracelet with Glidelock. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 4 separate items, one of each, arranged in a grid of 3 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. black lacquer dial with luminescent hour markers in white gold surrounds, date aperture at 3, printed text lines
2. Mercedes-style hour hand, white gold with Chromalight luminescent fill
3. sword minute hand, white gold with luminescent fill
4. thin seconds hand with round lume dot and counterweight
Nothing else in the image.
```

### `teardown_src/watches/rolex-submariner-date/bracelet.png`

Браслет Oyster, деталей: 28, сетка 4×2. Референсы: `frontend/assets/photos/rolex-submariner-date/1-1600.jpg`, `frontend/assets/photos/rolex-submariner-date/2-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. Seamless, perfectly uniform light-grey background (#d6d6d6), no texture, no gradient, no vignette. Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene (text that is really printed or engraved on a part, such as dial printing, stays as on the real watch).

Subject: the disassembled components of this watch: Rolex Submariner Date ref. 126610LN: 41 mm Oystersteel case with crown guards, black Cerachrom unidirectional bezel, black lacquer dial with Chromalight markers, date at 3 with Cyclops lens, Oyster bracelet with Glidelock. The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, crown, bracelet) must match it exactly in shape, colour, finish and printing.
Show EXACTLY 6 separate items, one of each, arranged in a grid of 4 columns and 2 rows, in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, in this order:
1. Oyster bracelet end link (solid, curved to fit the case), Oystersteel
2. single three-piece Oyster bracelet link (flat, brushed outer, polished edges), Oystersteel
3. Oysterlock with Glidelock folding clasp with cover, opened and seen from above, Oystersteel
4. Easylink 5 mm comfort extension link
5. tiny threaded link screw pin
6. spring bar (thin steel tube with pins)
Nothing else in the image.
```

- `movements/rolex-32xx-3235/movement_top.png`: уже описан выше (общий механизм).
- `movements/rolex-32xx-3235/movement_train.png`: уже описан выше (общий механизм).
- `movements/rolex-32xx-3235/movement_dial.png`: уже описан выше (общий механизм).
- `movements/rolex-32xx-3235/movement_screws.png`: уже описан выше (общий механизм).
### `teardown_src/watches/rolex-submariner-date/assembled_front.png`

Собранные часы. Референсы: `frontend/assets/photos/rolex-submariner-date/1-1600.jpg`, `frontend/assets/photos/rolex-submariner-date/2-1600.jpg`.

```text
Ultra-detailed macro product photograph for a technical watch encyclopedia. Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). Subject: the complete watch head (case, bezel, dial, hands, crown) WITHOUT bracelet or strap, seen exactly from above, centred, same lighting and background. The watch: Rolex Submariner Date ref. 126610LN: 41 mm Oystersteel case with crown guards, black Cerachrom unidirectional bezel, black lacquer dial with Chromalight markers, date at 3 with Cyclops lens, Oyster bracelet with Glidelock. Match the reference photos exactly (proportions, colours, dial layout, bezel). Seamless uniform light-grey background (#d6d6d6), shadowless light, the watch fills about 70% of the frame height.
```

