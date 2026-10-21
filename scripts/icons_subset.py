"""Шрифт иконок только с теми иконками Phosphor, что есть в коде (а не все 1530).

    uv run --with fonttools --with brotli python scripts/icons_subset.py

Ищет классы ph-* во фронтенде и контенте, вырезает их глифы из Phosphor-Light.woff2 и пишет
frontend/assets/icons/icons.woff2 и icons.css. Классы .ph-light и .ph-thin используют этот же шрифт.
Новая иконка в коде: перезапустить скрипт (тест test_icons_subset это проверяет).
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "frontend" / "vendor" / "phosphor" / "light"
OUT = ROOT / "frontend" / "assets" / "icons"
SCAN = [ROOT / "frontend" / "js", ROOT / "frontend" / "index.html", ROOT / "frontend" / "css", ROOT / "content", ROOT / "backend" / "horologium"]
SKIP = {"ph-light", "ph-thin", "ph-bold", "ph-fill", "ph-duotone", "ph-regular"}


def used_icons() -> set[str]:
    names = set()
    for base in SCAN:
        files = [base] if base.is_file() else [p for p in base.rglob("*") if p.suffix in {".js", ".html", ".css", ".yaml", ".py"}]
        for f in files:
            names |= set(re.findall(r"\bph-[a-z0-9]+(?:-[a-z0-9]+)*", f.read_text(encoding="utf-8")))
    return names - SKIP


def glyph_map() -> dict[str, str]:
    css = (SRC / "style.css").read_text()
    return {m.group(1): m.group(2) for m in re.finditer(r"\.ph-light\.(ph-[\w-]+):before\s*{\s*content:\s*\"\\(\w+)\"", css)}


def main() -> None:
    from fontTools import subset  # здесь, чтобы тест мог взять used_icons() без fontTools

    gm = glyph_map()
    names = sorted(n for n in used_icons() if n in gm)
    OUT.mkdir(parents=True, exist_ok=True)
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.notdef_outline = True
    font = subset.load_font(str(SRC / "Phosphor-Light.woff2"), opts)
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=[int(gm[n], 16) for n in names])
    sub.subset(font)
    subset.save_font(font, str(OUT / "icons.woff2"), opts)
    rules = "\n".join(f".{n}:before {{ content: \"\\{gm[n]}\"; }}" for n in names)
    (OUT / "icons.css").write_text(
        "/* Сгенерировано scripts/icons_subset.py: только иконки Phosphor Light, которые есть в коде. */\n"
        "@font-face { font-family: \"Phosphor-Light\"; src: url(\"/assets/icons/icons.woff2\") format(\"woff2\"); font-display: block; }\n"
        ".ph-light, .ph-thin { font-family: \"Phosphor-Light\" !important; speak: never; font-style: normal; font-weight: normal;"
        " font-variant: normal; text-transform: none; line-height: 1; letter-spacing: 0;"
        " -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }\n" + rules + "\n")
    print(f"иконок: {len(names)}; шрифт {(OUT / 'icons.woff2').stat().st_size // 1024} КБ, css {(OUT / 'icons.css').stat().st_size // 1024} КБ")
    missing = sorted(used_icons() - set(gm))
    if missing:
        print("нет в Phosphor (опечатки в коде?):", ", ".join(missing))


if __name__ == "__main__":
    main()
