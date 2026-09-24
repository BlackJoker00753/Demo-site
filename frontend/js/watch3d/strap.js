// Браслеты и ремешки. Уходят от ушек по дуге «запястья» назад, от зрителя.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import * as M from "./materials.js";

const METAL_BRACELETS = new Set(["oyster", "jubilee", "president", "integrated", "three_link", "five_link", "titanium", "mesh"]);

/** Точка крепления и дуга запястья для стороны s (+1 к «12», -1 к «6»). */
function arcFor(L, s) {
  const y0 = L.rectLike ? L.h + 1.6 : L.shape === "round" || L.shape === "cushion" ? L.h + L.lugLen - 1.2 : L.h * 0.92 + 3;
  const z0 = (L.zM0 + L.zM1) / 2 - 0.4;
  const Rw = y0 * 1.55 + 6;
  const zc = z0 - Math.sqrt(Rw * Rw - y0 * y0);
  const phi0 = Math.atan2(y0, z0 - zc);
  return {
    Rw, zc, phi0,
    point: (phi, target = new THREE.Vector3()) => target.set(0, s * Rw * Math.sin(phi), zc + Rw * Math.cos(phi)),
  };
}

function linkLayout(type, width) {
  // [смещение по X, ширина, доля длины, смещение по длине, радиус скругления, акцент]
  switch (type) {
    case "jubilee":
    case "five_link":
      return [
        [-width * 0.36, width * 0.28, 0.96, 0, 0.5, false],
        [width * 0.36, width * 0.28, 0.96, 0, 0.5, false],
        [-width * 0.13, width * 0.13, 0.46, -0.25, 0.4, true],
        [width * 0.13, width * 0.13, 0.46, -0.25, 0.4, true],
        [0, width * 0.13, 0.46, 0.25, 0.4, true],
      ];
    case "president":
      return [
        [-width * 0.33, width * 0.32, 0.9, 0, 1.1, false],
        [width * 0.33, width * 0.32, 0.9, 0, 1.1, false],
        [0, width * 0.32, 0.9, 0, 1.1, true],
      ];
    case "integrated":
      return [
        [-width * 0.34, width * 0.32, 0.95, 0, 0.35, false],
        [width * 0.34, width * 0.32, 0.95, 0, 0.35, false],
        [0, width * 0.34, 0.55, 0, 0.3, true],
      ];
    default:
      // oyster, three_link, titanium
      return [
        [-width * 0.34, width * 0.3, 0.95, 0, 0.45, false],
        [width * 0.34, width * 0.3, 0.95, 0, 0.45, false],
        [0, width * 0.36, 0.95, 0, 0.45, true],
      ];
  }
}

function buildBracelet(model, spec, L, detail, s) {
  const type = spec.strap.type;
  const mat = spec.case.material;
  const baseMat = M.metal(type === "titanium" ? "titanium" : mat.startsWith("two_tone") ? "steel" : mat, type === "president" || type === "jubilee" ? "polished" : "brushed");
  const accentMat = M.metal(M.accentMetalName(mat), "polished");
  const arc = arcFor(L, s);
  const span = detail !== "card" ? 1.35 : 1.05;
  const scale = L.D / 40;
  const linkLen = (type === "integrated" ? 5.2 : type === "president" ? 5.5 : 6.4) * scale;
  const step = linkLen / arc.Rw;
  const n = Math.floor(span / step);
  const th = type === "president" ? 3.6 : 3.2;
  const group = new THREE.Group();
  const layout = linkLayout(type, L.strapW);
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const sc = new THREE.Vector3();
  const m4 = new THREE.Matrix4();

  layout.forEach(([x, w, lenFrac, lenOff, radius, accent]) => {
    const geo = new RoundedBoxGeometry(w, linkLen * lenFrac, th, 3, Math.min(radius, w / 2 - 0.01, th / 2 - 0.01));
    const inst = new THREE.InstancedMesh(geo, accent ? accentMat : baseMat, n);
    for (let i = 0; i < n; i++) {
      const phi = arc.phi0 + step * (i + 0.5 + lenOff);
      arc.point(phi, p);
      // сужение к застёжке
      const taper = 1 - 0.2 * (i / Math.max(1, n - 1));
      e.set(-s * phi, 0, 0);
      q.setFromEuler(e);
      sc.set(taper, 1, 1);
      p.x = x * taper;
      m4.compose(p, q, sc);
      inst.setMatrixAt(i, m4);
    }
    inst.instanceMatrix.needsUpdate = true;
    group.add(inst);
  });
  return group;
}

/** Ремешок: свип скруглённого сечения вдоль дуги. */
function bandGeometry(L, arc, s, { width, thickness, span, segments = 72, taper = 0.2 }) {
  const cross = [];
  const M_ = 20;
  for (let k = 0; k < M_; k++) {
    const a = (k / M_) * Math.PI * 2;
    const c = Math.cos(a), sn = Math.sin(a);
    // суперэллипс: почти прямоугольник со скруглёнными краями
    cross.push([Math.sign(c) * Math.pow(Math.abs(c), 0.35), Math.sign(sn) * Math.pow(Math.abs(sn), 0.6)]);
  }
  const pos = [], uv = [], idx = [];
  const P = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const phi = arc.phi0 + span * t;
    arc.point(phi, P);
    const nY = s * Math.sin(phi), nZ = Math.cos(phi);
    const w = width * (1 - taper * t) / 2;
    const h = thickness / 2;
    for (let k = 0; k < M_; k++) {
      const [cx, cn] = cross[k];
      pos.push(cx * w, P.y + nY * cn * h, P.z + nZ * cn * h);
      uv.push(k / M_, t * span * arc.Rw / 20);
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let k = 0; k < M_; k++) {
      const a = i * M_ + k, b = i * M_ + ((k + 1) % M_);
      const c = (i + 1) * M_ + k, d = (i + 1) * M_ + ((k + 1) % M_);
      if (s > 0) idx.push(a, c, b, b, c, d);
      else idx.push(a, b, c, b, d, c);
    }
  }
  // торцевая заглушка
  const endCenter = pos.length / 3;
  const last = segments * M_;
  let cx = 0, cy = 0, cz = 0;
  for (let k = 0; k < M_; k++) { cx += pos[(last + k) * 3]; cy += pos[(last + k) * 3 + 1]; cz += pos[(last + k) * 3 + 2]; }
  pos.push(cx / M_, cy / M_, cz / M_);
  uv.push(0.5, 0.5);
  for (let k = 0; k < M_; k++) {
    const a = last + k, b = last + ((k + 1) % M_);
    if (s > 0) idx.push(a, b, endCenter);
    else idx.push(a, endCenter, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function buildBand(model, spec, L, detail, s) {
  const type = spec.strap.type;
  const arc = arcFor(L, s);
  const span = detail !== "card" ? 1.35 : 1.05;
  const thickness = type === "rubber" || type === "resin" ? 4.2 : type === "nato" || type === "fabric" ? 1.6 : 3.4;
  const width = L.strapW;
  const mat = type === "mesh" ? M.metal(spec.case.material, "brushed") : M.strapMaterial(type, spec.strap.color);
  const group = new THREE.Group();
  group.add(new THREE.Mesh(bandGeometry(L, arc, s, { width, thickness, span, taper: type === "rubber" || type === "resin" ? 0.08 : 0.22 }), mat));

  // прострочка по краям кожаного ремешка
  if ((type === "leather" || type === "alligator") && detail !== "card") {
    const stitch = new THREE.BoxGeometry(0.28, 1.1, 0.25);
    const count = Math.floor((span * arc.Rw) / 2.2);
    const inst = new THREE.InstancedMesh(stitch, M.painted(spec.strap.stitch ?? "#d9cbb4", { roughness: 0.8 }), count * 2);
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler(), m4 = new THREE.Matrix4(), one = new THREE.Vector3(1, 1, 1);
    let n = 0;
    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1);
      const phi = arc.phi0 + span * t;
      arc.point(phi, p);
      const nY = s * Math.sin(phi), nZ = Math.cos(phi);
      const halfW = (width * (1 - 0.22 * t)) / 2 - 1.1;
      for (const side of [-1, 1]) {
        const pp = p.clone();
        pp.x = side * halfW;
        pp.y += nY * (thickness / 2 + 0.05);
        pp.z += nZ * (thickness / 2 + 0.05);
        e.set(-s * phi, 0, 0);
        q.setFromEuler(e);
        m4.compose(pp, q, one);
        inst.setMatrixAt(n++, m4);
      }
    }
    inst.count = n;
    group.add(inst);
  }
  return group;
}

export function buildStrap(model, spec, L, detail) {
  const type = spec.strap.type;
  if (type === "none") return;
  const metalBracelet = METAL_BRACELETS.has(type) && type !== "mesh";
  const scale = L.D / 40;
  for (const s of [1, -1]) {
    const part = metalBracelet ? buildBracelet(model, spec, L, detail, s) : buildBand(model, spec, L, detail, s);
    model.addPart(metalBracelet ? "bracelet" : "strap", part, { explode: [0, s * 20 * scale, -10 * scale], order: 2 });
  }
  if (type === "nato") {
    // NATO проходит под задней крышкой
    const under = new THREE.Mesh(new THREE.BoxGeometry(L.strapW, L.h * 2.2, 1.4), M.strapMaterial("nato", spec.strap.color));
    under.position.z = L.zB0 - 0.8;
    model.addPart("strap", under, { explode: [0, 0, -14 * scale], order: 2 });
  }
}
