"""Разборка каждой модели до детали: задания для Gemini, генерация, нарезка, сборка сцены.

Поток:

    content/teardown/*.yaml ──tasks──▶ docs/TEARDOWN_GEMINI_TASK.md (задание для Gemini)
                            ──generate (Gemini 3 Pro Image, 4K)──▶ teardown_src/…/<лист>.png
                              (или положите туда картинки, сделанные в приложении Gemini вручную)
                            ──build──▶ frontend/assets/teardown/<slug>/ (атлас деталей + manifest.json)
                            ──review──▶ scripts/.cache/teardown/<slug>-<лист>.png (проверка подписей)

Команды:

    uv run python scripts/teardown.py tasks                         # задание для Gemini (все модели)
    uv run python scripts/teardown.py plan rolex-gmt-master-ii-pepsi # какие листы нужны и где они
    uv run --group teardown python scripts/teardown.py generate rolex-gmt-master-ii-pepsi [--plate dial] [--dry-run]
    uv run --group teardown python scripts/teardown.py build rolex-gmt-master-ii-pepsi   # rembg в группе teardown
    uv run --group teardown python scripts/teardown.py review rolex-gmt-master-ii-pepsi

Ключ Gemini берётся из переменной окружения GEMINI_API_KEY (никогда не храните его в репозитории).
"""

from __future__ import annotations

import argparse
import io
import json
import math
import os
import random
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

import yaml
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SPEC = ROOT / "content" / "teardown"
FIXES = SPEC / "fixes.yaml"  # ручные правки раскладки конкретных картинок
SRC = ROOT / "teardown_src"  # исходные 4K-листы (в .gitignore: тяжёлые)
OUT = ROOT / "frontend" / "assets" / "teardown"
CACHE = Path(__file__).resolve().parent / ".cache" / "teardown"
TASK_MD = ROOT / "docs" / "TEARDOWN_GEMINI_TASK.md"
INBOX = Path.home() / "Desktop" / "Horologium-детали"  # сюда сохраняются картинки из Nano Banana Pro
TASK_PAGE = ROOT / "frontend" / "assets" / "teardown-tasks" / "index.html"
# порядок моделей на странице заданий: сначала те, чьи механизмы уже нарисованы (нужны корпус и циферблат),
# потом новые калибры; готовые листы страница пропускает
PAGE_ORDER = [
    "rolex-gmt-master-ii-pepsi", "longines-spirit-zulu-time",
    "rolex-submariner", "rolex-submariner-date", "rolex-oyster-perpetual-41", "rolex-explorer-40",
    "rolex-datejust-41", "rolex-day-date-40", "longines-spirit-pilot", "longines-master-collection-moonphase",
    "rolex-cosmograph-daytona", "rolex-sky-dweller", "rolex-1908", "rolex-land-dweller-40", "longines-spirit-flyback",
]

MODEL = os.environ.get("TEARDOWN_MODEL", "gemini-3-pro-image")
BACKGROUND = "#d6d6d6"
ASPECT = 16 / 9
PPMM = 26  # пикселей спрайта на миллиметр: корпус 47 мм = ~1200 px, хватает для Retina
ATLAS = 4096

# Слой детали от задней крышки (0) к стеклу. Камера смотрит со стороны циферблата.
LAYERS = {
    "caseback": 0, "caseback_display": 0, "gasket": 0.6, "rotor": 1, "auto_bridge": 1.6, "reverser": 1.6,
    "screws": 2.4, "balance_cock": 2, "bridges": 2, "ratchet": 2.2, "crown_wheel": 2.2,
    "chrono_lever": 2.8, "column_wheel": 2.8, "clutch": 2.8, "chrono_wheel": 3.2,
    "barrel": 3.4, "mainspring": 3.4, "train": 3.4, "escape_wheel": 3.4, "pallet": 3.4, "balance": 3.4,
    "dynapulse": 3.4, "shock": 3.4, "jewels": 3.6, "winding": 3.8, "stem": 3.8,
    "mainplate": 4.4, "cannon": 5, "hour_wheel": 5, "setting": 5, "calendar": 5, "gmt_wheel": 5,
    "saros": 5, "ring_command": 5, "moon_disc": 5.4, "date_disc": 5.6, "day_disc": 5.6,
    "movement_ring": 6, "case": 6.4, "crown": 6.4, "pushers": 6.4,
    "dial": 7, "subdial_hands": 7.6, "hand_hour": 7.8, "hand_gmt": 7.9, "hand_minute": 8, "hand_second": 8.2,
    "flange": 8.6, "bezel_spring": 8.8, "bezel": 9, "bezel_insert": 9.3, "crystal": 10,
    "bracelet_end": 6.2, "bracelet_link": 6.2, "clasp": 6.2, "bracelet_pins": 6.2, "spring_bar": 6.2, "strap": 6.2,
}
SIDE_KEYS = {"crown", "pushers"}  # сидят сбоку на 3 часах
# Стрелки на листе нарисованы остриём вправо (на 3 часа), ось у левого края. В собранных часах
# они встают осью в центр под углом, как на собранном фото (10:10 и т. д.). pivot: доля длины от левого края.
HANDS = {"hand_hour": (305, None), "hand_minute": (55, None), "hand_second": (225, 0.2), "hand_gmt": (135, None), "subdial_hands": (0, None)}
STRAP_KEYS = {"bracelet_end", "bracelet_link", "clasp", "bracelet_pins", "spring_bar", "strap"}
DISK_KEYS = {"crystal"}  # прозрачное стекло почти не видно на фоне: маска по вписанному кругу
# Сплошные детали без сквозных отверстий: светлые места (матовая крышка, люминофор стрелок)
# не должны становиться дырами.
# кольца: отверстие в середине всегда прозрачное, даже если сегментация его залила
RING_KEYS = {"case", "bezel", "bezel_insert", "bezel_spring", "flange", "gasket", "movement_ring"}
FILL_KEYS = {"caseback", "hand_hour", "hand_minute", "hand_second", "hand_gmt", "subdial_hands"}

STYLE = (
    "Ultra-detailed macro product photograph for a technical watch encyclopedia. "
    "Camera exactly perpendicular, looking straight down (orthographic top-down view, no perspective tilt). "
    "Watch components are laid out flat and fully separated in a clean knolling grid: every item sits alone "
    "in its own grid cell, generous empty space between items, nothing overlaps or touches, nothing is cropped by the frame. "
    f"Seamless, perfectly uniform light-grey background ({BACKGROUND}), no texture, no gradient, no vignette. "
    "Soft, even, shadowless studio lighting from a large overhead softbox: no cast shadows, no dark reflections of the camera. "
    "Correct relative sizes between the items. Accurate materials and finishes (polished and satin-brushed steel or gold, "
    "ceramic, sapphire, gilded brass wheels, synthetic ruby jewels). Razor-sharp focus on every item. "
    "No captions, labels, numbers, arrows, rulers, tweezers, human hands or tools added to the scene "
    "(text that is really printed or engraved on a part, such as dial printing, stays as on the real watch)."
)


# ----------------------------------------------------------------------------- spec model


@dataclass
class Item:
    key: str
    name: str
    prompt: str
    mm: float
    z: float
    opts: dict = field(default_factory=dict)


@dataclass
class Job:
    id: str  # «watches/<slug>/<plate>» или «movements/<family>-<variant>/<plate>»
    plate: str
    title: str
    items: list[Item]
    look: str
    refs: list[Path]
    kind: str  # watch | movement | assembled
    extra: str = ""

    @property
    def path(self) -> Path:
        return SRC / f"{self.id}.png"

    @property
    def file_name(self) -> str:
        """Имя файла для ручной генерации: без папок, латиницей, чтобы не ошибиться при сохранении."""
        return self.id.split("/", 1)[1].replace("/", "--") + ".png"

    @property
    def unique(self) -> list[tuple[Item, int]]:
        """Одинаковые детали (винты, звенья) рисуются один раз, копии делает скрипт."""
        out: list[tuple[Item, int]] = []
        for it in self.items:
            if out and out[-1][0].prompt == it.prompt and out[-1][0].name == it.name:
                out[-1] = (out[-1][0], out[-1][1] + 1)
            else:
                out.append((it, 1))
        return out

    @property
    def grid(self) -> tuple[int, int]:
        n = max(1, len(self.unique))
        cols = max(1, math.ceil(math.sqrt(n * ASPECT)))
        rows = math.ceil(n / cols)
        return cols, rows


def _items(parts: list, variant) -> list[Item]:
    out = []
    for p in parts:
        key, name, prompt, mm, count = p[:5]
        opts = p[5] if len(p) > 5 else {}
        if "only" in opts and str(variant) not in {str(v) for v in opts["only"]}:
            continue
        z = opts.get("z", LAYERS.get(key, 5))
        out += [Item(key, name, prompt, float(mm), float(z), opts) for _ in range(int(count))]
    return out


def load_watch(slug: str) -> tuple[dict, dict]:
    w = yaml.safe_load((SPEC / "watches" / f"{slug}.yaml").read_text(encoding="utf-8"))
    fam = yaml.safe_load((SPEC / "families" / f"{w['family']}.yaml").read_text(encoding="utf-8"))
    return w, fam


def jobs_for(slug: str) -> list[Job]:
    w, fam = load_watch(slug)
    refs = [ROOT / r for r in w.get("references", [])]
    jobs = []
    for pl in w["plates"]:
        jobs.append(Job(f"watches/{slug}/{pl['id']}", pl["id"], pl["title"], _items(pl["parts"], w["variant"]), w["look"], refs, "watch"))
    for pl in fam["plates"]:
        # лист без деталей «only» одинаков у всех вариантов калибра: один на семейство
        # (мосты 3285 годятся и для 3230/3235/3255); иначе свой лист на вариант
        own = any(len(p) > 5 and "only" in p[5] for p in pl["parts"])
        mid = f"{w['family']}-{w['variant']}".lower() if own else w["family"].lower()
        jobs.append(Job(f"movements/{mid}/{pl['id']}", pl["id"], pl["title"], _items(pl["parts"], w["variant"]), fam["look"], [], "movement"))
    for side, text in (w.get("assembled") or {}).items():
        jobs.append(Job(f"watches/{slug}/assembled_{side}", f"assembled_{side}", "Собранные часы", [], w["look"], refs, "assembled", text))
    return jobs


def all_slugs() -> list[str]:
    return sorted(p.stem for p in (SPEC / "watches").glob("*.yaml"))


def prompt_for(job: Job) -> str:
    if job.kind == "assembled":
        return (
            f"{STYLE.split(' Watch components')[0]} Subject: {job.extra}. The watch: {job.look}. "
            f"Match the reference photos exactly (proportions, colours, dial layout, bezel). "
            f"Seamless uniform light-grey background ({BACKGROUND}), shadowless light, the watch fills about 70% of the frame height."
        )
    cols, rows = job.grid
    lines = [f"{i + 1}. {it.prompt}" for i, (it, _) in enumerate(job.unique)]
    ref = (" The attached reference photo shows the finished watch: every exterior part (case, bezel, dial, hands, "
           "crown, bracelet) must match it exactly in shape, colour, finish and printing.") if job.refs else ""
    n = len(job.unique)
    return (
        f"{STYLE}\n\nSubject: the disassembled components of this watch: {job.look}.{ref}\n"
        f"Show EXACTLY {n} separate items, one of each, arranged in a grid of {cols} columns and {rows} rows, "
        f"in reading order (left to right, then next row), each item centred in its own cell and as large as the cell allows, "
        f"in this order:\n" + "\n".join(lines) + "\nNothing else in the image."
    )


def cmd_tasks() -> None:
    seen: set[str] = set()
    out = [
        "# Задание для Gemini 3 Pro Image (Nano Banana Pro): детали часов для разборки",
        "",
        "Сгенерировано `scripts/teardown.py tasks` из `content/teardown/`. Не правьте вручную.",
        "",
        "## Как выполнять",
        "",
        "1. Модель: **Gemini 3 Pro Image** (Nano Banana Pro). Размер **4K**, соотношение сторон **16:9**",
        "   (для листов `assembled_*` можно 1:1).",
        "2. К каждому листу модели приложите указанные референсы (официальные фото модели).",
        "3. Вставьте промпт целиком. Одна картинка = один лист. Если детали налезают друг на друга,",
        "   есть подписи, тени или обрезаны края, сгенерируйте заново.",
        "4. Сохраните PNG ровно по указанному пути (папка `teardown_src/` в корне проекта).",
        "5. Механизмы общие для моделей с одним калибром: лист `movements/...` делается один раз.",
        "6. Затем: `uv run python scripts/teardown.py build <slug>` и `review <slug>` для проверки подписей.",
        "",
        f"Фон везде однородный светло-серый {BACKGROUND}: по нему скрипт вырезает детали. Порядок деталей в",
        "сетке даёт им названия на сайте, поэтому порядок важен, а подписи на картинке запрещены.",
        "",
    ]
    total = 0
    for slug in all_slugs():
        out += [f"## {slug}", ""]
        for job in jobs_for(slug):
            if job.id in seen:
                out.append(f"- `{job.id}.png`: уже описан выше (общий механизм).")
                continue
            seen.add(job.id)
            total += 1
            refs = ", ".join(f"`{r.relative_to(ROOT)}`" for r in job.refs) or "нет"
            count = f", деталей: {len(job.items)}, сетка {job.grid[0]}×{job.grid[1]}" if job.items else ""
            out += [
                f"### `teardown_src/{job.id}.png`",
                "",
                f"{job.title}{count}. Референсы: {refs}.",
                "",
                "```text",
                prompt_for(job),
                "```",
                "",
            ]
        out.append("")
    out.insert(4, f"Всего уникальных листов: **{total}** (ориентировочно ${total * 0.24:.0f} по цене 4K в Gemini API).")
    TASK_MD.write_text("\n".join(out), encoding="utf-8")
    print(f"{TASK_MD.relative_to(ROOT)}: {total} листов")


def cmd_plan(slug: str) -> None:
    for job in jobs_for(slug):
        state = "есть" if job.path.exists() else "нет"
        print(f"[{state:4s}] {job.path.relative_to(ROOT)}  {job.title}  ({len(job.items)} дет.)")
    parts = sum(len(j.items) for j in jobs_for(slug))
    print(f"итого деталей: {parts}")


# ----------------------------------------------------------------------------- generate (Gemini API)


def cmd_generate(slug: str, plate: str | None, dry: bool, force: bool, size: str) -> None:
    jobs = [j for j in jobs_for(slug) if plate in (None, j.plate)]
    if dry:
        for j in jobs:
            print(f"--- {j.id}\n{prompt_for(j)}\n")
        return
    if not os.environ.get("GEMINI_API_KEY"):
        sys.exit("Нет GEMINI_API_KEY в окружении. Задайте его в своём терминале: export GEMINI_API_KEY=...")
    from google import genai
    from google.genai import types

    client = genai.Client()
    for j in jobs:
        if j.path.exists() and not force:
            print(f"пропуск (уже есть): {j.path.relative_to(ROOT)}")
            continue
        contents: list = [prompt_for(j)] + [Image.open(r) for r in j.refs if r.exists()]
        aspect = "1:1" if j.kind == "assembled" else "16:9"
        print(f"генерация {j.id} ({len(j.items)} дет., {size}, {aspect})…", flush=True)
        for attempt in range(3):
            try:
                resp = client.models.generate_content(
                    model=MODEL, contents=contents,
                    config=types.GenerateContentConfig(
                        response_modalities=["IMAGE"],
                        image_config=types.ImageConfig(aspect_ratio=aspect, image_size=size),
                    ),
                )
                data = next(p.inline_data.data for p in resp.candidates[0].content.parts if getattr(p, "inline_data", None))
                j.path.parent.mkdir(parents=True, exist_ok=True)
                Image.open(io.BytesIO(data)).save(j.path)
                print(f"  сохранено {j.path.relative_to(ROOT)}")
                break
            except Exception as exc:  # noqa: BLE001 - сеть, квоты, фильтры
                print(f"  попытка {attempt + 1}: {type(exc).__name__}: {exc}", file=sys.stderr)
                time.sleep(5 * (attempt + 1))


# ----------------------------------------------------------------------------- segmentation


_REMBG = {}


def _rembg_alpha(img: Image.Image):
    """Альфа-маска rembg (isnet-general-use) или None, если пакет не установлен (группа teardown)."""
    import numpy as np

    try:
        from rembg import new_session, remove
    except ImportError:
        return None
    import hashlib

    key = (img.size, hashlib.sha1(img.tobytes()).hexdigest())
    if key not in _REMBG:
        sess = _REMBG.setdefault("session", new_session("isnet-general-use"))
        _REMBG[key] = np.asarray(remove(img.convert("RGB"), session=sess, only_mask=True)).astype(np.float32) / 255
    return _REMBG[key]


def _grid_lines(mask):
    """Линии сетки, которые Gemini иногда рисует между клетками: длинные и тонкие (до 6 px)."""
    import numpy as np
    from scipy import ndimage as ndi

    h, w = mask.shape
    lines = np.zeros_like(mask)
    for axis, length in ((0, w), (1, h)):
        # тонкое поперёк оси: сверху и снизу (или слева и справа) через 5 px уже фон
        thin = mask & ~np.roll(mask, 5, axis=axis) & ~np.roll(mask, -5, axis=axis)
        struct = np.array([[0, 0, 0], [1, 1, 1], [0, 0, 0]]) if axis == 0 else np.array([[0, 1, 0], [0, 1, 0], [0, 1, 0]])
        lab, n = ndi.label(thin, structure=struct)
        if not n:
            continue
        for k, sl in enumerate(ndi.find_objects(lab), start=1):
            span = (sl[1].stop - sl[1].start) if axis == 0 else (sl[0].stop - sl[0].start)
            if span > length * 0.15:
                lines[sl] |= lab[sl] == k
    return ndi.binary_dilation(lines, iterations=3)


# Разрешение, в котором ищутся детали (пороги, морфология и группировка подобраны под него).
# Листы больше (настоящие 4K) уменьшаются для поиска маски, а детали вырезаются из полного размера.
WORK_PX = 1400


def _segment(img: Image.Image):
    """Маска деталей и метки компонент в размере img; считается в рабочем разрешении WORK_PX."""
    import numpy as np
    from scipy import ndimage as ndi

    k = WORK_PX / max(img.size)
    if k >= 1:
        return _segment_work(img)
    small = img.convert("RGB").resize((round(img.size[0] * k), round(img.size[1] * k)), Image.LANCZOS)
    mask_s, groups_s, n = _segment_work(small)
    W, H = img.size
    zoom = (H / mask_s.shape[0], W / mask_s.shape[1])
    # край маски растягивается билинейно (гладкий контур), метки по ближайшему соседу
    mask = ndi.zoom(mask_s.astype(np.float32), zoom, order=1)[:H, :W] > 0.5
    labels = ndi.zoom(groups_s, zoom, order=0)[:H, :W]
    labels = ndi.grey_dilation(labels, size=(5, 5))  # покрыть пиксели сглаженного края
    return mask, labels * mask, n


def _segment_work(img: Image.Image):
    """Маска деталей на однородном фоне (как в cutouts.py) и метки компонент."""
    import numpy as np
    from scipy import ndimage as ndi

    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from cutouts import srgb_to_lab

    im = np.asarray(img.convert("RGB")).astype(np.float32) / 255.0
    lab = srgb_to_lab(im)
    border = np.concatenate([lab[:12].reshape(-1, 3), lab[-12:].reshape(-1, 3), lab[:, :12].reshape(-1, 3), lab[:, -12:].reshape(-1, 3)])
    bg0 = np.median(border, 0)
    rough = np.linalg.norm(lab - bg0, axis=-1) > 14
    # Фон плавный, поэтому оценивается на копии в 4 раза меньше и растягивается обратно (в ~16 раз быстрее).
    k = 4
    small, ws = lab[::k, ::k], (~rough[::k, ::k]).astype(np.float32)
    s = max(img.size) / 100 / k
    bgs = np.stack([ndi.gaussian_filter(small[..., i] * ws, s) for i in range(3)], -1) / (ndi.gaussian_filter(ws, s)[..., None] + 1e-6)
    bg = np.stack([ndi.zoom(bgs[..., i], (lab.shape[0] / bgs.shape[0], lab.shape[1] / bgs.shape[1]), order=1) for i in range(3)], -1)
    d_l = lab[..., 0] - bg[..., 0]
    d_c = np.hypot(lab[..., 1] - bg[..., 1], lab[..., 2] - bg[..., 2])
    mask = (d_c > 8) | (d_l < -18) | (d_l > 7)
    # Нейросеть rembg ловит детали, которые по цвету почти совпадают с серым фоном (матовая сталь,
    # стекло), а порог держит полые кольца полыми. Итоговая маска: объединение обоих.
    ai = _rembg_alpha(img)
    if ai is not None:
        mask |= ai > 0.15
    mask &= ~_grid_lines(mask)
    mask = ndi.binary_opening(mask, iterations=1)
    mask = ndi.binary_closing(mask, iterations=2)
    holes = ndi.binary_fill_holes(mask) & ~mask
    hl, hn = ndi.label(holes)
    if hn:
        sizes = ndi.sum(holes, hl, range(1, hn + 1))
        mask |= np.isin(hl, np.nonzero(sizes < (img.size[0] / 60) ** 2)[0] + 1)
    # Осколки одной детали (цифры безеля, стрелки с просветами) склеиваются расширением маски.
    # Группировка считается на уменьшенной маске: так в десятки раз быстрее на 4K.
    k = 4
    h, w = mask.shape
    small = mask[: h - h % k, : w - w % k].reshape(h // k, k, w // k, k).any(axis=(1, 3))
    grow = ndi.binary_dilation(small, iterations=max(1, round(img.size[0] / 250 / k)))
    lab_small, n = ndi.label(grow)
    groups = np.zeros(mask.shape, dtype=lab_small.dtype)
    up = np.repeat(np.repeat(lab_small, k, axis=0), k, axis=1)
    groups[: up.shape[0], : up.shape[1]] = up
    groups = groups * mask
    return mask, groups, n


def _reading_order(boxes: list[tuple[float, float, float, float]]) -> list[int]:
    """Порядок чтения: строки по вертикальным промежуткам, внутри строки слева направо."""
    idx = sorted(range(len(boxes)), key=lambda i: (boxes[i][1] + boxes[i][3]) / 2)
    rows: list[list[int]] = []
    for i in idx:
        cy = (boxes[i][1] + boxes[i][3]) / 2
        h = boxes[i][3] - boxes[i][1]
        if rows:
            last = rows[-1]
            ry0 = min(boxes[j][1] for j in last)
            ry1 = max(boxes[j][3] for j in last)
            if ry0 - h * 0.25 <= cy <= ry1 + h * 0.25 or abs(cy - sum((boxes[j][1] + boxes[j][3]) / 2 for j in last) / len(last)) < (ry1 - ry0) * 0.6:
                last.append(i)
                continue
        rows.append([i])
    order = []
    for r in rows:
        order += sorted(r, key=lambda i: boxes[i][0])
    return order


@dataclass
class Cut:
    item: Item
    sprite: Image.Image
    job: Job


def image_sha(path: Path) -> str:
    """Отпечаток картинки по пикселям (не по байтам файла): пересохранение PNG его не меняет."""
    import hashlib

    return hashlib.sha1(Image.open(path).convert("RGB").tobytes()).hexdigest()[:10]


def _fix(job: Job) -> list | None:
    """Ручная правка раскладки листа из content/teardown/fixes.yaml, если она для этой картинки."""
    if not FIXES.exists() or not job.path.exists():
        return None
    import hashlib

    fix = (yaml.safe_load(FIXES.read_text(encoding="utf-8")) or {}).get(job.id)
    if not fix:
        return None
    sha = image_sha(job.path)
    if fix.get("sha") != sha:
        print(f"  {job.id}: правка в fixes.yaml для другой картинки ({fix.get('sha')} ≠ {sha}), пропущена")
        return None
    cells = fix["cells"]
    if len(cells) != len(job.unique):
        sys.exit(f"{job.id}: в fixes.yaml {len(cells)} позиций, а деталей в списке {len(job.unique)}")
    return [c if isinstance(c, list) else [c] for c in cells]


def _cell(box: tuple, size: tuple[int, int], grid: tuple[int, int]) -> int:
    """Номер клетки заказанной сетки (с нуля, по строкам), в которую попадает центр рамки."""
    (x0, y0, x1, y1), (W, H), (cols, rows) = box, size, grid
    c = min(cols - 1, int((x0 + x1) / 2 / W * cols))
    r = min(rows - 1, int((y0 + y1) / 2 / H * rows))
    return r * cols + c


def _assign(job: Job, img: Image.Image, groups, objs) -> tuple[list[list[int]], list[tuple], list[str]]:
    """Какие компоненты маски относятся к какой детали списка.

    1. Ручная правка из fixes.yaml (Gemini положил детали не в те клетки или добавил лишнее).
    2. Каждый компонент в своей клетке заказанной сетки и заняты ровно первые клетки: по клеткам.
       Это надёжнее порядка чтения, когда высокая деталь (застёжка) перекрывает две строки.
    3. Компонент столько же, сколько деталей: порядок чтения.
    4. Иначе деталь распалась на куски: компоненты склеиваются внутри своей клетки.
    """
    min_area = (img.size[0] / 400) ** 2
    comps = []
    for gid, sl in enumerate(objs, start=1):
        if sl is None:
            continue
        if int((groups[sl] == gid).sum()) >= min_area:
            comps.append((gid, sl))
    boxes = [(sl[1].start, sl[0].start, sl[1].stop, sl[0].stop) for _, sl in comps]
    warnings = []
    items = [it for it, _ in job.unique]
    cells: dict[int, list[int]] = {}
    for k, box in enumerate(boxes):
        cells.setdefault(_cell(box, img.size, job.grid), []).append(k)
    fix = _fix(job)
    if fix is None and len(comps) == len(items):
        if sorted(cells) == list(range(len(items))):
            order = [cells[n][0] for n in range(len(items))]
        else:
            order = _reading_order(boxes)
        return [[comps[i][0]] for i in order], [boxes[i] for i in order], warnings
    cols, rows = job.grid
    # позиции деталей: по правке (номера клеток с единицы) или клетки по порядку
    want = [[c - 1 for c in f] for f in fix] if fix else [[n] for n in range(len(items))]
    out, out_boxes = [], []
    for n in range(len(items)):
        ks = [k for c in want[n] for k in cells.get(c, [])]
        if not ks:
            warnings.append(f"{job.id}: пустая клетка {n + 1} ({items[n].name})")
        out.append([comps[k][0] for k in ks])
        out_boxes.append((min(boxes[k][0] for k in ks), min(boxes[k][1] for k in ks), max(boxes[k][2] for k in ks), max(boxes[k][3] for k in ks)) if ks else None)
    extra = sorted(c + 1 for c in set(cells) - {c for w in want for c in w})
    how = "по правке из fixes.yaml" if fix else "склеено по клеткам"
    warnings.insert(0, f"{job.id}: компонент {len(comps)} при {len(items)} деталях, {how} {cols}×{rows}" + (f", не использованы клетки {extra}" if extra else ""))
    return out, out_boxes, warnings


def _clear_center(m, crop):
    """Отверстие кольца: область цвета фона, связанная с центром рамки, становится прозрачной.

    rembg иногда считает середину безеля частью детали, и в собранных часах она закрывает циферблат.
    Область не должна касаться края рамки: у разомкнутой детали это был бы внешний фон.
    """
    import numpy as np
    from scipy import ndimage as ndi

    outside = ~m
    bg = np.median(crop[outside], axis=0) if outside.sum() > 50 else np.array([214, 214, 214])
    lab, _ = ndi.label(np.abs(crop.astype(int) - bg).max(axis=2) < 10)
    cy, cx = m.shape[0] // 2, m.shape[1] // 2
    ids = lab[max(0, cy - 3):cy + 4, max(0, cx - 3):cx + 4]
    ids = ids[ids > 0]
    if not ids.size:
        return m
    hole = lab == np.bincount(ids).argmax()
    if hole[0].any() or hole[-1].any() or hole[:, 0].any() or hole[:, -1].any():
        return m
    return m & ~ndi.binary_dilation(hole, iterations=1)


def cut_plate(job: Job, img: Image.Image) -> tuple[list[Cut], list[str]]:
    import numpy as np
    from scipy import ndimage as ndi

    _, groups, _ = _segment(img)
    objs = ndi.find_objects(groups)
    gids, boxes, warnings = _assign(job, img, groups, objs)
    rgb = np.asarray(img.convert("RGB"))
    cuts = []
    pad = 6
    for (item, count), ids, box in zip(job.unique, gids, boxes):
        if not ids:
            continue
        x0, y0, x1, y1 = box
        y0, y1 = max(0, y0 - pad), min(img.size[1], y1 + pad)
        x0, x1 = max(0, x0 - pad), min(img.size[0], x1 + pad)
        m = np.isin(groups[y0:y1, x0:x1], ids)
        glass = item.key in DISK_KEYS or item.opts.get("shape") == "disk"
        if item.key in FILL_KEYS or item.opts.get("fill"):
            m = ndi.binary_fill_holes(m)
        elif item.key in RING_KEYS or item.opts.get("shape") == "ring":
            m = _clear_center(m, rgb[y0:y1, x0:x1])
        if glass:
            yy, xx = np.mgrid[0:m.shape[0], 0:m.shape[1]]
            r = min(m.shape) / 2 - pad
            m = m | (np.hypot(xx - m.shape[1] / 2, yy - m.shape[0] / 2) <= r)
        # стекло полупрозрачное: сквозь него в собранных часах виден циферблат
        level = 0.14 if glass else 1.0
        # край мягче на больших листах: маска найдена в рабочем разрешении
        blur = max(1.0, 0.7 * max(img.size) / WORK_PX)
        alpha = Image.fromarray((m * 255 * level).astype("uint8")).filter(ImageFilter.GaussianBlur(blur))
        sprite = Image.fromarray(rgb[y0:y1, x0:x1]).convert("RGBA")
        sprite.putalpha(alpha)
        # копии одинаковых деталей делят одну картинку в атласе
        cuts += [Cut(item, sprite, job) for _ in range(count)]
    return cuts, warnings


# ----------------------------------------------------------------------------- layout


def _strap_layout(cuts: list[Cut], idx: list[int], R: float) -> dict[int, tuple[list, list, float]]:
    """Браслет цепочкой от ушек вдоль оси 12–6: концевые звенья, затем звенья по порядку.

    Широкие детали (звенья, застёжка, ремешок) идут цепочкой с шагом в свою длину, мелкие
    (центральные звенья, штифты) спрятаны под цепочкой и в разборке расходятся в стороны.
    Возвращает для детали (at, ex, dy): положения в мм и сдвиг по высоте.
    """
    out: dict[int, tuple[list, list, float]] = {}

    def length(i):  # длина детали вдоль оси браслета (мм)
        sw, sh = cuts[i].sprite.size
        return cuts[i].item.mm * sh / max(sw, sh)

    wide = [i for i in idx if cuts[i].item.key in ("bracelet_end", "bracelet_link", "strap") and cuts[i].item.mm >= 14]
    small = [i for i in idx if i not in wide and cuts[i].item.key != "clasp"]
    clasp = [i for i in idx if cuts[i].item.key == "clasp"]
    ends = [i for i in wide if cuts[i].item.key == "bracelet_end"]
    chain = [i for i in wide if cuts[i].item.key != "bracelet_end"]
    reach = {-1: R + 1.0, 1: R + 1.0}
    order = ends + chain
    for n, i in enumerate(order):
        side = -1 if n % 2 == 0 else 1
        L = length(i)
        d = reach[side] + L / 2
        reach[side] += L - 0.6  # звенья чуть заходят друг на друга, как в настоящем браслете
        step = (d - R) / 20
        out[i] = ([0.0, side * d], [0.0, side * (d + 10 + step * 22)], 0.0)
    for i in clasp:
        L = length(i)
        d = reach[1] + L / 2
        reach[1] += L
        out[i] = ([0.0, d], [0.0, d + 38], 0.0)
    for n, i in enumerate(small):
        side = -1 if n % 2 == 0 else 1
        along = R + 6 + (n // 2) * 5.0
        out[i] = ([0.0, side * along], [(14 + (n // 2) % 4 * 5) * (1 if n % 4 < 2 else -1), side * (along + 8)], -1.0)
    return out


def _layout(cuts: list[Cut], case_mm: float) -> list[dict]:
    """Позы деталей в миллиметрах: собранная (at) и разобранная (ex). Ось Y сцены = ось часов."""
    rnd = random.Random(11)
    placed = []
    by_layer: dict[float, list[int]] = {}
    strap_idx = [i for i, c in enumerate(cuts) if c.item.key in STRAP_KEYS]
    for i, c in enumerate(cuts):
        if c.item.key not in STRAP_KEYS:
            by_layer.setdefault(c.item.z, []).append(i)
    layers = sorted(by_layer)
    # высота слоя в разборке: чем больше деталей в слое, тем больше места
    heights, h = {}, 0.0
    for z in layers:
        heights[z] = h
        h += 4.5 + 0.8 * math.sqrt(len(by_layer[z]))
    mid = h / 2
    R = case_mm / 2
    strap_y = heights.get(min(layers, key=lambda z: abs(z - 6.2)), 0.0) - mid if layers else 0.0
    for i, (at, ex, dy) in _strap_layout(cuts, strap_idx, R).items():
        placed.append({"i": i, "at": at, "ex": ex, "y": strap_y + dy})
    for z in layers:
        members = sorted(by_layer[z], key=lambda i: -cuts[i].item.mm)
        ring_r, ring_used, ring_cap = 0.0, 0.0, 0.0
        for rank, i in enumerate(members):
            c = cuts[i]
            s = c.item.mm
            key = c.item.key
            if key in HANDS:
                angle, pivot = HANDS[key]
                angle = c.item.opts.get("angle", angle)
                sw, sh = c.sprite.size
                # от оси до центра спрайта в мм (длина детали = s мм по большей стороне)
                piv = c.item.opts.get("pivot", pivot if pivot is not None else sh / sw / 2)
                off = s * (0.5 - piv)
                rad = math.radians(angle)
                at = [math.sin(rad) * off, -math.cos(rad) * off]
                ex = [math.sin(rad) * (off + 4 + rank * 2), -math.cos(rad) * (off + 4 + rank * 2)]
                placed.append({"i": i, "at": at, "ex": ex, "y": heights[z] - mid, "rot": angle - 90})
                continue
            if key in SIDE_KEYS:
                at = [R + s * 0.3, rnd.uniform(-3, 3) if key == "pushers" else 0.0]
                ex = [R + 18 + rank * 6, 0.0]
            elif rank == 0 or s > case_mm * 0.55:
                at, ex = [0.0, 0.0], [0.0, 0.0]
            else:
                # мелочь под крышками в собранном виде, в разборке раскладывается по кольцам вокруг оси
                a = rnd.uniform(0, math.tau)
                r = rnd.uniform(0, max(0.0, R * 0.55 - s / 2))
                at = [math.cos(a) * r, math.sin(a) * r]
                if ring_used + s + 3 > ring_cap:
                    ring_r = (ring_r or cuts[members[0]].item.mm / 2) + s + 4
                    ring_cap, ring_used = math.tau * ring_r, 0.0
                ang = (ring_used + s / 2) / ring_r
                ring_used += s + 3
                ex = [math.cos(ang) * ring_r, math.sin(ang) * ring_r]
            placed.append({"i": i, "at": at, "ex": ex, "y": heights[z] - mid})
    return sorted(placed, key=lambda p: p["i"])


TRAY_ORDER = ["exterior", "dial", "movement_dial", "movement_calendar", "movement_chrono", "movement_train",
              "movement_top", "movement_screws", "bracelet", "strap"]


TRAYS = {"tray": 1.75, "tray_sq": 1.1, "tray_tall": 0.72}


def _tray(cuts: list[Cut], sizes: list[tuple[float, float]], aspect: float = 1.75) -> list[tuple[float, float]]:
    """Лоток часовщика: все детали лежат плоско группами (корпус, циферблат, механизм, браслет).

    Полочная упаковка в миллиметрах по порядку групп; центр лотка в нуле. Возвращает (x, z) центров.
    """
    gap = 3.0
    order = sorted(range(len(cuts)), key=lambda i: (TRAY_ORDER.index(cuts[i].job.plate) if cuts[i].job.plate in TRAY_ORDER else 99, i))
    area = sum((sizes[i][0] + gap) * (sizes[i][1] + gap) for i in order)
    limit = math.sqrt(area * aspect) * 1.12
    pos: dict[int, tuple[float, float]] = {}
    x = y = shelf = 0.0
    last_group = None
    for i in order:
        w, h = sizes[i]
        group = cuts[i].job.plate
        if last_group is not None and group != last_group:
            x += gap * 3  # просвет между группами
        last_group = group
        if x + w > limit and x > 0:
            x, y, shelf = 0.0, y + shelf + gap, 0.0
        pos[i] = (x + w / 2, y + h / 2)
        x += w + gap
        shelf = max(shelf, h)
    xs = [pos[i][0] for i in pos]
    ys = [pos[i][1] for i in pos]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    return [(round(pos[i][0] - cx, 2), round(pos[i][1] - cy, 2)) for i in range(len(cuts))]


def _pack(sprites: list[Image.Image]) -> tuple[list[Image.Image], list[tuple[int, int, int, int, int]]]:
    """Полочная упаковка в страницы атласа ATLAS×ATLAS. Возвращает страницы и (page, x, y, w, h)."""
    order = sorted(range(len(sprites)), key=lambda i: -sprites[i].height)
    pages: list[Image.Image] = []
    rects = [None] * len(sprites)
    x = y = shelf = 0
    page = None
    for i in order:
        s = sprites[i]
        w, h = s.size
        if page is None or x + w > ATLAS:
            x, y, shelf = 0, y + shelf + 2, 0
        if page is None or y + h > ATLAS:
            page = Image.new("RGBA", (ATLAS, ATLAS), (0, 0, 0, 0))
            pages.append(page)
            x = y = shelf = 0
        page.paste(s, (x, y))
        rects[i] = (len(pages) - 1, x, y, w, h)
        x += w + 2
        shelf = max(shelf, h)
    return pages, rects


def cmd_build(slug: str) -> None:
    w, _ = load_watch(slug)
    case_mm = 40.0
    for bf in (ROOT / "content" / "brands").rglob("*.yaml"):
        data = yaml.safe_load(bf.read_text(encoding="utf-8"))
        for m in data.get("watches", []):
            if m["slug"] == slug:
                case_mm = float(m["case"]["diameter_mm"])
    cuts, warnings = [], []
    missing = []
    assembled = {}
    for job in jobs_for(slug):
        if not job.path.exists():
            missing.append(str(job.path.relative_to(ROOT)))
            continue
        img = Image.open(job.path)
        if job.kind == "assembled":
            assembled[job.plate] = img
            continue
        c, wr = cut_plate(job, img)
        cuts += c
        warnings += wr
    if missing:
        print("нет листов:\n  " + "\n  ".join(missing))
    if not cuts:
        sys.exit("нечего собирать")

    # Масштаб: каждая деталь приводится к своему реальному размеру (наибольшая сторона = mm).
    # копии одной детали (винты, звенья) упаковываются в атлас один раз
    uniq: dict[int, int] = {}
    packed = []
    for c in cuts:
        if id(c.sprite) in uniq:
            continue
        s = c.sprite
        # не растягивать сверх исходного разрешения: увеличивать будет GPU, а атлас не раздувается
        scale = min(1.0, c.item.mm * PPMM / max(s.size))
        uniq[id(c.sprite)] = len(packed)
        packed.append(s.resize((max(2, round(s.width * scale)), max(2, round(s.height * scale))), Image.LANCZOS) if scale < 1 else s)
    pages, packed_rects = _pack(packed)
    sprites = [packed[uniq[id(c.sprite)]] for c in cuts]
    rects = [packed_rects[uniq[id(c.sprite)]] for c in cuts]
    layout = _layout(cuts, case_mm)

    out = OUT / slug
    out.mkdir(parents=True, exist_ok=True)
    for f in out.glob("*.webp"):
        f.unlink()
    for n, page in enumerate(pages):
        page.save(out / f"atlas-{n}.webp", "WEBP", quality=86, method=6)
    extra = {}
    for name, img in assembled.items():
        # собранные часы тоже вырезаются с фона: самая крупная связная область листа
        import numpy as np

        _, groups, _ = _segment(img)
        ids, counts = np.unique(groups[groups > 0], return_counts=True)
        rgba = img.convert("RGBA")
        if len(ids):
            m = groups == ids[np.argmax(counts)]
            ys, xs = np.nonzero(m)
            box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
            alpha = Image.fromarray((m * 255).astype("uint8")).filter(ImageFilter.GaussianBlur(1.2))
            rgba.putalpha(alpha)
            rgba = rgba.crop(box)
        rgba.thumbnail((2048, 2048), Image.LANCZOS)
        key = name.removeprefix("assembled_")
        rgba.save(out / f"{name}.webp", "WEBP", quality=88, method=6)
        extra[key] = f"{name}.webp"
        # длина «от ушка до ушка» примерно 1,2 диаметра корпуса
        extra[f"{key}_mm"] = round(case_mm * 1.2, 1)

    parts = []
    for c, sp, rect, lay in zip(cuts, sprites, rects, layout):
        page, x, y, pw, ph = rect
        mm_per_px = c.item.mm / max(sp.size)  # наибольшая сторона детали = её реальный размер
        part = {
            "key": c.item.key, "name": c.item.name, "plate": c.job.plate,
            "w": round(sp.width * mm_per_px, 2), "h": round(sp.height * mm_per_px, 2), "z": c.item.z,
            "page": page, "uv": [x / ATLAS, y / ATLAS, pw / ATLAS, ph / ATLAS],
            "at": [round(v, 2) for v in lay["at"]], "ex": [round(v, 2) for v in lay["ex"]], "y": round(lay["y"], 2),
        }
        if lay.get("rot"):
            part["rot"] = lay["rot"]
        parts.append(part)
    import hashlib

    version = hashlib.sha1(b"".join(f.read_bytes() for f in sorted(out.glob("*.webp")))).hexdigest()[:10]
    # лотки под разную форму свободной части экрана: широкий, квадратный (телефон), высокий
    sizes = [(pp["w"], pp["h"]) for pp in parts]
    for name, aspect in TRAYS.items():
        for pp, (tx, tz) in zip(parts, _tray(cuts, sizes, aspect)):
            pp[name] = [tx, tz]
    manifest = {
        "slug": slug, "case_mm": case_mm, "version": version, "pages": [f"atlas-{n}.webp" for n in range(len(pages))],
        "assembled": extra, "generated": "Gemini 3 Pro Image по официальным фото модели", "parts": parts,
    }
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    size = sum(f.stat().st_size for f in out.glob("*"))
    print(f"{slug}: {len(parts)} деталей, {len(pages)} стр. атласа, {size / 1e6:.1f} МБ")
    for wr in warnings:
        print("  внимание:", wr)


def cmd_import(folder: Path) -> None:
    """Забрать картинки из папки на рабочем столе по именам файлов из страницы заданий."""
    if not folder.exists():
        sys.exit(f"Нет папки {folder}")
    files = {f.stem.lower(): f for f in folder.iterdir() if f.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp")}
    done, seen = 0, set()
    for slug in all_slugs():
        for job in jobs_for(slug):
            if job.id in seen:
                continue
            seen.add(job.id)
            src = files.get(Path(job.file_name).stem.lower())
            if not src:
                continue
            if job.path.exists() and job.path.stat().st_mtime >= src.stat().st_mtime:
                continue
            job.path.parent.mkdir(parents=True, exist_ok=True)
            Image.open(src).convert("RGB").save(job.path)
            done += 1
            print(f"  + {src.name} -> {job.path.relative_to(ROOT)}")
    unknown = sorted(set(files) - {Path(j.file_name).stem.lower() for s in all_slugs() for j in jobs_for(s)})
    print(f"импортировано: {done}")
    if unknown:
        print("файлы с незнакомыми именами (переименуйте по странице заданий):\n  " + "\n  ".join(unknown))


def cmd_page(slugs: list[str]) -> None:
    """Страница-помощник: промпты с кнопками копирования, референсы и имена файлов."""
    import html

    seen, cards, n, ready = set(), [], 0, 0
    for slug in slugs:
        for job in jobs_for(slug):
            if job.id in seen:
                continue
            seen.add(job.id)
            # уже сгенерированные листы (в том числе общие для семейства калибров) не показываем
            if job.path.exists():
                ready += 1
                continue
            n += 1
            aspect = "1:1" if job.kind == "assembled" else "16:9"
            refs = "".join(
                f'<a class="ref" href="/{html.escape(str(r.relative_to(ROOT / "frontend")))}" download><img src="/{html.escape(str(r.relative_to(ROOT / "frontend")))}" alt=""><span>Скачать референс</span></a>'
                for r in job.refs if r.exists()
            ) or '<p class="muted">Референс не нужен</p>'
            parts = "".join(f"<li>{html.escape(it.name)}{f' <b>×{c}</b>' if c > 1 else ''}</li>" for it, c in job.unique) or "<li>Часы целиком</li>"
            cards.append(f"""
<article class="job" id="job-{n}" data-file="{html.escape(job.file_name)}">
  <header><span class="num">{n:02d}</span><h2>{html.escape(slug if job.kind != 'movement' else job.id.split('/')[1])} · {html.escape(job.title)}</h2>
    <label class="done"><input type="checkbox"> готово</label></header>
  <div class="grid">
    <div>
      <p class="step">1. Настройки: Nano Banana Pro, <b>4K</b>, <b>{aspect}</b></p>
      <p class="step">2. Приложите референс</p>{refs}
      <p class="step">3. Сохраните как</p>
      <button class="copy file" data-copy="{html.escape(job.file_name)}">{html.escape(job.file_name)}</button>
      <p class="step">Детали на картинке ({len(job.unique)})</p><ol>{parts}</ol>
    </div>
    <div>
      <p class="label">Промпт <button class="copy" data-copy-from="p-{n}">Копировать промпт</button></p>
      <pre id="p-{n}">{html.escape(prompt_for(job))}</pre>
    </div>
  </div>
</article>""")
    page = f"""<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Задания для Nano Banana Pro | Horologium</title>
<style>
:root {{ --bg:#0b0c0e; --s:#14171b; --l:#262b31; --t:#e9ecef; --t2:#a9b0b8; --lume:#9fe9c4; }}
* {{ box-sizing:border-box }} body {{ margin:0; background:var(--bg); color:var(--t); font:15px/1.5 -apple-system,system-ui,sans-serif; }}
main {{ max-width:1180px; margin:0 auto; padding:32px 16px 80px; }}
h1 {{ font-size:32px; margin:0 0 8px }} .intro {{ background:var(--s); border:1px solid var(--l); border-radius:16px; padding:18px 22px; margin:18px 0 28px }}
.intro ol {{ margin:8px 0 0; padding-left:20px }} .intro code {{ color:var(--lume) }}
.job {{ border:1px solid var(--l); border-radius:16px; padding:18px; margin-bottom:18px; background:#0f1114 }}
.job.is-done {{ opacity:.45 }} .job header {{ display:flex; align-items:center; gap:12px }}
.num {{ font:600 13px/1 ui-monospace,monospace; color:var(--bg); background:var(--lume); border-radius:99px; padding:6px 9px }}
h2 {{ font-size:17px; margin:0; flex:1 }} .done {{ color:var(--t2); font-size:13px }}
.grid {{ display:grid; grid-template-columns:300px 1fr; gap:22px; margin-top:14px }}
@media (max-width:860px) {{ .grid {{ grid-template-columns:1fr }} }}
.label {{ color:var(--t2); font-size:13px; margin:12px 0 6px; display:flex; justify-content:space-between; align-items:center; gap:8px }}
.step {{ color:var(--t2); font-size:13px; margin:12px 0 6px }} .step b {{ color:var(--t) }}
.ref {{ display:flex; gap:10px; align-items:center; color:var(--lume); text-decoration:none; font-size:13px }}
.ref img {{ width:64px; height:80px; object-fit:cover; border-radius:8px; background:#000 }}
pre {{ white-space:pre-wrap; background:var(--s); border:1px solid var(--l); border-radius:12px; padding:14px; font:12.5px/1.55 ui-monospace,monospace; color:#cfd5db; max-height:420px; overflow:auto; margin:0 }}
.copy {{ background:var(--s); color:var(--t); border:1px solid var(--l); border-radius:99px; padding:6px 12px; font:13px/1 inherit; cursor:pointer }}
.copy:hover {{ border-color:var(--lume) }} .copy.ok {{ background:var(--lume); color:var(--bg) }}
.copy.file {{ font-family:ui-monospace,monospace; width:100%; text-align:left; border-radius:10px; overflow-wrap:anywhere }}
ol {{ margin:0; padding-left:20px; color:var(--t2); font-size:13px }} .muted {{ color:var(--t2); font-size:13px }}
</style></head><body><main>
<h1>Задания для Nano Banana Pro</h1>
<p class="muted">Модели: {html.escape(', '.join(slugs))}. Листов: {n}. Сгенерировано <code>scripts/teardown.py page</code>.</p>
<div class="intro"><b>Как делать</b><ol>
<li>Откройте <a href="https://aistudio.google.com/" target="_blank" rel="noopener" style="color:var(--lume)">Google AI Studio</a>, модель <b>Nano Banana Pro</b> (Gemini 3 Pro Image). В настройках: разрешение <b>4K</b>, соотношение сторон как указано у листа.</li>
<li>Для каждого листа: скачайте референс (если есть) и прикрепите его, нажмите «Копировать промпт» и вставьте.</li>
<li>Проверьте картинку: детали должны идти в том же порядке, что в списке «Детали на картинке» (по строкам, слева направо), каждая один раз. Если деталь пропущена, добавлена лишняя, детали налезают друг на друга, появились подписи или обрезанные края, сгенерируйте ещё раз.</li>
<li><b>Только 4K.</b> В 1K каждая деталь получается около 150 пикселей и на сайте выглядит мутной.</li>
<li>Скачайте картинку и сохраните в папку <code>Рабочий стол / Horologium-детали</code> под именем с кнопки «Сохраните как» (нажмите, имя скопируется).</li>
<li>Когда сделаете, напишите мне: я заберу картинки, вырежу детали, проверю подписи и соберу разборку.</li>
</ol></div>
{''.join(cards)}
</main>
<script>
document.addEventListener("click", async (e) => {{
  const b = e.target.closest(".copy"); if (!b) return;
  const text = b.dataset.copy ?? document.getElementById(b.dataset.copyFrom).textContent;
  await navigator.clipboard.writeText(text);
  const old = b.textContent; b.classList.add("ok"); b.textContent = "Скопировано";
  setTimeout(() => {{ b.classList.remove("ok"); b.textContent = old; }}, 1200);
}});
document.querySelectorAll(".job").forEach((job) => {{
  const box = job.querySelector(".done input"), key = "td:" + job.dataset.file;
  try {{ box.checked = localStorage.getItem(key) === "1"; }} catch {{}}
  job.classList.toggle("is-done", box.checked);
  box.addEventListener("change", () => {{ job.classList.toggle("is-done", box.checked); try {{ localStorage.setItem(key, box.checked ? "1" : "0"); }} catch {{}} }});
}});
</script></body></html>"""
    TASK_PAGE.parent.mkdir(parents=True, exist_ok=True)
    TASK_PAGE.write_text(page, encoding="utf-8")
    print(f"{TASK_PAGE.relative_to(ROOT)}: {n} листов (ещё {ready} уже готовы) → http://localhost:8765/assets/teardown-tasks/index.html")


def cmd_review(slug: str) -> None:
    """Каждый лист с рамками и подписями деталей: сразу видно, если порядок сбился."""
    from scipy import ndimage as ndi

    CACHE.mkdir(parents=True, exist_ok=True)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 30)
    except OSError:
        font = ImageFont.load_default()
    for job in jobs_for(slug):
        if job.kind == "assembled" or not job.path.exists():
            continue
        img = Image.open(job.path).convert("RGB")
        _, groups, _ = _segment(img)
        _, boxes, warnings = _assign(job, img, groups, ndi.find_objects(groups))
        draw = ImageDraw.Draw(img)
        # номера клеток заказанной сетки: по ним пишется правка в content/teardown/fixes.yaml
        cols, rows = job.grid
        cw, ch = img.size[0] / cols, img.size[1] / rows
        for c in range(cols * rows):
            x, y = (c % cols) * cw, (c // cols) * ch
            draw.rectangle([x, y, x + cw, y + ch], outline=(120, 120, 200), width=1)
            draw.text((x + 6, y + 4), f"#{c + 1}", fill=(90, 90, 190), font=font)
        for n, box in enumerate(boxes):
            if box is None:
                continue
            x0, y0, x1, y1 = box
            draw.rectangle([x0, y0, x1, y1], outline=(230, 40, 60), width=4)
            it, cnt = job.unique[n]
            draw.text((x0 + 4, y1 + 6), f"{n + 1}. {it.name}" + (f" ×{cnt}" if cnt > 1 else ""), fill=(15, 15, 15), font=font)
        img.thumbnail((2400, 2400))
        path = CACHE / f"{slug}-{job.plate}.png"
        img.save(path)
        print(path.relative_to(ROOT))
        for wr in warnings:
            print("  ", wr)


def main() -> int:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("tasks")
    im = sub.add_parser("import", help="забрать картинки из папки на рабочем столе")
    im.add_argument("--from", dest="folder", default=str(INBOX))
    pg = sub.add_parser("page", help="страница с промптами для ручной генерации")
    pg.add_argument("slugs", nargs="*")
    for name in ("plan", "build", "review"):
        sp = sub.add_parser(name)
        sp.add_argument("slug")
    g = sub.add_parser("generate")
    g.add_argument("slug")
    g.add_argument("--plate")
    g.add_argument("--dry-run", action="store_true")
    g.add_argument("--force", action="store_true")
    g.add_argument("--size", default="4K", choices=["1K", "2K", "4K"])
    args = ap.parse_args()
    if args.cmd == "tasks":
        cmd_tasks()
    elif args.cmd == "import":
        cmd_import(Path(args.folder).expanduser())
    elif args.cmd == "page":
        cmd_page(args.slugs or PAGE_ORDER + [s for s in all_slugs() if s not in PAGE_ORDER])
    elif args.cmd == "plan":
        cmd_plan(args.slug)
    elif args.cmd == "generate":
        cmd_generate(args.slug, args.plate, args.dry_run, args.force, args.size)
    elif args.cmd == "build":
        cmd_build(args.slug)
    else:
        cmd_review(args.slug)
    return 0


if __name__ == "__main__":
    sys.exit(main())
