"""Настоящие фотографии часов из свободно лицензированных источников.

Источники: Wikimedia Commons и Openverse (Flickr и др.). Берём только лицензии,
разрешающие коммерческое использование и изменение размера: CC0, Public Domain,
CC BY, CC BY-SA. Автор и лицензия сохраняются в ``content/photos.yaml`` и
показываются на сайте.

Процесс (человек или ИИ проверяет каждое фото глазами):

    uv run python scripts/photos.py candidates rolex-submariner-date     # поиск + контактный лист
    uv run python scripts/photos.py candidates --missing                 # для всех моделей без фото
    uv run python scripts/photos.py pick rolex-submariner-date 3 7       # скачать выбранные кадры
    uv run python scripts/photos.py pick rolex-submariner-date 3 --focus 0.5,0.4
    uv run python scripts/photos.py drop rolex-submariner-date           # убрать фото модели

Контактные листы: ``scripts/.cache/photos/<slug>.png`` (номер кадра в углу).
"""

from __future__ import annotations

import argparse
import io
import json
import re
import sys
import time
from pathlib import Path

import httpx
import yaml
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path(__file__).resolve().parent / ".cache" / "photos"
OUT = ROOT / "frontend" / "assets" / "photos"
PHOTOS_YAML = ROOT / "content" / "photos.yaml"
UA = "HorologiumAtlas/1.0 (educational watch encyclopedia; https://github.com/BlackJoker00753/Demo-site)"
client = httpx.Client(timeout=httpx.Timeout(40.0, connect=15.0), follow_redirects=True, headers={"User-Agent": UA})

OK_LICENSES = {"cc0", "pdm", "by", "by-sa"}
LICENSE_URLS = {
    "cc0": "https://creativecommons.org/publicdomain/zero/1.0/",
    "pdm": "https://creativecommons.org/publicdomain/mark/1.0/",
}
SIZES = (480, 960, 1600)


# ------------------------------------------------------------------ content helpers


def all_watches() -> dict[str, dict]:
    out = {}
    for path in sorted((ROOT / "content" / "brands").rglob("*.yaml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        brand = data["brand"]
        for w in data.get("watches", []):
            out[w["slug"]] = {"brand": brand["name"], "name": w["name"], "collection": w.get("collection"), "reference": w.get("reference")}
    return out


def load_photos() -> dict:
    if PHOTOS_YAML.exists():
        return yaml.safe_load(PHOTOS_YAML.read_text(encoding="utf-8")) or {}
    return {}


def save_photos(data: dict) -> None:
    header = (
        "# Фотографии моделей. Генерируется scripts/photos.py, правится вручную только focus.\n"
        "# Все снимки под свободными лицензиями (CC0, PD, CC BY, CC BY-SA); автор и лицензия обязательны.\n"
    )
    body = yaml.safe_dump(dict(sorted(data.items())), allow_unicode=True, sort_keys=False, width=200)
    PHOTOS_YAML.write_text(header + body, encoding="utf-8")


def queries_for(w: dict) -> list[str]:
    brand, name, coll, ref = w["brand"], w["name"], w["collection"], w["reference"]
    clean = re.sub(r"[«»\"]", "", name)
    qs = [f"{brand} {clean}"]
    if coll and coll.lower() not in clean.lower():
        qs.append(f"{brand} {coll}")
    if ref and len(str(ref)) >= 4:
        qs.append(f"{brand} {ref}")
    return list(dict.fromkeys(qs))


# ------------------------------------------------------------------ sources


def strip_html(s: str | None) -> str:
    return re.sub(r"<[^>]+>", "", s or "").strip()


def commons_search(query: str, limit: int = 8) -> list[dict]:
    params = {
        "action": "query", "format": "json", "generator": "search", "gsrsearch": query, "gsrnamespace": 6,
        "gsrlimit": limit, "prop": "imageinfo", "iiprop": "url|extmetadata|size|mime", "iiurlwidth": 1600,
    }
    r = client.get("https://commons.wikimedia.org/w/api.php", params=params)
    r.raise_for_status()
    pages = (r.json().get("query") or {}).get("pages") or {}
    out = []
    for p in sorted(pages.values(), key=lambda x: x.get("index", 0)):
        ii = (p.get("imageinfo") or [{}])[0]
        if ii.get("mime") not in ("image/jpeg", "image/png", "image/webp"):
            continue
        meta = ii.get("extmetadata") or {}
        lic = (meta.get("LicenseShortName", {}).get("value") or "").strip()
        lic_key = lic.lower().replace(" ", "-")
        key = "cc0" if "cc0" in lic_key else "pdm" if "public-domain" in lic_key or lic_key == "pd" else "by-sa" if "by-sa" in lic_key else "by" if lic_key.startswith("cc-by") else None
        if key not in OK_LICENSES:
            continue
        out.append({
            "source": "commons", "id": p["title"], "title": p["title"].removeprefix("File:"),
            "thumb": ii.get("thumburl") or ii.get("url"), "full": ii.get("thumburl") or ii.get("url"),
            "width": ii.get("width"), "height": ii.get("height"),
            "author": strip_html(meta.get("Artist", {}).get("value")) or "Неизвестный автор",
            "license": lic, "license_url": meta.get("LicenseUrl", {}).get("value") or LICENSE_URLS.get(key, ""),
            "source_url": ii.get("descriptionurl"),
        })
    return out


def openverse_search(query: str, limit: int = 8) -> list[dict]:
    params = {"q": query, "license": "by,by-sa,cc0,pdm", "page_size": limit, "mature": "false"}
    r = client.get("https://api.openverse.org/v1/images/", params=params)
    if r.status_code == 429:
        print("  openverse: rate limit, пропускаю", file=sys.stderr)
        return []
    r.raise_for_status()
    out = []
    for x in r.json().get("results", []):
        lic = x.get("license")
        if lic not in OK_LICENSES:
            continue
        name = f"CC {lic.upper()} {x.get('license_version') or ''}".strip() if lic not in ("cc0", "pdm") else lic.upper()
        out.append({
            "source": "openverse", "id": x["id"], "title": x.get("title") or "",
            "thumb": x.get("thumbnail") or x.get("url"), "full": x.get("url"),
            "width": x.get("width"), "height": x.get("height"),
            "author": x.get("creator") or "Неизвестный автор",
            "license": name, "license_url": x.get("license_url") or LICENSE_URLS.get(lic, ""),
            "source_url": x.get("foreign_landing_url"),
        })
    return out


# ------------------------------------------------------------------ contact sheet


def fetch_image(url: str, max_side: int | None = None) -> Image.Image | None:
    try:
        r = client.get(url)
        r.raise_for_status()
        img = Image.open(io.BytesIO(r.content))
        img = ImageOps.exif_transpose(img).convert("RGB")
        if max_side:
            img.thumbnail((max_side, max_side))
        return img
    except Exception as exc:  # noqa: BLE001
        print(f"  не удалось загрузить {url[:80]}: {type(exc).__name__}", file=sys.stderr)
        return None


def contact_sheet(slug: str, cands: list[dict]) -> Path:
    cols, cell = 4, 300
    rows = max(1, (len(cands) + cols - 1) // cols)
    sheet = Image.new("RGB", (cols * cell, rows * (cell + 34)), (20, 20, 22))
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 15)
    except OSError:
        font = ImageFont.load_default()
    for i, c in enumerate(cands):
        img = fetch_image(c["thumb"], cell) or (fetch_image(c["full"], cell) if c["full"] != c["thumb"] else None)
        x, y = (i % cols) * cell, (i // cols) * (cell + 34)
        if img:
            sheet.paste(img, (x + (cell - img.width) // 2, y + (cell - img.height) // 2))
        draw.rectangle([x, y, x + 34, y + 24], fill=(255, 210, 60))
        draw.text((x + 6, y + 4), str(i), fill=(0, 0, 0), font=font)
        label = f"{c['source'][:2]} {c['width']}x{c['height']} {c['title'][:28]}"
        draw.text((x + 4, y + cell + 6), label, fill=(220, 220, 220), font=font)
    CACHE.mkdir(parents=True, exist_ok=True)
    out = CACHE / f"{slug}.png"
    sheet.save(out)
    return out


def cmd_candidates(slugs: list[str], extra_query: str | None) -> None:
    watches = all_watches()
    for slug in slugs:
        w = watches[slug]
        qs = [extra_query] if extra_query else queries_for(w)
        seen, cands = set(), []
        for q in qs:
            for c in commons_search(q) + openverse_search(q):
                key = c["full"]
                if key in seen or (c["width"] and c["width"] < 700):
                    continue
                seen.add(key)
                cands.append(c)
            time.sleep(0.5)
        cands = cands[:16]
        CACHE.mkdir(parents=True, exist_ok=True)
        (CACHE / f"{slug}.json").write_text(json.dumps(cands, ensure_ascii=False, indent=1), encoding="utf-8")
        sheet = contact_sheet(slug, cands) if cands else None
        print(f"{slug}: {len(cands)} кандидатов ({' | '.join(qs)}) -> {sheet}")


# ------------------------------------------------------------------ pick


def cmd_pick(slug: str, indices: list[int], focus: str | None, caption: str | None = None) -> None:
    cands = json.loads((CACHE / f"{slug}.json").read_text(encoding="utf-8"))
    data = load_photos()
    entries = data.get(slug, [])
    target = OUT / slug
    target.mkdir(parents=True, exist_ok=True)
    fx, fy = (float(v) for v in focus.split(",")) if focus else (0.5, 0.5)
    for idx in indices:
        c = cands[idx]
        img = fetch_image(c["full"])
        if img is None:
            continue
        n = len(entries) + 1
        base = f"{n}"
        for size in SIZES:
            im = img.copy()
            im.thumbnail((size, size), Image.LANCZOS)
            im.save(target / f"{base}-{size}.jpg", "JPEG", quality=84, optimize=True, progressive=True)
        big = img.copy()
        big.thumbnail((SIZES[-1], SIZES[-1]))
        entries.append({
            "file": f"{slug}/{base}", "width": big.width, "height": big.height, "focus": [fx, fy],
            **({"caption": caption} if caption else {}),
            "title": c["title"][:140], "author": c["author"][:140], "license": c["license"],
            "license_url": c["license_url"], "source_url": c["source_url"],
        })
        print(f"  + {slug}/{base} ({big.width}x{big.height}) {c['license']} {c['author'][:40]}")
        time.sleep(0.3)
    data[slug] = entries
    save_photos(data)


def cmd_drop(slug: str) -> None:
    data = load_photos()
    data.pop(slug, None)
    save_photos(data)
    for f in (OUT / slug).glob("*"):
        f.unlink()
    print(f"удалено: {slug}")


def main() -> int:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("candidates")
    c.add_argument("slugs", nargs="*")
    c.add_argument("--missing", action="store_true")
    c.add_argument("--query")
    p = sub.add_parser("pick")
    p.add_argument("slug")
    p.add_argument("indices", nargs="+", type=int)
    p.add_argument("--focus")
    p.add_argument("--caption", help="уточнение, если на фото другая версия модели")
    d = sub.add_parser("drop")
    d.add_argument("slug")
    args = ap.parse_args()
    if args.cmd == "candidates":
        slugs = args.slugs
        if args.missing:
            have = load_photos()
            slugs = [s for s in all_watches() if s not in have]
        cmd_candidates(slugs, args.query)
    elif args.cmd == "pick":
        cmd_pick(args.slug, args.indices, args.focus, args.caption)
    else:
        cmd_drop(args.slug)
    return 0


if __name__ == "__main__":
    sys.exit(main())
