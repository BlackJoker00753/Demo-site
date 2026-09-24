// Большая сцена одной модели: страница часов (герой) и режим разборки.

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { reduced } from "../core/motion.js";
import { applyEnvironment } from "./materials.js";

export class WatchStage {
  constructor(canvas, { interactive = true, fov = 20, exposure = 1.0, ao = true } = {}) {
    this.canvas = canvas;
    this.interactive = interactive;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = exposure;
    renderer.setClearColor(0x000000, 0);
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    applyEnvironment(renderer, this.scene, () => this.render());
    this.camera = new THREE.PerspectiveCamera(fov, 1, 1, 2000);

    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(-60, 90, 120);
    const rim = new THREE.DirectionalLight(0xdfe8ff, 0.8);
    rim.position.set(90, -40, -60);
    this.scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.12));

    this.pivot = new THREE.Group(); // позиционирование сцены (скролл-анимации)
    this.spin = new THREE.Group(); // вращение пользователем
    this.pivot.add(this.spin);
    this.scene.add(this.pivot);

    this.pose = { rx: -0.18, ry: 0.35, rz: 0, dist: 1, x: 0, y: 0 };
    this.user = { rx: 0, ry: 0, trx: 0, try: 0, dragging: false };
    this.idle = true;
    this.model = null;
    this.running = false;
    this.listeners = [];
    this.highlighted = null;

    // Ambient occlusion: тени в стыках (звенья браслета, безель, мосты механизма),
    // без них металл выглядит «нарисованным». Отключается на слабых устройствах.
    this.composer = null;
    if (ao && !lowPower()) {
      const composer = new EffectComposer(renderer);
      composer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      composer.addPass(new RenderPass(this.scene, this.camera));
      const gtao = new GTAOPass(this.scene, this.camera, 1, 1);
      gtao.output = GTAOPass.OUTPUT.Default;
      gtao.blendIntensity = 0.9;
      gtao.updateGtaoMaterial({ radius: 2.2, distanceExponent: 1.6, thickness: 1.2, scale: 1.1, samples: 16 });
      gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
      composer.addPass(gtao);
      composer.addPass(new OutputPass());
      this.composer = composer;
    }

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    if (interactive) this.#bind();
    this.resize();
  }

  setModel(model) {
    if (this.model) {
      this.spin.remove(this.model.root);
      this.model.dispose();
    }
    this.model = model;
    this.spin.add(model.root);
    this.#fit();
    this.render();
  }

  /** Кадрирование: часы (с частью браслета) целиком помещаются по меньшей стороне холста. */
  #fit() {
    if (!this.model) return;
    const L = this.model.L;
    const size = Math.max(L.D, L.h * 2) * (this.frameScale ?? 1.5);
    const aspect = Math.min(1, this.camera.aspect || 1);
    this.baseDist = size / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * aspect);
  }

  resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.composer?.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.#fit();
    this.render();
  }

  #bind() {
    const c = this.canvas;
    c.addEventListener("pointerdown", (e) => {
      this.user.dragging = true;
      this.user.x = e.clientX;
      this.user.y = e.clientY;
      this.user.moved = 0;
      c.setPointerCapture(e.pointerId);
      c.classList.add("is-grabbing");
    });
    c.addEventListener("pointermove", (e) => {
      if (!this.user.dragging) return;
      const dx = e.clientX - this.user.x, dy = e.clientY - this.user.y;
      this.user.x = e.clientX;
      this.user.y = e.clientY;
      this.user.moved += Math.abs(dx) + Math.abs(dy);
      this.user.try += dx * 0.009;
      this.user.trx = THREE.MathUtils.clamp(this.user.trx + dy * 0.007, -1.2, 1.2);
    });
    const up = () => {
      this.user.dragging = false;
      c.classList.remove("is-grabbing");
    };
    c.addEventListener("pointerup", up);
    c.addEventListener("pointercancel", up);
    c.addEventListener("click", (e) => {
      if (this.user.moved > 5) return;
      const key = this.pick(e.clientX, e.clientY);
      this.listeners.forEach((fn) => fn(key));
    });
  }

  onPick(fn) {
    this.listeners.push(fn);
  }

  /** Сбросить пользовательский поворот (например, перед сценой разборки). */
  resetUser() {
    this.user.trx = 0;
    this.user.try = 0;
  }

  pick(x, y) {
    if (!this.model) return null;
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hits = ray.intersectObjects(this.model.pickables(), false);
    const hit = hits.find((h) => !(this.model.explodeT < 0.2 && (h.object.userData.part.startsWith("crystal"))));
    return hit?.object.userData.part ?? null;
  }

  /** Подсветить деталь: остальные приглушаются. */
  highlight(key) {
    this.highlighted = key;
    if (!this.model) return;
    for (const p of this.model.parts) {
      p.object.traverse((o) => {
        if (!o.isMesh) return;
        if (!o.userData.baseMaterial) o.userData.baseMaterial = o.material;
        if (!key || p.key === key) o.material = o.userData.baseMaterial;
        else {
          o.userData.dimMaterial ??= (() => {
            const m = o.userData.baseMaterial.clone();
            m.transparent = true;
            m.opacity = 0.16;
            m.depthWrite = false;
            return m;
          })();
          o.material = o.userData.dimMaterial;
        }
      });
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.t0 = performance.now();
    const loop = () => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      this.frame();
    };
    loop();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  frame() {
    const u = this.user;
    u.rx += (u.trx - u.rx) * 0.08;
    u.ry += (u.try - u.ry) * 0.08;
    const t = performance.now() / 1000;
    const sway = this.idle && !reduced() ? Math.sin(t * 0.4) * 0.12 : 0;
    const p = this.pose;
    this.pivot.rotation.set(p.rx, p.ry + sway, p.rz);
    this.pivot.position.set(p.x, p.y, 0);
    this.spin.rotation.set(u.rx, u.ry, 0);
    this.camera.position.set(0, 0, (this.baseDist ?? 200) * p.dist);
    this.camera.lookAt(0, 0, 0);
    this.model?.update(new Date(), t);
    this.render();
  }

  render() {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.stop();
    this.ro.disconnect();
    this.model?.dispose();
    this.composer?.dispose();
    this.renderer.dispose();
  }
}

/** Мобильные и слабые GPU: без постобработки, чтобы скролл оставался плавным. */
function lowPower() {
  return window.matchMedia("(pointer: coarse)").matches || (navigator.hardwareConcurrency ?? 8) <= 4;
}
