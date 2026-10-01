// Разборка модели до детали (scripts/teardown.py → frontend/assets/teardown/<slug>/).
//
// Каждая деталь: твёрдое 3D-тело. Контур детали (из альфы изображения) выдавливается на её реальную
// толщину в миллиметрах с фасками; лицевая сторона несёт изображение и карту нормалей (рельеф
// гравировки, зубцов, полос), боковые стенки окрашены в цвет кромки. Свет: студийная HDRI-панорама
// для отражений и ключевой источник с настоящими тенями на полу; сапфировое стекло преломляет.
//
// По t от 0 до 1: часы собраны (детали стоят в порядке сборки), затем расходятся вдоль оси,
// камера наклоняется в трёхчетвертной ракурс, и детали группами ложатся на лоток часовщика.

import * as THREE from "three";
import { applyEnvironment } from "../watch3d/materials.js";

const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const rad = THREE.MathUtils.degToRad;
const Y = new THREE.Vector3(0, 1, 0);
const X = new THREE.Vector3(1, 0, 0);
// варианты раскладки лотка и их пропорции (scripts/teardown.py, TRAYS)
const TRAYS = { tray: 1.75, tray_sq: 1.1, tray_tall: 0.72 };
// середина собранных часов по высоте (мм): сборка центрируется вокруг нуля
const ASM_MID = 7;
const AX = 0.52; // доля ползунка на разборку по оси, остальное на лоток

// свойства поверхности по типу материала (MATERIAL в teardown.py)
const SURFACE = {
  metal: { metalness: 0.45, roughness: 0.3, normal: 0.35 },
  dial: { metalness: 0.08, roughness: 0.4, normal: 0.12, env: 1.0 },
  ceramic: { metalness: 0.05, roughness: 0.16, normal: 0.12, env: 1.4 },
  rubber: { metalness: 0.0, roughness: 0.85, normal: 0.15, env: 0.5 },
  leather: { metalness: 0.0, roughness: 0.75, normal: 0.4, env: 0.6 },
  jewel: { metalness: 0.0, roughness: 0.12, normal: 0.1, env: 1.6 },
};

/** Точка внутри многоугольника (плоский массив [x0, y0, …]). */
function inside(px, py, ring) {
  let hit = false;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const xi = ring[i], yi = ring[i + 1], xj = ring[j], yj = ring[j + 1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

const area = (ring) => {
  let s = 0;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) s += (ring[j] + ring[i]) * (ring[j + 1] - ring[i + 1]);
  return Math.abs(s / 2);
};

/** Контур из манифеста (доли спрайта) → фигуры three.js в мм с отверстиями по вложенности колец. */
function shapesOf(rings, w, h) {
  const mm = rings.map((r) => r.map((v, i) => (i % 2 ? (0.5 - v) * h : (v - 0.5) * w))).sort((a, b) => area(b) - area(a));
  const nodes = mm.map((ring) => ({ ring, parent: null, depth: 0 }));
  nodes.forEach((n, i) => {
    // родитель: самое маленькое из больших колец, внутри которого лежит точка этого кольца
    for (let k = i - 1; k >= 0; k--) {
      if (inside(n.ring[0], n.ring[1], nodes[k].ring) && (!n.parent || area(nodes[k].ring) < area(n.parent.ring))) n.parent = nodes[k];
    }
    n.depth = n.parent ? n.parent.depth + 1 : 0;
  });
  const toPts = (ring) => {
    const pts = [];
    for (let i = 0; i < ring.length; i += 2) pts.push(new THREE.Vector2(ring[i], ring[i + 1]));
    return pts;
  };
  const shapes = new Map();
  for (const n of nodes) {
    if (n.depth % 2 === 0) shapes.set(n, new THREE.Shape(toPts(n.ring)));
    else shapes.get(n.parent)?.holes.push(new THREE.Path(toPts(n.ring)));
  }
  return [...shapes.values()];
}

/** Координата в атласе для точки детали (мм, y к 12 часам): проекция изображения сверху. */
const uvOf = (p) => {
  const { w, h } = p;
  const [u0, v0, uw, vh] = p.uv;
  return (x, y) => new THREE.Vector2(u0 + (x / w + 0.5) * uw, 1 - (v0 + (0.5 - y / h) * vh));
};

// скруглённые фаски: полированные звенья, корпус и застёжка мягче ловят свет
const BEVEL = { bracelet_link: 0.45, bracelet_end: 0.45, clasp: 0.4, case: 0.4, caseback: 0.35 };

/**
 * Профили вращения круглых деталей: сечение (r, y) снизу вверх, против часовой, которое прокручивается
 * вокруг оси. R внешний радиус, ri радиус отверстия, d высота. Малые фаски у кромок ловят блик.
 */
const PROFILES = {
  // выпуклый сапфир: тонкий бортик и купол
  crystal: (R, ri, d) => {
    const pts = [[0.001, 0], [R - 0.1, 0], [R, 0.1], [R, d * 0.42], [R * 0.992, d * 0.55]];
    for (let k = 1; k <= 16; k++) {
      const x = R * 0.99 * (1 - k / 16);
      pts.push([Math.max(0.001, x), d * 0.55 + d * 0.45 * (1 - (x / (R * 0.99)) ** 2)]);
    }
    return pts;
  },
  // безель: скруглённый внешний край с насечкой и углубление-посадка, в которое ложится вставка
  bezel: (R, ri, d) => [[ri + 0.15, 0], [R - 0.3, 0], [R, 0.3], [R, d * 0.7], [R - 0.15, d * 0.92], [R - 0.45, d], [R - 0.75, d * 0.96],
    [R - 0.9, d * 0.55], [ri + 0.25, d * 0.55], [ri, d * 0.45], [ri, 0.15], [ri + 0.15, 0]],
  // керамическая вставка: слегка коническая, внутренняя кромка выше
  bezel_insert: (R, ri, d) => [[ri, 0], [R, 0], [R, d * 0.5], [R - 0.2, d * 0.62], [ri + 0.2, d], [ri, d * 0.9], [ri, 0]],
  // флажок (рехаут): коническое кольцо, наклонённое к центру, как стенка вокруг циферблата
  flange: (R, ri, d) => [[ri, 0], [R, 0], [R, d], [R - 0.25, d], [ri + 0.1, d * 0.18], [ri, 0]],
  // задняя крышка: ступень под резьбу и выпуклая середина
  caseback: (R, ri, d) => [[0.001, 0], [R - 0.3, 0], [R, 0.3], [R, d * 0.42], [R * 0.95, d * 0.5], [R * 0.9, d * 0.58], [R * 0.86, d * 0.72],
    [R * 0.7, d * 0.88], [R * 0.45, d * 0.97], [0.001, d]],
  // кольцо механизма: прямоугольное сечение со скруглёнными кромками
  movement_ring: (R, ri, d) => [[ri + 0.15, 0], [R - 0.15, 0], [R, 0.15], [R, d - 0.15], [R - 0.15, d], [ri + 0.15, d], [ri, d - 0.15], [ri, 0.15], [ri + 0.15, 0]],
};
PROFILES.caseback_display = PROFILES.caseback;

/** Радиус отверстия кольца (мм) по контуру; null, если отверстия нет. */
function holeRadius(shape, w, h) {
  const rings = shape.poly.map((r) => r.map((v, i) => (i % 2 ? (0.5 - v) * h : (v - 0.5) * w))).sort((a, b) => area(b) - area(a));
  const hole = rings[1];
  if (!hole || !inside(hole[0], hole[1], rings[0])) return null;
  let sum = 0;
  for (let i = 0; i < hole.length; i += 2) sum += Math.hypot(hole[i], hole[i + 1]);
  return sum / (hole.length / 2);
}

/**
 * Круглая деталь как тело вращения (или тор для кольцевой прокладки). null, если деталь не круглая
 * или для её ключа нет профиля: тогда она выдавливается по контуру.
 */
function turnedGeometry(shape, p, ctx = {}) {
  const { w, h, d, key } = p;
  if (Math.abs(w - h) / Math.max(w, h) > 0.08) return null;
  const R = Math.min(w, h) / 2;
  const riTex = holeRadius(shape, w, h);
  // флажок начинается у края циферблата, а не поверх меток: кольцо уже, текстура сжимается по радиусу
  const ri = key === "flange" && riTex && ctx.dialR ? Math.min(R - 0.8, Math.max(riTex, ctx.dialR - 0.25)) : riTex;
  let g;
  if (key === "gasket") {
    // О-кольцо: тор; прокладка без отверстия в контуре (прозрачная у стекла) тоже кольцо
    if (shape.poly.length > 2) return null; // несколько колец на одном изображении
    const inner = ri ?? R * 0.92;
    g = new THREE.TorusGeometry((R + inner) / 2, Math.max(0.25, Math.min(d / 2, (R - inner) / 2)), 16, 128);
    g.rotateX(Math.PI / 2);
  } else {
    const make = PROFILES[key];
    const needsHole = !["crystal", "caseback", "caseback_display"].includes(key);
    if (!make || (needsHole && !ri) || (ri && ri > R - 0.4)) return null;
    const pts = make(R, ri ?? 0, d).map(([r, y]) => new THREE.Vector2(r, y - d / 2));
    // точки на оси (r≈0) не сдвигаются при пересчёте радиуса выборки
    g = new THREE.LatheGeometry(pts, 160);
  }
  // изображение накладывается сверху. Радиус выборки не выходит на самый край изображения (там размытый
  // цвет фона): стенки берут насечку и полировку с полосы у края; у суженного флажка радиус пересчитывается
  const toUV = uvOf(p);
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  const rMax = R - 0.35, rMin = (riTex ?? 0) + 0.3;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    let r = Math.hypot(x, z);
    if (ri && riTex && ri !== riTex) r = riTex + ((r - ri) * (R - riTex)) / (R - ri);
    r = Math.min(rMax, riTex ? Math.max(rMin, r) : r);
    const k = r / (Math.hypot(x, z) || 1);
    const t = toUV(x * k, -z * k);
    uv[i * 2] = t.x;
    uv[i * 2 + 1] = t.y;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.clearGroups();
  g.addGroup(0, g.index ? g.index.count : pos.count, 0);
  return g;
}

/** Твёрдое тело детали: выдавливание контура на толщину d с фасками, лицевая сторона вверх (+Y). */
function solidGeometry(shape, p) {
  const { w, h, d } = p;
  const toUV = uvOf(p);
  const uvGen = {
    generateTopUV: (g, v, a, b, c) => [toUV(v[a * 3], v[a * 3 + 1]), toUV(v[b * 3], v[b * 3 + 1]), toUV(v[c * 3], v[c * 3 + 1])],
    generateSideWallUV: () => [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()],
  };
  const bevel = d > 0.35 ? Math.min(BEVEL[p.key] ?? 0.2, d * (BEVEL[p.key] ? 0.3 : 0.22)) : 0;
  const shapes = shapesOf(shape.poly, w, h);
  const g = new THREE.ExtrudeGeometry(shapes.length ? shapes : [new THREE.Shape().absarc(0, 0, Math.min(w, h) / 2, 0, Math.PI * 2)], {
    depth: Math.max(0.05, d - bevel * 2), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel,
    bevelSegments: bevel > 0.3 ? 4 : 2, curveSegments: 6, UVGenerator: uvGen,
  });
  g.translate(0, 0, -(d - bevel * 2) / 2);
  g.rotateX(-Math.PI / 2); // лицевая сторона вверх, верх изображения к 12 часам (−Z)
  return g;
}

export class Teardown {
  // ракурсы (полярный угол, азимут в градусах): собранные часы чуть под углом, чтобы была видна
  // толщина; разборка сбоку; лоток сверху с наклоном
  static POSE = { asm: [16, -8], axial: [56, -22], tray: [26, -6] };

  constructor(canvas, slug) {
    this.canvas = canvas;
    this.base = `/assets/teardown/${slug}`;
    this.t = -1;
    this.hover = -1;
    this.focusKey = null;
    this.listeners = new Set();
    this.look = { x: 0, y: 0, tx: 0, ty: 0 }; // параллакс за курсором
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    const mobile = Math.min(screen.width, screen.height) < 820;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap; // мягкость даёт shadow.radius
    renderer.setClearColor(0x000000, 0);
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(28, 1, 1, 5000);
    applyEnvironment(renderer, this.scene, () => this.render());
    // ключевой свет сверху слева с мягкими тенями и заполняющий снизу
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.castShadow = true;
    key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.03;
    key.shadow.radius = 4;
    this.key = key;
    // контровой свет сзади: на кромках и фасках появляется светлая линия, детали отделяются от фона
    const rim = new THREE.DirectionalLight(0xcfe0ff, 1.1);
    this.rim = rim;
    this.scene.add(key, key.target, rim, rim.target, new THREE.HemisphereLight(0xdfe6ee, 0x1a1c20, 0.35));
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
  }

  async load() {
    const m = await fetch(`${this.base}/manifest.json`, { cache: "no-cache" }).then((r) => r.json());
    this.manifest = m;
    const loader = new THREE.TextureLoader();
    const v = m.version ? `?v=${m.version}` : "";
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const load = (f, color) => loader.loadAsync(`${this.base}/${f}${v}`).then((tex) => {
      tex.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      tex.anisotropy = maxAniso;
      return tex;
    });
    const [pages, normals] = await Promise.all([
      Promise.all(m.pages.map((f) => load(f, true))),
      Promise.all((m.normals ?? []).map((f) => load(f, false).catch(() => null))),
    ]);

    const groups = [...new Set(m.parts.map((p) => p.plate))];
    this.parts = m.parts.map((p, i) => ({ ...p, i, trayDelay: (groups.indexOf(p.plate) / Math.max(1, groups.length - 1)) * 0.3 }));
    const geoCache = new Map();
    this.meshes = [];
    const dial = this.parts.find((p) => p.key === "dial");
    const ctx = { dialR: dial ? Math.min(dial.w, dial.h) / 2 : null };
    for (const p of this.parts) {
      const gk = `${p.shape}|${p.w}|${p.h}|${p.d}|${p.key}`;
      if (!geoCache.has(gk)) geoCache.set(gk, turnedGeometry(m.shapes[p.shape], p, ctx) ?? solidGeometry(m.shapes[p.shape], p));
      const shape = m.shapes[p.shape];
      let cap, side;
      if (p.mat === "glass") {
        // сапфир: прозрачное тело с преломлением; блики появляются под углом (френель), как у настоящего стекла
        cap = side = new THREE.MeshPhysicalMaterial({
          color: 0xffffff, metalness: 0, roughness: 0.02, transmission: 1, thickness: Math.max(0.6, p.d * 0.8), ior: 1.5,
          envMapIntensity: 0.55, specularIntensity: 0.6, clearcoat: 0.6, clearcoatRoughness: 0.03,
          attenuationColor: new THREE.Color(0xe6efff), attenuationDistance: 30,
        });
      } else {
        const s = SURFACE[p.mat] ?? SURFACE.metal;
        cap = new THREE.MeshStandardMaterial({
          map: pages[p.page], normalMap: normals[p.page] ?? null, normalScale: new THREE.Vector2(s.normal, s.normal),
          metalness: s.metalness, roughness: s.roughness, envMapIntensity: s.env ?? 1.6,
        });
        // боковые стенки полированнее лицевой стороны: на них скользят блики студии
        side = new THREE.MeshStandardMaterial({
          color: new THREE.Color(shape.edge ?? "#a0a4a8"), metalness: Math.min(1, s.metalness + 0.3), roughness: Math.max(0.12, s.roughness - 0.1),
          envMapIntensity: s.env ?? 1.8,
        });
      }
      const mesh = new THREE.Mesh(geoCache.get(gk), [cap, side]);
      mesh.castShadow = p.mat !== "glass";
      mesh.receiveShadow = true;
      mesh.userData.part = p;
      p.mesh = mesh;
      this.scene.add(mesh);
      this.meshes.push(mesh);
    }
    // порядок появления: снизу вверх по высоте в сборке
    const order = [...this.parts].sort((a, b) => a.ya - b.ya);
    order.forEach((p, n) => (p.introDelay = (n / Math.max(1, order.length - 1)) * 0.58));
    // до вступления сцена пустая: часы не показываются собранными, чтобы тут же исчезнуть
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.introPending = true;
      this.introT = 0;
      this.#introMaterials(true);
    }
    // пол: только тень, фон остаётся от страницы
    this.floor = Math.min(...this.parts.map((p) => p.y - p.d / 2), ...this.parts.map((p) => p.ya - ASM_MID)) - 8;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.ShadowMaterial({ opacity: 0.42 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = this.floor;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.resize();
    this.setT(0, true);
    return this;
  }

  resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.parts && this.t >= 0) this.setT(this.t, true);
    else this.render();
  }

  /**
   * t: 0 собраны, 1 разложены на лотке. Две фазы:
   *   0 … AX   часы расходятся вдоль своей оси, камера наклоняется;
   *   AX … 1   детали опускаются на лоток часовщика группами, в полёте слегка наклоняясь.
   */
  setT(t, force = false) {
    if (!this.parts || (!force && Math.abs(t - this.t) < 1e-4)) return;
    this.t = t;
    if (this.introPending && t >= 0.05) this.#endIntro();
    const a = clamp01(t / AX), b = clamp01((t - AX) / (1 - AX));
    const q = new THREE.Quaternion(), qt = new THREE.Quaternion();
    const layers = this.layers ??= [...new Set(this.parts.map((p) => p.z))].sort((x, y) => x - y);
    const mid = (layers.length - 1) / 2;
    const zRank = this.zRank ??= new Map(layers.map((z, i) => [z, Math.abs(i - mid) / Math.max(1, mid)]));
    const tk = this.#free().trayKey;
    // появление: детали опускаются сверху по порядку сборки (от крышки к стеклу)
    const intro = this.introT;
    for (const p of this.parts) {
      // фаза 1: крайние слои (стекло, крышка) уходят первыми
      const e1 = ease(clamp01((a - (1 - zRank.get(p.z)) * 0.35) / 0.65));
      const yAsm = p.ya + p.d / 2 - ASM_MID;
      let x = p.at[0] + (p.ex[0] - p.at[0]) * e1;
      let zz = p.at[1] + (p.ex[1] - p.at[1]) * e1;
      let y = yAsm + (p.y - yAsm) * e1;
      let rot = p.rot ?? 0;
      let tilt = 0;
      // фаза 2: на лоток, группами с небольшим сдвигом во времени
      const tray = p[tk] ?? p.tray;
      if (b > 0 && tray) {
        const e2 = ease(clamp01((b - (p.trayDelay ?? 0)) / 0.7));
        const fly = Math.sin(Math.PI * e2);
        x += (tray[0] - x) * e2;
        zz += (tray[1] - zz) * e2;
        y = y * (1 - e2) + (this.floor + p.d / 2 + 0.02) * e2 + fly * 16;
        rot = rot * (1 - e2);
        tilt = fly * 0.45 * ((p.i % 2) * 2 - 1); // в полёте деталь чуть наклоняется, как в пинцете
      }
      if (intro != null) {
        // деталь проявляется над своим местом и мягко садится; непрозрачной становится до касания
        const k = ease(clamp01((intro - p.introDelay) / 0.42));
        y += (1 - k) * 16;
        rot += (1 - k) * 12;
        p.mesh.visible = k > 0.002;
        for (const mat of new Set(p.mesh.material)) mat.opacity = mat.userData.base.opacity * Math.min(1, k * 1.7);
      }
      q.setFromAxisAngle(Y, -rad(rot));
      if (tilt) q.multiply(qt.setFromAxisAngle(X, tilt));
      p.mesh.position.set(x, y, zz);
      p.mesh.quaternion.copy(q);
    }
    // под стеклом на лотке ничего нет, а three.js при прозрачном холсте подставляет за преломление
    // белый фон: сапфир выглядел бы матовым белым диском. Пропускание гасится, и сквозь стекло
    // читается тёмный лоток, а блики остаются
    const gb = ease(b);
    for (const p of this.glass ??= this.parts.filter((x) => x.mat === "glass")) {
      p.mesh.material[0].color.setScalar(1 - 0.9 * gb);
    }
    this.#camera(a, b);
    this.render();
  }

  /** Точки [x, y, z, радиус] кадра: собранные часы (0), разборка по оси (1), лоток (2). */
  #bounds(state, tk = "tray") {
    if (state === 2) {
      const at = (p) => p[tk] ?? p.tray;
      return this.parts.map((p) => [at(p)[0], this.floor + p.d / 2, at(p)[1], Math.max(p.w, p.h) / 2]);
    }
    // кадр по корпусу и механизму: браслет длинный и делал бы часы мелкими, он уходит за край
    const core = this.parts.filter((p) => !["bracelet", "strap"].includes(p.plate));
    return (core.length ? core : this.parts).map((p) => {
      const yAsm = p.ya + p.d / 2 - ASM_MID;
      return [
        p.at[0] + (p.ex[0] - p.at[0]) * state,
        yAsm + (p.y - yAsm) * state,
        p.at[1] + (p.ex[1] - p.at[1]) * state,
        Math.max(p.w, p.h) / 2,
      ];
    });
  }

  /**
   * Центр и расстояние камеры, при которых все точки видны под заданным ракурсом.
   * Точки проецируются в плоскость камеры, кадр центрируется по их реальным границам.
   */
  #fitView(pts, polar, azim, tanW, tanV, pad) {
    const dir = new THREE.Vector3(Math.sin(polar) * Math.sin(azim), Math.cos(polar), Math.sin(polar) * Math.cos(azim));
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 0, -1), dir).normalize();
    const up = new THREE.Vector3().crossVectors(dir, right);
    const c = pts.reduce((acc, p) => acc.add(new THREE.Vector3(p[0], p[1], p[2])), new THREE.Vector3()).divideScalar(pts.length);
    const v = new THREE.Vector3();
    const proj = pts.map((p) => {
      v.set(p[0], p[1], p[2]).sub(c);
      return [v.dot(right), v.dot(up), v.dot(dir), p[3]];
    });
    const cx = (Math.min(...proj.map((q) => q[0] - q[3])) + Math.max(...proj.map((q) => q[0] + q[3]))) / 2;
    const cy = (Math.min(...proj.map((q) => q[1] - q[3])) + Math.max(...proj.map((q) => q[1] + q[3]))) / 2;
    const d = Math.max(...proj.map(([x, y, z, r]) => z + r + Math.max((Math.abs(x - cx) + r) / tanW, (Math.abs(y - cy) + r) / tanV) * pad));
    return { c: c.addScaledVector(right, cx).addScaledVector(up, cy), d };
  }

  /** Отступы под текст, вкладки и ползунок (px): кадр центрируется в оставшейся части холста. */
  setInset(left, top = 0, bottom = 0) {
    this.inset = left;
    this.insetTop = top;
    this.insetBottom = bottom;
    this.resize();
  }

  /** Свободная часть холста (без отступов под текст) и подходящий к ней лоток. */
  #free() {
    const W = this.canvas.clientWidth || 1, H = this.canvas.clientHeight || 1;
    const lim = (x, max) => Math.min(Math.max(0, x || 0), max);
    const inset = lim(this.inset, W * 0.45);
    const top = lim(this.insetTop, H * 0.4);
    const bottom = lim(this.insetBottom, H * 0.3);
    const freeW = W - inset, freeH = H - top - bottom;
    const k = Math.log(freeW / freeH);
    const trayKey = Object.entries(TRAYS).sort((x, y) => Math.abs(Math.log(x[1]) - k) - Math.abs(Math.log(y[1]) - k))[0][0];
    return { W, H, inset, top, bottom, freeW, freeH, trayKey };
  }

  #camera(a = 0, b = 0) {
    const { W, H, inset, top, bottom, freeW, freeH, trayKey } = this.#free();
    const tanH = Math.tan(rad(this.camera.fov / 2));
    const tanV = (tanH * freeH) / H, tanW = (tanH * freeW) / H;
    const P = Teardown.POSE;
    const key = `${W}x${H}:${inset}:${top}:${bottom}:${trayKey}`;
    if (this.fitKey !== key) {
      const pts = (this.pts ??= [this.#bounds(0), this.#bounds(1)]);
      this.fitKey = key;
      this.fit = [
        this.#fitView(pts[0], rad(P.asm[0]), rad(P.asm[1]), tanW, tanV, 1.16),
        this.#fitView(pts[1], rad(P.axial[0]), rad(P.axial[1]), tanW, tanV, 1.04),
        this.#fitView(this.#bounds(2, trayKey), rad(P.tray[0]), rad(P.tray[1]), tanW, tanV, 1.05),
      ];
    }
    const [A, B, C] = this.fit;
    const ea = ease(a), eb = ease(b);
    const pose = (i) => (P.asm[i] + (P.axial[i] - P.asm[i]) * ea) * (1 - eb) + P.tray[i] * eb;
    const polar = rad(pose(0) + this.look.y * 5);
    const azim = rad(pose(1) + this.look.x * 8);
    const target = A.c.clone().lerp(B.c, ea).lerp(C.c, eb);
    let r = A.d + (B.d - A.d) * ea;
    r += (C.d - r) * eb;
    this.camera.position.set(target.x + Math.sin(polar) * Math.sin(azim) * r, target.y + Math.cos(polar) * r, target.z + Math.sin(polar) * Math.cos(azim) * r);
    this.camera.up.set(0, 0, -1);
    this.camera.lookAt(target);
    // «сдвиг объектива»: центр сцены в середине свободной части, а не всего холста
    this.camera.setViewOffset(W, H, -inset / 2, -(top - bottom) / 2, W, H);
    // свет и тени следуют за кадром: тень покрывает то, что видно
    const span = Math.max(80, r * tanH * 2.4);
    this.key.position.set(target.x - span * 0.35, target.y + span * 1.2, target.z - span * 0.55);
    this.key.target.position.copy(target);
    this.rim.position.set(target.x + span * 0.6, target.y + span * 0.35, target.z + span * 0.9);
    this.rim.target.position.copy(target);
    const sc = this.key.shadow.camera;
    sc.left = sc.bottom = -span;
    sc.right = sc.top = span;
    sc.near = 1;
    sc.far = span * 4;
    sc.updateProjectionMatrix();
  }

  /** Подсветить детали с ключом key (остальные приглушить); null снимает подсветку. */
  highlight(key) {
    this.focusKey = key;
    for (const mesh of this.meshes) {
      const p = mesh.userData.part;
      const dim = !!key && p.key !== key;
      for (const mat of new Set(mesh.material)) {
        // исходные значения (у стекла своя прозрачность) запоминаются при первом вызове
        const base = (mat.userData.base ??= { opacity: mat.opacity, transparent: mat.transparent, depthWrite: mat.depthWrite });
        mat.transparent = dim || base.transparent;
        mat.opacity = dim ? Math.min(0.12, base.opacity) : base.opacity;
        mat.depthWrite = dim ? false : base.depthWrite;
        mat.needsUpdate = true;
      }
      mesh.castShadow = !dim && p.mat !== "glass";
    }
    this.render();
  }

  #setHover(i) {
    if (i === this.hover) return;
    for (const mesh of this.meshes) {
      const on = mesh.userData.part.i === i;
      for (const mat of new Set(mesh.material)) mat.emissive?.setScalar(on ? 0.12 : 0);
    }
    this.hover = i;
    this.render();
  }

  /** Деталь под курсором: первое пересечение луча с телом (стекло пропускается, если под ним есть деталь). */
  pick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hits = ray.intersectObjects(this.meshes, false);
    const parts = hits.map((h) => h.object.userData.part).filter((p) => !this.focusKey || p.key === this.focusKey);
    return parts.find((p) => p.mat !== "glass") ?? parts[0] ?? null;
  }

  /** Плавный параллакс за курсором: сцена чуть поворачивается, свет скользит по металлу. */
  #animateLook() {
    if (this.lookRaf) return;
    const step = () => {
      const L = this.look;
      L.x += (L.tx - L.x) * 0.08;
      L.y += (L.ty - L.y) * 0.08;
      this.#camera(clamp01(this.t / AX), clamp01((this.t - AX) / (1 - AX)));
      this.render();
      this.lookRaf = Math.abs(L.tx - L.x) + Math.abs(L.ty - L.y) > 0.002 ? requestAnimationFrame(step) : 0;
    };
    this.lookRaf = requestAnimationFrame(step);
  }

  /** Часы собираются на глазах, когда секция впервые попадает в кадр (без reduced motion). */
  #playIntro() {
    if (!this.introPending) return;
    this.introPending = false;
    const t0 = performance.now();
    const step = () => {
      this.introT = Math.max(0, (performance.now() - t0) / 1900);
      if (this.introT >= 1) return this.#endIntro();
      this.setT(this.t, true);
      this.introRaf = requestAnimationFrame(step);
    };
    this.introRaf = requestAnimationFrame(step);
  }

  #endIntro() {
    cancelAnimationFrame(this.introRaf);
    this.introPending = false;
    this.introT = null;
    this.#introMaterials(false);
    this.setT(this.t, true);
  }

  /** На время вступления материалы прозрачные (переключаются один раз, а не каждый кадр). */
  #introMaterials(on) {
    for (const mesh of this.meshes) {
      mesh.visible = !on;
      for (const mat of new Set(mesh.material)) {
        const base = (mat.userData.base ??= { opacity: mat.opacity, transparent: mat.transparent, depthWrite: mat.depthWrite });
        mat.transparent = on || base.transparent;
        mat.opacity = on ? 0 : base.opacity;
        mat.needsUpdate = true;
      }
    }
  }

  bind() {
    const c = this.canvas;
    // собрать часы при первом появлении секции, если ползунок в начале
    this.io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && e.intersectionRatio > 0.35 && this.t < 0.05) this.#playIntro();
    }, { threshold: [0, 0.35, 0.6] });
    this.io.observe(c);
    let raf = 0;
    c.addEventListener("pointermove", (e) => {
      if (e.pointerType === "mouse") {
        const r = c.getBoundingClientRect();
        this.look.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
        this.look.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
        this.#animateLook();
      }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const p = this.t > 0.2 ? this.pick(e.clientX, e.clientY) : null;
        this.#setHover(p ? p.i : -1);
        c.style.cursor = p ? "pointer" : "";
        this.listeners.forEach((fn) => fn({ type: "hover", part: p, x: e.clientX, y: e.clientY }));
      });
    });
    c.addEventListener("pointerleave", () => {
      this.look.tx = this.look.ty = 0;
      this.#animateLook();
      this.#setHover(-1);
      this.listeners.forEach((fn) => fn({ type: "hover", part: null }));
    });
    c.addEventListener("click", (e) => {
      const p = this.pick(e.clientX, e.clientY);
      // на тач-экране pointermove перед кликом нет: подсказку обновляем и здесь
      this.#setHover(p ? p.i : -1);
      this.listeners.forEach((fn) => fn({ type: "hover", part: p, x: e.clientX, y: e.clientY }));
      this.listeners.forEach((fn) => fn({ type: "pick", part: p }));
    });
    return this;
  }

  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  catalogue() {
    const seen = new Map();
    for (const p of [...this.parts].sort((a, b) => b.z - a.z)) {
      const id = `${p.key}|${p.name}`;
      if (!seen.has(id)) seen.set(id, { key: p.key, name: p.name, count: 0 });
      seen.get(id).count += 1;
    }
    return [...seen.values()];
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this.lookRaf);
    cancelAnimationFrame(this.introRaf);
    this.io?.disconnect();
    this.ro.disconnect();
    const seen = new Set();
    const free = (x) => {
      if (!x || seen.has(x)) return;
      seen.add(x);
      x.dispose();
    };
    this.scene.traverse((o) => {
      free(o.geometry);
      for (const mat of [].concat(o.material ?? [])) {
        free(mat.map);
        free(mat.normalMap);
        free(mat);
      }
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss(); // освободить контекст сразу, см. WatchStage.dispose
  }
}

export async function hasTeardown(slug) {
  try {
    const r = await fetch(`/assets/teardown/${slug}/manifest.json`, { method: "HEAD", cache: "no-store" });
    return r.ok;
  } catch {
    return false;
  }
}
