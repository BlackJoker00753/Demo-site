"""Маски печати Submariner 124060 из официального фото Rolex (без рисования от руки).

    uv run --with opencv-python-headless python scripts/blender/sub124060_textures.py

Источник: teardown_src/3d/rolex-submariner/upright-c.png (media.rolex.com, 3840×5714, ≈46,3 px/мм).
С фото берётся только то, ГДЕ нанесена краска или платина: цвет, блеск и рельеф дают физические
материалы в Blender, поэтому блики и тени, запечённые в фото, на модель не переезжают.

Стрелки на фото закрывают часть надписей. Их силуэты известны по замерам (те же размеры идут на 3D-стрелки),
под ними маска очищается, а буквы восстанавливаются из того же фото: такие же буквы того же шрифта из
соседних слов, зеркальная половина симметричных букв (M, A, V, Y), «O» и «Y» в OYSTER собраны из «U» и «A»
того же шрифта. Ни одного символа из сторонних шрифтов.
"""

from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "teardown_src/3d/rolex-submariner/upright-c.png"
OUT = ROOT / "teardown_src/3d/rolex-submariner/tex"
CX, CY, PX_MM = 1919.2, 2847.0, 46.3
R_DIAL = 14.7                      # мм: квадрат текстуры циферблата 2*R_DIAL
N = int(round(2 * R_DIAL * PX_MM))  # 1361 px
C = N / 2                          # центр циферблата в кропе


def crop_dial(img):
    x0, y0 = int(round(CX - C)), int(round(CY - C))
    return img[y0:y0 + N, x0:x0 + N]


def polar(d_mm, ang_deg):
    """Точка на кропе по расстоянию от центра (мм) и углу (математический, 0 = 3 часа, против часовой)."""
    a = np.radians(ang_deg)
    return (C + d_mm * PX_MM * np.cos(a), C - d_mm * PX_MM * np.sin(a))


# ---------------------------------------------------------------- стрелки на фото (замеры)
HANDS = {
    "hour": {"angle": 145.4, "length": 7.95, "disc_at": 4.83, "disc_r": 1.47},
    "minute": {"angle": 26.45, "length": 12.48},
    "second": {"angle": -96.25, "length": 13.0, "dot_at": 7.30, "dot_r": 0.57, "tail": 4.41, "tail_r": 0.49},
}


def hands_mask(shape):
    m = np.zeros(shape, np.uint8)
    pt = lambda d, a: tuple(int(round(v)) for v in polar(d, a))
    h = HANDS["hour"]
    a = h["angle"]
    cv2.line(m, pt(0, a), pt(h["disc_at"], a), 255, 50)
    cv2.circle(m, pt(h["disc_at"], a), int((h["disc_r"] + 0.08) * PX_MM), 255, -1)
    # копьё от края круга до кончика
    base = h["disc_at"] + 0.9
    n = np.radians(a + 90)
    bx, by = polar(base, a)
    w = 1.0 * PX_MM
    cv2.fillPoly(m, [np.int32([pt(h["length"] + 0.12, a), (bx + w * np.cos(n), by - w * np.sin(n)),
                               (bx - w * np.cos(n), by + w * np.sin(n))])], 255)
    mm = HANDS["minute"]
    a = mm["angle"]
    n = np.radians(a + 90)
    poly = []
    for d, half in ((0, 0.62), (10.4, 0.8), (mm["length"] + 0.2, 0.0)):
        x, y = polar(d, a)
        poly.append((x + half * PX_MM * np.cos(n), y - half * PX_MM * np.sin(n)))
    for d, half in ((10.4, 0.8), (0, 0.62)):
        x, y = polar(d, a)
        poly.append((x - half * PX_MM * np.cos(n), y + half * PX_MM * np.sin(n)))
    cv2.fillPoly(m, [np.int32(poly)], 255)
    s = HANDS["second"]
    a = s["angle"]
    cv2.line(m, pt(-s["tail"], a), pt(s["length"], a), 255, 24)   # со светлой кромкой полировки
    cv2.circle(m, pt(s["dot_at"], a), int((s["dot_r"] + 0.2) * PX_MM), 255, -1)
    cv2.circle(m, pt(-s["tail"], a), int((s["tail_r"] + 0.16) * PX_MM), 255, -1)
    cv2.circle(m, (int(C), int(C)), int(1.3 * PX_MM), 255, -1)
    return cv2.dilate(m, np.ones((5, 5), np.uint8)) > 0


# ---------------------------------------------------------------- печать под стрелками
# Официальный снимок голого циферблата (raw-dial, тот же источник media.rolex.com) показывает надписи без стрелок.
# Он совмещается с основным фото по центрам меток (подобие: масштаб, поворот, сдвиг; ошибка ≈0,03 мм), и
# под стрелками берутся его пиксели. Ничего не дорисовывается.
RAW_DIAL = ROOT / "teardown_src/3d/rolex-submariner/raw-dial.png"


def _marker_blobs(L, C, S, rmin, rmax):
    B = (L > 150).astype(np.uint8)
    n, lab, st, ce = cv2.connectedComponentsWithStats(B, 8)
    out = {}
    for i in range(1, n):
        cx, cy = ce[i]
        r = np.hypot(cx - C[0], cy - C[1]) / S
        if rmin < r < rmax and st[i][4] > 0.6 * S * S:
            hr = round(((90 - np.degrees(np.arctan2(C[1] - cy, cx - C[0]))) % 360) / 30) % 12
            out[hr] = (cx, cy)
    return out


def raw_dial_print(dial_rgb, hand_mask):
    """Маска печати с голого циферблата в координатах кропа основного фото."""
    rd = np.array(Image.open(RAW_DIAL))
    Lr = cv2.cvtColor(rd[..., :3], cv2.COLOR_RGB2GRAY).astype(np.float32)
    ys, xs = np.nonzero(rd[..., 3] > 128)
    Cr = ((xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2)
    Sr = (xs.max() - xs.min()) / 2 / 13.9
    Lu = cv2.cvtColor(dial_rgb, cv2.COLOR_RGB2GRAY).astype(np.float32)
    bu = _marker_blobs(Lu, (C, C), PX_MM, 7.5, 12.8)
    br = _marker_blobs(Lr, Cr, Sr, 7.0, 13.5)
    hours = [h for h in bu if h in br and not hand_mask[int(bu[h][1]), int(bu[h][0])]]
    M, _ = cv2.estimateAffinePartial2D(np.float32([br[h] for h in hours]), np.float32([bu[h] for h in hours]), method=cv2.LMEDS)
    warped = np.clip(cv2.warpAffine(Lr, M, (N, N), flags=cv2.INTER_CUBIC, borderValue=0), 0, 255)   # без переполнения uint8
    return print_mask(np.dstack([warped.astype(np.uint8)] * 3)), M


# ---------------------------------------------------------------- вставка безеля
INS_R0, INS_R1 = 15.44, 19.03   # мм, кольцо вставки
POLAR_K = 2                      # 2 px на пиксель фото: ≈92,6 px/мм


def polar_strip(img, r0, r1, k=POLAR_K):
    """Развёртка кольца: X = угол от 12 часов по часовой (0..360), Y = радиус (r1 сверху, r0 снизу)."""
    W = int(2 * np.pi * (r0 + r1) / 2 * PX_MM * k)
    H = int((r1 - r0) * PX_MM * k)
    th = np.radians(90 - np.linspace(0, 360, W, endpoint=False))
    rr = np.linspace(r1, r0, H)
    X = (CX + np.outer(rr, np.cos(th)) * PX_MM).astype(np.float32)
    Y = (CY - np.outer(rr, np.sin(th)) * PX_MM).astype(np.float32)
    return cv2.remap(img, X, Y, cv2.INTER_CUBIC)


def insert_mask(img):
    """Платиновые цифры и деления. На фото глянцевая керамика местами отражает софтбокс и светлеет,
    поэтому знаки отделяются не по яркости, а по фактуре: платина зернистая (пескоструй), керамика гладкая."""
    L = cv2.cvtColor(polar_strip(img, INS_R0, INS_R1), cv2.COLOR_RGB2GRAY).astype(np.float32)
    mu, mu2 = cv2.blur(L, (5, 5)), cv2.blur(L * L, (5, 5))
    sd = np.sqrt(np.maximum(mu2 - mu * mu, 0))
    H, W = L.shape
    E = (sd > 5).astype(np.uint8)
    E[:7] = 0
    E[-7:] = 0
    E[:, E.sum(0) > 0.93 * (H - 14)] = 0                     # стыки секторов блика
    E = cv2.morphologyEx(E, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    free = (1 - E).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(free, 4)
    border = set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    grain = cv2.blur(sd, (3, 3))
    g = E.copy()
    for i in range(1, n):
        if i not in border and grain[lab == i].mean() > 1.0:   # зернистая область внутри контура = платина
            g[lab == i] = 1
    g = cv2.morphologyEx(g, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab, st, ce = cv2.connectedComponentsWithStats(g, 8)
    out = np.zeros_like(g)
    comps = []
    for i in range(1, n):
        x, y, w, h, a = st[i]
        if a < 150 or h < 25 or w <= 4 or w > 20 * h or w < 0.15 * h:   # обрывки линий бликов
            continue
        out[lab == i] = 1
        comps.append((x, y, w, h))
    # пятиминутные бары одинаковые: бар на 55 минутах лежит в блике, ставим копию чистого бара с 35 минут
    col = lambda minute: int(round(minute / 60 * W))
    bar = max((c for c in comps if abs(c[0] + c[2] / 2 - col(35)) < 60), key=lambda c: c[3])
    x, y, w, h = bar
    piece = out[y:y + h, x:x + w].copy()
    x55 = col(55) - w // 2
    out[y:y + h, x55 - 8:x55 + w + 8] = 0
    out[y:y + h, x55:x55 + w] = piece
    # треугольник на нуле сплошной (капсула люминофора сверху отдельной 3D-деталью); он делится краями полосы
    for lo, hi in ((0, col(0.62)), (col(59.38), W)):
        sub_ = out[:, lo:hi]
        pts = cv2.findNonZero(sub_)
        if pts is not None:
            cv2.fillConvexPoly(sub_, cv2.convexHull(pts), 1)
    return cv2.GaussianBlur(out.astype(np.float32), (0, 0), 0.8)


# ---------------------------------------------------------------- флажок (рехаут)
FL_R0, FL_R1 = 13.55, 14.2      # мм, видимая наклонная часть флажка с гравировкой


def flange_mask(img):
    """Гравировка флажка: корона на 12 часах и 12 слов ROLEX подряд (шаг слова 1000 px при k=3, остаток
    кольца занимает корона). Буквы мелкие и в отражениях, поэтому берётся мягкая маска локального контраста
    одного чёткого экземпляра (корона и первое слово у 12 часов) и раскладывается по кольцу."""
    L = cv2.cvtColor(polar_strip(img, FL_R0, FL_R1, k=3), cv2.COLOR_RGB2GRAY).astype(np.float32)
    d = np.abs(L - cv2.GaussianBlur(L, (0, 0), 25))
    H, W = d.shape
    crown_w, word = W - 12 * 1000, 1000
    out = np.zeros_like(d)
    out[:, :crown_w] = d[:, :crown_w]
    w0 = d[:, crown_w:crown_w + word]
    for i in range(12):
        out[:, crown_w + i * word:crown_w + (i + 1) * word] = w0
    out[:5] = 0
    out[-5:] = 0
    return np.clip((out - 8) / 40, 0, 1)


def print_mask(rgb):
    L = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY).astype(np.float32)
    return np.clip((L - 55) / (150 - 55), 0, 1)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    img = np.array(Image.open(SRC).convert("RGB"))
    dial = crop_dial(img)
    P = print_mask(dial)
    hm = hands_mask(P.shape)
    # под стрелками и около них (полированные кромки и тени) печать берётся с голого циферблата
    Pr, M = raw_dial_print(dial, hm)
    zone = cv2.dilate(hm.astype(np.uint8), np.ones((19, 19), np.uint8)).astype(np.float32)
    zone = cv2.GaussianBlur(zone, (0, 0), 3)
    Q = P * (1 - zone) + Pr * zone
    np.save(OUT / "_q.npy", Q)
    np.save(OUT / "_hm.npy", hm)
    Image.fromarray((Q * 255).astype(np.uint8)).save(OUT / "_dial_print_raw.png")
    print("маска без стрелок:", OUT / "_dial_print_raw.png", Q.shape)
    save_mask(Q, OUT / "dial_print.png")
    ins = insert_mask(img)
    Image.fromarray((ins * 255).astype(np.uint8)).save(OUT / "insert_platinum.png")
    print("вставка:", OUT / "insert_platinum.png", ins.shape)
    fl = flange_mask(img)
    Image.fromarray((fl * 255).astype(np.uint8)).save(OUT / "flange_engraving.png")
    print("флажок:", OUT / "flange_engraving.png", fl.shape)


def save_mask(Q, path, up=2):
    """Бледные остатки отсекаются, края остаются мягкими; увеличение ×2 для крупных планов."""
    Q = np.clip((Q - 0.3) / 0.4, 0, 1)
    Q = Q * Q * (3 - 2 * Q)
    big = cv2.resize(Q, None, fx=up, fy=up, interpolation=cv2.INTER_CUBIC)
    big = np.clip((big - 0.5) * 1.6 + 0.5, 0, 1)
    Image.fromarray((big * 255).astype(np.uint8)).save(path)
    print("сохранено", path, big.shape)


if __name__ == "__main__":
    main()
