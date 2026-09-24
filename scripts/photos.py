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
    uv run python scripts/photos.py candidates part:balance              # фото детали механизма

Запросы берутся из ``scripts/photo_queries.yaml`` (короткие и широкие), иначе строятся
из бренда и названия. Кроме полнотекстового поиска Commons смотрим файлы из найденных
категорий (``Category:Rolex Submariner`` и т. п.): там больше всего снимков.

Фото моделей пишутся в ``content/photos.yaml``, фото деталей (ключи ``part:<key>``)
в ``content/part_photos.yaml``. Контактные листы: ``scripts/.cache/photos/<slug>.png``.
"""

from __future__ import annotations

import argparse
import io
import json
import re
import sys
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import httpx
import yaml
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path(__file__).resolve().parent / ".cache" / "photos"
OUT = ROOT / "frontend" / "assets" / "photos"
PHOTOS_YAML = ROOT / "content" / "photos.yaml"
PART_PHOTOS_YAML = ROOT / "content" / "part_photos.yaml"
QUERIES_YAML = Path(__file__).resolve().parent / "photo_queries.yaml"
# Отсекаем то, что почти никогда не является снимком самих часов.
SKIP_TITLE = re.compile(r"logo|boutique|store|shop front|headquarter|building|signage|advert|poster|billboard|\.svg", re.I)
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


def is_part(slug: str) -> bool:
    return slug.startswith("part:")


def yaml_for(slug: str) -> Path:
    return PART_PHOTOS_YAML if is_part(slug) else PHOTOS_YAML


def key_for(slug: str) -> str:
    return slug.removeprefix("part:")


def load_photos(path: Path = PHOTOS_YAML) -> dict:
    if path.exists():
        return yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return {}


def save_photos(data: dict, path: Path = PHOTOS_YAML) -> None:
    what = "деталей механизма (режим разборки)" if path == PART_PHOTOS_YAML else "моделей"
    header = (
        f"# Фотографии {what}. Генерируется scripts/photos.py, вручную правятся только focus и caption.\n"
        "# Все снимки под свободными лицензиями (CC0, PD, CC BY, CC BY-SA); автор и лицензия обязательны.\n"
    )
    body = yaml.safe_dump(dict(sorted(data.items())), allow_unicode=True, sort_keys=False, width=200)
    path.write_text(header + body, encoding="utf-8")


def norm(s: str) -> str:
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()


# Ключевое слово бренда, которое обязано быть в названии файла из полнотекстового поиска
# (иначе «Odysseus» находит античные вазы, а «Lange 1» надгробия).
BRAND_TOKEN = {
    "A. Lange & Söhne": "lange", "Glashütte Original": "glashutte", "NOMOS Glashütte": "nomos",
    "H. Moser & Cie.": "moser", "IWC Schaffhausen": "iwc", "TAG Heuer": "heuer", "Jaeger-LeCoultre": "lecoultre",
    "Vacheron Constantin": "vacheron", "Audemars Piguet": "audemars|piguet|royal oak", "Patek Philippe": "patek",
    "Grand Seiko": "seiko", "Swatch": "swatch", "Casio": "casio|g-shock|shock",
}


def brand_token(brand: str) -> str:
    return BRAND_TOKEN.get(brand) or norm(brand).split()[0]


def load_queries() -> dict[str, list[str]]:
    return yaml.safe_load(QUERIES_YAML.read_text(encoding="utf-8")) or {}


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


def _license_key(lic: str) -> str | None:
    k = lic.lower().replace(" ", "-")
    if "cc0" in k:
        return "cc0"
    if "public-domain" in k or k in ("pd", "pdm"):
        return "pdm"
    if "by-sa" in k:
        return "by-sa"
    if k.startswith("cc-by"):
        return "by"
    return None


def _commons_images(params: dict) -> list[dict]:
    base = {"action": "query", "format": "json", "prop": "imageinfo", "iiprop": "url|extmetadata|size|mime|user", "iiurlwidth": 1600}
    r = client.get("https://commons.wikimedia.org/w/api.php", params={**base, **params})
    r.raise_for_status()
    pages = (r.json().get("query") or {}).get("pages") or {}
    out = []
    for p in sorted(pages.values(), key=lambda x: x.get("index", 0)):
        ii = (p.get("imageinfo") or [{}])[0]
        if ii.get("mime") not in ("image/jpeg", "image/png", "image/webp") or SKIP_TITLE.search(p["title"]):
            continue
        meta = ii.get("extmetadata") or {}
        lic = (meta.get("LicenseShortName", {}).get("value") or "").strip()
        key = _license_key(lic)
        if key not in OK_LICENSES:
            continue
        out.append({
            "source": "commons", "id": p["title"], "title": p["title"].removeprefix("File:"),
            "thumb": re.sub(r"/\d+px-", "/330px-", (ii.get("thumburl") or ii.get("url") or "").split("?")[0]),
            "full": ii.get("thumburl") or ii.get("url"),
            "width": ii.get("width"), "height": ii.get("height"),
            "author": strip_html(meta.get("Artist", {}).get("value")) or ii.get("user") or "Неизвестный автор",
            "license": lic, "license_url": meta.get("LicenseUrl", {}).get("value") or LICENSE_URLS.get(key, ""),
            "source_url": ii.get("descriptionurl"),
        })
    return out


def commons_files(titles: list[str]) -> list[dict]:
    """Конкретные файлы Commons по названиям (``File:...``), когда нужный снимок уже известен."""
    out = []
    for i in range(0, len(titles), 20):
        chunk = ["File:" + t.removeprefix("File:") for t in titles[i:i + 20]]
        out += _commons_images({"titles": "|".join(chunk)})
    return out


def commons_search(query: str, limit: int = 12) -> list[dict]:
    return _commons_images({"generator": "search", "gsrsearch": query, "gsrnamespace": 6, "gsrlimit": limit})


def commons_categories(query: str, limit: int = 2, per_cat: int = 24, must: re.Pattern | None = None) -> list[dict]:
    """Файлы из категорий Commons, найденных по запросу (название категории тоже фильтруется)."""
    r = client.get("https://commons.wikimedia.org/w/api.php", params={
        "action": "query", "format": "json", "list": "search", "srsearch": query, "srnamespace": 14, "srlimit": limit,
    })
    r.raise_for_status()
    out = []
    for hit in (r.json().get("query") or {}).get("search", []):
        if must and not must.search(norm(hit["title"])):
            continue
        out += _commons_images({"generator": "categorymembers", "gcmtitle": hit["title"], "gcmtype": "file", "gcmlimit": per_cat})
    return out


def openverse_search(query: str, limit: int = 10) -> list[dict]:
    # PDM на Flickr часто ставят на перезалитые пресс-фото без прав, поэтому только CC.
    params = {"q": query, "license": "by,by-sa,cc0", "page_size": limit, "mature": "false"}
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
            "thumb": _small_url(x.get("url")) or x.get("thumbnail"),
            "full": _commons_thumb(x["url"], 1600) if "upload.wikimedia.org" in (x.get("url") or "") and (x.get("width") or 0) > 1600 else (x.get("url") or "").split("?utm")[0],
            "width": x.get("width"), "height": x.get("height"),
            "author": x.get("creator") or "Неизвестный автор",
            "license": name, "license_url": x.get("license_url") or LICENSE_URLS.get(lic, ""),
            "source_url": x.get("foreign_landing_url"),
        })
    return out


def _small_url(url: str | None) -> str | None:
    """Flickr отдаёт размеры по суффиксу: _n = 320 px; у Commons есть готовые миниатюры."""
    if url and "staticflickr.com" in url:
        return re.sub(r"(_[a-z])?\.jpg$", "_n.jpg", url)
    if url and "upload.wikimedia.org" in url:
        return _commons_thumb(url, 330)
    return url


def _commons_thumb(url: str, width: int) -> str:
    """Оригинал Commons (часто 20+ Мп и под лимитом запросов) -> стандартная миниатюра."""
    url = url.split("?")[0]
    m = re.match(r"(https://upload\.wikimedia\.org/wikipedia/commons)/(\w/\w\w)/(.+)$", url)
    if not m:
        return url
    return f"{m.group(1)}/thumb/{m.group(2)}/{m.group(3)}/{width}px-{m.group(3)}"


# ------------------------------------------------------------------ contact sheet


def fetch_image(url: str, max_side: int | None = None) -> Image.Image | None:
    try:
        for attempt in range(4):
            r = client.get(url)
            if r.status_code != 429:
                break
            time.sleep(2 + attempt * 3)
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
    cols, cell = 5, 280
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


GENERIC = {"watch", "watches", "automatic", "chronograph", "the", "and", "with", "date"}
PLACE_RE = re.compile(r"stammhaus|building|gebaude|haus\b|boutique|store|factory|fabrik|street|strasse|platz|postcard|ansicht|blick|panorama|logo|portrait|grave|grab", re.I)
WATCH_RE = re.compile(r"watch|uhr|orologio|montre|reloj|wrist|dial|zifferblatt|chrono|diver|caliber|calibre|kaliber", re.I)


def score(c: dict, words: list[str], refs: list[str]) -> int:
    """Грубая релевантность по названию файла: модель и референс важнее, здания и открытки вниз."""
    title = norm(c["title"])
    s = sum(2 for w in words if w in title) + sum(4 for r in refs if r in title.replace(" ", ""))
    s += 1 if WATCH_RE.search(title) else 0
    s -= 4 if PLACE_RE.search(title) else 0
    return s


def find_candidates(slug: str, qs: list[str], must: str | None = None, words: list[str] = (), refs: list[str] = ()) -> list[dict]:
    seen, cands = set(), []
    must_re = re.compile(must) if must else None
    for q in qs:
        found = []
        for fn in (commons_categories, commons_search, openverse_search):
            try:
                res = fn(q, must=must_re) if fn is commons_categories else fn(q)
            except httpx.HTTPError as exc:
                print(f"  {slug}: {fn.__name__}({q!r}) {type(exc).__name__}", file=sys.stderr)
                continue
            if must_re and fn is not commons_categories:
                res = [c for c in res if must_re.search(norm(c["title"]))]
            found += res
        for c in found:
            # Openverse индексирует и Commons: один файл приходит дважды под разными id.
            key = re.sub(r"\.(jpe?g|png|webp)$", "", c["title"].lower()).strip() or c["id"]
            if key in seen or (c["width"] and c["width"] < 700):
                continue
            seen.add(key)
            cands.append(c)
        if len(cands) >= 60:
            break
        time.sleep(0.3)
    ranked = sorted(enumerate(cands), key=lambda ic: (-score(ic[1], words, refs), ic[0]))
    return [c for _, c in ranked][:20]


def _candidates_one(slug: str, watches: dict, queries: dict, extra_query: str | None) -> str:
    if extra_query:
        qs = [extra_query]
    elif slug in queries:
        qs = queries[slug]
    else:
        qs = queries_for(watches[slug])
    if is_part(slug):
        cands = find_candidates(slug, qs)
    else:
        w = watches[slug]
        btoken = brand_token(w["brand"])
        words = [x for x in re.findall(r"[a-z0-9]+", norm(f"{w['name']} {w['collection'] or ''}")) if len(x) >= 3 and x not in GENERIC and not re.fullmatch(btoken, x)]
        refs = [norm(str(w["reference"])).replace(" ", "")[:6]] if w.get("reference") and len(str(w["reference"])) >= 4 else []
        cands = find_candidates(slug, qs, btoken, list(dict.fromkeys(words)), refs)
    safe = slug.replace(":", "_")
    (CACHE / f"{safe}.json").write_text(json.dumps(cands, ensure_ascii=False, indent=1), encoding="utf-8")
    sheet = contact_sheet(safe, cands) if cands else None
    return f"{slug}: {len(cands)} кандидатов ({' | '.join(qs)}) -> {sheet.name if sheet else '-'}"


def cmd_files(slug: str, titles: list[str]) -> None:
    cands = commons_files(titles)
    safe = slug.replace(":", "_")
    CACHE.mkdir(parents=True, exist_ok=True)
    (CACHE / f"{safe}.json").write_text(json.dumps(cands, ensure_ascii=False, indent=1), encoding="utf-8")
    sheet = contact_sheet(safe, cands) if cands else None
    for i, c in enumerate(cands):
        print(f"  {i:2d} {c['license'][:12]:12s} {c['width']}x{c['height']} {c['title'][:90]}")
    print(f"{slug}: {len(cands)} -> {sheet.name if sheet else '-'}")


def cmd_candidates(slugs: list[str], extra_query: str | None, workers: int = 4) -> None:
    watches, queries = all_watches(), load_queries()
    CACHE.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=workers) as pool:
        for line in pool.map(lambda s: _candidates_one(s, watches, queries, extra_query), slugs):
            print(line, flush=True)


# ------------------------------------------------------------------ pick


def _original(url: str) -> str:
    """Миниатюра Commons -> оригинал (нужен для кадрирования мелких деталей)."""
    url = url.split("?")[0].replace("://thumb.wikimedia.org/", "://upload.wikimedia.org/")
    return re.sub(r"/thumb(/.+?)/\d+px-[^/]+$", r"\1", url)


def cmd_pick(slug: str, indices: list[int], focus: str | None, caption: str | None = None, context: bool = False,
             crop: str | None = None) -> None:
    cands = json.loads((CACHE / f"{slug.replace(':', '_')}.json").read_text(encoding="utf-8"))
    path, key = yaml_for(slug), key_for(slug)
    data = load_photos(path)
    entries = data.get(key, [])
    folder = f"parts/{key}" if is_part(slug) else slug
    target = OUT / folder
    target.mkdir(parents=True, exist_ok=True)
    fx, fy = (float(v) for v in focus.split(",")) if focus else (0.5, 0.5)
    for idx in indices:
        c = cands[idx]
        img = fetch_image(_original(c["full"]) if crop else c["full"])
        if img is None:
            continue
        if crop:
            x0, y0, x1, y1 = (float(v) for v in crop.split(","))
            img = img.crop((int(x0 * img.width), int(y0 * img.height), int(x1 * img.width), int(y1 * img.height)))
        n = len(entries) + 1
        base = f"{n}"
        for size in SIZES:
            im = img.copy()
            im.thumbnail((size, size), Image.LANCZOS)
            im.save(target / f"{base}-{size}.jpg", "JPEG", quality=84, optimize=True, progressive=True)
        big = img.copy()
        big.thumbnail((SIZES[-1], SIZES[-1]))
        entries.append({
            "file": f"{folder}/{base}", "width": big.width, "height": big.height, "focus": [fx, fy],
            **({"caption": caption} if caption else {}),
            **({"context": True} if context else {}),
            "title": c["title"][:140], "author": c["author"][:140], "license": c["license"],
            "license_url": c["license_url"], "source_url": c["source_url"],
        })
        print(f"  + {slug}/{base} ({big.width}x{big.height}) {c['license']} {c['author'][:40]}")
        time.sleep(0.3)
    data[key] = entries
    save_photos(data, path)


def cmd_review(specs: list[str], out: str = "_review") -> None:
    """Сводный лист выбранных кадров из разных моделей: ``slug:0,3 other:1``."""
    items = []
    for spec in specs:
        slug, _, idx = spec.rpartition(":")
        cands = json.loads((CACHE / f"{slug.replace(':', '_')}.json").read_text(encoding="utf-8"))
        for i in (int(x) for x in idx.split(",") if x):
            short = slug if len(slug) <= 26 else "…" + slug[-25:]
            items.append((f"{short} #{i}", cands[i]))
    cols, cell = 5, 300
    rows = max(1, (len(items) + cols - 1) // cols)
    sheet = Image.new("RGB", (cols * cell, rows * (cell + 26)), (20, 20, 22))
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 15)
    except OSError:
        font = ImageFont.load_default()

    def load(item):
        c = item[1]
        return fetch_image(c["thumb"], cell) or (fetch_image(c["full"], cell) if c["full"] != c["thumb"] else None)

    with ThreadPoolExecutor(max_workers=3) as pool:
        imgs = list(pool.map(load, items))
    for n, ((label, _), img) in enumerate(zip(items, imgs)):
        x, y = (n % cols) * cell, (n // cols) * (cell + 26)
        if img:
            sheet.paste(img, (x + (cell - img.width) // 2, y + (cell - img.height) // 2))
        draw.rectangle([x, y + cell, x + cell, y + cell + 26], fill=(255, 210, 60))
        draw.text((x + 6, y + cell + 5), label, fill=(0, 0, 0), font=font)
    path = CACHE / f"{out}.png"
    sheet.save(path)
    print(path)


def cmd_drop(slug: str) -> None:
    path, key = yaml_for(slug), key_for(slug)
    data = load_photos(path)
    data.pop(key, None)
    save_photos(data, path)
    for f in (OUT / (f"parts/{key}" if is_part(slug) else slug)).glob("*"):
        f.unlink()
    print(f"удалено: {slug}")


def main() -> int:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("candidates")
    c.add_argument("slugs", nargs="*")
    c.add_argument("--missing", action="store_true")
    c.add_argument("--query")
    c.add_argument("--parts", action="store_true", help="все детали из photo_queries.yaml")
    c.add_argument("--workers", type=int, default=4)
    p = sub.add_parser("pick")
    p.add_argument("slug")
    p.add_argument("indices", nargs="+", type=int)
    p.add_argument("--focus")
    p.add_argument("--caption", help="уточнение, если на фото другая версия модели")
    p.add_argument("--context", action="store_true", help="родственная модель: только в ленте «Вживую»")
    fl = sub.add_parser("files", help="кандидаты из конкретных файлов Commons")
    fl.add_argument("slug")
    fl.add_argument("titles", nargs="+")
    rv = sub.add_parser("review")
    rv.add_argument("specs", nargs="+")
    rv.add_argument("--out", default="_review")
    d = sub.add_parser("drop")
    d.add_argument("slug")
    args = ap.parse_args()
    if args.cmd == "candidates":
        slugs = list(args.slugs)
        if args.missing:
            have = load_photos()
            slugs += [s for s in all_watches() if s not in have]
        if args.parts:
            have = load_photos(PART_PHOTOS_YAML)
            slugs += [s for s in load_queries() if is_part(s) and key_for(s) not in have]
        cmd_candidates(slugs, args.query, args.workers)
    elif args.cmd == "files":
        cmd_files(args.slug, args.titles)
    elif args.cmd == "review":
        cmd_review(args.specs, args.out)
    elif args.cmd == "pick":
        cmd_pick(args.slug, args.indices, args.focus, args.caption, args.context)
    else:
        cmd_drop(args.slug)
    return 0


if __name__ == "__main__":
    sys.exit(main())
