"""Загрузка и подготовка всех статических ассетов фронтенда.

Результат уже лежит в репозитории, запускать скрипт нужно только чтобы
обновить версии библиотек или пересобрать карты:

    uv run python scripts/fetch_assets.py [--only vendor,fonts,earth,geo,countries] [--force]

Источники и лицензии (указаны также в подвале сайта):
- Three.js (MIT), GSAP (Standard «no charge» license), Lenis (MIT), Phosphor Icons (MIT)
- Шрифты Google Fonts (SIL OFL): Cormorant Garamond, Onest, JetBrains Mono
- NASA Blue Marble Next Generation и VIIRS Black Marble через NASA GIBS (public domain)
- Natural Earth (public domain) для границ стран
- Sentinel-2 cloudless 2016 by EOX IT Services GmbH (CC BY 4.0) для крупного плана стран
"""

from __future__ import annotations

import argparse
import io
import json
import re
import sys
from pathlib import Path

import httpx
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
FRONT = ROOT / "frontend"
VENDOR = FRONT / "vendor"
ASSETS = FRONT / "assets"
CACHE = Path(__file__).resolve().parent / ".cache"

THREE = "0.186.0"
GSAP = "3.15.0"
LENIS = "1.3.26"
PHOSPHOR = "2.1.2"
JSD = "https://cdn.jsdelivr.net/npm"

UA_CHROME = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/128.0 Safari/537.36"
)

client = httpx.Client(timeout=httpx.Timeout(180.0, connect=20.0), follow_redirects=True, headers={"User-Agent": UA_CHROME})


def get(url: str) -> bytes:
    r = client.get(url)
    r.raise_for_status()
    return r.content


def save(path: Path, data: bytes | str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(data, str):
        data = data.encode("utf-8")
    path.write_bytes(data)
    print(f"  {path.relative_to(ROOT)}  {len(data) / 1024:.0f} KB")


def cached(name: str, url: str) -> bytes:
    path = CACHE / name
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(get(url))
    return path.read_bytes()


# --------------------------------------------------------------------------- vendor

THREE_ADDONS = [
    "loaders/GLTFLoader.js",
    "exporters/GLTFExporter.js",  # build-time only; visitors load baked GLBs
    "utils/SkeletonUtils.js",
    "controls/OrbitControls.js",
    "environments/RoomEnvironment.js",
    "geometries/RoundedBoxGeometry.js",
    "utils/BufferGeometryUtils.js",
    "loaders/HDRLoader.js",
    "lines/LineSegments2.js",
    "lines/LineSegmentsGeometry.js",
    "lines/LineMaterial.js",
    "lines/Line2.js",
    "lines/LineGeometry.js",
    "postprocessing/EffectComposer.js",
    "postprocessing/RenderPass.js",
    "postprocessing/ShaderPass.js",
    "postprocessing/MaskPass.js",
    "postprocessing/Pass.js",
    "postprocessing/UnrealBloomPass.js",
    "postprocessing/OutputPass.js",
    "shaders/CopyShader.js",
    "shaders/LuminosityHighPassShader.js",
    "shaders/OutputShader.js",
    # ambient occlusion для «фотографического» 3D (стыки деталей, звенья браслета)
    "postprocessing/GTAOPass.js",
    "shaders/GTAOShader.js",
    "shaders/PoissonDenoiseShader.js",
    "math/SimplexNoise.js",
]


def fetch_vendor() -> None:
    print("vendor")
    base = f"{JSD}/three@{THREE}"
    save(VENDOR / "three" / "LICENSE", get(f"{base}/LICENSE"))
    # jsDelivr минифицирует на лету; имена сохраняем исходные, чтобы работали внутренние импорты.
    save(VENDOR / "three" / "three.module.js", get(f"{base}/build/three.module.min.js"))
    save(VENDOR / "three" / "three.core.js", get(f"{base}/build/three.core.min.js"))
    for addon in THREE_ADDONS:
        save(VENDOR / "three" / "addons" / addon, get(f"{base}/examples/jsm/{addon}"))
    save(VENDOR / "gsap" / "gsap.min.js", get(f"{JSD}/gsap@{GSAP}/dist/gsap.min.js"))
    save(VENDOR / "gsap" / "ScrollTrigger.min.js", get(f"{JSD}/gsap@{GSAP}/dist/ScrollTrigger.min.js"))
    save(VENDOR / "lenis" / "lenis.min.js", get(f"{JSD}/lenis@{LENIS}/dist/lenis.min.js"))
    save(VENDOR / "lenis" / "lenis.css", get(f"{JSD}/lenis@{LENIS}/dist/lenis.css"))
    for f in ("style.css", "Phosphor-Light.woff2", "Phosphor-Light.woff"):
        save(VENDOR / "phosphor" / "light" / f, get(f"{JSD}/@phosphor-icons/web@{PHOSPHOR}/src/light/{f}"))
    for f in ("style.css", "Phosphor-Thin.woff2", "Phosphor-Thin.woff"):
        save(VENDOR / "phosphor" / "thin" / f, get(f"{JSD}/@phosphor-icons/web@{PHOSPHOR}/src/thin/{f}"))


# --------------------------------------------------------------------------- fonts

FONT_FAMILIES = [
    "Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400",
    "Onest:wght@300;400;500;600",
    "JetBrains+Mono:wght@400;500",
]
KEEP_SUBSETS = {"latin", "latin-ext", "cyrillic", "cyrillic-ext"}


def fetch_fonts() -> None:
    """Шрифты Google Fonts локально. Google отдаёт вариативный файл, один и тот же для каждого заявленного
    веса; поэтому один @font-face на семейство, начертание и набор символов с диапазоном весов, иначе
    браузер качает одинаковый файл по разу на каждый вес (так было: 48 файлов, из них 14 разных)."""
    print("fonts")
    url = "https://fonts.googleapis.com/css2?" + "&".join(f"family={f}" for f in FONT_FAMILIES) + "&display=swap"
    css = get(url).decode()
    blocks = re.findall(r"/\*\s*([\w-]+)\s*\*/\s*(@font-face\s*{[^}]+})", css)
    groups: dict[tuple, dict] = {}
    for subset, block in blocks:
        if subset not in KEEP_SUBSETS:
            continue
        family = re.search(r"font-family:\s*'([^']+)'", block).group(1)
        style = re.search(r"font-style:\s*(\w+)", block).group(1)
        weight = int(re.search(r"font-weight:\s*(\d+)", block).group(1))
        src = re.search(r"url\((https://[^)]+\.woff2)\)", block).group(1)
        rng = re.search(r"unicode-range:\s*([^;]+);", block).group(1)
        g = groups.setdefault((family, style, subset, src), {"weights": [], "range": rng})
        g["weights"].append(weight)
    write_font_css(groups, lambda src: get(src))


def write_font_css(groups: dict, load) -> None:
    out = ["/* Сгенерировано scripts/fetch_assets.py из Google Fonts (SIL OFL). Один файл на семейство, начертание и набор символов. */"]
    keep = set()
    for (family, style, subset, src), g in sorted(groups.items()):
        lo, hi = min(g["weights"]), max(g["weights"])
        name = f"{family.lower().replace(' ', '-')}-{style}-{subset}.woff2"
        save(ASSETS / "fonts" / name, load(src))
        keep.add(name)
        weight = f"{lo}" if lo == hi else f"{lo} {hi}"
        out.append(f"/* {subset} */\n@font-face {{\n  font-family: '{family}';\n  font-style: {style};\n  font-weight: {weight};\n"
                   f"  font-display: swap;\n  src: url(/assets/fonts/{name}) format('woff2');\n  unicode-range: {g['range']};\n}}")
    save(ASSETS / "fonts" / "fonts.css", "\n".join(out) + "\n")
    for f in (ASSETS / "fonts").glob("*.woff2"):
        if f.name not in keep:
            f.unlink()


def dedupe_local_fonts() -> None:
    """То же без сети: схлопнуть уже скачанные одинаковые файлы (по содержимому)."""
    import hashlib
    css = (ASSETS / "fonts" / "fonts.css").read_text()
    groups: dict[tuple, dict] = {}
    data: dict[str, bytes] = {}
    for subset, block in re.findall(r"/\*\s*([\w-]+)\s*\*/\s*(@font-face\s*{[^}]+})", css):
        family = re.search(r"font-family:\s*'([^']+)'", block).group(1)
        style = re.search(r"font-style:\s*(\w+)", block).group(1)
        weights = [int(w) for w in re.search(r"font-weight:\s*([\d ]+)", block).group(1).split()]
        path = ASSETS / "fonts" / re.search(r"url\(/assets/fonts/([^)]+)\)", block).group(1)
        rng = re.search(r"unicode-range:\s*([^;]+);", block).group(1)
        blob = path.read_bytes()
        key = hashlib.md5(blob).hexdigest()
        data[key] = blob
        g = groups.setdefault((family, style, subset, key), {"weights": [], "range": rng})
        g["weights"] += weights
    write_font_css(groups, lambda key: data[key])


# --------------------------------------------------------------------------- earth textures

GIBS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"
EOX = "https://tiles.maps.eox.at/wms"


def wms(base: str, layer: str, bbox: tuple[float, float, float, float], w: int, h: int) -> Image.Image:
    params = {
        "SERVICE": "WMS", "REQUEST": "GetMap", "VERSION": "1.1.1", "LAYERS": layer, "STYLES": "",
        "SRS": "EPSG:4326", "BBOX": ",".join(str(v) for v in bbox), "WIDTH": w, "HEIGHT": h,
        "FORMAT": "image/jpeg",
    }
    r = client.get(base, params=params)
    r.raise_for_status()
    if not r.headers.get("content-type", "").startswith("image/"):
        raise RuntimeError(f"WMS error for {layer}: {r.text[:300]}")
    return Image.open(io.BytesIO(r.content)).convert("RGB")


def save_jpeg(path: Path, img: Image.Image, quality: int = 84) -> None:
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=quality, optimize=True, progressive=True)
    save(path, buf.getvalue())


def fetch_earth() -> None:
    print("earth")
    world = (-180, -90, 180, 90)
    day = wms(GIBS, "BlueMarble_NextGeneration", world, 8192, 4096)
    save_jpeg(ASSETS / "earth" / "day-8k.jpg", day, 86)
    save_jpeg(ASSETS / "earth" / "day-2k.jpg", day.resize((2048, 1024), Image.LANCZOS), 82)
    night = wms(GIBS, "VIIRS_Black_Marble", world, 4096, 2048)
    save_jpeg(ASSETS / "earth" / "night-4k.jpg", night, 84)
    earth_lite()


def earth_lite() -> None:
    """2K-версии ночной Земли и карты стран (без сети, из 4K): на слабых ноутбуках загрузка текстур в
    видеопамять занимает вчетверо меньше времени. Карта стран уменьшается без сглаживания (это номера)."""
    earth = ASSETS / "earth"
    if (earth / "night-4k.jpg").exists():
        night = Image.open(earth / "night-4k.jpg").convert("RGB")
        save_jpeg(earth / "night-2k.jpg", night.resize((2048, 1024), Image.LANCZOS), 84)
    if (earth / "country-ids-4k.png").exists():
        ids = Image.open(earth / "country-ids-4k.png").convert("RGB").resize((2048, 1024), Image.NEAREST)
        buf = io.BytesIO()
        ids.save(buf, "PNG", optimize=True)
        save(earth / "country-ids-2k.png", buf.getvalue())


# --------------------------------------------------------------------------- geo

NE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson"


def _rings(geometry: dict) -> list[list[list[float]]]:
    if geometry["type"] == "Polygon":
        return geometry["coordinates"]
    if geometry["type"] == "MultiPolygon":
        return [ring for poly in geometry["coordinates"] for ring in poly]
    return []


def _polys(geometry: dict) -> list[list[list[list[float]]]]:
    if geometry["type"] == "Polygon":
        return [geometry["coordinates"]]
    return geometry["coordinates"] if geometry["type"] == "MultiPolygon" else []


def _a3(props: dict) -> str:
    for key in ("ADM0_A3", "ISO_A3_EH", "ISO_A3"):
        v = props.get(key)
        if v and v != "-99":
            return v
    return "???"


def _flat(ring: list[list[float]], nd: int) -> list[float]:
    out: list[float] = []
    prev = None
    for lon, lat, *_ in ring:
        pt = (round(lon, nd), round(lat, nd))
        if pt != prev:
            out.extend(pt)
            prev = pt
    return out


def load_country_slugs() -> dict[str, str]:
    import yaml

    data = yaml.safe_load((ROOT / "content" / "countries.yaml").read_text(encoding="utf-8"))
    return {c["iso_a3"]: c["slug"] for c in data}


def fetch_geo() -> None:
    print("geo")
    ours = load_country_slugs()
    ne50 = json.loads(cached("ne_50m_admin_0_countries.geojson", f"{NE}/ne_50m_admin_0_countries.geojson"))
    features = []
    for i, f in enumerate(ne50["features"], start=1):
        props = f["properties"]
        a3 = _a3(props)
        features.append(
            {
                "id": i,
                "a3": a3,
                "name": props.get("NAME_RU") or props.get("NAME"),
                "name_en": props.get("NAME"),
                "slug": ours.get(a3),
                "rings": [_flat(r, 2) for r in _rings(f["geometry"])],
            }
        )
    save(ASSETS / "geo" / "world-50m.json", json.dumps({"countries": features}, ensure_ascii=False, separators=(",", ":")))

    # Карта идентификаторов стран: R + G*256 = id, 0 = океан. Без сглаживания.
    w, h = 4096, 2048
    img = Image.new("RGB", (w, h), (0, 0, 0))
    draw = ImageDraw.Draw(img)

    def px(lon: float, lat: float) -> tuple[float, float]:
        return ((lon + 180) / 360 * w, (90 - lat) / 180 * h)

    for f, feat in zip(ne50["features"], features):
        color = (feat["id"] % 256, feat["id"] // 256, 0)
        for poly in _polys(f["geometry"]):
            outer, *holes = poly
            draw.polygon([px(lon, lat) for lon, lat, *_ in outer], fill=color)
            for hole in holes:
                draw.polygon([px(lon, lat) for lon, lat, *_ in hole], fill=(0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, "PNG", optimize=True)
    save(ASSETS / "earth" / "country-ids-4k.png", buf.getvalue())
    earth_lite()

    # Детальные границы (1:10m) только для наших стран.
    ne10 = json.loads(cached("ne_10m_admin_0_countries.geojson", f"{NE}/ne_10m_admin_0_countries.geojson"))
    for f in ne10["features"]:
        a3 = _a3(f["properties"])
        if a3 in ours:
            polys = [[_flat(ring, 4) for ring in poly] for poly in _polys(f["geometry"])]
            save(ASSETS / "geo" / "countries" / f"{ours[a3]}.json", json.dumps({"a3": a3, "polygons": polys}, separators=(",", ":")))


# --------------------------------------------------------------------------- country close-ups

# Кадр спутникового снимка для каждой страны: (min_lon, min_lat, max_lon, max_lat).
COUNTRY_FRAMES = {
    "switzerland": (5.6, 45.55, 10.9, 48.05),
    "germany": (5.2, 46.9, 15.8, 55.3),
    "japan": (128.5, 30.4, 146.6, 45.9),
    "usa": (-125.8, 23.8, -65.8, 50.2),
    "france": (-5.6, 41.2, 10.2, 51.4),
    "united-kingdom": (-8.9, 49.7, 2.3, 59.2),
    "italy": (6.4, 36.3, 19.0, 47.3),
    "russia": (26.0, 43.5, 62.0, 66.5),
}


def fetch_countries() -> None:
    print("countries")
    meta = {}
    for slug, bbox in COUNTRY_FRAMES.items():
        dlon, dlat = bbox[2] - bbox[0], bbox[3] - bbox[1]
        w = 4096 if dlon / dlat > 1.4 else 3200
        h = round(w * dlat / dlon)
        img = wms(EOX, "s2cloudless", bbox, w, h)
        save_jpeg(ASSETS / "countries" / f"{slug}.jpg", img, 82)
        meta[slug] = {"bbox": bbox, "width": w, "height": h}
    save(ASSETS / "countries" / "frames.json", json.dumps(meta, indent=1))


def fetch_hdri() -> None:
    """Студийное HDRI с Poly Haven (CC0) для реалистичных отражений в 3D-часах."""
    print("hdri")
    meta = httpx.get("https://api.polyhaven.com/files/monochrome_studio_04", timeout=30).json()
    save(ASSETS / "hdri" / "monochrome_studio_04_2k.hdr", get(meta["hdri"]["2k"]["hdr"]["url"]))
    # то же HDRI в 1K для слабых устройств: вчетверо меньше скачивать и разбирать
    save(ASSETS / "hdri" / "monochrome_studio_04_1k.hdr", get(meta["hdri"]["1k"]["hdr"]["url"]))


STEPS = {"hdri": fetch_hdri, "vendor": fetch_vendor, "fonts": fetch_fonts, "fonts-dedupe": dedupe_local_fonts, "earth": fetch_earth, "geo": fetch_geo, "countries": fetch_countries, "earth-lite": earth_lite}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", default=",".join(STEPS))
    args = parser.parse_args()
    for step in args.only.split(","):
        STEPS[step.strip()]()
    return 0


if __name__ == "__main__":
    sys.exit(main())
