// Разборка модели до детали (scripts/teardown.py → frontend/assets/teardown/<slug>/).
//
// Каждая деталь: плоский спрайт реального размера в миллиметрах, лежащий в своём слое.
// Все детали одной страницы атласа рисуются одним InstancedMesh (сотни деталей за 1 вызов),
// тени под ними ещё одним. По t от 0 до 1 часы расходятся вдоль своей оси, а камера из вида
// «сверху на циферблат» поворачивается в трёхчетвертной ракурс.

import * as THREE from "three";

const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const Y = new THREE.Vector3(0, 1, 0);
// варианты раскладки лотка и их пропорции (scripts/teardown.py, TRAYS)
const TRAYS = { tray: 1.75, tray_sq: 1.1, tray_tall: 0.72 };

const VERT = /* glsl */ `
  attribute vec4 iUv;
  attribute float iAlpha;
  attribute float iTint;
  varying vec2 vUv;
  varying float vAlpha;
  varying float vTint;
  void main() {
    vUv = vec2(iUv.x + uv.x * iUv.z, 1.0 - iUv.y - iUv.w + uv.y * iUv.w);
    vAlpha = iAlpha;
    vTint = iTint;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }`;

const FRAG = /* glsl */ `
  uniform sampler2D map;
  varying vec2 vUv;
  varying float vAlpha;
  varying float vTint;
  void main() {
    vec4 c = texture2D(map, vUv);
    if (c.a < 0.04) discard;
    gl_FragColor = vec4(c.rgb * (1.0 + vTint * 0.35), c.a * vAlpha);
    #include <colorspace_fragment>
  }`;

// Тень: та же форма, взятая с грубого мипмапа (мягкий край), чёрная и полупрозрачная.
const SHADOW_FRAG = /* glsl */ `
  uniform sampler2D map;
  varying vec2 vUv;
  varying float vAlpha;
  void main() {
    float a = texture2D(map, vUv, 3.5).a;
    gl_FragColor = vec4(0.0, 0.0, 0.0, a * vAlpha);
  }`;

export class Teardown {
  constructor(canvas, slug) {
    this.canvas = canvas;
    this.base = `/assets/teardown/${slug}`;
    this.t = -1;
    this.hover = -1;
    this.focusKey = null;
    this.listeners = new Set();
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(28, 1, 1, 5000);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
  }

  async load() {
    const m = await fetch(`${this.base}/manifest.json`, { cache: "no-cache" }).then((r) => r.json());
    this.manifest = m;
    const loader = new THREE.TextureLoader();
    // ?v=… из манифеста: после пересборки браузер не возьмёт старый атлас из кеша
    const v = m.version ? `?v=${m.version}` : "";
    const pages = await Promise.all(m.pages.map((f) => loader.loadAsync(`${this.base}/${f}${v}`)));
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    for (const tex of pages) {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAniso;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
    }
    this.#alphaMaps(pages);

    // геометрия детали: единичный квадрат, лежащий в плоскости XZ лицом вверх
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.rotateX(-Math.PI / 2);
    const groups = [...new Set(m.parts.map((p) => p.plate))];
    this.parts = m.parts.map((p, i) => ({ ...p, i, trayDelay: (groups.indexOf(p.plate) / Math.max(1, groups.length - 1)) * 0.3 }));
    this.byPage = pages.map(() => []);
    this.parts.forEach((p) => this.byPage[p.page].push(p));
    // снизу вверх: полупрозрачное стекло, нарисованное раньше циферблата, закрыло бы его по глубине
    for (const list of this.byPage) list.sort((p, q) => p.y - q.y);
    this.meshes = [];
    this.shadows = [];
    const floor = Math.min(...this.parts.map((p) => p.y)) - 6;
    this.floor = floor;
    pages.forEach((tex, pi) => {
      const list = this.byPage[pi];
      const n = list.length;
      const g = geo.clone();
      const iUv = new Float32Array(n * 4);
      list.forEach((p, k) => iUv.set(p.uv, k * 4));
      g.setAttribute("iUv", new THREE.InstancedBufferAttribute(iUv, 4));
      g.setAttribute("iAlpha", new THREE.InstancedBufferAttribute(new Float32Array(n).fill(1), 1));
      g.setAttribute("iTint", new THREE.InstancedBufferAttribute(new Float32Array(n), 1));
      const mat = new THREE.ShaderMaterial({ uniforms: { map: { value: tex } }, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: true });
      const mesh = new THREE.InstancedMesh(g, mat, n);
      mesh.frustumCulled = false;
      mesh.userData.list = list;
      this.scene.add(mesh);
      this.meshes.push(mesh);
      const sg = g.clone();
      const smat = new THREE.ShaderMaterial({ uniforms: { map: { value: tex } }, vertexShader: VERT, fragmentShader: SHADOW_FRAG, transparent: true, depthWrite: false });
      const shadow = new THREE.InstancedMesh(sg, smat, n);
      shadow.frustumCulled = false;
      shadow.renderOrder = -1;
      this.scene.add(shadow);
      this.shadows.push(shadow);
    });

    // собранные часы целиком (лист assembled_front): видны в начале и растворяются
    if (m.assembled?.front) {
      const tex = await loader.loadAsync(`${this.base}/${m.assembled.front}${v}`);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAniso;
      const size = m.assembled.front_mm ?? m.case_mm * 1.16;
      const plane = new THREE.Mesh(geo.clone(), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
      plane.scale.set(size * (tex.image.width / tex.image.height), 1, size);
      // лежит прямо над собранными деталями (в собранном виде слои сжаты до 3,5 % высоты)
      plane.position.y = Math.max(...this.parts.map((p) => p.y)) * 0.035 + 0.3;
      plane.renderOrder = 10;
      this.cover = plane;
      this.scene.add(plane);
    }
    this.resize();
    this.setT(0, true);
    return this;
  }

  /** Альфа-каналы атласа в уменьшенном виде: клик попадает только в непрозрачную часть детали. */
  #alphaMaps(pages) {
    this.alpha = pages.map((tex) => {
      const img = tex.image;
      const s = 1024 / Math.max(img.width, img.height);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, c.width, c.height);
      return { w: c.width, h: c.height, data: ctx.getImageData(0, 0, c.width, c.height).data };
    });
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
   *   0 … AX   часы расходятся вдоль своей оси (3D), камера наклоняется;
   *   AX … 1   детали опускаются на лоток часовщика группами, камера возвращается в вид сверху.
   */
  setT(t, force = false) {
    if (!this.parts || (!force && Math.abs(t - this.t) < 1e-4)) return;
    this.t = t;
    const AX = 0.52;
    const a = clamp01(t / AX), b = clamp01((t - AX) / (1 - AX));
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3();
    const layers = this.layers ??= [...new Set(this.parts.map((p) => p.z))].sort((x, y) => x - y);
    const mid = (layers.length - 1) / 2;
    const zRank = this.zRank ??= new Map(layers.map((z, i) => [z, Math.abs(i - mid) / Math.max(1, mid)]));
    const tk = this.#free().trayKey;
    for (const [pi, mesh] of this.meshes.entries()) {
      const shadow = this.shadows[pi];
      const alpha = shadow.geometry.getAttribute("iAlpha");
      mesh.userData.list.forEach((p, k) => {
        // фаза 1: крайние слои (стекло, крышка) уходят первыми
        const e1 = ease(clamp01((a - (1 - zRank.get(p.z)) * 0.35) / 0.65));
        let x = p.at[0] + (p.ex[0] - p.at[0]) * e1;
        let zz = p.at[1] + (p.ex[1] - p.at[1]) * e1;
        let y = p.y * (0.035 + 0.965 * e1);
        let rot = p.rot ?? 0;
        // фаза 2: на лоток, группами с небольшим сдвигом во времени
        const tray = p[tk] ?? p.tray;
        if (b > 0 && tray) {
          const e2 = ease(clamp01((b - (p.trayDelay ?? 0)) / 0.7));
          const arc = Math.sin(Math.PI * e2) * 14; // лёгкая дуга вверх в полёте
          x += (tray[0] - x) * e2;
          zz += (tray[1] - zz) * e2;
          y = y * (1 - e2) + (this.floor + 0.6) * e2 + arc;
          rot = rot * (1 - e2);
        }
        s.set(p.w, 1, p.h);
        q.setFromAxisAngle(Y, -THREE.MathUtils.degToRad(rot));
        m.compose(v.set(x, y, zz), q, s);
        mesh.setMatrixAt(k, m);
        // тень на полу: смещена от света и тем бледнее, чем выше деталь
        const lift = Math.max(0, y - this.floor);
        m.compose(v.set(x + lift * 0.18, this.floor, zz + lift * 0.12), q, s.set(p.w * 1.04, 1, p.h * 1.04));
        shadow.setMatrixAt(k, m);
        alpha.setX(k, 0.42 / (1 + lift * 0.03));
      });
      mesh.instanceMatrix.needsUpdate = true;
      shadow.instanceMatrix.needsUpdate = true;
      alpha.needsUpdate = true;
    }
    if (this.cover) this.cover.material.opacity = 1 - clamp01(t / 0.08);
    this.#camera(a, b);
    this.render();
  }

  /** Точки [x, y, z, радиус] кадра: собранные часы (0), разборка по оси (1). Лоток (2): прямоугольник. */
  #bounds(state, tk = "tray") {
    if (state === 2) {
      // лоток плоский: нужен прямоугольник (на лотке детали не повёрнуты)
      const at = (p) => p[tk] ?? p.tray;
      const xs = this.parts.flatMap((p) => [at(p)[0] - p.w / 2, at(p)[0] + p.w / 2]);
      const zs = this.parts.flatMap((p) => [at(p)[1] - p.h / 2, at(p)[1] + p.h / 2]);
      const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
      return { c: new THREE.Vector3((x0 + x1) / 2, this.floor, (z0 + z1) / 2), w: x1 - x0, h: z1 - z0 };
    }
    // кадр по корпусу и механизму: браслет длинный и делал бы часы мелкими, он уходит за край
    const core = this.parts.filter((p) => !["bracelet", "strap"].includes(p.plate));
    return (core.length ? core : this.parts).map((p) => [
      p.at[0] + (p.ex[0] - p.at[0]) * state,
      p.y * (0.035 + 0.965 * state),
      p.at[1] + (p.ex[1] - p.at[1]) * state,
      Math.max(p.w, p.h) / 2,
    ]);
  }

  /**
   * Центр и расстояние камеры, при которых все точки видны под заданным ракурсом.
   * Точки проецируются в плоскость камеры, кадр центрируется по их реальным границам, а не по
   * описанной сфере: высокая стопка деталей под углом занимает гораздо меньше места, чем сфера.
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
    // лоток с пропорциями, ближайшими к свободной области (широкий, квадратный или высокий)
    const k = Math.log(freeW / freeH);
    const trayKey = Object.entries(TRAYS).sort((x, y) => Math.abs(Math.log(x[1]) - k) - Math.abs(Math.log(y[1]) - k))[0][0];
    return { W, H, inset, top, bottom, freeW, freeH, trayKey };
  }

  #camera(a = 0, b = 0) {
    const { W, H, inset, top, bottom, freeW, freeH, trayKey } = this.#free();
    // тангенсы половинных углов обзора, суженных до свободной части холста
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const tanV = (tanH * freeH) / H, tanW = (tanH * freeW) / H;
    const rad = THREE.MathUtils.degToRad;
    const key = `${W}x${H}:${inset}:${top}:${bottom}`;
    if (this.fitKey !== key) {
      const pts = (this.pts ??= [this.#bounds(0), this.#bounds(1)]);
      const C = this.#bounds(2, trayKey);
      this.fitKey = key;
      this.fit = [
        this.#fitView(pts[0], rad(3), 0, tanW, tanV, 1.18),
        this.#fitView(pts[1], rad(55), rad(-20), tanW, tanV, 1.04),
        { c: C.c, d: Math.max(C.h / 2 / tanV, C.w / 2 / tanW) * 1.08 },
      ];
    }
    const [A, B, C] = this.fit;
    const ea = ease(a), eb = ease(b);
    const polar = rad((3 + 52 * ea) * (1 - eb) + 0.5 * eb);
    const azim = rad(-20 * ea * (1 - eb));
    const target = A.c.clone().lerp(B.c, ea).lerp(C.c, eb);
    let r = A.d + (B.d - A.d) * ea;
    r += (C.d - r) * eb;
    this.camera.position.set(target.x + Math.sin(polar) * Math.sin(azim) * r, target.y + Math.cos(polar) * r, target.z + Math.sin(polar) * Math.cos(azim) * r);
    this.camera.up.set(0, 0, -1);
    this.camera.lookAt(target);
    // «сдвиг объектива»: центр сцены в середине свободной части, а не всего холста
    this.camera.setViewOffset(W, H, -inset / 2, -(top - bottom) / 2, W, H);
  }

  /** Подсветить детали с ключом key (остальные приглушить); null снимает подсветку. */
  highlight(key) {
    this.focusKey = key;
    for (const mesh of this.meshes) {
      const a = mesh.geometry.getAttribute("iAlpha");
      mesh.userData.list.forEach((p, k) => a.setX(k, !key || p.key === key ? 1 : 0.14));
      a.needsUpdate = true;
    }
    this.render();
  }

  #setHover(i) {
    if (i === this.hover) return;
    for (const mesh of this.meshes) {
      const a = mesh.geometry.getAttribute("iTint");
      mesh.userData.list.forEach((p, k) => a.setX(k, p.i === i ? 1 : 0));
      a.needsUpdate = true;
    }
    this.hover = i;
    this.render();
  }

  /** Деталь под курсором (с учётом прозрачности спрайта). */
  pick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hits = ray.intersectObjects(this.meshes, false).sort((a, b) => a.distance - b.distance);
    for (const h of hits) {
      const p = h.object.userData.list[h.instanceId];
      if (this.focusKey && p.key !== this.focusKey) continue;
      const a = this.alpha[p.page];
      const u = p.uv[0] + h.uv.x * p.uv[2], v = p.uv[1] + (1 - h.uv.y) * p.uv[3];
      const px = Math.min(a.w - 1, Math.floor(u * a.w)), py = Math.min(a.h - 1, Math.floor(v * a.h));
      if (a.data[(py * a.w + px) * 4 + 3] > 60) return p;
    }
    return null;
  }

  bind() {
    const c = this.canvas;
    let raf = 0;
    c.addEventListener("pointermove", (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const p = this.t > 0.2 ? this.pick(e.clientX, e.clientY) : null;
        this.#setHover(p ? p.i : -1);
        c.style.cursor = p ? "pointer" : "";
        this.listeners.forEach((fn) => fn({ type: "hover", part: p, x: e.clientX, y: e.clientY }));
      });
    });
    c.addEventListener("pointerleave", () => {
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

  /** Список деталей для панели: уникальные пары ключ + название, по слоям сверху вниз. */
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
    this.ro.disconnect();
    this.scene.traverse((o) => {
      o.geometry?.dispose?.();
      o.material?.uniforms?.map?.value?.dispose?.();
      o.material?.map?.dispose?.();
      o.material?.dispose?.();
    });
    this.renderer.dispose();
  }
}

/** Есть ли для модели готовая разборка до детали. */
export async function hasTeardown(slug) {
  try {
    const r = await fetch(`/assets/teardown/${slug}/manifest.json`, { method: "HEAD", cache: "no-store" });
    return r.ok;
  } catch {
    return false;
  }
}
