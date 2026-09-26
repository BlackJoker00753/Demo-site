"""Фирменные картинки: превью ссылок (Open Graph) и PNG-иконки приложения.

    uv run --with fonttools --with brotli python scripts/brand_assets.py

Иконка повторяет favicon.svg (циферблат с двумя стрелками), шрифты берутся из frontend/assets/fonts
(woff2 распаковывается во временный TTF). Результат в frontend/assets/brand/.
"""

from __future__ import annotations

import io
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
FONTS = ROOT / "frontend" / "assets" / "fonts"
OUT = ROOT / "frontend" / "assets" / "brand"

BG = (7, 8, 10)
RING = (201, 206, 212)
HOUR = (232, 235, 238)
LUME = (159, 233, 196)
TEXT = (233, 236, 239)
TEXT2 = (169, 176, 184)


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    """Шрифт сайта из woff2 (Cormorant Garamond, Onest)."""
    from fontTools.ttLib import TTFont

    tt = TTFont(FONTS / f"{name}.woff2")
    tt.flavor = None
    buf = io.BytesIO()
    tt.save(buf)
    buf.seek(0)
    return ImageFont.truetype(buf, size)


def mark(size: int, pad: float = 0.0, radius: float = 14 / 64) -> Image.Image:
    """Иконка как favicon.svg (viewBox 64), отрисованная с запасом и уменьшенная (гладкие края)."""
    k = 4
    S = size * k
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * radius), fill=BG)
    u = S * (1 - 2 * pad) / 64  # единица viewBox
    o = S * pad
    c = o + 32 * u
    r = 21 * u
    d.ellipse([c - r, c - r, c + r, c + r], outline=RING, width=max(1, round(2 * u)))

    def hand(x2, y2, color, w):
        d.line([c, c, o + x2 * u, o + y2 * u], fill=color, width=max(1, round(w * u)))
        rr = w * u / 2
        for x, y in ((c, c), (o + x2 * u, o + y2 * u)):
            d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=color)

    hand(32, 16, HOUR, 2.5)
    hand(41, 38, LUME, 2.5)
    return img.resize((size, size), Image.LANCZOS)


def og_image() -> Image.Image:
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), BG)
    # холодный свет справа сверху и едва заметный зелёный снизу слева, как на страницах
    glow = Image.new("RGB", (W, H), BG)
    g = ImageDraw.Draw(glow)
    g.ellipse([620, -260, 1380, 420], fill=(34, 40, 48))
    g.ellipse([-260, 420, 360, 900], fill=(14, 26, 22))
    img = Image.blend(img, glow.filter(ImageFilter.GaussianBlur(120)), 1.0)
    d = ImageDraw.Draw(img)
    # концентрические круги, как у заглушек циферблата
    cx, cy = 930, 315
    for i, r in enumerate(range(90, 420, 34)):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(22 + i, 25 + i, 29 + i), width=1)
    for t in range(60):
        a = t / 60 * math.tau
        r1, r2 = (230, 206) if t % 5 == 0 else (230, 220)
        col = (120, 128, 136) if t % 5 == 0 else (52, 56, 62)
        d.line([cx + math.sin(a) * r1, cy - math.cos(a) * r1, cx + math.sin(a) * r2, cy - math.cos(a) * r2], fill=col, width=2 if t % 5 == 0 else 1)
    d.line([cx, cy, cx + 0, cy - 150], fill=HOUR, width=6)
    d.line([cx, cy, cx + 150 * math.sin(math.radians(128)), cy - 150 * math.cos(math.radians(128))], fill=LUME, width=6)
    d.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], fill=HOUR)

    img.paste(mark(96), (80, 96), mark(96))
    d.text((80, 230), "Horologium", font=font("cormorant-garamond-normal-400-latin", 112), fill=TEXT)
    d.text((84, 372), "Атлас часового искусства", font=font("onest-normal-400-cyrillic", 40), fill=TEXT2)
    d.text((84, 452), "Страны, мануфактуры, модели, механизмы", font=font("onest-normal-400-cyrillic", 26), fill=(120, 128, 136))
    d.text((84, 494), "Разборка часов до последнего винта", font=font("onest-normal-400-cyrillic", 26), fill=LUME)
    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    og_image().save(OUT / "og.jpg", quality=90, optimize=True, progressive=True)
    for size in (192, 512):
        mark(size).save(OUT / f"icon-{size}.png", optimize=True)
    # maskable: система сама скругляет углы, поэтому фон на весь квадрат и рисунок в безопасной зоне (80 %)
    m = Image.new("RGBA", (512, 512), BG + (255,))
    inner = mark(512, pad=0.1, radius=0)
    m.alpha_composite(inner)
    m.save(OUT / "icon-maskable-512.png", optimize=True)
    # iOS: без прозрачности, углы скругляет система
    apple = Image.new("RGB", (180, 180), BG)
    apple.paste(mark(180, radius=0), (0, 0), mark(180, radius=0))
    apple.save(OUT / "apple-touch-icon.png", optimize=True)
    for f in sorted(OUT.iterdir()):
        print(f.relative_to(ROOT), f"{f.stat().st_size // 1024} КБ")


if __name__ == "__main__":
    main()
