"""Пакетный выбор фото: строки ``slug|индекс|подпись|фокус|ctx|кадр`` (всё после индекса необязательно).

``кадр``: x0,y0,x1,y1 в долях 0..1, вырезается из оригинала (для мелких деталей).

``ctx`` в пятой колонке: снимок родственной модели, только для ленты «Вживую».

    uv run python scripts/pick_batch.py picks.txt
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from photos import cmd_pick  # noqa: E402

for line in Path(sys.argv[1]).read_text(encoding="utf-8").splitlines():
    if not line.strip() or line.startswith("#"):
        continue
    slug, idx, *rest = [x.strip() for x in line.split("|")]
    caption = rest[0] if rest and rest[0] else None
    focus = rest[1] if len(rest) > 1 and rest[1] else None
    context = len(rest) > 2 and rest[2] == "ctx"
    crop = rest[3] if len(rest) > 3 and rest[3] else None
    cmd_pick(slug, [int(idx)], focus, caption, context, crop)
