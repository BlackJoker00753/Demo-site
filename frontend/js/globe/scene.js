// Глобус: постоянный фоновый слой главной и страниц стран.
//
// Публичный API (используется страницами):
//   setMode("visible" | "hidden")
//   overview()                         обзор всей планеты, авто-вращение
//   focus(country, { shift })          перелёт к стране, снимок Sentinel-2, границы
//   setPins(pins) / highlightPin(slug) бренды на карте страны
//   preview(iso)                        подсветка страны из списка
//   setShift(px)                        сдвиг глобуса вправо, чтобы освободить место панели
//   on("hover" | "click" | "pin", cb)

import * as THREE from "three";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { esc } from "../core/dom.js";
import { reduced } from "../core/motion.js";
import {
  bordersGeometry, lonLatToVec3, loadCountryShape, loadFrames, loadIdPicker, loadWorld, raySphere, ringArea,
  ringPositions, vec3ToLonLat,
} from "./geo.js";
import * as SH from "./shaders.js";

const LUME = new THREE.Color("#9fe9c4");
const DEG = Math.PI / 180;
const HALO_R = 1.2;

export class GlobeScene {
  constructor(canvas, markers) {
    this.canvas = canvas;
    this.markers = markers;
    this.layer = canvas.parentElement;
    this.handlers = { hover: new Set(), click: new Set(), pin: new Set() };
    this.mode = "visible";
    this.running = false;
    this.ready = false;

    // Состояние камеры, которое анимирует GSAP.
    this.rig = { lat: 24, lon: 18, dist: 3.35, tilt: 0, focusT: 0, flon: 0, flat: 0, sx: 0, sy: 0 };
    this.drag = { active: false, x: 0, y: 0, vx: 0, vy: 0, moved: 0 };
    this.parallax = { x: 0, y: 0, tx: 0, ty: 0 };
    this.autoRotate = true;
    this.focused = null;
    this.pins = [];
    this.pinClusters = [];
    this.hoverId = 0;
    this.countriesById = new Map();
    this.countriesByIso = new Map();
    this.time = { last: performance.now(), elapsed: 0 };
  }

  on(event, cb) {
    this.handlers[event].add(cb);
    return () => this.handlers[event].delete(cb);
  }
  #emit(event, payload) {
    this.handlers[event].forEach((cb) => cb(payload));
  }

  // ------------------------------------------------------------------ setup

  async init(ourCountries) {
    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x07080a, 1);
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.01, 200);

    const loader = new THREE.TextureLoader();
    const load = (url) => loader.loadAsync(url);
    const [day, night, ids, world, picker, frames] = await Promise.all([
      load("/assets/earth/day-2k.jpg"),
      load("/assets/earth/night-4k.jpg"),
      load("/assets/earth/country-ids-4k.png"),
      loadWorld(),
      loadIdPicker(),
      loadFrames(),
    ]);
    this.picker = picker;
    this.frames = frames;
    day.colorSpace = THREE.SRGBColorSpace;
    night.colorSpace = THREE.SRGBColorSpace;
    day.anisotropy = renderer.capabilities.getMaxAnisotropy();
    ids.colorSpace = THREE.NoColorSpace;
    ids.magFilter = ids.minFilter = THREE.NearestFilter;
    ids.generateMipmaps = false;

    for (const c of world.countries) {
      this.countriesById.set(c.id, c);
      this.countriesByIso.set(c.a3, c);
    }
    this.ours = new Map(ourCountries.map((c) => [c.iso_a3, c]));
    const ourIds = ourCountries.map((c) => this.countriesByIso.get(c.iso_a3)?.id ?? -1);

    // Земля
    this.earthUniforms = {
      uDay: { value: day },
      uNight: { value: night },
      uIds: { value: ids },
      uSun: { value: new THREE.Vector3(1, 0.4, 1) },
      uHover: { value: -1 },
      uSelected: { value: -1 },
      uFocus: { value: 0 },
      uOurs: { value: [...ourIds, ...Array(16 - ourIds.length).fill(-1)] },
      uOursCount: { value: ourIds.length },
      uLume: { value: LUME.clone().convertSRGBToLinear() },
      uTime: { value: 0 },
    };
    this.earth = new THREE.Mesh(
      new THREE.SphereGeometry(1, 160, 120),
      new THREE.ShaderMaterial({ uniforms: this.earthUniforms, vertexShader: SH.earthVertex, fragmentShader: SH.earthFragment }),
    );
    this.scene.add(this.earth);

    // Атмосфера
    this.atmoUniforms = {
      uSun: this.earthUniforms.uSun,
      uIntensity: { value: 0.75 },
      uLimb: { value: Math.sqrt(1 - 1 / (HALO_R * HALO_R)) },
    };
    this.atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(HALO_R, 96, 64),
      new THREE.ShaderMaterial({
        uniforms: this.atmoUniforms, vertexShader: SH.atmosphereVertex, fragmentShader: SH.atmosphereFragment,
        side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }),
    );
    this.scene.add(this.atmosphere);

    // Границы: все страны тонко, наши чуть ярче.
    const ourIso = new Set(ourCountries.map((c) => c.iso_a3));
    this.borders = new THREE.LineSegments(
      bordersGeometry(world.countries, 1.0012, (c) => !ourIso.has(c.a3)),
      new THREE.LineBasicMaterial({ color: 0xc9d4de, transparent: true, opacity: 0.16, depthWrite: false }),
    );
    this.ourBorders = new THREE.LineSegments(
      bordersGeometry(world.countries, 1.0014, (c) => ourIso.has(c.a3)),
      new THREE.LineBasicMaterial({ color: 0xdff3ea, transparent: true, opacity: 0.42, depthWrite: false }),
    );
    this.scene.add(this.borders, this.ourBorders);

    this.#buildStars();
    this.#bindEvents();
    this.#resize();
    new ResizeObserver(() => this.#resize()).observe(this.layer);

    this.tooltip = document.createElement("div");
    this.tooltip.className = "gtip";
    this.markers.append(this.tooltip);
    this.coords = document.createElement("div");
    this.coords.className = "gcoords mono";
    this.markers.append(this.coords);

    this.ready = true;
    this.rig.dist = this.fitDist();
    this.#applyShift();
    if (this.mode === "visible") this.#start();
    this.#upgradeDayTexture(loader);
    return this;
  }

  async #upgradeDayTexture(loader) {
    // Сначала быстрый 2K, затем 8K для крупных планов.
    const hi = await loader.loadAsync("/assets/earth/day-8k.jpg").catch(() => null);
    if (!hi) return;
    hi.colorSpace = THREE.SRGBColorSpace;
    hi.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.renderer.initTexture(hi);
    const old = this.earthUniforms.uDay.value;
    this.earthUniforms.uDay.value = hi;
    old.dispose();
  }

  #buildStars() {
    const n = 5200;
    const pos = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const seed = new Float32Array(n);
    const v = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(70 + Math.random() * 30);
      pos.set([v.x, v.y, v.z], i * 3);
      const r = Math.random();
      size[i] = r > 0.985 ? 2.6 + Math.random() * 1.2 : 0.7 + Math.pow(Math.random(), 3) * 1.6;
      seed[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    this.starUniforms = { uTime: { value: 0 }, uPixelRatio: { value: this.renderer.getPixelRatio() } };
    this.stars = new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        uniforms: this.starUniforms, vertexShader: SH.starsVertex, fragmentShader: SH.starsFragment,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }),
    );
    this.scene.add(this.stars);
  }

  #resize() {
    const w = this.layer.clientWidth, h = this.layer.clientHeight;
    if (!w || !h) return;
    this.size = { w, h };
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    (this.borderMats ?? []).forEach((m) => m.resolution.set(w, h));
    this.#applyShift();
    this.#layoutPins();
  }

  /** Дистанция камеры, при которой глобус занимает долю k от меньшей стороны экрана. */
  fitDist(k = this.size && this.size.w < 760 ? 0.62 : 0.74) {
    const aspect = this.size ? this.size.w / this.size.h : 1.6;
    let t = k * Math.tan((this.camera.fov * DEG) / 2);
    if (aspect < 1) t *= aspect;
    return 1 / Math.sin(Math.atan(t));
  }

  #applyShift() {
    if (!this.size) return;
    const { w, h } = this.size;
    const { sx, sy } = this.rig;
    if (sx || sy) this.camera.setViewOffset(w, h, -sx, sy, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------------ interaction

  #bindEvents() {
    const el = this.canvas;
    el.addEventListener("pointerdown", (e) => {
      if (this.focused) return;
      this.drag = { active: true, x: e.clientX, y: e.clientY, vx: 0, vy: 0, moved: 0 };
      el.setPointerCapture(e.pointerId);
      this.autoRotate = false;
      this.layer.classList.add("is-dragging");
    });
    el.addEventListener("pointermove", (e) => {
      this.pointer = { x: e.clientX, y: e.clientY };
      if (this.drag.active) {
        const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y;
        this.drag.x = e.clientX;
        this.drag.y = e.clientY;
        this.drag.moved += Math.abs(dx) + Math.abs(dy);
        const k = 0.16 * (this.rig.dist - 1) / 2.3;
        this.drag.vx = -dx * k;
        this.drag.vy = dy * k;
        this.rig.lon += this.drag.vx;
        this.rig.lat = THREE.MathUtils.clamp(this.rig.lat + this.drag.vy, -70, 75);
      }
      const { w, h } = this.size;
      this.parallax.tx = (e.clientX / w - 0.5) * 2;
      this.parallax.ty = (e.clientY / h - 0.5) * 2;
      this.needsPick = true;
    });
    const end = (e) => {
      if (!this.drag.active) return;
      this.drag.active = false;
      this.layer.classList.remove("is-dragging");
      clearTimeout(this.autoTimer);
      this.autoTimer = setTimeout(() => { if (!this.focused) this.autoRotate = true; }, 4000);
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("pointerleave", () => { this.pointer = null; this.needsPick = true; });
    el.addEventListener("click", (e) => {
      if (this.drag.moved > 6) return;
      const hit = this.#pick(e.clientX, e.clientY);
      if (hit?.country) this.#emit("click", hit);
    });
    el.addEventListener("wheel", (e) => {
      if (this.focused) return;
      e.preventDefault();
      const base = this.fitDist();
      this.rig.dist = THREE.MathUtils.clamp(this.rig.dist * (1 + e.deltaY * 0.0012), 1.6, base * 1.35);
    }, { passive: false });
    document.addEventListener("visibilitychange", () => (document.hidden ? this.#stop() : this.mode === "visible" && this.#start()));
  }

  #pick(x, y) {
    if (!this.size) return null;
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const p = raySphere(ray.ray, 1);
    if (!p) return null;
    const { lon, lat } = vec3ToLonLat(p);
    const id = this.picker.idAt(lon, lat);
    const feature = this.countriesById.get(id);
    const country = feature ? this.ours.get(feature.a3) : null;
    return { id, lon, lat, feature, country };
  }

  #updateHover() {
    if (!this.needsPick) return;
    this.needsPick = false;
    const hit = this.pointer && !this.drag.active ? this.#pick(this.pointer.x, this.pointer.y) : null;
    const id = hit?.feature ? hit.id : 0;
    const focusedId = this.focused ? this.countriesByIso.get(this.focused.iso_a3)?.id : -1;
    const interactive = !!hit?.country && id !== focusedId;
    this.earthUniforms.uHover.value = interactive ? id : this.focused ? -1 : id ? id : -1;
    if (!this.focused && id && !interactive) this.earthUniforms.uHover.value = -1;
    this.canvas.style.cursor = interactive ? "pointer" : this.focused ? "default" : this.drag.active ? "grabbing" : "grab";

    if (this.focused && hit) {
      this.coords.textContent = `${Math.abs(hit.lat).toFixed(2)}° ${hit.lat >= 0 ? "N" : "S"}   ${Math.abs(hit.lon).toFixed(2)}° ${hit.lon >= 0 ? "E" : "W"}`;
    }
    if (hit?.feature && this.pointer && (!this.focused || interactive)) {
      const c = hit.country;
      this.tooltip.innerHTML = c
        ? `<b>${esc(c.name)}</b><span>${esc(c.brand_count)} ${c.brand_count % 10 === 1 && c.brand_count % 100 !== 11 ? "бренд" : c.brand_count % 10 >= 2 && c.brand_count % 10 <= 4 && (c.brand_count % 100 < 12 || c.brand_count % 100 > 14) ? "бренда" : "брендов"}</span>`
        : `<span class="muted">${esc(hit.feature.name)}</span>`;
      this.tooltip.style.transform = `translate3d(${this.pointer.x + 16}px, ${this.pointer.y + 14}px, 0)`;
      this.tooltip.classList.add("is-on");
      this.tooltip.classList.toggle("is-ours", !!c);
    } else {
      this.tooltip.classList.remove("is-on");
    }
    if (id !== this.hoverId) {
      this.hoverId = id;
      this.#emit("hover", hit?.country ?? null);
    }
  }

  // ------------------------------------------------------------------ modes & camera

  setMode(mode) {
    this.mode = mode;
    this.layer.classList.toggle("is-hidden", mode === "hidden");
    if (mode === "visible") this.#start();
    else {
      clearTimeout(this.stopTimer);
      this.stopTimer = setTimeout(() => this.mode === "hidden" && this.#stop(), 900);
      this.tooltip?.classList.remove("is-on");
    }
  }

  /** Сдвиг изображения: x вправо, y вверх (в пикселях), чтобы освободить место под панели. */
  setShift({ x = 0, y = 0 } = {}, duration = 1.2) {
    const g = window.gsap;
    if (!this.ready) { Object.assign(this.rig, { sx: x, sy: y }); return; }
    if (!g || reduced() || !duration) { Object.assign(this.rig, { sx: x, sy: y }); this.#applyShift(); return; }
    g.to(this.rig, { sx: x, sy: y, duration, ease: "expo.inOut", onUpdate: () => this.#applyShift(), overwrite: "auto" });
  }

  /** Мягко повернуть глобус к точке, не приближаясь (наведение на список стран). */
  peek(country) {
    const g = window.gsap;
    if (this.focused || !g || !this.ready) return;
    this.autoRotate = false;
    clearTimeout(this.autoTimer);
    let lon = country.lon;
    while (lon - this.rig.lon > 180) lon -= 360;
    while (lon - this.rig.lon < -180) lon += 360;
    g.to(this.rig, { lon, lat: THREE.MathUtils.clamp(country.lat - 6, -40, 55), duration: 1.4, ease: "power3.out", overwrite: "auto" });
  }

  release() {
    clearTimeout(this.autoTimer);
    this.autoTimer = setTimeout(() => { if (!this.focused) this.autoRotate = true; }, 2500);
  }

  overview({ shift = {} } = {}) {
    const g = window.gsap;
    const wasFocused = this.focused;
    this.focused = null;
    this.clearPins();
    this.#clearCountryLayer();
    this.coords.classList.remove("is-on");
    this.earthUniforms.uSelected.value = -1;
    this.earthUniforms.uHover.value = -1;
    const target = { dist: this.fitDist(), tilt: 0, focusT: 0 };
    if (wasFocused) Object.assign(target, { lat: THREE.MathUtils.clamp(wasFocused.lat - 8, -40, 50), lon: wasFocused.lon });
    this.autoRotate = true;
    if (!g || reduced()) {
      Object.assign(this.rig, target);
      this.earthUniforms.uFocus.value = 0;
      this.setShift(shift, 0);
      return;
    }
    g.killTweensOf(this.rig);
    g.to(this.rig, { ...target, duration: wasFocused ? 2.2 : 1.6, ease: "expo.inOut" });
    g.to(this.earthUniforms.uFocus, { value: 0, duration: 1.2, ease: "power2.out" });
    g.to(this.atmoUniforms.uIntensity, { value: 0.75, duration: 1.6 });
    this.setShift(shift, wasFocused ? 2.2 : 1.6);
  }

  preview(iso) {
    const f = iso ? this.countriesByIso.get(iso) : null;
    this.earthUniforms.uHover.value = f ? f.id : -1;
  }

  /** Перелёт к стране. country: { slug, iso_a3, lat, lon, altitude }. */
  async focus(country, { shift = {} } = {}) {
    const g = window.gsap;
    this.focused = country;
    this.autoRotate = false;
    this.clearPins();
    const feature = this.countriesByIso.get(country.iso_a3);
    this.earthUniforms.uSelected.value = feature?.id ?? -1;
    this.earthUniforms.uHover.value = -1;

    const alt = country.altitude * (this.size && this.size.w / this.size.h < 1 ? 1.25 : 1);
    // маленькой стране меньше наклона: иначе она сжимается у горизонта и подписи налезают
    const tilt = Math.min(26, 4 + alt * 40);
    // Кратчайший путь по долготе.
    let lon = country.lon;
    while (lon - this.rig.lon > 180) lon -= 360;
    while (lon - this.rig.lon < -180) lon += 360;
    this.rig.flat = country.lat;
    this.rig.flon = country.lon;

    const layerReady = this.#buildCountryLayer(country);
    const target = { lat: country.lat - tilt, lon, dist: 1 + alt, tilt: 0, focusT: 1 };

    if (!g || reduced()) {
      Object.assign(this.rig, target);
      this.earthUniforms.uFocus.value = 1;
      this.setShift(shift, 0);
      await layerReady;
      this.#showCountryLayer(true);
      this.#layoutPins(true);
      return;
    }
    g.killTweensOf(this.rig);
    const tl = g.timeline();
    // Сначала облёт на средней высоте, затем «пикирование» с наклоном.
    const mid = Math.max(this.rig.dist, 2.2);
    tl.to(this.rig, { lon, lat: country.lat - tilt * 0.3, dist: mid, focusT: 0.35, duration: 1.3, ease: "power2.inOut" });
    tl.to(this.rig, { ...target, duration: 1.7, ease: "expo.inOut" }, "-=0.35");
    g.to(this.earthUniforms.uFocus, { value: 1, duration: 2.2, delay: 0.6, ease: "power2.inOut" });
    g.to(this.atmoUniforms.uIntensity, { value: 0.55, duration: 2.4 });
    this.setShift(shift, 2.6);
    await layerReady;
    tl.call(() => this.#showCountryLayer(), [], "-=1.1");
    await tl;
    this.coords.classList.add("is-on");
    this.#layoutPins(true);
  }

  // ------------------------------------------------------------------ country layer

  async #buildCountryLayer(country) {
    this.#clearCountryLayer();
    const token = (this.layerToken = (this.layerToken ?? 0) + 1);
    const frame = this.frames[country.slug];
    const [shape, map] = await Promise.all([
      loadCountryShape(country.slug),
      frame ? new THREE.TextureLoader().loadAsync(`/assets/countries/${country.slug}.jpg`) : null,
    ]);
    if (token !== this.layerToken) return;
    const group = new THREE.Group();

    if (frame && map) {
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      const [minLon, minLat, maxLon, maxLat] = frame.bbox;
      const mask = this.#countryMask(shape, frame.bbox, 1024);
      const geo = new THREE.SphereGeometry(
        1.0006, 96, 72,
        (minLon + 180) * DEG, (maxLon - minLon) * DEG,
        (90 - maxLat) * DEG, (maxLat - minLat) * DEG,
      );
      this.patchUniforms = { uMap: { value: map }, uMask: { value: mask }, uOpacity: { value: 0 }, uSun: this.earthUniforms.uSun };
      const patch = new THREE.Mesh(
        geo,
        new THREE.ShaderMaterial({
          uniforms: this.patchUniforms, vertexShader: SH.patchVertex, fragmentShader: SH.patchFragment,
          transparent: true, depthWrite: false,
        }),
      );
      patch.renderOrder = 2;
      group.add(patch);
    }

    // Светящаяся граница: тонкая линия + широкое мягкое свечение, прорисовка по длине.
    this.borderMats = [];
    const res = new THREE.Vector2(this.size.w, this.size.h);
    for (const poly of shape.polygons) {
      const ring = poly[0];
      if (ringArea(ring) < 0.004) continue;
      const positions = ringPositions(ring, 1.0018);
      for (const [width, opacity] of [[7, 0.16], [1.6, 1]]) {
        const lg = new LineGeometry();
        lg.setPositions(positions);
        const mat = new LineMaterial({
          color: LUME, linewidth: width, transparent: true, opacity: 0, resolution: res,
          dashed: true, dashSize: 0, gapSize: 1e3, depthWrite: false,
        });
        const line = new Line2(lg, mat);
        line.computeLineDistances();
        const d = lg.attributes.instanceDistanceEnd;
        mat.userData = { length: d.array[d.array.length - 1], opacity };
        line.renderOrder = 3;
        group.add(line);
        this.borderMats.push(mat);
      }
    }
    this.countryLayer = group;
    this.scene.add(group);
  }

  #countryMask(shape, bbox, width) {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    const w = width, h = Math.round((width * (maxLat - minLat)) / (maxLon - minLon));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.filter = "blur(2px)";
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    for (const poly of shape.polygons) {
      for (const ring of poly) {
        for (let i = 0; i + 1 < ring.length; i += 2) {
          const x = ((ring[i] - minLon) / (maxLon - minLon)) * w;
          const y = ((maxLat - ring[i + 1]) / (maxLat - minLat)) * h;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
      }
    }
    ctx.fill("evenodd");
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.NoColorSpace;
    return tex;
  }

  #showCountryLayer(instant = false) {
    const g = window.gsap;
    const mats = this.borderMats ?? [];
    if (instant || !g || reduced()) {
      if (this.patchUniforms) this.patchUniforms.uOpacity.value = 1;
      mats.forEach((m) => { m.opacity = m.userData.opacity; m.dashSize = m.userData.length; });
      return;
    }
    if (this.patchUniforms) g.to(this.patchUniforms.uOpacity, { value: 1, duration: 1.6, ease: "power2.out" });
    mats.forEach((m) => {
      g.to(m, { opacity: m.userData.opacity, duration: 0.6 });
      g.to(m, { dashSize: m.userData.length, duration: 2.4, ease: "power2.inOut" });
    });
  }

  #clearCountryLayer() {
    this.layerToken = (this.layerToken ?? 0) + 1;
    if (!this.countryLayer) return;
    const layer = this.countryLayer;
    this.countryLayer = null;
    const dispose = () => {
      this.scene.remove(layer);
      layer.traverse((o) => {
        o.geometry?.dispose?.();
        if (o.material) {
          o.material.uniforms?.uMap?.value?.dispose?.();
          o.material.uniforms?.uMask?.value?.dispose?.();
          o.material.dispose();
        }
      });
    };
    const g = window.gsap;
    if (!g || reduced()) return dispose();
    const pu = this.patchUniforms;
    if (pu) g.to(pu.uOpacity, { value: 0, duration: 0.8 });
    (this.borderMats ?? []).forEach((m) => g.to(m, { opacity: 0, duration: 0.6 }));
    setTimeout(dispose, 900);
  }

  // ------------------------------------------------------------------ pins

  setPins(pins) {
    this.clearPins();
    this.pins = pins.map((p) => ({ ...p, pos: lonLatToVec3(p.lon, p.lat, 1.001) }));
    if (this.focused && !this.rigBusy) this.#layoutPins(true);
  }

  clearPins() {
    this.pins = [];
    this.pinClusters.forEach((c) => c.el.remove());
    this.pinClusters = [];
  }

  highlightPin(slug) {
    this.pinClusters.forEach((c) => {
      c.el.querySelectorAll("[data-slug]").forEach((a) => a.classList.toggle("is-hot", a.dataset.slug === slug));
      c.el.classList.toggle("is-hot", c.items.some((p) => p.slug === slug));
    });
  }

  #project(pos) {
    const v = pos.clone().project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * this.size.w, y: (-v.y * 0.5 + 0.5) * this.size.h };
  }

  #visible(pos) {
    const toCam = this.camera.position.clone().sub(pos).normalize();
    return pos.clone().normalize().dot(toCam) > 0.08;
  }

  /** Группирует близкие бренды (например, все женевские) в один маркер со списком. */
  #layoutPins(animate = false) {
    if (!this.pins.length || !this.size || !this.focused) return;
    this.pinClusters.forEach((c) => c.el.remove());
    this.camera.updateMatrixWorld();
    const pts = this.pins.map((p) => ({ ...p, screen: this.#project(p.pos) }));
    const clusters = [];
    for (const p of pts.sort((a, b) => a.screen.y - b.screen.y)) {
      const c = clusters.find((k) => Math.hypot(k.screen.x - p.screen.x, k.screen.y - p.screen.y) < 30);
      if (c) c.items.push(p);
      else clusters.push({ screen: p.screen, pos: p.pos, items: [p] });
    }
    this.pinClusters = clusters.map((c, i) => {
      const el = document.createElement("div");
      el.className = "gpin";
      el.innerHTML = `<span class="gpin__dot"></span><span class="gpin__list">${c.items
        .map((p) => `<a class="gpin__item" href="${esc(p.href)}" data-slug="${esc(p.slug)}"><b>${esc(p.name)}</b><small>${esc(p.meta ?? "")}</small></a>`)
        .join("")}</span>`;
      el.addEventListener("pointerenter", () => this.#emit("pin", c.items[0].slug));
      el.addEventListener("pointerleave", () => this.#emit("pin", null));
      el.querySelectorAll("a").forEach((a) => a.addEventListener("pointerenter", () => this.#emit("pin", a.dataset.slug)));
      this.markers.append(el);
      const flip = c.screen.x > this.size.w - 220;
      el.classList.toggle("is-flip", flip);
      if (animate) {
        el.style.setProperty("--d", `${i * 90}ms`);
        requestAnimationFrame(() => el.classList.add("is-in"));
      } else el.classList.add("is-in");
      return { ...c, el };
    });
    this.#updatePins();
    this.#resolveLabels();
  }

  /**
   * Подписи не должны налезать друг на друга и на точки: известные бренды (раньше в списке)
   * ставятся первыми, остальные пробуют другую сторону, а если места нет, прячутся до наведения.
   */
  #resolveLabels() {
    const order = new Map(this.pins.map((p, i) => [p.slug, i]));
    const rank = (c) => Math.min(...c.items.map((p) => order.get(p.slug) ?? 99));
    const pad = 4;
    const hit = (a, b) => a.left < b.right + pad && a.right + pad > b.left && a.top < b.bottom + pad && a.bottom + pad > b.top;
    const dots = this.pinClusters.map((c) => c.el.querySelector(".gpin__dot").getBoundingClientRect());
    const placed = [];
    for (const c of [...this.pinClusters].sort((a, b) => rank(a) - rank(b))) {
      if (c.el.classList.contains("is-behind")) continue;
      const list = c.el.querySelector(".gpin__list");
      const own = c.el.querySelector(".gpin__dot").getBoundingClientRect();
      const free = () => {
        const r = list.getBoundingClientRect();
        return !placed.some((q) => hit(r, q)) && !dots.some((d) => d !== own && d.left !== own.left && hit(r, d));
      };
      const preferFlip = c.el.classList.contains("is-flip");
      let ok = false;
      for (const flip of [preferFlip, !preferFlip]) {
        c.el.classList.toggle("is-flip", flip);
        if (free()) {
          ok = true;
          break;
        }
      }
      if (!ok) c.el.classList.toggle("is-flip", preferFlip);
      c.el.classList.toggle("is-collapsed", !ok);
      if (ok) placed.push(list.getBoundingClientRect());
    }
  }

  #updatePins() {
    for (const c of this.pinClusters) {
      const s = this.#project(c.pos);
      c.el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0)`;
      c.el.classList.toggle("is-behind", !this.#visible(c.pos));
    }
  }

  // ------------------------------------------------------------------ loop

  #start() {
    if (this.running || !this.ready) return;
    this.running = true;
    this.time.last = performance.now();
    const tick = () => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(tick);
      this.#frame();
    };
    tick();
  }

  #stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  #frame() {
    const now = performance.now();
    const dt = Math.min((now - this.time.last) / 1000, 0.05);
    this.time.last = now;
    const t = (this.time.elapsed += dt);
    const rig = this.rig;

    if (!this.focused && !this.drag.active) {
      if (this.autoRotate && !reduced()) rig.lon -= dt * 2.4;
      // инерция после перетаскивания
      rig.lon += this.drag.vx;
      rig.lat = THREE.MathUtils.clamp(rig.lat + this.drag.vy, -70, 75);
      this.drag.vx *= 0.92;
      this.drag.vy *= 0.92;
    }
    this.parallax.x += (this.parallax.tx - this.parallax.x) * 0.04;
    this.parallax.y += (this.parallax.ty - this.parallax.y) * 0.04;
    const px = this.focused ? this.parallax.x * 1.2 : 0;
    const py = this.focused ? this.parallax.y * 0.8 : 0;

    const camPos = lonLatToVec3(rig.lon - px, rig.lat + py, rig.dist);
    const focusPoint = lonLatToVec3(rig.flon, rig.flat, 1).multiplyScalar(rig.focusT);
    this.camera.position.copy(camPos);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(focusPoint);

    // Солнце светит «из-за плеча» зрителя слева-сверху: терминатор у правого края.
    const sun = camPos.clone().normalize();
    sun.applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.95).add(new THREE.Vector3(0, 0.35, 0)).normalize();
    this.earthUniforms.uSun.value.lerp(sun, this.focused ? 0.05 : 1);
    this.earthUniforms.uTime.value = t;
    this.starUniforms.uTime.value = t;
    this.stars.rotation.y = t * 0.002;

    this.#updateHover();
    this.renderer.render(this.scene, this.camera);
    if (this.pinClusters.length) this.#updatePins();
  }
}
