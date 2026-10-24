import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { frameGate, lowPower, reduced } from "../core/motion.js";
import { describePart } from "./submariner-parts.js";

const smooth = (a, b, t) => { const x = THREE.MathUtils.clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** A demand-rendered viewer: geometry is generated once in Blender, never on the phone. */
export class SubmarinerScene {
  constructor(canvas, onPick) {
    this.canvas = canvas;
    this.onPick = onPick;
    this.parts = [];
    this.t = this.targetT = 0;
    this.dead = false;
    this.pending = false;
    this.raf = frameGate(canvas, "0px");
    this.abort = new AbortController();
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower() ? 1 : 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 4000);
    this.camera.position.set(85, 115, 150);
    this.controls = new OrbitControls(this.camera, canvas);
    canvas.style.touchAction = "pan-y pinch-zoom";
    this.controls.target.set(0, -18, 0);
    this.controls.enableDamping = false;
    this.controls.enableZoom = false; // Wheel and vertical gestures retain normal page scrolling.
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.6;
    this.controls.touches.ONE = THREE.TOUCH.ROTATE;
    this.controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
    this.controls.addEventListener("change", () => this.request());
    this.controls.addEventListener("start", () => { this.cameraGoal = null; });
    const key = new THREE.DirectionalLight(0xfff7eb, 1.1);
    key.position.set(-60, 150, 90);
    key.castShadow = true;
    key.shadow.mapSize.setScalar(lowPower() ? 512 : 1024);
    Object.assign(key.shadow.camera, { left: -200, right: 200, top: 200, bottom: -200, near: 1, far: 500 });
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.08;
    this.scene.add(key, new THREE.HemisphereLight(0xf1f4ff, 0x34383c, 0.4));
    const fill = new THREE.DirectionalLight(0xe4edff, 0.7);
    fill.position.set(100, 35, -80);
    this.scene.add(fill);
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(1500, 1500), new THREE.ShadowMaterial({ opacity: 0.25 }));
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -82;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);
    const room = new RoomEnvironment();
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = this.pmrem.fromScene(room, 0.04);
    room.dispose();
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = 0.8;
    // Fine directional grain, shared by all brushed parts (64 KiB, no image download).
    const grain = new Uint8Array(256 * 64 * 4);
    let seed = 3230;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let x = 0; x < 256; x++) {
      const line = 135 + random() * 60;
      for (let y = 0; y < 64; y++) {
        const i = (y * 256 + x) * 4, v = Math.round(line + random() * 10);
        grain.set([v, v, v, 255], i);
      }
    }
    this.grain = new THREE.DataTexture(grain, 256, 64);
    this.grain.wrapS = this.grain.wrapT = THREE.RepeatWrapping;
    this.grain.repeat.set(8, 1);
    this.grain.needsUpdate = true;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.events = new AbortController();
    const signal = this.events.signal;
    canvas.addEventListener("pointerdown", e => { this.down = [e.clientX, e.clientY]; }, { signal });
    canvas.addEventListener("pointerup", e => {
      if (!this.down || Math.hypot(e.clientX - this.down[0], e.clientY - this.down[1]) > 7) return;
      const r = canvas.getBoundingClientRect();
      this.pointer.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hit = this.raycaster.intersectObjects(this.parts.filter(p => p.node.visible).map(p => p.node), true)[0];
      let node = hit?.object;
      while (node && !node.userData.workshopId) node = node.parent;
      if (node) this.onPick(node.userData.workshopId);
    }, { signal });
    canvas.addEventListener("pointercancel", () => { this.down = null; }, { signal });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) this.request(); }, { signal });
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas.parentElement);
    this.resize();
  }

  async load(onProgress) {
    const response = await fetch("/assets/workshop/submariner/submariner.glb", { signal: this.abort.signal });
    if (!response.ok) throw new Error("Модель недоступна");
    const loader = new GLTFLoader();
    // Embedded images use <img> (img-src blob:), preserving the site's strict connect-src.
    loader.register(parser => {
      parser.textureLoader = new THREE.TextureLoader();
      return { name: "HOROLOGIUM_image_loader" };
    });
    const asset = await loader.parseAsync(await response.arrayBuffer(), "");
    if (this.dead) { this.disposeObject(asset.scene); return []; }
    this.model = asset.scene;
    this.scene.add(this.model);
    // All dimensions are normalized to the measured 41 mm bezel diameter.
    const bezel = this.model.getObjectByName("Безель");
    const size = new THREE.Box3().setFromObject(bezel ?? this.model).getSize(V());
    const scale = bezel ? 41 / Math.max(size.x, size.z) : 1;
    this.model.scale.setScalar(scale);
    this.model.updateMatrixWorld(true);
    // Preserve children (lume inserts, rubies, hands): they move with their physical parent.
    const nodes = [...this.model.children];
    for (const [index, node] of nodes.entries()) {
      this.scene.attach(node);
      const box = new THREE.Box3().setFromObject(node);
      if (box.isEmpty()) continue;
      // Three sanitizes animation bindings with underscores; retain the author's labels.
      const rawName = (node.userData.name ?? node.name.replaceAll("_", " ")).replace(/^_+/, "");
      const name = rawName.charAt(0).toLocaleUpperCase("ru") + rawName.slice(1);
      const info = describePart(name);
      const id = `part-${index}`;
      node.userData.workshopId = id;
      const home = node.position.clone();
      const center = box.getCenter(V());
      const part = { ...info, id, node, home, center, quaternion: node.quaternion.clone(), materials: [] };
      node.traverse(mesh => {
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const materials = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(original => {
          let material = original.clone();
          if (material.map) material.map.anisotropy = Math.min(lowPower() ? 4 : 8, this.renderer.capabilities.getMaxAnisotropy());
          if (/Стекло/.test(node.name)) {
            material = new THREE.MeshPhysicalMaterial({ color: 0x8294a3, metalness: 0.05, roughness: 0.05, transparent: true, opacity: 0.45, depthWrite: false, clearcoat: 1, side: THREE.DoubleSide });
            material.onBeforeCompile = shader => {
              shader.fragmentShader = shader.fragmentShader.replace("#include <opaque_fragment>", "diffuseColor.a *= 0.035 + 0.965 * pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 4.0);\n#include <opaque_fragment>");
            };
            mesh.castShadow = false;
          } else {
            // Transmission on tiny jewels would require a full extra render pass.
            if (material.transmission) material.transmission = 0;
            if (material.metalness > 0.5) material.roughness = Math.max(0.12, material.roughness);
            material.envMapIntensity = 0.85;
            if (/сатин|Genève|шлифовка/.test(material.name)) {
              material.roughness = 0.28;
              if (!lowPower()) {
                if (!mesh.geometry.attributes.uv) {
                  const position = mesh.geometry.attributes.position;
                  const uv = new Float32Array(position.count * 2);
                  for (let i = 0; i < position.count; i++) { uv[i * 2] = position.getX(i); uv[i * 2 + 1] = position.getZ(i); }
                  mesh.geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
                }
                material.bumpMap = this.grain;
                material.bumpScale = 0.012;
              }
            }
            if (material.name === "Dial" || material.name === "Cerachrom") {
              material.envMapIntensity = 0.22;
              material.clearcoat = 0.22;
            }
          }
          part.materials.push(material);
          original.dispose();
          return material;
        });
        mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
      });
      this.parts.push(part);
    }
    // A real-size shelf layout: large pieces get enough room, screws keep their own scale.
    let x = -95, z = -60, row = 0;
    for (const part of [...this.parts].sort((a, b) => a.stage - b.stage || a.name.localeCompare(b.name, "ru"))) {
      const box = new THREE.Box3().setFromObject(part.node).getSize(V());
      const width = Math.max(7, box.x) + 5, depth = Math.max(7, box.z) + 5;
      if (x + width > 100) { x = -95; z += row; row = 0; }
      part.tray = V(x + width / 2, 0, z + depth / 2).sub(part.center).add(part.home);
      x += width; row = Math.max(row, depth);
      // Each phase opens its own compartment without burying the small components.
      const i = this.parts.filter(p => p.stage === part.stage).indexOf(part);
      part.exploded = part.stage === 1
        ? V((i % 4 - 1.5) * 25, -30, Math.floor(i / 4) * 11 - 70).sub(part.center).add(part.home)
        : part.home.clone().add(V(
        (i % 4 - 1.5) * 13,
        part.stage === 6 ? 22 + i * 4 : -part.stage * 10 - i * 2.2,
        part.stage === 1 ? (part.center.z > 0 ? 36 : -36) : (Math.floor(i / 4) - 1) * 13,
      ));
    }
    this.trayDepth = z + row;
    this.setT(this.targetT, true);
    this.view("front", true);
    await this.renderer.compileAsync(this.scene, this.camera);
    if (this.dead) return [];
    this.request();
    onProgress?.();
    new HDRLoader().loadAsync("/assets/hdri/monochrome_studio_04_1k.hdr").then(hdr => {
      if (this.dead) { hdr.dispose(); return; }
      const env = this.pmrem.fromEquirectangular(hdr);
      hdr.dispose(); this.environment.dispose(); this.environment = env;
      this.scene.environment = env.texture;
      this.scene.environmentIntensity = 0.7;
      this.request();
    }).catch(() => {}); // The local studio remains a complete fallback.
    return this.parts;
  }

  setT(t, instant = false) {
    this.fromT = this.t;
    this.motionStart = performance.now();
    this.targetT = THREE.MathUtils.clamp(t, 0, 1);
    if (instant || reduced()) this.t = this.targetT;
    this.request();
  }

  select(id) {
    this.selected = id;
    for (const p of this.parts) for (const m of p.materials) {
      if (m.emissive) { m.emissive.setHex(p.id === id ? 0x19382e : 0x000000); m.emissiveIntensity = 0.3; }
    }
    this.request();
  }

  isolate(id) {
    this.t = this.targetT;
    this.positionParts(this.t);
    this.isolated = id;
    for (const p of this.parts) p.node.visible = !id || p.id === id;
    if (id) {
      const p = this.parts.find(p => p.id === id);
      if (p) this.fit(new THREE.Box3().setFromObject(p.node), V(0.7, 1, 1));
    } else this.view(this.targetT > 0.93 ? "tray" : this.targetT > 0.2 ? "back" : "front");
    this.request();
  }

  view(name, instant = false) {
    this.isolated = null;
    for (const p of this.parts) p.node.visible = true;
    if (name === "tray") {
      const box = new THREE.Box3(V(-105, -10, -65), V(105, 10, Math.max(70, this.trayDepth)));
      this.fit(box, V(0.1, 1.5, 0.7), instant);
    } else {
      this.positionParts(this.targetT);
      const box = new THREE.Box3();
      for (const p of this.parts) box.expandByObject(p.node);
      this.fit(box, name === "back" ? V(0.6, -0.8, 1.1) : V(0.45, 1.5, 1.1), instant);
    }
  }

  fit(box, direction, instant = false) {
    const center = box.getCenter(V());
    const forward = direction.clone().normalize();
    const right = V().crossVectors(V(0, 1, 0), forward).normalize();
    const up = V().crossVectors(forward, right).normalize();
    const tangent = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    let distance = 10;
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const p = V(x, y, z).sub(center), depth = p.dot(forward);
      distance = Math.max(distance, Math.abs(p.dot(up)) / tangent + depth, Math.abs(p.dot(right)) / (tangent * this.camera.aspect) + depth);
    }
    this.cameraGoal = center.clone().add(forward.multiplyScalar(distance * 1.12));
    this.targetGoal = center;
    this.cameraFrom = this.camera.position.clone();
    this.targetFrom = this.controls.target.clone();
    this.cameraStart = performance.now();
    if (instant || reduced()) {
      this.camera.position.copy(this.cameraGoal);
      this.controls.target.copy(center);
      this.cameraGoal = null;
      this.controls.update();
    }
    this.request();
  }

  zoom(amount) {
    this.cameraGoal = null;
    const offset = this.camera.position.clone().sub(this.controls.target).multiplyScalar(amount);
    const distance = offset.length();
    if (distance > 6 && distance < 1500) this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update(); this.request();
  }

  resize() {
    if (this.dead) return;
    const r = this.canvas.parentElement.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.renderer.setSize(r.width, r.height, false);
    this.camera.aspect = r.width / r.height;
    this.camera.updateProjectionMatrix();
    if (this.parts.length) this.view(this.t > 0.93 ? "tray" : "front", true);
    this.request();
  }

  request() {
    if (this.pending || this.dead) return;
    this.pending = true;
    this.raf(() => this.render());
  }

  render() {
    this.pending = false;
    if (this.dead || document.hidden) return;
    const progress = THREE.MathUtils.clamp((performance.now() - (this.motionStart ?? 0)) / 650, 0, 1);
    let moving = this.t !== this.targetT && progress < 1;
    this.t = moving ? THREE.MathUtils.lerp(this.fromT, this.targetT, 1 - (1 - progress) ** 3) : this.targetT;
    this.positionParts(this.t);
    if (this.cameraGoal) {
      const t = reduced() ? 1 : THREE.MathUtils.clamp((performance.now() - this.cameraStart) / 650, 0, 1);
      const ease = 1 - (1 - t) ** 3;
      this.camera.position.lerpVectors(this.cameraFrom, this.cameraGoal, ease);
      this.controls.target.lerpVectors(this.targetFrom, this.targetGoal, ease);
      if (t < 1) moving = true;
      else this.cameraGoal = null;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    if (moving) this.request();
  }

  positionParts(t) {
    for (const p of this.parts) {
      const phase = p.stage === 0 ? 0 : smooth((p.stage - 0.8) / 7, p.stage / 7, t);
      p.node.position.lerpVectors(p.home, p.exploded, phase);
      p.node.position.lerp(p.tray, smooth(0.88, 1, t));
    }
  }

  disposeObject(object) {
    const materials = new Set(), geometries = new Set(), textures = new Set();
    object.traverse(o => {
      if (o.geometry) geometries.add(o.geometry);
      for (const m of o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []) {
        materials.add(m);
        for (const value of Object.values(m)) if (value?.isTexture) textures.add(value);
      }
    });
    textures.forEach(t => t.dispose()); materials.forEach(m => m.dispose()); geometries.forEach(g => g.dispose());
  }

  dispose() {
    this.dead = true;
    this.abort.abort(); this.events.abort(); this.raf.stop(); this.ro.disconnect(); this.controls.dispose();
    this.disposeObject(this.scene);
    this.environment.dispose(); this.pmrem.dispose(); this.renderer.dispose(); this.renderer.forceContextLoss();
    this.grain.dispose();
  }
}
