// Offline parametric reconstruction. Run scripts/build_catalogue_workshops.mjs to bake GLBs.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { buildWatch } from "../watch3d/factory.js";
import * as M from "../watch3d/materials.js";
import { workshopProfile } from "./profiles.js";
import { buildDetailedMovement } from "./build-movement.js";

const PARTS = {
  case: ["Корпус", 0, "Удерживает механизм и защищает внутренние узлы вместе со стеклом, крышкой и уплотнениями."],
  crown: ["Головка", 2, "Позволяет устанавливать время и, если предусмотрено механизмом, заводить часы вручную."],
  crown_guard: ["Защита головки", 2, "Защищает органы управления от случайных ударов."],
  caseback: ["Задняя крышка", 2, "Закрывает корпус со стороны механизма."],
  caseback_display: ["Задняя крышка", 2, "Крышка с прозрачным окном позволяет рассматривать механизм."],
  bezel: ["Безель", 6, "Обрамляет стекло. Функция и шкала зависят от выбранной модели."],
  bezel_insert: ["Вставка безеля", 6, "Несёт шкалу, предусмотренную конструкцией этих часов."],
  dial: ["Циферблат", 6, "Несёт шкалы и обозначения. Окна и вспомогательные указатели соответствуют конфигурации модели в атласе."],
  flange: ["Фланец циферблата", 6, "Обрамляет циферблат и отделяет его от стекла."],
  date_disc: ["Диск даты", 6, "Перемещает числа относительно окна даты."],
  hand_hour: ["Часовая стрелка", 6, "Показывает часы, вращаясь медленнее минутной стрелки."],
  hand_minute: ["Минутная стрелка", 6, "Показывает минуты на основной шкале."],
  hand_second: ["Секундная стрелка", 6, "Показывает секунды или отсчёт хронографа, в зависимости от исполнения."],
  hand_gmt: ["Стрелка второго пояса", 6, "Позволяет читать дополнительный часовой пояс по соответствующей шкале."],
  crystal: ["Стекло", 6, "Защищает индикацию и позволяет считывать показания."],
  crystal_hesalite: ["Стекло", 6, "Прозрачное акриловое стекло защищает индикацию."],
};

function convexLink(source) {
  const g = source.clone(); g.computeBoundingBox();
  const b = g.boundingBox, w = b.max.x - b.min.x, h = b.max.y - b.min.y, d = b.max.z - b.min.z;
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (z > 0) pos.setZ(i, z + .14 * d * Math.max(0, Math.cos(Math.PI * x / w)) * Math.max(0, Math.cos(Math.PI * y / h)));
  }
  g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
  return g;
}

export function buildWorkshopModel(watch) {
  const profile = workshopProfile(watch);
  const original = buildWatch(watch.render, {
    detail: "hero", diameter: watch.case.diameter_mm, thickness: watch.case.thickness_mm || 11,
    movementType: watch.movement.type, frequency: watch.movement.frequency_vph,
    logo: watch.brand_name, calibre: watch.movement.caliber, movement: false,
  });
  original.update(new Date(2026, 0, 1, 10, 10, 32), 0);
  original.root.updateWorldMatrix(true, true);
  const root = new THREE.Group(), names = new Map();
  const add = (role, name, object, stage, text, material = "Материал и отделка по конфигурации модели") => {
    const index = (names.get(name) || 0) + 1; names.set(name, index);
    object.name = index > 1 ? `${name} ${index}` : name;
    object.userData = { ...object.userData, name: object.name, workshop: { role, name: object.name, stage, title: object.name, text, material } };
    if (object.parent) root.attach(object); else root.add(object);
    return object;
  };
  const pin = (name, x, y, z, threaded = false, stage = 1, length = original.L.strapW) => {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(new THREE.CylinderGeometry(.28, .28, length, 16).rotateZ(Math.PI / 2), M.metal("steel", "polished")));
    group.position.set(x, y, z);
    const node = add(threaded ? "screw" : "springbar", name, group, stage, threaded ? "Резьбовое крепление звена. В модели сначала выкручивается, затем освобождает соединённые части." : "Пружинная шпилька удерживает ремешок между ушками корпуса.", "Сталь");
    if (threaded) Object.assign(node.userData, { workshop_axis: [1, 0, 0], workshop_turns: 3, workshop_pitch: .12 });
    return node;
  };
  const strapParts = original.parts.filter(part => ["bracelet", "strap"].includes(part.key));
  for (const [half, entry] of strapParts.entries()) {
    const side = half === 0 ? "12" : "6";
    if (entry.key === "bracelet") {
      for (const [column, inst] of entry.object.children.entries()) {
        if (!inst.isInstancedMesh) continue;
        let source = inst.geometry;
        if (["five_link", "jubilee"].includes(watch.render.strap.type) && column >= 2) {
          source.computeBoundingBox(); const size = source.boundingBox.getSize(new THREE.Vector3());
          source = new RoundedBoxGeometry(size.x, size.y / .46 * .94, size.z, 3, .4);
        }
        const geometry = convexLink(source), matrix = new THREE.Matrix4();
        if (source !== inst.geometry) source.dispose();
        for (let i = 0; i < inst.count; i++) {
          inst.getMatrixAt(i, matrix);
          const link = new THREE.Mesh(geometry, inst.material);
          link.applyMatrix4(matrix.clone().premultiply(inst.matrixWorld));
          add("bracelet", `Звено ${side} часов: ряд ${i + 1}, элемент ${column + 1}`, link, 1, "Отдельная часть звена обеспечивает подвижность браслета и распределяет нагрузку на запястье.");
          if (column === 0) {
            const p = new THREE.Vector3().setFromMatrixPosition(matrix.clone().premultiply(inst.matrixWorld));
            pin(`Винт звена ${side} часов ${i + 1}`, 0, p.y, p.z, true, 1, original.L.strapW * new THREE.Vector3().setFromMatrixScale(matrix).x);
          }
        }
      }
    } else add("strap", `Ремешок ${side} часов`, entry.object, 1, "Гибкая часть крепления удерживает часы на запястье. Прострочка и слои показаны единым изделием.", watch.bracelet || "Материал ремешка по конфигурации модели");
    const attachY = (half === 0 ? 1 : -1) * (original.L.h + original.L.lugLen * .5);
    pin(`Шпилька ${side} часов`, 0, attachY, (original.L.zM0 + original.L.zM1) / 2);
  }
  for (const entry of original.parts) {
    if (["bracelet", "strap", "indices"].includes(entry.key)) continue;
    if (entry.key === "pushers" || entry.key === "subdial_hands" || entry.key === "bezel_screws") {
      for (const [i, child] of [...entry.object.children].entries()) {
        const screw = entry.key === "bezel_screws";
        const node = add(screw ? "screw" : entry.key, `${screw ? "Винт безеля" : entry.key === "pushers" ? "Кнопка" : "Стрелка счётчика"} ${i + 1}`, child, entry.key === "pushers" ? 2 : 6, screw ? "Удерживает детали внешнего обрамления корпуса." : entry.key === "pushers" ? "Передаёт нажатие управляющему узлу." : "Показывает значение вспомогательного указателя.");
        if (screw) Object.assign(node.userData, { workshop_axis: [0, 1, 0], workshop_turns: 3, workshop_pitch: .1 });
      }
      continue;
    }
    const description = PARTS[entry.key];
    if (!description) throw new Error(`Unmapped exterior: ${entry.key}`);
    const [name, stage, text] = description;
    add(entry.key, profile.type === "smart" || profile.digital ? entry.key === "dial" ? "Дисплей" : name : name, entry.object, stage, text);
  }
  // Preserve the exterior factory's triangles, double batons, diamonds and lume.
  // Its merged meshes are partitioned by hour, so each applied marker remains selectable.
  const indices = original.parts.find(part => part.key === "indices")?.object;
  if (indices) {
    const markers = Array.from({ length: 12 }, () => new THREE.Group());
    indices.traverse(source => {
      if (!source.isMesh) return;
      const geometry = source.geometry.index ? source.geometry.toNonIndexed() : source.geometry;
      const position = geometry.attributes.position, buckets = Array.from({ length: 12 }, () => []);
      for (let i = 0; i < position.count; i += 3) {
        const x = position.getX(i) + position.getX(i + 1) + position.getX(i + 2);
        const y = position.getY(i) + position.getY(i + 1) + position.getY(i + 2);
        const hour = ((Math.round((Math.PI / 2 - Math.atan2(y, x)) * 6 / Math.PI) % 12) + 12) % 12;
        buckets[hour].push(i, i + 1, i + 2);
      }
      buckets.forEach((vertices, hour) => {
        if (!vertices.length) return;
        const g = new THREE.BufferGeometry();
        for (const [key, attr] of Object.entries(geometry.attributes)) {
          const data = new Float32Array(vertices.length * attr.itemSize);
          vertices.forEach((vertex, i) => { for (let c = 0; c < attr.itemSize; c++) data[i * attr.itemSize + c] = attr.array[vertex * attr.itemSize + c]; });
          g.setAttribute(key, new THREE.BufferAttribute(data, attr.itemSize));
        }
        const marker = new THREE.Mesh(g, source.material); marker.applyMatrix4(source.matrixWorld);
        markers[hour].add(marker);
      });
      if (geometry !== source.geometry) geometry.dispose();
    });
    markers.forEach((marker, hour) => {
      if (marker.children.length) add("index", `Метка ${hour || 12} часов`, marker, 6, "Накладной часовой индекс помогает читать время. Светящийся слой показан вместе с металлическим основанием.");
    });
  }
  // Caseback fasteners are educational fixtures, not a claim about the factory attachment method.
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const screw = new THREE.Group();
    screw.add(new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .4, 20).rotateX(Math.PI / 2), M.metal("steel", "polished")));
    const slot = new THREE.Mesh(new THREE.BoxGeometry(.8, .15, .08), M.painted("#182029")); slot.position.z = -.22; screw.add(slot);
    screw.position.set(Math.cos(a) * original.L.R * .8, Math.sin(a) * original.L.R * .8, original.L.zB0 - .1);
    const node = add("screw", `Винт крышки ${i + 1}`, screw, 2, "Учебное крепление крышки. Точный способ крепления зависит от модели и не является сервисной схемой.");
    Object.assign(node.userData, { workshop_axis: [0, -1, 0], workshop_turns: 3, workshop_pitch: .1 });
  }
  buildDetailedMovement(watch, profile, original.L, add);
  if (profile.complications.includes("split-seconds")) {
    const second = original.parts.find(part => part.key === "hand_second");
    if (second) { const extra = second.object.clone(true); extra.position.z += .18; add("split_hand", "Сплит-секундная стрелка", extra, 6, "Позволяет отмечать промежуточное время независимо от основной стрелки хронографа."); }
  }
  // Keep stitches and other instanced decorations inside their physical parent.
  // GLTFExporter emits GPU-instanced nodes separately, which would orphan them on disassembly.
  const instances = []; root.traverse(node => { if (node.isInstancedMesh) instances.push(node); });
  for (const inst of instances) {
    const group = new THREE.Group(); group.copy(inst, false); group.isInstancedMesh = false;
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < inst.count; i++) {
      inst.getMatrixAt(i, matrix); const item = new THREE.Mesh(inst.geometry, inst.material);
      item.applyMatrix4(matrix); group.add(item);
    }
    inst.parent.add(group); inst.removeFromParent();
  }
  // Export root-level physical parts in the same Y-up coordinates as the Submariner workshop.
  root.rotation.x = -Math.PI / 2; root.updateWorldMatrix(true, true);
  const scene = new THREE.Scene();
  for (const node of [...root.children]) scene.attach(node);
  // WebP keeps fine dial printing while avoiding multi-megabyte uncompressed noise maps.
  scene.traverse(object => {
    for (const material of object.material ? Array.isArray(object.material) ? object.material : [object.material] : []) {
      if (!material.name) material.name = material.metalness > .5 && material.roughness >= .25 ? "Сатин и шлифовка" : "Отделка детали";
      for (const value of Object.values(material)) if (value?.isTexture) value.userData.mimeType = "image/webp";
    }
  });
  scene.userData = { slug: watch.slug, family: profile.family, caliber: watch.movement.caliber, generator: "horologium-catalogue-v1" };
  return { scene, profile, parts: scene.children, dispose() {
    const geos = new Set(), mats = new Set(), textures = new Set();
    for (const source of [scene, original.root]) source.traverse(o => {
      if (o.geometry) geos.add(o.geometry);
      for (const mat of o.material ? Array.isArray(o.material) ? o.material : [o.material] : []) {
        mats.add(mat); for (const value of Object.values(mat)) if (value?.isTexture) textures.add(value);
      }
    });
    geos.forEach(g => g.dispose()); mats.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
  } };
}
