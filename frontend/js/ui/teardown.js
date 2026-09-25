// Разборка модели до детали (scripts/teardown.py → frontend/assets/teardown/<slug>/).
//
// Каждая деталь: плоский спрайт реального размера в миллиметрах, лежащий в своём слое.
// Все детали одной страницы атласа рисуются одним InstancedMesh (сотни деталей за 1 вызов),
// тени под ними ещё одним. По t от 0 до 1 часы расходятся вдоль своей оси, а камера из вида
// «сверху на циферблат» поворачивается в трёхчетвертной ракурс.

import * as THREE from "three";

const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const clamp01 = (x) => Math.min(1, Math.max(0, x));

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
    const m = await fetch(`${this.base}/manifest.json`).then((r) => r.json());
    this.manifest = m;
    const loader = new THREE.TextureLoader();
    const pages = await Promise.all(m.pages.map((f) => loader.loadAsync(`${this.base}/${f}`)));
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
    this.parts = m.parts.map((p, i) => ({ ...p, i }));
    this.byPage = pages.map(() => []);
    this.parts.forEach((p) => this.byPage[p.page].push(p));
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
      const tex = await loader.loadAsync(`${this.base}/${m.assembled.front}`);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAniso;
      const size = m.assembled.front_mm ?? m.case_mm * 1.16;
      const plane = new THREE.Mesh(geo.clone(), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
      plane.scale.set(size * (tex.image.width / tex.image.height), 1, size);
      plane.position.y = Math.max(...this.parts.map((p) => p.y)) + 0.5;
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
    if (this.parts) this.#camera();
    this.render();
  }

  /** t: 0 собраны, 1 разобраны до детали. */
  setT(t, force = false) {
    if (!this.parts || (!force && Math.abs(t - this.t) < 1e-4)) return;
    this.t = t;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3();
    const layers = [...new Set(this.parts.map((p) => p.z))].sort((a, b) => a - b);
    const mid = (layers.length - 1) / 2;
    const zRank = new Map(layers.map((z, i) => [z, Math.abs(i - mid) / Math.max(1, mid)]));
    for (const [pi, mesh] of this.meshes.entries()) {
      const shadow = this.shadows[pi];
      const alpha = shadow.geometry.getAttribute("iAlpha");
      mesh.userData.list.forEach((p, k) => {
        // крайние слои (стекло, крышка) уходят первыми, середина механизма последней
        const delay = (1 - zRank.get(p.z)) * 0.35;
        const e = ease(clamp01((t - delay) / 0.6));
        const x = p.at[0] + (p.ex[0] - p.at[0]) * e;
        const zz = p.at[1] + (p.ex[1] - p.at[1]) * e;
        const y = p.y * (0.035 + 0.965 * e);
        s.set(p.w, 1, p.h);
        m.compose(v.set(x, y, zz), q, s);
        mesh.setMatrixAt(k, m);
        // тень на полу: смещена от света и тем бледнее, чем выше деталь
        const lift = y - this.floor;
        m.compose(v.set(x + lift * 0.18, this.floor, zz + lift * 0.12), q, s.set(p.w * 1.04, 1, p.h * 1.04));
        shadow.setMatrixAt(k, m);
        alpha.setX(k, 0.42 / (1 + lift * 0.03));
      });
      mesh.instanceMatrix.needsUpdate = true;
      shadow.instanceMatrix.needsUpdate = true;
      alpha.needsUpdate = true;
    }
    if (this.cover) this.cover.material.opacity = 1 - clamp01(t / 0.12);
    this.#camera();
    this.render();
  }

  /** Сфера, в которую помещаются детали при данном t (собранные часы или вся разборка). */
  #bounds(k) {
    const pts = this.parts.map((p) => [p.at[0] + (p.ex[0] - p.at[0]) * k, p.y * (0.035 + 0.965 * k), p.at[1] + (p.ex[1] - p.at[1]) * k, Math.max(p.w, p.h) / 2]);
    // без браслета: он длинный, и кадр по нему делает механизм мелким
    const core = this.parts.map((p, i) => (p.plate === "bracelet" || p.plate === "strap" ? null : pts[i])).filter(Boolean);
    const use = core.length ? core : pts;
    const c = use.reduce((a, p) => [a[0] + p[0] / use.length, a[1] + p[1] / use.length, a[2] + p[2] / use.length], [0, 0, 0]);
    const r = Math.max(...use.map((p) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) + p[3]));
    return { c: new THREE.Vector3(...c), r };
  }

  #camera() {
    const t = ease(clamp01(this.t));
    this.fitA ??= this.#bounds(0);
    this.fitB ??= this.#bounds(1);
    const polar = THREE.MathUtils.degToRad(3 + 55 * t); // от вида сверху к трёхчетвертному
    const azim = THREE.MathUtils.degToRad(-22 * t);
    const half = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const aspect = Math.min(1, this.camera.aspect);
    const dist = (b) => (b.r * 1.02) / Math.sin(half) / aspect;
    const target = this.fitA.c.clone().lerp(this.fitB.c, t);
    const r = dist(this.fitA) + (dist(this.fitB) - dist(this.fitA)) * t;
    this.camera.position.set(target.x + Math.sin(polar) * Math.sin(azim) * r, target.y + Math.cos(polar) * r, target.z + Math.sin(polar) * Math.cos(azim) * r);
    this.camera.up.set(0, 0, -1);
    this.camera.lookAt(target);
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
    const r = await fetch(`/assets/teardown/${slug}/manifest.json`, { method: "HEAD" });
    return r.ok;
  } catch {
    return false;
  }
}
