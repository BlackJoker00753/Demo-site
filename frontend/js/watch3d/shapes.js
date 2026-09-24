// 2D-контуры: корпуса, стрелки, шестерни. Единицы: миллиметры, 12 часов = +Y.

import * as THREE from "three";

const TAU = Math.PI * 2;

// ------------------------------------------------------------------ outlines

/** Суперэллипс |x/a|^n + |y/b|^n = 1: n=2 эллипс, n→∞ прямоугольник. */
function superellipse(a, b, n, segments = 96, bulge = 0) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * TAU;
    const c = Math.cos(t), s = Math.sin(t);
    let x = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
    const y = b * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
    // «бочка»: боковины выгнуты сильнее в середине
    if (bulge) x *= 1 + bulge * (1 - Math.pow(Math.abs(y / b), 2));
    pts.push(new THREE.Vector2(x, y));
  }
  return pts;
}

function roundedPolygon(sides, r, corner, rotation = 0) {
  const pts = [];
  const verts = [];
  for (let i = 0; i < sides; i++) {
    const a = rotation + (i / sides) * TAU;
    verts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  for (let i = 0; i < sides; i++) {
    const p = verts[i], prev = verts[(i - 1 + sides) % sides], next = verts[(i + 1) % sides];
    const d1 = prev.clone().sub(p).normalize().multiplyScalar(corner);
    const d2 = next.clone().sub(p).normalize().multiplyScalar(corner);
    const a = p.clone().add(d1), b = p.clone().add(d2);
    for (let k = 0; k <= 4; k++) {
      const t = k / 4;
      // квадратичная кривая Безье через вершину
      const x = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * p.x + t * t * b.x;
      const y = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * p.y + t * t * b.y;
      pts.push(new THREE.Vector2(x, y));
    }
  }
  return pts;
}

/**
 * Контур корпуса/безеля в плоскости XY.
 * @param shape round | octagon | porthole | cushion | tonneau | rect | square | tv
 * @param w полуширина, h полувысота
 */
export function outline(shape, w, h = w) {
  switch (shape) {
    case "octagon":
      return roundedPolygon(8, w / Math.cos(Math.PI / 8), w * 0.08, Math.PI / 8);
    case "porthole": {
      // «иллюминатор» Nautilus: скруглённый восьмиугольник, сплюснутый по вертикали
      return superellipse(w, h * 0.96, 3.2, 96);
    }
    case "cushion":
      return superellipse(w, h, 3.6, 96);
    case "tv":
      return superellipse(w, h, 4.5, 96);
    case "tonneau":
      return superellipse(w * 0.9, h, 3.2, 96, 0.12);
    case "rect":
    case "square":
      return superellipse(w, h, 9, 128);
    default:
      return superellipse(w, h, 2, 128);
  }
}

export function shapeFromPoints(pts, holes = []) {
  const s = new THREE.Shape(pts);
  for (const hole of holes) s.holes.push(new THREE.Path(hole));
  return s;
}

export function circlePoints(r, segments = 96, cx = 0, cy = 0) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * TAU;
    pts.push(new THREE.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  return pts;
}

// ------------------------------------------------------------------ hands

/**
 * Форма стрелки. Стрелка смотрит вверх (+Y) от оси (0,0).
 * Возвращает { shape, lume } где lume (опционально) — вставка люминофора.
 */
export function handShape(style, length, width, kind = "hour") {
  const w = width, L = length;
  const s = new THREE.Shape();
  let lume = null;
  const tail = kind === "second" ? L * 0.22 : L * 0.12;

  const lumeRect = (y0, y1, wi) => {
    const p = new THREE.Shape();
    p.moveTo(-wi / 2, y0); p.lineTo(wi / 2, y0); p.lineTo(wi / 2, y1); p.lineTo(-wi / 2, y1); p.closePath();
    return p;
  };

  switch (style) {
    case "mercedes": {
      if (kind === "hour") {
        // стержень + кольцо с тремя секторами («звезда Мерседес») + наконечник
        const cy = L * 0.7, r = w * 1.35;
        s.moveTo(-w * 0.35, -tail);
        s.lineTo(w * 0.35, -tail);
        s.lineTo(w * 0.35, cy - r);
        s.absarc(0, cy, r, -Math.PI / 2 + 0.25, Math.PI * 1.5 - 0.25, false);
        s.lineTo(-w * 0.35, cy - r);
        s.closePath();
        // отдельный треугольный наконечник над кольцом
        const tip = new THREE.Shape();
        tip.moveTo(-w * 0.4, cy + r * 0.9);
        tip.lineTo(w * 0.4, cy + r * 0.9);
        tip.lineTo(0, L);
        tip.closePath();
        const holes = [0, 1, 2].map((k) => {
          const a0 = Math.PI / 2 + k * (TAU / 3) + 0.22, a1 = a0 + TAU / 3 - 0.44;
          const p = new THREE.Path();
          p.moveTo(0, cy);
          p.absarc(0, cy, r * 0.78, a0, a1, false);
          p.closePath();
          return p;
        });
        s.holes.push(...holes);
        return { shape: s, extra: [tip], lume: null, lumeCircle: { y: cy, r: r * 0.78 } };
      }
      // минутная у Rolex — прямая «меч-палка»
      style = "baton";
      break;
    }
    default:
      break;
  }

  switch (style) {
    case "dauphine":
    case "alpha":
    case "lance": {
      const mid = style === "alpha" ? L * 0.25 : L * 0.08;
      const mw = style === "dauphine" ? w * 0.9 : w * 0.75;
      s.moveTo(0, -tail);
      s.lineTo(mw * 0.35, 0);
      s.lineTo(mw, mid);
      s.lineTo(0, L);
      s.lineTo(-mw, mid);
      s.lineTo(-mw * 0.35, 0);
      s.closePath();
      if (style !== "dauphine") lume = lumeRect(mid, L * 0.8, mw * 0.5);
      break;
    }
    case "leaf":
    case "feuille": {
      s.moveTo(0, -tail * 0.5);
      s.bezierCurveTo(w * 1.1, L * 0.2, w * 0.9, L * 0.7, 0, L);
      s.bezierCurveTo(-w * 0.9, L * 0.7, -w * 1.1, L * 0.2, 0, -tail * 0.5);
      break;
    }
    case "sword":
    case "plongeur": {
      const bw = style === "plongeur" && kind === "minute" ? w * 1.3 : w * 0.7;
      s.moveTo(-w * 0.25, -tail);
      s.lineTo(w * 0.25, -tail);
      s.lineTo(bw, L * 0.18);
      s.lineTo(bw * 0.85, L * 0.86);
      s.lineTo(0, L);
      s.lineTo(-bw * 0.85, L * 0.86);
      s.lineTo(-bw, L * 0.18);
      s.closePath();
      lume = lumeRect(L * 0.24, L * 0.84, bw * 0.9);
      break;
    }
    case "arrow": {
      const hw = w * 0.35;
      s.moveTo(-hw, -tail);
      s.lineTo(hw, -tail);
      s.lineTo(hw, L * 0.68);
      s.lineTo(w * 1.2, L * 0.68);
      s.lineTo(0, L);
      s.lineTo(-w * 1.2, L * 0.68);
      s.lineTo(-hw, L * 0.68);
      s.closePath();
      lume = lumeRect(L * 0.2, L * 0.66, hw * 1.2);
      break;
    }
    case "snowflake": {
      const hw = w * 0.35;
      s.moveTo(-hw, -tail);
      s.lineTo(hw, -tail);
      s.lineTo(hw, L * 0.62);
      s.lineTo(w * 1.05, L * 0.62);
      s.lineTo(w * 1.05, L * 0.84);
      s.lineTo(0, L);
      s.lineTo(-w * 1.05, L * 0.84);
      s.lineTo(-w * 1.05, L * 0.62);
      s.lineTo(-hw, L * 0.62);
      s.closePath();
      lume = lumeRect(L * 0.65, L * 0.83, w * 1.6);
      break;
    }
    case "breguet": {
      const hw = w * 0.22, cy = L * 0.72, r = w * 0.95;
      s.moveTo(-hw, -tail);
      s.lineTo(hw, -tail);
      s.lineTo(hw, cy - r);
      s.absarc(0, cy, r, -Math.PI / 2 + 0.2, Math.PI / 2 - 0.12, false);
      s.lineTo(w * 0.12, L);
      s.lineTo(-w * 0.12, L);
      s.absarc(0, cy, r, Math.PI / 2 + 0.12, Math.PI * 1.5 - 0.2, false);
      s.lineTo(-hw, cy - r);
      s.closePath();
      const hole = new THREE.Path();
      hole.absarc(0, cy, r * 0.62, 0, TAU, false);
      s.holes.push(hole);
      break;
    }
    case "syringe": {
      const hw = w * 0.3;
      s.moveTo(-hw, -tail);
      s.lineTo(hw, -tail);
      s.lineTo(hw, L * 0.55);
      s.lineTo(w * 0.55, L * 0.58);
      s.lineTo(w * 0.55, L * 0.8);
      s.lineTo(w * 0.12, L * 0.82);
      s.lineTo(0, L);
      s.lineTo(-w * 0.12, L * 0.82);
      s.lineTo(-w * 0.55, L * 0.8);
      s.lineTo(-w * 0.55, L * 0.58);
      s.lineTo(-hw, L * 0.55);
      s.closePath();
      lume = lumeRect(L * 0.6, L * 0.78, w * 0.8);
      break;
    }
    case "cathedral": {
      const hw = w * 0.3;
      s.moveTo(-hw, -tail);
      s.lineTo(hw, -tail);
      s.lineTo(w, L * 0.35);
      s.lineTo(w * 0.8, L * 0.7);
      s.lineTo(0, L);
      s.lineTo(-w * 0.8, L * 0.7);
      s.lineTo(-w, L * 0.35);
      s.closePath();
      const hole = new THREE.Path();
      hole.moveTo(0, L * 0.4); hole.lineTo(w * 0.5, L * 0.55); hole.lineTo(0, L * 0.75); hole.lineTo(-w * 0.5, L * 0.55); hole.closePath();
      s.holes.push(hole);
      break;
    }
    case "pencil": {
      const hw = w * 0.55;
      s.moveTo(-hw, -tail);
      s.lineTo(hw, -tail);
      s.lineTo(hw, L * 0.86);
      s.lineTo(0, L);
      s.lineTo(-hw, L * 0.86);
      s.closePath();
      lume = lumeRect(L * 0.22, L * 0.84, hw * 1.2);
      break;
    }
    case "skeleton": {
      const hw = w * 0.7;
      s.moveTo(-hw, -tail); s.lineTo(hw, -tail); s.lineTo(hw, L * 0.88); s.lineTo(0, L); s.lineTo(-hw, L * 0.88); s.closePath();
      const hole = new THREE.Path();
      hole.moveTo(-hw * 0.5, L * 0.15); hole.lineTo(hw * 0.5, L * 0.15); hole.lineTo(hw * 0.5, L * 0.84); hole.lineTo(-hw * 0.5, L * 0.84); hole.closePath();
      s.holes.push(hole);
      break;
    }
    default: {
      // baton
      const hw = kind === "second" ? w * 0.12 : w * 0.45;
      s.moveTo(-hw, -tail);
      s.lineTo(hw, -tail);
      s.lineTo(hw, L * 0.94);
      s.lineTo(0, L);
      s.lineTo(-hw, L * 0.94);
      s.closePath();
      if (kind !== "second") lume = lumeRect(L * 0.25, L * 0.9, hw * 1.25);
    }
  }
  return { shape: s, lume };
}

/** Секундная стрелка: игла с противовесом и «леденцом» люминофора. */
export function secondsShape(length, width, style = "lollipop") {
  const s = new THREE.Shape();
  const w = width * 0.12, tail = length * 0.24;
  s.moveTo(-w * 2.2, -tail);
  s.lineTo(w * 2.2, -tail);
  s.lineTo(w * 1.2, -tail * 0.3);
  s.lineTo(w, length);
  s.lineTo(-w, length);
  s.lineTo(-w * 1.2, -tail * 0.3);
  s.closePath();
  const disc = new THREE.Shape();
  if (style === "lollipop") disc.absarc(0, length * 0.72, width * 0.55, 0, TAU, false);
  else if (style === "arrow") {
    disc.moveTo(-width * 0.55, length * 0.78);
    disc.lineTo(width * 0.55, length * 0.78);
    disc.lineTo(0, length * 0.95);
    disc.closePath();
  } else return { shape: s, extra: [] };
  return { shape: s, extra: [disc] };
}

// ------------------------------------------------------------------ gears

/** Шестерня с зубьями и спицами. */
export function gearShape(radius, teeth = 40, { spokes = 4, hub = 0.18, rim = 0.12, toothDepth = null } = {}) {
  const s = new THREE.Shape();
  const td = toothDepth ?? Math.min(radius * 0.12, (TAU * radius) / teeth * 0.45);
  const n = teeth * 4;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU;
    const phase = i % 4;
    const r = phase === 0 || phase === 3 ? radius - td : radius;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i === 0 ? s.moveTo(x, y) : s.lineTo(x, y);
  }
  if (spokes > 0 && radius > 0.8) {
    const inner = radius - td - radius * rim;
    const hubR = radius * hub;
    for (let k = 0; k < spokes; k++) {
      const a0 = (k / spokes) * TAU + 0.28, a1 = ((k + 1) / spokes) * TAU - 0.28;
      const hole = new THREE.Path();
      hole.absarc(0, 0, inner, a0, a1, false);
      hole.lineTo(Math.cos(a1 - 0.05) * hubR * 1.4, Math.sin(a1 - 0.05) * hubR * 1.4);
      hole.lineTo(Math.cos(a0 + 0.05) * hubR * 1.4, Math.sin(a0 + 0.05) * hubR * 1.4);
      hole.closePath();
      s.holes.push(hole);
    }
  }
  return s;
}

/** Храповое колесо барабана: зубья-пилы. */
export function ratchetShape(radius, teeth = 36) {
  const s = new THREE.Shape();
  const td = radius * 0.08;
  for (let i = 0; i <= teeth; i++) {
    const a = (i / teeth) * TAU;
    const a2 = ((i + 0.85) / teeth) * TAU;
    const p1 = [Math.cos(a) * (radius - td), Math.sin(a) * (radius - td)];
    const p2 = [Math.cos(a2) * radius, Math.sin(a2) * radius];
    i === 0 ? s.moveTo(...p1) : s.lineTo(...p1);
    if (i < teeth) s.lineTo(...p2);
  }
  return s;
}

/** Мост механизма: «клякса» по нескольким опорным точкам (выпуклая оболочка со скруглениями). */
export function bridgeShape(points, width) {
  const s = new THREE.Shape();
  const hull = convexHull(points);
  const n = hull.length;
  for (let i = 0; i < n; i++) {
    const p = hull[i], next = hull[(i + 1) % n];
    const dir = new THREE.Vector2().subVectors(next, p).normalize();
    const normal = new THREE.Vector2(dir.y, -dir.x).multiplyScalar(width);
    const a = p.clone().add(normal), b = next.clone().add(normal);
    if (i === 0) s.moveTo(a.x, a.y);
    else s.lineTo(a.x, a.y);
    s.lineTo(b.x, b.y);
    // скругление вокруг следующей вершины
    const nn = hull[(i + 2) % n];
    const dir2 = new THREE.Vector2().subVectors(nn, next).normalize();
    const normal2 = new THREE.Vector2(dir2.y, -dir2.x).multiplyScalar(width);
    const a0 = Math.atan2(normal.y, normal.x), a1 = Math.atan2(normal2.y, normal2.x);
    let da = a1 - a0;
    while (da < 0) da += TAU;
    const steps = 6;
    for (let k = 1; k <= steps; k++) {
      const ang = a0 + (da * k) / steps;
      s.lineTo(next.x + Math.cos(ang) * width, next.y + Math.sin(ang) * width);
    }
  }
  s.closePath();
  return s;
}

function convexHull(points) {
  const pts = points.map((p) => new THREE.Vector2(p[0], p[1])).sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length < 3) return pts;
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (const p of [...pts].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  // против часовой стрелки
  return lower.concat(upper);
}
