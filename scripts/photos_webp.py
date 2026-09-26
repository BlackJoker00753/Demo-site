"""WebP-копии всех фото атласа (frontend/assets/photos/*/*.jpg → .webp).

    uv run python scripts/photos_webp.py

Новые фото получают WebP сразу в scripts/photos.py; скрипт догоняет старые и те, что положили руками.
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PHOTOS = ROOT / "frontend" / "assets" / "photos"


def main() -> None:
    made = skipped = 0
    jpg_total = webp_total = 0
    for jpg in sorted(PHOTOS.glob("*/*.jpg")):
        webp = jpg.with_suffix(".webp")
        if not webp.exists() or webp.stat().st_mtime < jpg.stat().st_mtime:
            Image.open(jpg).save(webp, "WEBP", quality=80, method=6)
            made += 1
        else:
            skipped += 1
        jpg_total += jpg.stat().st_size
        webp_total += webp.stat().st_size
    print(f"WebP: создано {made}, уже были {skipped}; JPEG {jpg_total / 1e6:.1f} МБ → WebP {webp_total / 1e6:.1f} МБ")


if __name__ == "__main__":
    main()
