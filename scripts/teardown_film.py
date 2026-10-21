"""Фильм-разборка: кадры рендера Blender → WebP для сайта и film.json с главами.

    uv run python scripts/teardown_film.py rolex-submariner

Источник: teardown_src/3d/<slug>/frames/f_####.png (Blender, прозрачный фон, 1600×900).
Результат: frontend/assets/teardown/<slug>/film/{d,m}/f_####.webp (ПК 1280×720 и телефон 640×360) и film.json.
"""

import json
import sys
from pathlib import Path

import yaml
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SIZES = {"d": (1280, 720, 80), "m": (640, 360, 74)}


def main(slug: str) -> None:
    src = ROOT / "teardown_src" / "3d" / slug / "frames"
    frames = sorted(src.glob("f_*.png"))
    if not frames:
        sys.exit(f"нет кадров в {src}")
    out = ROOT / "frontend" / "assets" / "teardown" / slug / "film"
    total = {k: 0 for k in SIZES}
    for key, (w, h, q) in SIZES.items():
        (out / key).mkdir(parents=True, exist_ok=True)
        for i, f in enumerate(frames):
            dst = out / key / f"f_{i:04d}.webp"
            if not dst.exists() or dst.stat().st_mtime < f.stat().st_mtime:
                Image.open(f).convert("RGBA").resize((w, h), Image.LANCZOS).save(dst, "WEBP", quality=q, method=6)
            total[key] += dst.stat().st_size
    films = yaml.safe_load((ROOT / "content" / "teardown" / "films.yaml").read_text())
    meta = films.get(slug, {})
    chapters = sorted(meta.get("chapters", []), key=lambda c: c["from"])
    manifest = {
        "frames": len(frames),
        "sizes": {k: {"w": w, "h": h, "path": f"{k}/f_{{i}}.webp"} for k, (w, h, _) in SIZES.items()},
        "chapters": chapters,
        "note": meta.get("note", ""),
        "version": int(max(f.stat().st_mtime for f in frames)),
    }
    (out / "film.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
    print(f"{slug}: {len(frames)} кадров; ПК {total['d'] / 1e6:.1f} МБ, телефон {total['m'] / 1e6:.1f} МБ")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "rolex-submariner")
