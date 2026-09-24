"""Вырезать детали с настоящей фотографии разобранного механизма.

Из снимка «все детали на столе» получаются отдельные спрайты с прозрачным фоном
и манифест с двумя позами каждой детали:

* ``to``   место детали на исходном снимке (разобранный механизм);
* ``from`` место в собранном механизме (вид со стороны платы).

Фронтенд (``frontend/js/ui/photo-explode.js``) по скроллу переводит детали из одной
позы в другую. Все пиксели настоящие, анимируется только их положение.

    uv run python scripts/cutouts.py eta-955 --preview   # маска поверх снимка для проверки
    uv run python scripts/cutouts.py eta-955             # спрайты + manifest.json

Нужны numpy и scipy (dev-группа в pyproject).
"""

from __future__ import annotations

import argparse
import io
import json
import math
import random
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

sys.path.insert(0, str(Path(__file__).resolve().parent))
from photos import client, load_photos, PART_PHOTOS_YAML  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend" / "assets" / "exploded"
CACHE = Path(__file__).resolve().parent / ".cache" / "cutouts"

# ----------------------------------------------------------------------------- sources
#
# Координаты в долях кадра (x по ширине, y по высоте). Позы ``assembled`` подобраны
# вручную по фотографиям собранного калибра с той же стороны.

SOURCES = {
    "eta-955": {
        "photo_key": "exploded_quartz",  # запись в content/part_photos.yaml (автор, лицензия, точки)
        "url": "https://upload.wikimedia.org/wikipedia/commons/{path}",
        "file": "ETA-ESA_955.412,_contents_2.png",
        "scale": 0.5,
        "thr_chroma": 10, "thr_dark": 28, "thr_bright": 9,
        # белое кольцо даты по цвету совпадает с фоном: задаём его кольцом (центр, радиусы в долях ширины)
        "rings": [{"cx": 0.1588, "cy": 0.2300, "r_out": 0.1413, "r_in": 0.0855}],
        # группы мелких деталей по области кадра
        "regions": [{"key": "screws", "x0": 0.0, "x1": 0.145, "y0": 0.64, "y1": 1.0}],
        "assembled": {
            "center": [0.5, 0.52],
            "keys": {
                "mainplate": {"dx": 0.0, "dy": 0.0, "z": 10},
                "date_disc": {"dx": 0.0, "dy": 0.0, "z": 5},
                "spacer": {"dx": -0.03, "dy": 0.02, "z": 11},
                "bridges": {"dx": 0.01, "dy": 0.06, "z": 12},
                "jewels": {"dx": 0.06, "dy": -0.03, "z": 13},
                "circuit": {"dx": -0.01, "dy": -0.03, "z": 20},
                "battery_film": {"dx": 0.075, "dy": -0.06, "z": 24},
            },
            "hidden_z": 4,  # мелочь прячется под платиной
            "zoom": 1.35,
            "top_z": 30,  # винты поверх всего
        },
    },
}

# Музейный набор механических часов Prim: детали на чёрном бархате вперемешку с подписями
# и поролоновыми подставками, поэтому детали выбираются явно, по точке внутри каждой.
SEEDED = {
    "prim": {
        "photo_key": "exploded_mechanical",
        "url": "https://upload.wikimedia.org/wikipedia/commons/{path}",
        "file": "Prim_mechanical_wrist_watch_disassembled_whole.jpg",
        "scale": 1.0,
        "dark_threshold": 24,
        # кадр анимации: корпус занимает 20 % ширины, пропорции 16:10, сборка в центре
        "frame": {"case_px": 2 * 0.0528 * 4048, "case_frac": 0.2, "aspect": 1.6},
        "zoom": 1.9,  # в начале камера крупно на часах, потом отъезжает
        "parts": [
            # key, x, y, z (в собранном виде), особые флаги
            # key, seed (точка внутри детали на снимке), z (слой в собранном виде), at (место в разборке)
            {"key": "case", "circle": [0.499, 0.4229, 0.0528], "z": 60, "fade": True, "at": [0.5, 0.5]},
            {"key": "dial", "seed": [0.8933, 0.4855], "z": 50, "at": [0.17, 0.3]},
            {"key": "date_disc", "seed": [0.6126, 0.4638], "z": 45, "at": [0.37, 0.19]},
            {"key": "calendar", "seed": [0.6107, 0.5336], "z": 40, "at": [0.33, 0.43]},
            {"key": "calendar", "seed": [0.6378, 0.5487], "z": 40, "at": [0.365, 0.45]},
            {"key": "calendar", "seed": [0.665, 0.548], "z": 40, "at": [0.4, 0.43]},
            {"key": "calendar", "seed": [0.6843, 0.5224], "z": 40, "at": [0.3, 0.46]},
            {"key": "setting", "seed": [0.7831, 0.2747], "z": 38, "at": [0.33, 0.77]},
            {"key": "setting", "seed": [0.8202, 0.2938], "z": 38, "at": [0.39, 0.8]},
            {"key": "setting", "seed": [0.8513, 0.2958], "z": 38, "at": [0.44, 0.76]},
            {"key": "setting", "seed": [0.8211, 0.2582], "z": 38, "at": [0.36, 0.7]},
            {"key": "setting", "seed": [0.8523, 0.2675], "z": 38, "at": [0.42, 0.69]},
            {"key": "setting", "seed": [0.7989, 0.3043], "z": 38, "at": [0.3, 0.72]},
            {"key": "mainplate", "seed": [0.1285, 0.1067], "z": 30, "at": [0.63, 0.2]},
            {"key": "bridges", "seed": [0.2297, 0.1153], "z": 20, "at": [0.8, 0.17]},
            {"key": "bridges", "seed": [0.2732, 0.1173], "z": 20, "at": [0.9, 0.3]},
            {"key": "bridges", "seed": [0.3162, 0.1206], "z": 20, "at": [0.8, 0.4]},
            {"key": "balance_cock", "seed": [0.3785, 0.1219], "z": 20, "at": [0.89, 0.52]},
            {"key": "bridges", "seed": [0.4219, 0.1298], "z": 20, "at": [0.77, 0.6]},
            {"key": "barrel", "seed": [0.6507, 0.7246], "z": 12, "at": [0.6, 0.8]},
            {"key": "barrel", "seed": [0.707, 0.7253], "z": 12, "at": [0.7, 0.83]},
            {"key": "barrel", "seed": [0.79, 0.8504], "z": 12, "at": [0.79, 0.8]},
            {"key": "dial", "seed": [0.7826, 0.4848], "z": 8, "at": [0.17, 0.72]},
        ],
    },
}

EXTRA_KEYS = {
    # детали без точки на снимке, но с понятной ролью
    "eta-955": [{"key": "spacer", "x": 0.16, "y": 0.55}, {"key": "battery_film", "x": 0.875, "y": 0.86}],
}


# ----------------------------------------------------------------------------- image ops


def srgb_to_lab(c: np.ndarray) -> np.ndarray:
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    m = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ m.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def load_source(cfg: dict) -> Image.Image:
    CACHE.mkdir(parents=True, exist_ok=True)
    local = CACHE / cfg["file"]
    if not local.exists():
        import hashlib

        h = hashlib.md5(cfg["file"].encode()).hexdigest()
        url = cfg["url"].format(path=f"{h[0]}/{h[:2]}/{cfg['file']}")
        r = client.get(url)
        r.raise_for_status()
        local.write_bytes(r.content)
    img = Image.open(io.BytesIO(local.read_bytes())).convert("RGB")
    s = cfg["scale"]
    return img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)


def segment(img: Image.Image, cfg: dict) -> np.ndarray:
    """Метки деталей: фон отличается от детали цветом или заметно темнее/светлее (тени не в счёт)."""
    im = np.asarray(img).astype(np.float32) / 255.0
    lab = srgb_to_lab(im)
    border = np.concatenate([lab[:20].reshape(-1, 3), lab[-20:].reshape(-1, 3), lab[:, :20].reshape(-1, 3), lab[:, -20:].reshape(-1, 3)])
    bg0 = np.median(border, 0)
    rough = np.linalg.norm(lab - bg0, axis=-1) > 18
    w = (~rough).astype(np.float32)
    # локальный фон: освещение неравномерное (виньетка), сравниваем с соседним фоном
    bg = np.stack([ndi.gaussian_filter(lab[..., i] * w, 40) for i in range(3)], -1) / (ndi.gaussian_filter(w, 40)[..., None] + 1e-6)
    d_l = lab[..., 0] - bg[..., 0]
    d_c = np.hypot(lab[..., 1] - bg[..., 1], lab[..., 2] - bg[..., 2])
    mask = (d_c > cfg["thr_chroma"]) | (d_l < -cfg["thr_dark"]) | (d_l > cfg["thr_bright"])
    mask = ndi.binary_opening(mask, iterations=1)
    mask = ndi.binary_closing(mask, iterations=3)
    h, wd = mask.shape
    yy, xx = np.mgrid[0:h, 0:wd]
    for ring in cfg.get("rings", []):
        r = np.hypot(xx - ring["cx"] * wd, yy - ring["cy"] * h)
        mask |= (r <= ring["r_out"] * wd) & (r >= ring["r_in"] * wd)
    # заполнить только мелкие дырки (отверстия в платине остаются сквозными)
    holes = ndi.binary_fill_holes(mask) & ~mask
    hl, hn = ndi.label(holes)
    sizes = ndi.sum(holes, hl, range(1, hn + 1))
    mask |= np.isin(hl, np.nonzero(sizes < 1500)[0] + 1)
    labels, n = ndi.label(mask)
    sizes = ndi.sum(mask, labels, range(1, n + 1))
    keep = np.nonzero(sizes > 120)[0] + 1
    return np.where(np.isin(labels, keep), labels, 0)


# ----------------------------------------------------------------------------- build


def build(name: str, preview: bool) -> None:
    cfg = SOURCES[name]
    img = load_source(cfg)
    labels = segment(img, cfg)
    W, H = img.size
    if preview:
        vis = np.asarray(img).copy()
        vis[labels == 0] = (vis[labels == 0] * 0.25).astype(np.uint8)
        path = CACHE / f"{name}-preview.png"
        Image.fromarray(vis).save(path)
        print(path, "components:", len(np.unique(labels)) - 1)
        return

    photo = (load_photos(PART_PHOTOS_YAML).get(cfg["photo_key"]) or [{}])[0]
    anchors = [(h["key"], h["x"], h["y"]) for h in photo.get("hotspots", [])]
    anchors += [(e["key"], e["x"], e["y"]) for e in EXTRA_KEYS.get(name, [])]

    out = OUT / name
    out.mkdir(parents=True, exist_ok=True)
    for f in out.glob("*.webp"):
        f.unlink()
    rgb = np.asarray(img)
    rnd = random.Random(7)
    asm = cfg["assembled"]
    cx0, cy0 = asm["center"]
    parts = []
    used_keys: set[str] = set()
    objects = ndi.find_objects(labels)
    ids = [i + 1 for i, sl in enumerate(objects) if sl is not None]
    # крупные детали первыми: так ключ точки достаётся главной детали, а не соседнему винтику
    ids.sort(key=lambda i: -int((labels[objects[i - 1]] == i).sum()))
    for idx, lid in enumerate(ids):
        sl = objects[lid - 1]
        pad = 6
        y0, y1 = max(0, sl[0].start - pad), min(H, sl[0].stop + pad)
        x0, x1 = max(0, sl[1].start - pad), min(W, sl[1].stop + pad)
        m = (labels[y0:y1, x0:x1] == lid)
        area = int(m.sum())
        alpha = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
        sprite = Image.fromarray(rgb[y0:y1, x0:x1]).convert("RGBA")
        sprite.putalpha(alpha)
        file = f"p{idx:02d}.webp"
        sprite.save(out / file, "WEBP", quality=88, method=6)
        ys, xs = np.nonzero(m)
        cx, cy = (x0 + xs.mean()) / W, (y0 + ys.mean()) / H

        key = None
        for region in cfg.get("regions", []):
            if region["x0"] <= cx <= region["x1"] and region["y0"] <= cy <= region["y1"]:
                key = region["key"]
        if key is None:
            best = min(anchors, key=lambda a: math.hypot(a[1] - cx, (a[2] - cy) * H / W), default=None)
            if best and math.hypot(best[1] - cx, (best[2] - cy) * H / W) < 0.06 and best[0] not in used_keys:
                key = best[0]
                used_keys.add(key)

        spec = asm["keys"].get(key)
        if spec:
            fx, fy, z = cx0 + spec["dx"], cy0 + spec["dy"], spec["z"]
        elif key == "screws":
            ang = rnd.uniform(0, math.tau)
            fx, fy, z = cx0 + math.cos(ang) * 0.11, cy0 + math.sin(ang) * 0.11 * W / H, asm["top_z"]
        else:
            fx, fy, z = cx0 + rnd.uniform(-0.04, 0.04), cy0 + rnd.uniform(-0.05, 0.05), asm["hidden_z"]
        parts.append({
            "file": file, "key": key, "area": area, "z": z,
            "w": round((x1 - x0) / W, 5), "h": round((y1 - y0) / H, 5),
            # позиции центра спрайта (не центра масс), чтобы CSS ставил картинку ровно
            "to": [round((x0 + x1) / 2 / W, 5), round((y0 + y1) / 2 / H, 5)],
            "from": [round(fx + ((x0 + x1) / 2 / W - cx), 5), round(fy + ((y0 + y1) / 2 / H - cy), 5)],
        })

    manifest = {
        "name": name, "width": W, "height": H, "photo_key": cfg["photo_key"], "zoom": asm.get("zoom", 1),
        "credit": {k: photo.get(k) for k in ("title", "author", "license", "license_url", "source_url")},
        "parts": parts,
    }
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    size = sum(f.stat().st_size for f in out.glob("*.webp"))
    keyed = sorted({p["key"] for p in parts if p["key"]})
    print(f"{name}: {len(parts)} деталей, {size / 1e6:.1f} МБ, ключи: {', '.join(keyed)}")


def build_seeded(name: str) -> None:
    """Детали по точкам-семенам на тёмном фоне; раскладка разборки задана вручную (``at``)."""
    cfg = SEEDED[name]
    img = load_source(cfg)
    W, H = img.size
    rgb = np.asarray(img)
    lum = ndi.gaussian_filter(rgb.astype(np.float32) @ np.array([0.299, 0.587, 0.114]), 1.2 * cfg["scale"] * 2)
    mask = lum > cfg["dark_threshold"]
    mask = ndi.binary_opening(mask, iterations=1)
    mask = ndi.binary_closing(mask, iterations=round(4 * cfg["scale"] * 2))
    holes = ndi.binary_fill_holes(mask) & ~mask
    hl, hn = ndi.label(holes)
    sizes = ndi.sum(holes, hl, range(1, hn + 1))
    mask |= np.isin(hl, np.nonzero(sizes < 1600 * cfg["scale"] ** 2 * 4)[0] + 1)
    labels, _ = ndi.label(mask)
    yy, xx = np.mgrid[0:H, 0:W]

    fr = cfg["frame"]
    FW = fr["case_px"] * cfg["scale"] / fr["case_frac"]
    FH = FW / fr["aspect"]
    items = []
    for i, spec in enumerate(cfg["parts"]):
        if "circle" in spec:
            x, y, r = spec["circle"]
            m_full = np.hypot(xx - x * W, yy - y * H) <= r * W
        else:
            sx, sy = round(spec["seed"][0] * W), round(spec["seed"][1] * H)
            win = labels[max(0, sy - 20):sy + 20, max(0, sx - 20):sx + 20]
            ids, counts = np.unique(win[win > 0], return_counts=True)
            if not len(ids):
                print("  нет детали у точки", spec)
                continue
            m_full = labels == ids[np.argmax(counts)]
        ys, xs = np.nonzero(m_full)
        pad = 8
        y0, y1, x0, x1 = max(0, ys.min() - pad), min(H, ys.max() + pad), max(0, xs.min() - pad), min(W, xs.max() + pad)
        m = m_full[y0:y1, x0:x1]
        alpha = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.0))
        sprite = Image.fromarray(rgb[y0:y1, x0:x1]).convert("RGBA")
        sprite.putalpha(alpha)
        items.append({"spec": spec, "sprite": sprite, "w": x1 - x0, "h": y1 - y0})

    out = OUT / name
    out.mkdir(parents=True, exist_ok=True)
    for f in out.glob("*.webp"):
        f.unlink()
    parts = []
    for n, it in enumerate(items):
        file = f"p{n:02d}.webp"
        it["sprite"].save(out / file, "WEBP", quality=88, method=6)
        parts.append({
            "file": file, "key": it["spec"]["key"], "z": it["spec"]["z"], "fade": bool(it["spec"].get("fade")),
            "w": round(it["w"] / FW, 5), "h": round(it["h"] / FH, 5),
            "to": it["spec"]["at"], "from": [0.5, 0.5],
        })
    photo = (load_photos(PART_PHOTOS_YAML).get(cfg["photo_key"]) or [{}])[0]
    manifest = {
        "name": name, "width": round(FW), "height": round(FH), "photo_key": cfg["photo_key"], "zoom": cfg.get("zoom", 1),
        "credit": {k2: photo.get(k2) for k2 in ("title", "author", "license", "license_url", "source_url")},
        "parts": parts,
    }
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    size = sum(f.stat().st_size for f in out.glob("*.webp"))
    print(f"{name}: {len(parts)} деталей, кадр {round(FW)}x{round(FH)}, {size / 1e6:.1f} МБ")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("name", choices=sorted(SOURCES) + sorted(SEEDED))
    ap.add_argument("--preview", action="store_true")
    args = ap.parse_args()
    if args.name in SEEDED:
        build_seeded(args.name)
    else:
        build(args.name, args.preview)
    return 0


if __name__ == "__main__":
    sys.exit(main())
