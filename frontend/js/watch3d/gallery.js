// Общий WebGL-холст для карточек каталога: каждая карточка рисуется в свой
// прямоугольник (viewport + scissor). Один контекст на всю страницу.

import * as THREE from "three";
import { reduced } from "../core/motion.js";
import { studioEnvironment } from "./materials.js";
import { buildWatch } from "./factory.js";

export class Gallery {
  constructor(canvas) {
    this.canvas = canvas;
    this.items = new Map();
    this.running = false;
    // Верхняя граница видимой области (px): всё, что выше (навигация, липкие панели), не рисуется.
    this.clipTop = () => 68;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = false;
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.scene.environment = studioEnvironment(renderer);
    const key = new THREE.DirectionalLight(0xffffff, 1.3);
    key.position.set(-60, 90, 120);
    this.scene.add(key, new THREE.AmbientLight(0xffffff, 0.12));
    this.camera = new THREE.PerspectiveCamera(22, 1, 1, 2000);
    this.io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const item = this.items.get(e.target);
        if (!item) continue;
        item.visible = e.isIntersecting;
        if (item.visible && !item.model) this.#build(item);
      }
      this.#toggleLoop();
    }, { rootMargin: "200px 0px" });
    this.resize = this.resize.bind(this);
    window.addEventListener("resize", this.resize);
    this.resize();
  }

  resize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  /** el — контейнер-сцена в карточке. info: { render, diameter, thickness, movementType, frequency, logo, caption } */
  add(el, info) {
    const item = { el, info, model: null, visible: false, hover: 0, targetHover: 0, appear: 0, seed: Math.random() * 10 };
    this.items.set(el, item);
    const card = el.closest("a, article") ?? el;
    card.addEventListener("pointerenter", () => (item.targetHover = 1));
    card.addEventListener("pointerleave", () => (item.targetHover = 0));
    this.io.observe(el);
    return item;
  }

  #build(item) {
    // Строим лениво и по одной модели за кадр, чтобы не подвесить прокрутку.
    this.queue ??= [];
    this.queue.push(item);
  }

  clear() {
    for (const item of this.items.values()) {
      this.io.unobserve(item.el);
      item.model?.dispose();
    }
    this.items.clear();
    this.queue = [];
    this.clipTop = () => 68;
    this.renderer.setScissorTest(false);
    this.renderer.clear();
    this.#toggleLoop();
  }

  #toggleLoop() {
    const anyVisible = [...this.items.values()].some((i) => i.visible);
    if (anyVisible && !this.running) {
      this.running = true;
      const loop = () => {
        if (!this.running) return;
        this.raf = requestAnimationFrame(loop);
        this.#frame();
      };
      loop();
    } else if (!anyVisible && this.running) {
      this.running = false;
      cancelAnimationFrame(this.raf);
      this.renderer.setScissorTest(false);
      this.renderer.clear();
    }
  }

  #frame() {
    if (this.queue?.length) {
      const item = this.queue.shift();
      if (this.items.has(item.el) && !item.model) {
        const i = item.info;
        item.model = buildWatch(i.render, { detail: "card", diameter: i.diameter, thickness: i.thickness, movementType: i.movementType, frequency: i.frequency, logo: i.logo, caption: i.caption });
        const L = item.model.L;
        item.dist = (Math.max(L.D, L.h * 2) * 1.6) / (2 * Math.tan(THREE.MathUtils.degToRad(11)));
        item.el.classList.add("has-3d");
      }
    }
    const r = this.renderer;
    const W = window.innerWidth, H = window.innerHeight;
    r.setScissorTest(false);
    r.clear();
    r.setScissorTest(true);
    const t = performance.now() / 1000;
    const still = reduced();
    for (const item of this.items.values()) {
      if (!item.visible || !item.model) continue;
      const rect = item.el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > H || rect.width < 2 || rect.height < 2) continue;
      const top = Math.max(rect.top, this.clipTop());
      if (top >= rect.bottom) continue;
      item.hover += (item.targetHover - item.hover) * 0.08;
      item.appear += (1 - item.appear) * 0.06;
      const m = item.model;
      const sway = still ? 0 : Math.sin(t * 0.5 + item.seed) * 0.1;
      m.root.rotation.set(-0.22 - item.hover * 0.1, 0.34 + sway + item.hover * 0.55, 0);
      m.root.scale.setScalar(0.9 + item.appear * 0.1);
      m.update(new Date(), t);
      const x = rect.left, y = H - rect.bottom;
      r.setViewport(x, y, rect.width, rect.height);
      r.setScissor(x, y, rect.width, rect.bottom - top);
      this.camera.aspect = rect.width / rect.height;
      this.camera.position.set(0, 0, item.dist * (1 - item.hover * 0.06));
      this.camera.lookAt(0, 0, 0);
      this.camera.updateProjectionMatrix();
      this.scene.add(m.root);
      try {
        r.render(this.scene, this.camera);
      } finally {
        this.scene.remove(m.root);
      }
    }
  }
}

let shared = null;
export function getGallery() {
  shared ??= new Gallery(document.getElementById("gallery-canvas"));
  return shared;
}
