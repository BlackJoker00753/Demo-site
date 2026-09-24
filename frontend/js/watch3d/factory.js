// Фабрика процедурных 3D-часов.
//
//   const model = buildWatch(render, { diameter, thickness, movementType, frequency, logo, caption, detail })
//   scene.add(model.root); model.update(); model.setExplode(0..1)
//
// Модель собрана из именованных деталей (model.parts), у каждой есть смещение
// для режима разборки. Единицы: миллиметры. Циферблат смотрит в +Z, 12 часов = +Y.

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import * as M from "./materials.js";
import { explodeFor } from "./explode-map.js";
import { hexToRgb, paintBezelInsert, paintDial, luminance } from "./textures.js";
import { circlePoints, handShape, outline, secondsShape, shapeFromPoints } from "./shapes.js";
import { buildMovement } from "./movement.js";
import { buildStrap } from "./strap.js";

const TAU = Math.PI * 2;

// ------------------------------------------------------------------ helpers

/** Тело вращения вокруг оси Z по профилю [[r, z], ...]. */
export function lathe(profile, segments = 128) {
  const g = new THREE.LatheGeometry(profile.map(([r, z]) => new THREE.Vector2(r, z)), segments);
  g.rotateX(Math.PI / 2);
  return g;
}

/**
 * Кольцевая поверхность с модуляцией радиуса по углу (рифление, насечка).
 * profile(t) → [r, z], t ∈ [0,1]; mod(theta, t) → dr.
 */
export function ringSurface(profile, mod, { segments = 360, rows = 10 } = {}) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= segments; i++) {
    const th = (i / segments) * TAU;
    for (let j = 0; j <= rows; j++) {
      const t = j / rows;
      const [r0, z] = profile(t);
      const r = r0 + (mod ? mod(th, t) : 0);
      pos.push(Math.cos(th) * r, Math.sin(th) * r, z);
      uv.push(i / segments, t);
    }
  }
  const row = rows + 1;
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < rows; j++) {
      const a = i * row + j, b = (i + 1) * row + j;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function extrude(shape, depth, bevel = 0, segments = 3, curveSegments = 48) {
  return new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: segments, curveSegments,
  });
}

/** Перестановка осей: форма в плоскости (Y,Z), выдавливание вдоль X. */
const YZ_TO_WORLD = new THREE.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1);

function planarUV(geometry, halfW, halfH) {
  const p = geometry.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = p.getX(i) / (2 * halfW) + 0.5;
    uv[i * 2 + 1] = p.getY(i) / (2 * halfH) + 0.5;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geometry;
}

const mesh = (geometry, material, props = {}) => Object.assign(new THREE.Mesh(geometry, material), props);

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// ------------------------------------------------------------------ spec defaults

function withDefaults(render = {}) {
  const r = structuredClone(render);
  r.case = { shape: "round", material: "steel", finish: "mixed", lugs: "standard", crown_guard: false, pushers: 0, crown_side: "right", display_back: false, aspect: 1, ...(r.case ?? {}) };
  r.bezel = { type: "smooth", material: "metal", ...(r.bezel ?? {}) };
  r.dial = { color: "#16181c", finish: "sunburst", indices: "baton", index_color: "#e9ecef", text_color: "#e9ecef", lume: true, lume_color: "#dfeee4", track: "minutes", ...(r.dial ?? {}) };
  r.hands = { style: "baton", color: "#e9ecef", lume: true, seconds: "center", ...(r.hands ?? {}) };
  r.strap = { type: "leather", ...(r.strap ?? {}) };
  r.subdials ??= [];
  r.date ??= "none";
  r.moonphase ??= "none";
  r.crystal ??= "sapphire";
  return r;
}

// ------------------------------------------------------------------ layout

function computeLayout(spec, D, T, movementType) {
  const shape = spec.case.shape;
  const rectLike = ["rect", "square", "tonneau", "tv"].includes(shape);
  const R = D / 2;
  const aspect = rectLike ? Math.max(spec.case.aspect || 1.2, 1) : shape === "porthole" ? 0.96 : 1;
  const w = R, h = R * aspect;
  const toolBezel = ["dive", "gmt", "tachymeter", "countdown", "compass", "slide_rule"].includes(spec.bezel.type);
  const thinBezel = ["none", "smooth", "coin"].includes(spec.bezel.type);
  const dialR = R * (toolBezel ? 0.72 : spec.bezel.type === "octagon" || spec.bezel.type === "screws" ? 0.76 : thinBezel ? 0.86 : 0.8);
  const smart = movementType === "smart" || spec.dial.finish === "screen";
  const t = Math.max(T, 6);
  const L = {
    shape, rectLike, smart, R, D, T: t, w, h, aspect,
    dialR,
    dialW: rectLike ? w * (smart ? 0.86 : 0.74) : dialR,
    dialH: rectLike ? h * (smart ? 0.88 : 0.76) : dialR,
    crystalR: dialR + R * 0.045,
    zB0: -t * 0.5,
    zB1: -t * 0.5 + t * 0.14,
    zM0: -t * 0.5 + t * 0.12,
    zM1: t * 0.2,
    zDial: t * 0.2 - t * 0.2,
    zTop: 0,
    movR: Math.min(R * 0.74, 16),
    strapW: spec.case.lug_width ?? Math.round(D * (rectLike ? 0.6 : 0.5)),
    lugLen: R * (rectLike ? 0.05 : shape === "cushion" ? 0.12 : 0.19),
    lugW: Math.max(2.2, D * 0.075),
  };
  L.zDial = L.zM1 - t * 0.14;
  L.bezelH = toolBezel ? t * 0.14 : spec.bezel.type === "none" ? 0 : t * 0.1;
  L.zTop = L.zM1 + L.bezelH;
  L.zCrystal0 = L.zTop - 0.9;
  L.zCrystal1 = L.zTop + (spec.crystal === "domed" || spec.crystal === "hesalite" ? 1.2 : spec.crystal === "box" ? 1.6 : -0.08);
  L.movZ1 = L.zDial - 0.6;
  L.movZ0 = L.zB1 + 0.2;
  return L;
}

// ------------------------------------------------------------------ model

export class WatchModel {
  constructor({ spec, layout, movementType, frequency }) {
    this.spec = spec;
    this.L = layout;
    this.movementType = movementType;
    this.frequency = frequency || (movementType === "manual" || movementType === "automatic" ? 28800 : 0);
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.parts = [];
    this.hands = {};
    this.moving = { wheels: [], balance: null, rotor: null, glide: null };
    this.explodeT = 0;
    this.disposables = new Set();
  }

  /** Регистрирует деталь. explode: смещение [x,y,z] в мм в полностью разобранном виде. */
  addPart(key, object, { explode = [0, 0, 0], order = 0, pickable = true } = {}) {
    object.traverse((o) => {
      if (o.isMesh) {
        o.userData.part = key;
        o.castShadow = false;
        if (!pickable) o.raycast = () => {};
        this.disposables.add(o.geometry);
      }
    });
    this.body.add(object);
    const part = { key, object, base: object.position.clone(), explode: new THREE.Vector3(...explode), order };
    this.parts.push(part);
    return part;
  }

  setExplode(t) {
    this.explodeT = t;
    const maxOrder = Math.max(1, ...this.parts.map((p) => p.order));
    for (const p of this.parts) {
      // внешние детали (стекло, безель) снимаются первыми, корпус остаётся на месте
      const delay = ((maxOrder - p.order) / maxOrder) * 0.35;
      const k = easeInOut(THREE.MathUtils.clamp((t - delay) / 0.65, 0, 1));
      p.object.position.copy(p.base).addScaledVector(p.explode, k);
    }
  }

  /** Анимация: стрелки показывают текущее время, баланс колеблется с реальной частотой. */
  update(now = new Date(), elapsed = performance.now() / 1000) {
    const ms = now.getMilliseconds() / 1000;
    let sec = now.getSeconds() + ms;
    const type = this.movementType;
    if (type === "quartz" || type === "solar" || type === "kinetic" || type === "smart") sec = Math.floor(sec);
    else if (type !== "spring_drive") {
      const steps = Math.max(1, (this.frequency || 28800) / 3600);
      sec = Math.floor(sec * steps) / steps;
    }
    const min = now.getMinutes() + sec / 60;
    const hr = (now.getHours() % 12) + min / 60;
    const { hour, minute, second, gmt, small } = this.hands;
    if (hour) hour.rotation.z = -(hr / 12) * TAU;
    if (minute) minute.rotation.z = -(min / 60) * TAU;
    if (second) second.rotation.z = -(sec / 60) * TAU;
    if (small) small.rotation.z = -(sec / 60) * TAU;
    if (gmt) gmt.rotation.z = -(((now.getHours() + min / 60) / 24) * TAU);

    const mv = this.moving;
    if (mv.balance) {
      const f = (this.frequency || 28800) / 7200;
      mv.balance.rotation.z = Math.sin(elapsed * TAU * f) * 1.9;
    }
    if (mv.glide) mv.glide.rotation.z = -elapsed * 1.6;
    for (const w of mv.wheels) w.object.rotation.z = w.phase + elapsed * w.speed;
    if (mv.rotor) mv.rotor.rotation.z = Math.sin(elapsed * 0.35) * 1.4 + Math.sin(elapsed * 0.13) * 0.6;
  }

  pickables() {
    const out = [];
    this.body.traverse((o) => o.isMesh && o.userData.part && out.push(o));
    return out;
  }

  dispose() {
    this.disposables.forEach((g) => g.dispose?.());
    this.root.traverse((o) => {
      if (o.isMesh && o.material?.userData?.owned) {
        o.material.map?.dispose();
        o.material.dispose();
      }
    });
  }
}

// ------------------------------------------------------------------ case

function buildCase(model, spec, L, detail) {
  const seg = detail === "hero" ? 160 : 96;
  const mat = spec.case.material;
  const polished = M.metal(mat, "polished");
  const brushed = M.metal(mat, spec.case.finish === "polished" ? "polished" : "brushed");
  const accent = M.metal(M.accentMetalName(mat), "polished");
  const R = L.R;
  const group = new THREE.Group();

  if (!L.rectLike && L.shape === "round") {
    const z0 = L.zM0, z1 = L.zM1, zm = (z0 + z1) / 2;
    const profile = [
      [L.movR + 0.6, z0 + 0.2], [R * 0.82, z0], [R * 0.9, z0 + 0.25], [R * 0.955, z0 + 1.1],
      [R * 0.972, zm], [R * 0.968, z1 - 1.0], [R * 0.955, z1 - 0.3], [R * 0.93, z1], [R * 0.86, z1 + 0.02],
      [L.crystalR + 0.2, z1 - 0.2], [L.movR + 0.6, z1 - 0.6],
    ];
    group.add(mesh(lathe(profile, seg), brushed));
  } else {
    const pts = outline(L.shape, L.w * 0.985, L.h * 0.985);
    const hole = L.rectLike ? outline(L.shape, L.dialW * 0.98, L.dialH * 0.98) : circlePoints(L.movR + 0.4, 64);
    const g = extrude(shapeFromPoints(pts, [hole]), L.zM1 - L.zM0 - 1.2, 0.6, 4, 64);
    g.translate(0, 0, L.zM0 + 0.6);
    group.add(mesh(g, L.smart || mat.startsWith("resin") ? polished : brushed));
  }

  // Ушки
  const lugType = spec.case.lugs;
  if (!L.rectLike && lugType !== "none" && lugType !== "integrated" && !L.smart) {
    const lugs = new THREE.Group();
    const xLug = L.strapW / 2 + L.lugW / 2;
    const edge = L.shape === "round" ? Math.sqrt(Math.max(0, R * R - xLug * xLug)) : L.h * 0.9;
    const y0 = edge - 2.2, y1 = L.h + L.lugLen;
    const zt = L.zM1 - 0.3, zb = L.zM0 + 0.6;
    for (const side of [1, -1]) {
      const s = new THREE.Shape();
      const u = (y) => side * y;
      s.moveTo(u(y0), zt);
      s.bezierCurveTo(u((y0 + y1) / 2), zt + 0.1, u(y1 - 1.2), zt - 0.6, u(y1), zt - 1.6);
      s.quadraticCurveTo(u(y1 + 0.3), (zt + zb) / 2 - 0.5, u(y1 - 0.4), zb + 0.4);
      s.bezierCurveTo(u(y1 - 2.5), zb + 0.2, u((y0 + y1) / 2), zb - 0.1, u(y0), zb);
      s.closePath();
      const lw = lugType === "wire" ? 0.9 : L.lugW;
      const g = extrude(s, lw, lugType === "wire" ? 0.2 : 0.35, 3, 24);
      g.applyMatrix4(YZ_TO_WORLD);
      for (const xs of [1, -1]) {
        const lug = mesh(g, lugType === "twisted" ? polished : brushed);
        lug.position.x = xs > 0 ? L.strapW / 2 + 0.1 : -L.strapW / 2 - lw - 0.1;
        lugs.add(lug);
      }
      if (lugType === "hooded") {
        const hood = mesh(new RoundedBoxGeometry(L.strapW + lw * 2, L.lugLen * 0.9, zt - zb, 3, 0.8), brushed);
        hood.position.set(0, side * (L.h + L.lugLen * 0.4), (zt + zb) / 2);
        lugs.add(hood);
      }
    }
    group.add(lugs);
  }
  if (lugType === "integrated" && !L.smart) {
    // интегрированный браслет начинается прямо от корпуса: короткий широкий «зуб»
    for (const side of [1, -1]) {
      const g = new RoundedBoxGeometry(L.strapW + 3, 5, L.zM1 - L.zM0 - 0.8, 4, 1.2);
      const m = mesh(g, brushed);
      m.position.set(0, side * (L.h * 0.9 + 1.6), (L.zM0 + L.zM1) / 2 - 0.4);
      group.add(m);
    }
  }
  if (L.rectLike && !L.smart) {
    // у прямоугольных корпусов ушки продолжают боковины
    for (const side of [1, -1]) for (const xs of [1, -1]) {
      const g = new RoundedBoxGeometry(L.lugW * 0.9, 4.5, L.zM1 - L.zM0 - 1.2, 3, 0.6);
      const m = mesh(g, polished);
      m.position.set(xs * (L.strapW / 2 + L.lugW * 0.45), side * (L.h + 1.2), (L.zM0 + L.zM1) / 2 - 0.3);
      group.add(m);
    }
  }
  model.addPart("case", group, { explode: explodeFor("case", L.D / 40), order: 0 });

  // Заводная головка
  const crownGroup = new THREE.Group();
  const cr = L.smart ? 2.6 : Math.max(2.2, L.D * 0.07);
  const cl = L.smart ? 3.2 : 2.6;
  const knurl = new THREE.Shape();
  const teeth = L.smart ? 60 : 26;
  for (let i = 0; i <= teeth * 2; i++) {
    const a = (i / (teeth * 2)) * TAU;
    const r = i % 2 ? cr : cr * 0.94;
    i === 0 ? knurl.moveTo(Math.cos(a) * r, Math.sin(a) * r) : knurl.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const cg = extrude(knurl, cl, 0.3, 3, 8);
  cg.rotateY(Math.PI / 2);
  const crown = mesh(cg, accent);
  const crownX = (L.rectLike ? L.w : R) * 0.975;
  const sideSign = spec.case.crown_side === "left" ? -1 : 1;
  crown.position.set(sideSign > 0 ? crownX + 0.4 : -crownX - cl - 0.4, 0, (L.zM0 + L.zM1) / 2 + 0.3);
  const tube = mesh(new THREE.CylinderGeometry(cr * 0.45, cr * 0.45, 1.2, 24), polished);
  tube.rotation.z = Math.PI / 2;
  tube.position.set(sideSign * (crownX + 0.1), 0, crown.position.z);
  crownGroup.add(crown, tube);
  if (L.smart) {
    const btn = mesh(new RoundedBoxGeometry(1.4, 7, 2.2, 2, 0.5), polished);
    btn.position.set(crownX + 0.3, -L.h * 0.35, crown.position.z);
    crownGroup.add(btn);
  }
  model.addPart("crown", crownGroup, { explode: explodeFor("crown", L.D / 40), order: 1 });

  if (spec.case.crown_guard) {
    const guards = new THREE.Group();
    for (const s of [1, -1]) {
      const g = new RoundedBoxGeometry(2.4, 2.2, L.zM1 - L.zM0 - 1.6, 3, 0.7);
      const m = mesh(g, brushed);
      m.position.set(sideSign * (crownX + 0.8), s * (cr + 1.0), crown.position.z);
      guards.add(m);
    }
    model.addPart("crown_guard", guards, { explode: explodeFor("crown_guard", L.D / 40), order: 1 });
  }

  if (spec.case.pushers > 0) {
    const pushers = new THREE.Group();
    const angles = spec.case.pushers >= 2 ? [Math.PI / 6, -Math.PI / 6] : [Math.PI / 6];
    for (const a of angles) {
      const p = mesh(new THREE.CylinderGeometry(1.25, 1.25, 3.4, 32), accent);
      const r = (L.rectLike ? L.w : R) * 0.96 + 1.5;
      p.position.set(sideSign * Math.cos(a) * r, Math.sin(a) * r, crown.position.z);
      p.rotation.z = Math.PI / 2 + sideSign * a;
      p.rotation.z = a + Math.PI / 2;
      pushers.add(p);
    }
    model.addPart("pushers", pushers, { explode: explodeFor("pushers", L.D / 40), order: 1 });
  }

  // Задняя крышка
  const back = new THREE.Group();
  if (L.rectLike) {
    const g = extrude(shapeFromPoints(outline(L.shape, L.w * 0.9, L.h * 0.9)), L.zB1 - L.zB0 - 0.6, 0.5, 3, 48);
    g.translate(0, 0, L.zB0 + 0.3);
    back.add(mesh(g, L.smart ? M.metal("ceramic_black") : brushed));
    if (L.smart) {
      const sensor = mesh(new THREE.CircleGeometry(L.w * 0.42, 64), M.ceramic("#101114"));
      sensor.position.z = L.zB0 - 0.02;
      sensor.rotation.x = Math.PI;
      back.add(sensor);
    }
  } else {
    const rb = R * 0.86;
    const display = spec.case.display_back && detail === "hero";
    const prof = display
      ? [[rb * 0.72, L.zB0 + 0.4], [rb * 0.8, L.zB0 + 0.1], [rb * 0.95, L.zB0 + 0.4], [rb, L.zB1 - 0.4], [rb * 0.98, L.zB1], [rb * 0.72, L.zB1]]
      : [[0.01, L.zB0], [rb * 0.6, L.zB0 + 0.08], [rb * 0.9, L.zB0 + 0.3], [rb, L.zB0 + 0.9], [rb, L.zB1 - 0.3], [rb * 0.97, L.zB1], [0.01, L.zB1]];
    back.add(mesh(lathe(prof, seg), brushed));
    if (display) {
      const glass = mesh(new THREE.CylinderGeometry(rb * 0.74, rb * 0.74, 0.8, 64), M.crystalMaterial("sapphire", false));
      glass.rotation.x = Math.PI / 2;
      glass.position.z = L.zB0 + 0.6;
      back.add(glass);
    }
  }
  const backKey = spec.case.display_back ? "caseback_display" : "caseback";
  model.addPart(backKey, back, { explode: explodeFor(backKey, L.D / 40), order: 6 });
}

// ------------------------------------------------------------------ bezel

function buildBezel(model, spec, L, detail) {
  const type = spec.bezel.type;
  if (type === "none" || type === "digital" || L.smart) return;
  const R = L.R;
  const mat = spec.case.material;
  const metalName = M.accentMetalName(mat);
  const polished = M.metal(metalName === "steel" && ["fluted", "coin"].includes(type) ? "white_gold" : metalName, "polished");
  const seg = detail === "hero" ? 540 : 240;
  const z0 = L.zM1, z1 = L.zTop;
  const rin = L.crystalR + 0.15;
  const group = new THREE.Group();
  const scale = L.D / 40;

  if (L.rectLike || L.shape === "cushion" || L.shape === "porthole" || type === "octagon") {
    const pts = type === "octagon" ? outline("octagon", L.w * 0.93) : outline(L.shape, L.w * 0.97, L.h * 0.97);
    const hole = L.rectLike ? outline(L.shape, L.dialW, L.dialH) : circlePoints(rin, 96);
    const g = extrude(shapeFromPoints(pts, [hole]), Math.max(0.4, z1 - z0 - 0.8), 0.45, 4, 64);
    g.translate(0, 0, z0 + 0.4);
    group.add(mesh(g, polished));
    if (type === "octagon") {
      const screw = new THREE.CylinderGeometry(0.8 * scale, 0.8 * scale, 0.5, 6);
      screw.rotateX(Math.PI / 2);
      const slot = new THREE.BoxGeometry(1.2 * scale, 0.22 * scale, 0.3);
      const screws = new THREE.Group();
      const rr = L.w * 0.86;
      for (let i = 0; i < 8; i++) {
        const a = Math.PI / 8 + (i / 8) * TAU;
        const s = mesh(screw, M.metal("white_gold", "polished"));
        s.position.set(Math.cos(a) * rr, Math.sin(a) * rr, z1 + 0.05);
        s.rotation.z = a * 1.7;
        const sl = mesh(slot, M.painted("#2a2c30"));
        sl.position.set(s.position.x, s.position.y, z1 + 0.28);
        sl.rotation.z = a + 0.6;
        screws.add(s, sl);
      }
      model.addPart("bezel_screws", screws, { explode: explodeFor("bezel_screws", L.D / 40), order: 7 });
    }
    model.addPart("bezel", group, { explode: explodeFor("bezel", L.D / 40), order: 6 });
    return;
  }

  if (type === "fluted") {
    const N = 48;
    const g = ringSurface(
      (t) => [rin + (R - rin) * t, z1 - (z1 - z0) * Math.pow(t, 1.6)],
      (th, t) => {
        const ph = ((th * N) / TAU) % 1;
        const ridge = 1 - Math.abs(2 * ph - 1);
        return (ridge - 0.5) * 0.5 * Math.sin(Math.PI * Math.min(1, t * 1.15));
      },
      { segments: N * 12, rows: 14 },
    );
    group.add(mesh(g, polished));
    const lip = mesh(lathe([[R, z0 + 0.3], [R * 0.995, z0]], 128), polished);
    group.add(lip);
  } else if (type === "smooth" || type === "coin" || type === "screws") {
    const prof = [[rin, z1 - 0.35], [rin + 0.3, z1], [R * 0.9, z1 - 0.12], [R * 0.975, z1 - 0.55], [R, z1 - 1.1], [R * 0.985, z0]];
    if (type === "coin") {
      group.add(mesh(ringSurface((t) => [R * 0.985 + t * 0.02, z0 + (z1 - 0.6 - z0) * t], (th) => (Math.floor((th / TAU) * 120 * 2) % 2 ? 0.12 : -0.05), { segments: 480, rows: 2 }), polished));
      group.add(mesh(lathe([[rin, z1 - 0.35], [rin + 0.4, z1], [R * 0.96, z1 - 0.1], [R * 0.99, z1 - 0.6]], seg / 2), polished));
    } else group.add(mesh(lathe(prof, seg / 2), polished));
    if (type === "screws") {
      const screws = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + Math.PI / 6;
        const s = mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.5, 20), M.metal("titanium", "polished"));
        s.rotation.x = Math.PI / 2;
        s.position.set(Math.cos(a) * (rin + (R - rin) * 0.5), Math.sin(a) * (rin + (R - rin) * 0.5), z1 + 0.05);
        const h1 = mesh(new THREE.BoxGeometry(1.1, 0.22, 0.2), M.painted("#1a1b1e"));
        h1.position.copy(s.position).setZ(z1 + 0.32);
        h1.rotation.z = a;
        screws.add(s, h1);
      }
      model.addPart("bezel_screws", screws, { explode: explodeFor("bezel_screws", L.D / 40), order: 7 });
    }
  } else {
    // инструментальные безели: насечённая рамка + вставка со шкалой
    const frame = ringSurface(
      (t) => (t < 0.5 ? [R * 0.985, z0 + (z1 - 0.4 - z0) * (t * 2)] : [R * 0.985 - (t - 0.5) * 2 * 0.9, z1 - 0.4 + (t - 0.5) * 0.6]),
      (th, t) => (t < 0.55 ? (Math.floor((th / TAU) * 120 * 2) % 2 ? 0.14 : -0.04) : 0),
      { segments: 480, rows: 4 },
    );
    group.add(mesh(frame, polished));
    group.add(mesh(lathe([[rin - 0.05, z1 - 0.9], [rin, z1 - 0.1], [rin + 0.3, z1]], 128), polished));
    const insertCol = spec.bezel.color ?? "#0c0d10";
    const tex = paintBezelInsert(type, {
      color: insertCol, color2: spec.bezel.color2, inner: (rin + 0.1) / (R - 0.85), size: detail === "hero" ? 2048 : 1024,
    });
    const insMat = new THREE.MeshPhysicalMaterial({
      map: tex, metalness: spec.bezel.material === "aluminium" ? 0.55 : 0.05,
      roughness: spec.bezel.material === "aluminium" ? 0.38 : 0.1,
      clearcoat: spec.bezel.material === "ceramic" ? 1 : 0.3, clearcoatRoughness: 0.05,
    });
    insMat.userData.owned = true;
    const insert = mesh(new THREE.RingGeometry(rin + 0.1, R - 0.85, seg / 2, 1), insMat);
    insert.position.z = z1 - 0.02;
    const insGroup = new THREE.Group();
    insGroup.add(insert);
    // люминесцентная точка на «12»
    if (type === "dive" || type === "gmt" || type === "countdown") {
      const pip = mesh(new THREE.SphereGeometry(0.55 * scale, 20, 12, 0, TAU, 0, Math.PI / 2), M.lume(spec.dial.lume_color));
      pip.rotation.x = Math.PI / 2;
      pip.position.set(0, (rin + R - 0.85) / 2 + 0.2, z1 + 0.02);
      const cup = mesh(new THREE.TorusGeometry(0.62 * scale, 0.14, 8, 32), polished);
      cup.position.copy(pip.position);
      insGroup.add(pip, cup);
    }
    model.addPart("bezel_insert", insGroup, { explode: explodeFor("bezel_insert", L.D / 40), order: 7 });
  }
  model.addPart("bezel", group, { explode: explodeFor("bezel", L.D / 40), order: 6 });
}

// ------------------------------------------------------------------ dial, indices, hands

const HOUR_ANGLE = (i) => Math.PI / 2 - (i / 12) * TAU;

function occupiedHours(spec) {
  const occ = new Set((spec.subdials ?? []).map((s) => (s.pos === 12 ? 0 : s.pos)));
  if (spec.date === "3" || spec.date === "day_date") occ.add(3);
  if (spec.date === "6" || spec.moonphase === "6") occ.add(6);
  if (spec.moonphase === "12" || spec.date === "big_12" || spec.date === "day_date") occ.add(0);
  return occ;
}

function buildDial(model, spec, L, { detail, logo, caption }) {
  const scale = L.D / 40;
  const size = detail === "hero" ? 2048 : 1024;
  const aspect = L.rectLike ? L.dialH / L.dialW : 1;
  const tex = paintDial({ ...spec, logo, caption }, { size, aspect });
  const f = spec.dial.finish;
  const screen = f === "screen" || f === "lcd";
  const dialMat = new THREE.MeshPhysicalMaterial({
    map: tex,
    roughness: f === "lacquer" || f === "enamel" ? 0.16 : f === "sunburst" ? 0.34 : f === "matte" ? 0.72 : 0.45,
    metalness: f === "sunburst" ? 0.35 : f === "mother_of_pearl" ? 0.1 : 0,
    clearcoat: f === "lacquer" || f === "enamel" ? 1 : f === "mother_of_pearl" ? 0.6 : 0,
    clearcoatRoughness: 0.05,
    transparent: f === "skeleton",
    alphaTest: f === "skeleton" ? 0.5 : 0,
    emissive: screen ? new THREE.Color(0xffffff) : new THREE.Color(0x000000),
    emissiveMap: screen ? tex : null,
    emissiveIntensity: screen ? 0.9 : 0,
  });
  dialMat.userData.owned = true;
  let dialGeo;
  if (L.rectLike) {
    dialGeo = planarUV(new THREE.ShapeGeometry(shapeFromPoints(outline(L.shape, L.dialW, L.dialH)), 48), L.dialW, L.dialH);
  } else dialGeo = new THREE.CircleGeometry(L.dialR, 128);
  const dial = mesh(dialGeo, dialMat);
  dial.position.z = L.zDial;
  const dialGroup = new THREE.Group();
  dialGroup.add(dial);
  const back = mesh(dialGeo.clone(), M.metal("steel", "brushed"));
  back.position.z = L.zDial - 0.35;
  back.rotation.x = Math.PI;
  dialGroup.add(back);
  model.addPart("dial", dialGroup, { explode: explodeFor("dial", L.D / 40), order: 3 });

  // Флажок (наклонное кольцо между циферблатом и стеклом)
  if (!L.rectLike) {
    const flangeCol = spec.dial.color;
    const flangeMat = M.painted(luminance(flangeCol) > 0.6 ? "#d9dadc" : "#1b1d21", { roughness: 0.5, metalness: 0.3 });
    const flange = mesh(lathe([[L.dialR - 0.1, L.zDial + 0.05], [L.crystalR, L.zCrystal0 - 0.05]], 128), flangeMat);
    model.addPart("flange", flange, { explode: explodeFor("flange", L.D / 40), order: 5 });
  }

  // Диск даты (виден только в разборе)
  if (spec.date !== "none" && !screen && detail === "hero") {
    const disc = mesh(new THREE.RingGeometry(L.dialR * 0.55, L.dialR * 0.92, 96), M.painted("#f1f0ec", { roughness: 0.6 }));
    disc.position.z = L.zDial - 0.6;
    model.addPart("date_disc", disc, { explode: explodeFor("date_disc", L.D / 40), order: 3 });
  }

  // Накладные индексы
  const applied = ["baton", "dots", "explorer", "diamond", "mixed", "applied_arabic"].includes(spec.dial.indices);
  if (applied && !screen) {
    const metalGeos = [], lumeGeos = [];
    const occ = occupiedHours(spec);
    const len = L.dialR * 0.15, wid = Math.max(0.9, L.dialR * 0.05), hgt = 0.42 * scale;
    const rOuter = L.dialR * 0.88;
    const lumeOn = spec.dial.lume;
    const place = (geo, i, r, z = L.zDial + hgt / 2) => {
      const a = HOUR_ANGLE(i);
      geo.rotateZ(a - Math.PI / 2);
      geo.translate(Math.cos(a) * r, Math.sin(a) * r, z);
      return geo;
    };
    for (let i = 0; i < 12; i++) {
      if (occ.has(i)) continue;
      const kind = spec.dial.indices;
      if ((kind === "explorer" || kind === "mixed") && [0, 3, 6, 9].includes(i) && i !== 0) continue;
      if (kind === "mixed" && i === 0) continue;
      if (kind === "diamond") {
        metalGeos.push(place(new THREE.OctahedronGeometry(wid * 0.9, 0), i, rOuter - len / 2));
        continue;
      }
      if ((kind === "dots" || kind === "explorer") && i === 0) {
        const tri = new THREE.Shape();
        tri.moveTo(-len * 0.45, len * 0.4); tri.lineTo(len * 0.45, len * 0.4); tri.lineTo(0, -len * 0.5); tri.closePath();
        const g = extrude(tri, hgt, 0.08, 2, 4);
        g.translate(0, 0, -hgt / 2);
        metalGeos.push(place(g, i, rOuter - len * 0.4));
        if (lumeOn) {
          const inner = new THREE.Shape();
          inner.moveTo(-len * 0.32, len * 0.3); inner.lineTo(len * 0.32, len * 0.3); inner.lineTo(0, -len * 0.33); inner.closePath();
          const lg = extrude(inner, 0.1, 0, 1, 4);
          lumeGeos.push(place(lg, i, rOuter - len * 0.4, L.zDial + hgt + 0.08));
        }
        continue;
      }
      if (kind === "dots" && i % 3 !== 0) {
        const r = len * 0.32;
        metalGeos.push(place(new THREE.CylinderGeometry(r, r, hgt, 32).rotateX(Math.PI / 2), i, rOuter - r * 1.1));
        if (lumeOn) lumeGeos.push(place(new THREE.CylinderGeometry(r * 0.78, r * 0.78, 0.1, 32).rotateX(Math.PI / 2), i, rOuter - r * 1.1, L.zDial + hgt + 0.06));
        continue;
      }
      const double = kind === "baton" && i === 0;
      const l = kind === "dots" ? len * 1.15 : len;
      for (const off of double ? [-wid * 0.75, wid * 0.75] : [0]) {
        const g = new RoundedBoxGeometry(wid, l, hgt, 2, Math.min(wid, hgt) * 0.3);
        g.translate(off, 0, 0);
        metalGeos.push(place(g, i, rOuter - l / 2));
        if (lumeOn) {
          const lg = new THREE.BoxGeometry(wid * 0.55, l * 0.8, 0.12);
          lg.translate(off, 0, 0);
          lumeGeos.push(place(lg, i, rOuter - l / 2, L.zDial + hgt + 0.04));
        }
      }
    }
    const idx = new THREE.Group();
    const indexMat = M.metal(luminance(spec.dial.index_color) > 0.7 ? "white_gold" : M.accentMetalName(spec.case.material) === "steel" ? "white_gold" : M.accentMetalName(spec.case.material), "polished");
    if (metalGeos.length) idx.add(mesh(mergeGeometries(metalGeos.map((g) => g.toNonIndexed())), indexMat));
    if (lumeGeos.length) idx.add(mesh(mergeGeometries(lumeGeos.map((g) => g.toNonIndexed())), M.lume(spec.dial.lume_color)));
    model.addPart("indices", idx, { explode: explodeFor("indices", L.D / 40), order: 3 });
  }
}

/** Материал стрелок по цвету: золото, воронёная сталь, белое золото или краска. */
export function handMaterial(color) {
  const [r, g, b] = hexToRgb(color);
  const lum = luminance(color);
  if (b > r + 40 && lum < 0.35) return M.blued();
  if (r > b + 55 && g > b + 20 && lum > 0.35) return M.metal(r - g > 45 ? "rose_gold" : "yellow_gold", "polished");
  if (lum > 0.6) return M.metal("white_gold", "polished");
  return M.painted(color, { roughness: 0.32, metalness: 0.55 });
}

function makeHand(shapeInfo, material, lumeMat, depth, z) {
  const g = new THREE.Group();
  const geos = [shapeInfo.shape, ...(shapeInfo.extra ?? [])].map((s) => extrude(s, depth, 0.05, 1, 24));
  const merged = mergeGeometries(geos.map((x) => x.toNonIndexed()));
  g.add(mesh(merged, material));
  if (shapeInfo.lume && lumeMat) {
    const lg = extrude(shapeInfo.lume, 0.06, 0, 1, 8);
    const lm = mesh(lg, lumeMat);
    lm.position.z = depth + 0.02;
    g.add(lm);
  }
  if (shapeInfo.lumeCircle && lumeMat) {
    const disc = mesh(new THREE.CircleGeometry(shapeInfo.lumeCircle.r, 32), lumeMat);
    disc.position.set(0, shapeInfo.lumeCircle.y, depth * 0.3);
    g.add(disc);
  }
  g.position.z = z;
  return g;
}

function buildHands(model, spec, L) {
  const screen = spec.dial.finish === "screen" || spec.dial.finish === "lcd";
  if (screen || spec.hands.style === "none") return;
  const scale = L.D / 40;
  const R = L.rectLike ? Math.min(L.dialW, L.dialH) * 1.02 : L.dialR;
  const color = spec.hands.color;
  const finalMat = handMaterial(color);
  const lumeMat = spec.hands.lume ? M.lume(spec.dial.lume_color) : null;
  const style = spec.hands.style;
  const depth = 0.22;
  const zBase = L.zDial + 0.9;

  const hour = makeHand(handShape(style, R * 0.6, R * 0.055, "hour"), finalMat, lumeMat, depth, zBase);
  const minute = makeHand(handShape(style === "mercedes" ? "baton" : style, R * 0.93, R * 0.045, "minute"), finalMat, lumeMat, depth, zBase + 0.35);
  model.hands.hour = hour;
  model.hands.minute = minute;
  model.addPart("hand_hour", hour, { explode: explodeFor("hand_hour", L.D / 40), order: 4 });
  model.addPart("hand_minute", minute, { explode: explodeFor("hand_minute", L.D / 40), order: 4 });

  if (spec.hands.gmt_color) {
    const gshape = handShape("arrow", R * 0.88, R * 0.04, "minute");
    const gmt = makeHand({ shape: gshape.shape }, M.painted(spec.hands.gmt_color, { roughness: 0.35, metalness: 0.4 }), null, 0.16, zBase + 0.18);
    model.hands.gmt = gmt;
    model.addPart("hand_gmt", gmt, { explode: explodeFor("hand_gmt", L.D / 40), order: 4 });
  }

  const chrono = (spec.subdials ?? []).some((s) => s.kind.startsWith("chrono"));
  const small = (spec.subdials ?? []).find((s) => s.kind === "small_seconds");
  const secColor = spec.hands.seconds_color ?? color;
  const secMat = spec.hands.seconds_color ? handMaterial(secColor) : finalMat;
  if (spec.hands.seconds === "center" || chrono) {
    const ss = secondsShape(R * 0.94, R * 0.07, style === "mercedes" ? "lollipop" : style === "arrow" || style === "plongeur" ? "arrow" : "none");
    const sec = makeHand(ss, secMat, null, 0.12, zBase + 0.7);
    const cap = mesh(new THREE.CylinderGeometry(R * 0.035, R * 0.035, 0.4, 24), secMat);
    cap.rotation.x = Math.PI / 2;
    cap.position.z = 0.2;
    sec.add(cap);
    if (!chrono || !small) model.hands.second = sec;
    model.addPart("hand_second", sec, { explode: explodeFor("hand_second", L.D / 40), order: 4 });
  }

  // Стрелки подциферблатов
  const sub = new THREE.Group();
  for (const sd of spec.subdials ?? []) {
    if (["moonphase", "tourbillon"].includes(sd.kind)) continue;
    const offs = { 3: [0.5, 0], 6: [0, -0.5], 9: [-0.5, 0], 12: [0, 0.5] }[sd.pos];
    const col = sd.color && luminance(sd.color) < 0.4 ? "#e8ebee" : luminance(spec.dial.color) > 0.6 && !sd.color ? "#1a1c1f" : "#e8ebee";
    const needle = makeHand(handShape("baton", R * 0.2, R * 0.03, "minute"), handMaterial(col), null, 0.1, L.zDial + 0.35);
    needle.position.x = offs[0] * R * (L.rectLike ? L.dialW / R : 1);
    needle.position.y = offs[1] * R * (L.rectLike ? L.dialH / R : 1);
    needle.rotation.z = sd.kind === "power_reserve" ? -0.8 : 0;
    if (sd.kind === "small_seconds") model.hands.small = needle;
    sub.add(needle);
  }
  if (sub.children.length) model.addPart("subdial_hands", sub, { explode: explodeFor("subdial_hands", L.D / 40), order: 4 });
}

function buildCrystal(model, spec, L, detail) {
  const hero = detail === "hero";
  const mat = M.crystalMaterial(spec.crystal === "hesalite" ? "hesalite" : "sapphire", hero);
  const g = new THREE.Group();
  if (L.rectLike) {
    const geo = extrude(shapeFromPoints(outline(L.shape, L.dialW * 1.02, L.dialH * 1.02)), 0.6, 0.35, 4, 48);
    geo.translate(0, 0, L.zCrystal0);
    g.add(mesh(geo, mat));
  } else {
    const r = L.crystalR;
    const domed = spec.crystal === "domed" || spec.crystal === "hesalite" || spec.crystal === "box";
    if (domed) {
      const hd = L.zCrystal1 - L.zTop + 0.2;
      const Rs = (r * r + hd * hd) / (2 * hd);
      const cap = new THREE.SphereGeometry(Rs, 96, 24, 0, TAU, 0, Math.asin(r / Rs));
      cap.rotateX(Math.PI / 2);
      cap.translate(0, 0, L.zCrystal1 - Rs);
      g.add(mesh(cap, mat));
      const wall = new THREE.CylinderGeometry(r, r, L.zTop - L.zCrystal0 + 0.2, 96, 1, true);
      wall.rotateX(Math.PI / 2);
      wall.translate(0, 0, (L.zTop + L.zCrystal0) / 2);
      g.add(mesh(wall, mat));
    } else {
      // плоское стекло: только верхняя поверхность, кромку скрывает безель
      const disc = new THREE.CircleGeometry(r + 0.1, 96);
      disc.translate(0, 0, L.zCrystal1);
      g.add(mesh(disc, mat));
    }
  }
  if (spec.cyclops && spec.date !== "none" && !L.rectLike) {
    const c = mesh(new RoundedBoxGeometry(L.dialR * 0.26, L.dialR * 0.21, 1.2, 3, 0.5), M.crystalMaterial("sapphire", hero));
    c.position.set(L.dialR * 0.64, 0, L.zCrystal1 + 0.4);
    g.add(c);
  }
  // Кристалл не должен перехватывать клики по деталям под ним, пока часы собраны.
  const crystalKey = spec.crystal === "hesalite" ? "crystal_hesalite" : "crystal";
  model.addPart(crystalKey, g, { explode: explodeFor(crystalKey, L.D / 40), order: 8 });
}

// ------------------------------------------------------------------ public

/**
 * @param render   render-спека модели (см. backend content/schema.py RenderSpec)
 * @param opts.detail "card" (каталог, без механизма) | "hero" (страница модели, с механизмом)
 */
export function buildWatch(render, opts = {}) {
  const spec = withDefaults(render);
  const { detail = "card", diameter = 40, thickness = 12, movementType = "automatic", frequency = 28800, caption = null, calibre = "" } = opts;
  const logo = spec.logo ?? opts.logo ?? null;
  const L = computeLayout(spec, diameter, thickness, movementType);
  const model = new WatchModel({ spec, layout: L, movementType, frequency });

  buildCase(model, spec, L, detail);
  buildBezel(model, spec, L, detail);
  buildDial(model, spec, L, { detail, logo, caption });
  buildHands(model, spec, L);
  buildCrystal(model, spec, L, detail);
  buildStrap(model, spec, L, detail);
  if (detail === "hero") buildMovement(model, spec, L, { movementType, logo, calibre, plate: spec.movement_plate, blueSpring: spec.blue_spring });

  model.update();
  return model;
}
