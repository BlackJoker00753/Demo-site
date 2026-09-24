// Процедурный механизм: механика, кварц, Spring Drive и «начинка» смарт-часов.
// Со стороны задней крышки (-Z) к циферблату (+Z): ротор → мосты → колёса → платина.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import * as M from "./materials.js";
import { explodeFor } from "./explode-map.js";
import { bridgeShape, gearShape, ratchetShape } from "./shapes.js";
import { paintCircuit, paintRotor } from "./textures.js";

const TAU = Math.PI * 2;

function extrude(shape, depth, bevel = 0.08) {
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 32 });
}

function gear(r, teeth, depth, material, opts) {
  const g = extrude(gearShape(r, teeth, opts), depth, 0.03);
  return new THREE.Mesh(g, material);
}

function cyl(r, h, material, segments = 32) {
  const g = new THREE.CylinderGeometry(r, r, h, segments);
  g.rotateX(Math.PI / 2);
  return new THREE.Mesh(g, material);
}

function jewel(r, z, x, y, withChaton = false) {
  const g = new THREE.Group();
  const j = cyl(r, 0.25, M.ruby(), 20);
  g.add(j);
  if (withChaton) {
    const c = new THREE.Mesh(new THREE.TorusGeometry(r * 1.45, r * 0.45, 8, 24), M.metal("yellow_gold", "polished"));
    g.add(c);
  }
  g.position.set(x, y, z);
  return g;
}

function screw(r, z, x, y, blued = true) {
  const g = new THREE.Group();
  const head = cyl(r, 0.35, blued ? M.blued() : M.metal("steel", "polished"), 20);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(r * 2.1, r * 0.35, 0.2), M.painted("#111"));
  slot.position.z = -0.2;
  slot.rotation.z = Math.random() * Math.PI;
  g.add(head, slot);
  g.position.set(x, y, z);
  return g;
}

function hairspring(r0, r1, turns, material) {
  const pts = [];
  const n = turns * 48;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = t * turns * TAU;
    const r = r0 + (r1 - r0) * t;
    pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, n, 0.035, 5, false), material);
}

// ------------------------------------------------------------------ mechanical

function mechanical(model, spec, L, opts) {
  const Rm = L.movR;
  const s = L.D / 40;
  const z1 = L.movZ1;
  const zPlate0 = z1 - 1.1;
  const kind = opts.plate ?? "rhodium";
  const plateMat = M.movementMetal(kind, "perlage");
  const bridgeMat = M.movementMetal(kind, "cotes");
  const wheelMat = M.gilt();
  const chatons = kind === "german_silver";
  const P = (x, y) => [x * Rm, y * Rm];

  // Платина
  const plate = cyl(Rm, 1.1, plateMat, 96);
  plate.position.z = z1 - 0.55;
  model.addPart("mainplate", plate, { explode: explodeFor("mainplate", L.D / 40), order: 1 });

  // Барабан и храповик
  const barrelPos = P(-0.36, 0.3);
  const barrel = new THREE.Group();
  const drum = gear(0.34 * Rm, 72, 1.3, wheelMat, { spokes: 0 });
  drum.position.z = -1.3;
  const cover = cyl(0.3 * Rm, 0.15, M.metal("steel", "brushed"), 64);
  cover.position.z = -1.4;
  barrel.add(drum, cover);
  barrel.position.set(...barrelPos, zPlate0 - 0.15);
  model.addPart("barrel", barrel, { explode: explodeFor("barrel", L.D / 40), order: 2 });
  model.moving.wheels.push({ object: drum, speed: -0.004, phase: 0 });

  // Колёсная передача
  const train = new THREE.Group();
  const wheels = [
    { pos: P(0, 0), r: 0.28, teeth: 80, speed: -TAU / 3600 },
    { pos: P(0.32, -0.24), r: 0.21, teeth: 75, speed: TAU / 450 },
    { pos: P(0.1, -0.5), r: 0.19, teeth: 70, speed: -TAU / 60 },
  ];
  wheels.forEach((w, i) => {
    const g = gear(w.r * Rm, w.teeth, 0.22, wheelMat, { spokes: 4 });
    g.position.set(...w.pos, zPlate0 - 0.35 - i * 0.28);
    const pinion = cyl(0.045 * Rm, 1.2, M.metal("steel", "polished"), 12);
    pinion.position.z = 0.4;
    g.add(pinion);
    train.add(g);
    model.moving.wheels.push({ object: g, speed: w.speed, phase: i });
  });
  model.addPart("train", train, { explode: explodeFor("train", L.D / 40), order: 2 });

  // Анкерное колесо и вилка
  const escapeGroup = new THREE.Group();
  const escShape = new THREE.Shape();
  const er = 0.11 * Rm;
  for (let i = 0; i <= 15 * 2; i++) {
    const a = (i / 30) * TAU;
    const r = i % 2 ? er : er * 0.7;
    const aa = i % 2 ? a + 0.12 : a;
    i === 0 ? escShape.moveTo(Math.cos(aa) * r, Math.sin(aa) * r) : escShape.lineTo(Math.cos(aa) * r, Math.sin(aa) * r);
  }
  const escape = new THREE.Mesh(extrude(escShape, 0.18, 0.02), M.metal("steel", "polished"));
  escape.position.set(...P(0.35, -0.6), zPlate0 - 0.5);
  escapeGroup.add(escape);
  model.moving.wheels.push({ object: escape, speed: TAU / 10, phase: 0 });
  model.addPart("escape_wheel", escapeGroup, { explode: explodeFor("escape_wheel", L.D / 40), order: 3 });

  const pallet = new THREE.Shape();
  pallet.moveTo(-0.09 * Rm, 0);
  pallet.lineTo(0.09 * Rm, 0);
  pallet.lineTo(0.02 * Rm, 0.2 * Rm);
  pallet.lineTo(-0.02 * Rm, 0.2 * Rm);
  pallet.closePath();
  const palletMesh = new THREE.Mesh(extrude(pallet, 0.2, 0.02), M.metal("steel", "polished"));
  palletMesh.position.set(...P(0.46, -0.46), zPlate0 - 0.75);
  palletMesh.rotation.z = 0.9;
  model.addPart("pallet", palletMesh, { explode: explodeFor("pallet", L.D / 40), order: 3 });

  // Баланс или регулятор Spring Drive
  const balPos = P(0.5, -0.18);
  if (opts.movementType === "spring_drive") {
    const glide = new THREE.Group();
    const wheel = gear(0.18 * Rm, 8, 0.4, M.metal("steel", "polished"), { spokes: 8, hub: 0.3, rim: 0.2, toothDepth: 0.01 });
    glide.add(wheel);
    const coil = cyl(0.06 * Rm, 1.2, M.painted("#b87333", { metalness: 0.8, roughness: 0.35 }), 20);
    coil.position.set(0.28 * Rm, 0, -0.3);
    coil.rotation.y = Math.PI / 2;
    glide.add(coil);
    glide.position.set(...balPos, zPlate0 - 1.1);
    model.moving.glide = wheel;
    model.addPart("glide_wheel", glide, { explode: explodeFor("glide_wheel", L.D / 40), order: 4 });
  } else {
    const balance = new THREE.Group();
    const br = 0.25 * Rm;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(br, 0.05 * Rm, 12, 72), M.metal("yellow_gold", "polished"));
    balance.add(rim);
    for (let k = 0; k < 2; k++) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(br * 2, 0.06 * Rm, 0.2), M.metal("yellow_gold", "polished"));
      arm.rotation.z = (k * Math.PI) / 2;
      balance.add(arm);
    }
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU + 0.2;
      const w = cyl(0.03 * Rm, 0.3, M.metal("yellow_gold", "polished"), 12);
      w.position.set(Math.cos(a) * (br + 0.05 * Rm), Math.sin(a) * (br + 0.05 * Rm), 0);
      w.rotation.set(0, Math.PI / 2, a);
      balance.add(w);
    }
    const staff = cyl(0.025 * Rm, 1.6, M.metal("steel", "polished"), 12);
    balance.add(staff);
    const spring = hairspring(0.04 * Rm, 0.17 * Rm, 11, opts.blueSpring ? M.blued() : M.metal("steel", "polished"));
    spring.position.z = -0.3;
    balance.add(spring);
    balance.position.set(...balPos, zPlate0 - 1.05);
    model.moving.balance = balance;
    model.addPart("balance", balance, { explode: explodeFor("balance", L.D / 40), order: 4 });
  }

  // Мосты
  const bridges = new THREE.Group();
  const zBridge = zPlate0 - 1.6;
  const mkBridge = (points, width) => {
    const g = extrude(bridgeShape(points.map(([x, y]) => [x * Rm, y * Rm]), width * Rm), 0.9, 0.12);
    const m = new THREE.Mesh(g, bridgeMat);
    m.position.z = zBridge - 0.9;
    return m;
  };
  if (kind === "german_silver") {
    // трёхчетвертная платина в немецкой традиции
    const shape = new THREE.Shape();
    shape.absarc(0, 0, Rm * 0.97, -0.5, Math.PI * 1.5 - 0.1, false);
    shape.lineTo(Math.cos(-0.5) * Rm * 0.35, Math.sin(-0.5) * Rm * 0.35);
    shape.closePath();
    const hole = new THREE.Path();
    hole.absarc(balPos[0], balPos[1], 0.3 * Rm, 0, TAU, true);
    const m = new THREE.Mesh(extrude(shape, 0.9, 0.12), bridgeMat);
    m.position.z = zBridge - 0.9;
    bridges.add(m);
  } else {
    bridges.add(mkBridge([[-0.36, 0.3], [-0.1, 0.62], [-0.72, 0.36], [-0.5, -0.05], [0.05, 0.12]], 0.2));
    bridges.add(mkBridge([[0, 0], [0.32, -0.24], [0.1, -0.5], [-0.25, -0.35], [0.35, -0.6]], 0.13));
  }
  // рубины и винты на мостах
  const pivots = [[-0.36, 0.3], [0, 0], [0.32, -0.24], [0.1, -0.5], [0.35, -0.6]];
  pivots.forEach(([x, y]) => bridges.add(jewel(0.035 * Rm, zBridge - 0.95, x * Rm, y * Rm, chatons)));
  [[-0.72, 0.36], [-0.1, 0.62], [0.05, 0.12], [-0.25, -0.35], [0.35, -0.6]].forEach(([x, y], i) =>
    bridges.add(screw(0.05 * Rm, zBridge - 1.0, x * Rm * 0.92 + 0.3, y * Rm * 0.92, opts.blueScrews ?? i % 2 === 0)),
  );
  model.addPart("bridges", bridges, { explode: explodeFor("bridges", L.D / 40), order: 5 });

  // Мост баланса
  const cock = new THREE.Group();
  const cockMesh = mkBridge([[0.95, 0.05], [0.5, -0.18], [0.9, -0.4]], 0.09);
  cockMesh.position.z = zBridge - 1.3;
  cock.add(cockMesh);
  cock.add(jewel(0.04 * Rm, zBridge - 1.4, balPos[0], balPos[1], chatons));
  cock.add(screw(0.05 * Rm, zBridge - 1.45, 0.86 * Rm, -0.16 * Rm, true));
  model.addPart("balance_cock", cock, { explode: explodeFor("balance_cock", L.D / 40), order: 6 });

  // Ротор
  if (opts.movementType === "automatic" || opts.movementType === "spring_drive") {
    const rotorGroup = new THREE.Group();
    const rs = new THREE.Shape();
    rs.absarc(0, 0, Rm * 0.97, 0.05, Math.PI - 0.05, false);
    rs.absarc(0, 0, Rm * 0.18, Math.PI - 0.3, 0.3, true);
    rs.closePath();
    const tex = paintRotor(`${opts.logo ?? ""} ${opts.calibre ?? ""}`.trim() || "AUTOMATIC", { color: kind === "german_silver" ? "#e3d7b8" : "#cfd2d6" });
    const rotorMat = new THREE.MeshPhysicalMaterial({ map: tex, metalness: 1, roughness: 0.28 });
    rotorMat.userData.owned = true;
    const rg = extrude(rs, 0.5, 0.1);
    // UV для гравировки: планарная проекция
    const p = rg.attributes.position;
    const uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      uv[i * 2] = p.getX(i) / (2 * Rm) + 0.5;
      uv[i * 2 + 1] = p.getY(i) / (2 * Rm) + 0.5;
    }
    rg.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    const rotor = new THREE.Mesh(rg, rotorMat);
    rotorGroup.add(rotor);
    const weight = new THREE.Mesh(
      new THREE.TorusGeometry(Rm * 0.9, 0.08 * Rm, 8, 64, Math.PI - 0.1),
      M.metal(opts.rotorGold ? "yellow_gold" : "white_gold", "polished"),
    );
    weight.rotation.z = 0.05;
    weight.scale.z = 0.35;
    rotorGroup.add(weight);
    const bearing = cyl(Rm * 0.16, 0.9, M.metal("steel", "polished"), 32);
    rotorGroup.add(bearing);
    rotorGroup.position.z = zBridge - 2.1;
    const pivot = new THREE.Group();
    pivot.add(rotorGroup);
    model.moving.rotor = rotorGroup;
    model.addPart("rotor", pivot, { explode: explodeFor("rotor", L.D / 40), order: 7 });
  }
}

// ------------------------------------------------------------------ quartz

function quartz(model, spec, L, opts) {
  const Rm = L.movR * 0.92;
  const s = L.D / 40;
  const z1 = L.movZ1;
  const plate = cyl(Rm, 1.0, M.painted("#15161a", { roughness: 0.6 }), 64);
  plate.position.z = z1 - 0.5;
  model.addPart("mainplate", plate, { explode: explodeFor("mainplate", L.D / 40), order: 1 });

  const circuit = new THREE.Mesh(
    new THREE.CylinderGeometry(Rm * 0.9, Rm * 0.9, 0.3, 64, 1, false, 0.6, Math.PI * 1.3).rotateX(Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: paintCircuit(), roughness: 0.5, metalness: 0.3 }),
  );
  circuit.material.userData.owned = true;
  circuit.position.z = z1 - 1.25;
  model.addPart("circuit", circuit, { explode: explodeFor("circuit", L.D / 40), order: 2 });

  const quartzCap = cyl(0.07 * Rm, 0.5 * Rm, M.metal("steel", "polished"), 20);
  quartzCap.rotation.set(0, Math.PI / 2, 0);
  quartzCap.position.set(-0.4 * Rm, -0.45 * Rm, z1 - 1.7);
  model.addPart("quartz", quartzCap, { explode: explodeFor("quartz", L.D / 40), order: 3 });

  const coil = new THREE.Group();
  const bobbin = cyl(0.1 * Rm, 0.55 * Rm, M.painted("#b87333", { metalness: 0.9, roughness: 0.3 }), 24);
  bobbin.rotation.set(0, Math.PI / 2, 0);
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.8 * Rm, 0.08 * Rm, 0.3), M.metal("steel", "brushed"));
  coil.add(bobbin, core);
  coil.position.set(0.35 * Rm, 0.45 * Rm, z1 - 1.8);
  model.addPart("coil", coil, { explode: explodeFor("coil", L.D / 40), order: 3 });

  const train = new THREE.Group();
  [[0, 0, 0.2], [0.25, -0.2, 0.13], [0.1, -0.42, 0.1]].forEach(([x, y, r], i) => {
    const g = gear(r * Rm, 40, 0.2, M.gilt(), { spokes: 0 });
    g.position.set(x * Rm, y * Rm, z1 - 1.6 - i * 0.2);
    train.add(g);
    model.moving.wheels.push({ object: g, speed: (i % 2 ? 1 : -1) * 0.2, phase: i });
  });
  model.addPart("train", train, { explode: explodeFor("train", L.D / 40), order: 2 });

  if (opts.movementType !== "solar") {
    const battery = new THREE.Group();
    const cell = cyl(0.38 * Rm, 1.6, M.metal("steel", "polished"), 64);
    const top = cyl(0.3 * Rm, 1.65, M.metal("steel", "brushed"), 64);
    battery.add(cell, top);
    battery.position.set(-0.3 * Rm, 0.25 * Rm, z1 - 2.4);
    model.addPart("battery", battery, { explode: explodeFor("battery", L.D / 40), order: 4 });
  }
  if (opts.movementType === "kinetic") {
    const rotor = new THREE.Mesh(new THREE.CylinderGeometry(Rm * 0.9, Rm * 0.9, 0.5, 48, 1, false, 0, Math.PI).rotateX(Math.PI / 2), M.metal("steel", "brushed"));
    rotor.position.z = z1 - 3.2;
    model.moving.rotor = rotor;
    model.addPart("rotor", rotor, { explode: explodeFor("rotor", L.D / 40), order: 5 });
  }
}

// ------------------------------------------------------------------ smart

function smart(model, spec, L) {
  const s = L.D / 40;
  const w = L.w * 0.86, h = L.h * 0.86;
  const board = new THREE.Mesh(new RoundedBoxGeometry(w * 1.2, h * 1.1, 0.8, 3, 0.4), new THREE.MeshStandardMaterial({ map: paintCircuit(), roughness: 0.4, metalness: 0.4 }));
  board.material.userData.owned = true;
  board.position.z = L.movZ1 - 0.6;
  model.addPart("chip", board, { explode: explodeFor("chip", L.D / 40), order: 2 });
  const batt = new THREE.Mesh(new RoundedBoxGeometry(w * 1.3, h * 1.2, 2.2, 4, 1), M.painted("#2a2d33", { roughness: 0.5, metalness: 0.3 }));
  batt.position.z = L.movZ1 - 2.4;
  model.addPart("smart_battery", batt, { explode: explodeFor("smart_battery", L.D / 40), order: 3 });
  const sensors = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const led = cyl(0.8, 0.3, M.painted(i % 2 ? "#2bff6a" : "#1a1a1a", { roughness: 0.3 }), 16);
    const a = (i / 4) * TAU + Math.PI / 4;
    led.position.set(Math.cos(a) * 3, Math.sin(a) * 3, L.zB0 + 0.4);
    sensors.add(led);
  }
  model.addPart("sensors", sensors, { explode: explodeFor("sensors", L.D / 40), order: 4 });
}

// ------------------------------------------------------------------ public

export function buildMovement(model, spec, L, opts) {
  const type = opts.movementType;
  if (type === "smart" || L.smart) return smart(model, spec, L);
  if (type === "quartz" || type === "solar" || type === "kinetic") return quartz(model, spec, L, opts);
  return mechanical(model, spec, L, opts);
}
