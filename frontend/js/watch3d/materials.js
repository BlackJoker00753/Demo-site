// Материалы и студийное окружение для 3D-часов.
//
// Все размеры в сцене в миллиметрах. Металлы отражают «тёмную студию»:
// несколько софтбоксов на чёрном фоне, как на предметной съёмке часов.

import * as THREE from "three";

// ------------------------------------------------------------------ studio environment

const envCache = new WeakMap();

/** PMREM-окружение «тёмная фотостудия» (кешируется на рендерер). */
export function studioEnvironment(renderer) {
  if (envCache.has(renderer)) return envCache.get(renderer);
  const scene = new THREE.Scene();
  // Купол с мягким вертикальным градиентом: сверху светлее, снизу темнее.
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(60, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {},
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "varying vec3 vP; void main(){ float t = vP.y * 0.5 + 0.5; vec3 c = mix(vec3(0.02,0.022,0.026), vec3(0.2,0.21,0.23), smoothstep(0.35, 1.0, t)); gl_FragColor = vec4(c, 1.0); }",
    }),
  );
  scene.add(dome);
  const box = (w, h, intensity, pos, tint = 0xffffff) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(intensity), side: THREE.DoubleSide }),
    );
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  // Предметная съёмка часов: большой софтбокс за камерой (даёт «сталь» на плоскостях),
  // верхний свет, узкие стрипы по бокам (блики на гранях), контровой сзади.
  box(46, 30, 2.6, [0, 14, 48]);
  box(60, 14, 3.6, [0, 40, 6]);
  box(5, 40, 6.5, [-36, 4, 16], 0xf1f4ff);
  box(5, 36, 4.5, [36, 0, 14], 0xfff5e8);
  box(40, 6, 2.2, [0, -34, 18]);
  box(30, 6, 1.8, [0, 10, -40]);
  box(10, 10, 8.0, [22, 24, 30]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, 0.03).texture;
  pmrem.dispose();
  envCache.set(renderer, env);
  return env;
}

// ------------------------------------------------------------------ procedural textures

const texCache = new Map();

function canvasTex(key, size, draw, { repeat = 1, color = false } = {}) {
  const k = `${key}:${size}:${repeat}`;
  if (texCache.has(k)) return texCache.get(k);
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 8;
  tex.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texCache.set(k, tex);
  return tex;
}

/** Карта шероховатости «сатинирование»: тонкие параллельные штрихи. */
export function brushedRoughness() {
  return canvasTex("brushed", 512, (ctx, s) => {
    ctx.fillStyle = "#6b6b6b";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 2400; i++) {
      const y = Math.random() * s;
      const v = 80 + Math.random() * 60;
      ctx.strokeStyle = `rgba(${v},${v},${v},${0.25 + Math.random() * 0.3})`;
      ctx.lineWidth = Math.random() * 1.2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(s, y + (Math.random() - 0.5) * 2);
      ctx.stroke();
    }
  }, { repeat: 2 });
}

/** «Перляж» (круговое зернение) для платины механизма. */
export function perlage() {
  return canvasTex("perlage", 512, (ctx, s) => {
    ctx.fillStyle = "#8a8a8a";
    ctx.fillRect(0, 0, s, s);
    const step = 22;
    for (let y = 0; y < s + step; y += step * 0.8) {
      for (let x = 0; x < s + step; x += step * 0.8) {
        const cx = x + (Math.random() - 0.5) * 3, cy = y + (Math.random() - 0.5) * 3;
        for (let r = step * 0.75; r > 1; r -= 1.6) {
          const v = 110 + Math.sin(r * 1.7) * 40;
          ctx.strokeStyle = `rgba(${v},${v},${v},0.55)`;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  }, { repeat: 1 });
}

/** «Женевские волны» (Côtes de Genève) для мостов. */
export function cotesDeGeneve() {
  return canvasTex("cotes", 512, (ctx, s) => {
    const bands = 8;
    const bw = s / bands;
    for (let b = 0; b < bands; b++) {
      const g = ctx.createLinearGradient(b * bw, 0, (b + 1) * bw, 0);
      g.addColorStop(0, "#5c5c5c");
      g.addColorStop(0.45, "#d9d9d9");
      g.addColorStop(0.55, "#f2f2f2");
      g.addColorStop(1, "#6a6a6a");
      ctx.fillStyle = g;
      ctx.fillRect(b * bw, 0, bw, s);
    }
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? "#fff" : "#000";
      ctx.fillRect(Math.random() * s, Math.random() * s, 1, Math.random() * 6);
    }
  }, { repeat: 1 });
}

/** Узор ремешка: зерно кожи. */
export function leatherBump() {
  return canvasTex("leather", 512, (ctx, s) => {
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 9000; i++) {
      const v = 90 + Math.random() * 80;
      ctx.fillStyle = `rgba(${v},${v},${v},0.5)`;
      const r = 0.6 + Math.random() * 2.2;
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }, { repeat: 3 });
}

/** Чешуя аллигатора: крупные прямоугольные «плитки». */
export function alligatorBump() {
  return canvasTex("alligator", 512, (ctx, s) => {
    ctx.fillStyle = "#3a3a3a";
    ctx.fillRect(0, 0, s, s);
    let y = 0;
    while (y < s) {
      const h = 26 + Math.random() * 30;
      let x = -Math.random() * 30;
      while (x < s) {
        const w = 30 + Math.random() * 46;
        const g = ctx.createRadialGradient(x + w / 2, y + h / 2, 2, x + w / 2, y + h / 2, Math.max(w, h) * 0.7);
        g.addColorStop(0, "#d8d8d8");
        g.addColorStop(1, "#6a6a6a");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, w - 4, h - 4, 8);
        ctx.fill();
        x += w;
      }
      y += h;
    }
  }, { repeat: 1 });
}

/** Кованый карбон. */
export function forgedCarbon() {
  return canvasTex("carbon", 512, (ctx, s) => {
    ctx.fillStyle = "#0c0c0d";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 700; i++) {
      const v = 18 + Math.random() * 40;
      ctx.fillStyle = `rgb(${v},${v},${v + 3})`;
      ctx.save();
      ctx.translate(Math.random() * s, Math.random() * s);
      ctx.rotate(Math.random() * Math.PI);
      ctx.beginPath();
      ctx.ellipse(0, 0, 6 + Math.random() * 30, 2 + Math.random() * 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }, { repeat: 1, color: true });
}

// ------------------------------------------------------------------ materials

const METALS = {
  steel: { color: "#d4d7db", roughness: 0.16 },
  white_gold: { color: "#dcdcd8", roughness: 0.14 },
  platinum: { color: "#d9dbde", roughness: 0.15 },
  yellow_gold: { color: "#f1c77a", roughness: 0.16 },
  rose_gold: { color: "#eab299", roughness: 0.16 },
  titanium: { color: "#a9aaab", roughness: 0.3 },
  bronze: { color: "#b98a57", roughness: 0.34 },
  aluminium: { color: "#c9ccd0", roughness: 0.3 },
};

const matCache = new Map();

/**
 * Материал по имени. finish: "polished" | "brushed". Кешируется по ключу.
 * Для двухцветных корпусов (two_tone_*) основной металл сталь, акценты золото.
 */
export function metal(name, finish = "polished") {
  const key = `metal:${name}:${finish}`;
  if (matCache.has(key)) return matCache.get(key);
  let mat;
  if (name === "ceramic_black" || name === "ceramic_white") {
    mat = new THREE.MeshPhysicalMaterial({
      color: name === "ceramic_black" ? 0x0d0e10 : 0xf1f1ee, metalness: 0, roughness: finish === "brushed" ? 0.32 : 0.06,
      clearcoat: 1, clearcoatRoughness: 0.04,
    });
  } else if (name === "resin_black" || name === "resin_white") {
    mat = new THREE.MeshPhysicalMaterial({ color: name === "resin_black" ? 0x141517 : 0xe9e9e6, metalness: 0, roughness: 0.55, sheen: 0.2 });
  } else if (name === "carbon") {
    mat = new THREE.MeshPhysicalMaterial({ map: forgedCarbon(), metalness: 0.2, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  } else if (name === "sapphire") {
    mat = new THREE.MeshPhysicalMaterial({ color: 0xf2f6ff, metalness: 0, roughness: 0.02, transmission: 0.95, thickness: 2, ior: 1.77, transparent: true, opacity: 0.6 });
  } else {
    const base = name.startsWith("two_tone") ? "steel" : name;
    const m = METALS[base] ?? METALS.steel;
    mat = new THREE.MeshPhysicalMaterial({
      color: m.color, metalness: 1, roughness: finish === "brushed" ? m.roughness + 0.16 : m.roughness * 0.6,
      envMapIntensity: 1.35, side: THREE.DoubleSide,
    });
    if (finish === "brushed") {
      mat.roughnessMap = brushedRoughness();
    }
  }
  matCache.set(key, mat);
  return mat;
}

/** Акцентный металл для двухцветных корпусов (безель, заводная головка, центральные звенья). */
export function accentMetalName(material) {
  if (material === "two_tone_yellow") return "yellow_gold";
  if (material === "two_tone_rose") return "rose_gold";
  return material;
}

export function ceramic(color) {
  const key = `ceramic:${color}`;
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshPhysicalMaterial({ color, metalness: 0, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03 }));
  }
  return matCache.get(key);
}

export function painted(color, { roughness = 0.45, metalness = 0 } = {}) {
  const key = `paint:${color}:${roughness}:${metalness}`;
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  return matCache.get(key);
}

export function lume(color = "#dfeee4") {
  const key = `lume:${color}`;
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.6, emissive: new THREE.Color(color), emissiveIntensity: 0.08 }));
  }
  return matCache.get(key);
}

export function ruby() {
  if (!matCache.has("ruby")) {
    matCache.set("ruby", new THREE.MeshPhysicalMaterial({ color: 0xb0102a, roughness: 0.05, metalness: 0, clearcoat: 1, transmission: 0.3, ior: 1.76, thickness: 0.4, emissive: 0x3a0008, emissiveIntensity: 0.3 }));
  }
  return matCache.get("ruby");
}

export function blued() {
  if (!matCache.has("blued")) matCache.set("blued", new THREE.MeshPhysicalMaterial({ color: 0x1f3a8a, metalness: 1, roughness: 0.18, iridescence: 0.4 }));
  return matCache.get("blued");
}

export function gilt() {
  if (!matCache.has("gilt")) matCache.set("gilt", new THREE.MeshPhysicalMaterial({ color: 0xd9b56a, metalness: 1, roughness: 0.22 }));
  return matCache.get("gilt");
}

/** Посеребрённая платина/мосты механизма (родий) или немецкое серебро. */
export function movementMetal(kind = "rhodium", texture = "perlage") {
  const key = `mv:${kind}:${texture}`;
  if (matCache.has(key)) return matCache.get(key);
  const color = kind === "german_silver" ? 0xe3d7b8 : kind === "gilt" ? 0xd8b570 : kind === "black" ? 0x2a2c30 : 0xcfd2d6;
  const mat = new THREE.MeshPhysicalMaterial({
    color, metalness: 1, roughness: 0.3,
    roughnessMap: texture === "cotes" ? cotesDeGeneve() : perlage(),
    bumpMap: texture === "cotes" ? cotesDeGeneve() : perlage(),
    bumpScale: 0.6,
  });
  matCache.set(key, mat);
  return mat;
}

export function crystalMaterial(kind = "sapphire", hero = false) {
  const key = `crystal:${kind}:${hero}`;
  if (matCache.has(key)) return matCache.get(key);
  const mat = hero
    ? new THREE.MeshPhysicalMaterial({
        color: kind === "hesalite" ? 0xfff8ee : 0xf4f8ff, metalness: 0, roughness: 0, transmission: 1, thickness: 0.5,
        ior: kind === "hesalite" ? 1.5 : 1.6, transparent: true, specularIntensity: 0.6, envMapIntensity: 0.9,
      })
    : new THREE.MeshPhysicalMaterial({
        color: 0xffffff, metalness: 0, roughness: 0.02, transparent: true, opacity: 0.08, envMapIntensity: 1.2,
        depthWrite: false,
      });
  matCache.set(key, mat);
  return mat;
}

export function strapMaterial(type, color) {
  const key = `strap:${type}:${color}`;
  if (matCache.has(key)) return matCache.get(key);
  let mat;
  if (type === "rubber" || type === "resin") {
    mat = new THREE.MeshPhysicalMaterial({ color: color ?? "#15161a", roughness: 0.62, metalness: 0, sheen: 0.4, sheenRoughness: 0.6 });
  } else if (type === "nato" || type === "fabric") {
    mat = new THREE.MeshPhysicalMaterial({ color: color ?? "#2b3140", roughness: 0.9, sheen: 1, sheenColor: new THREE.Color(color ?? "#2b3140").multiplyScalar(1.6), sheenRoughness: 0.5, bumpMap: leatherBump(), bumpScale: 0.3 });
  } else {
    const bump = type === "alligator" ? alligatorBump() : leatherBump();
    mat = new THREE.MeshPhysicalMaterial({
      color: color ?? "#2a1a12", roughness: 0.55, metalness: 0, bumpMap: bump, bumpScale: type === "alligator" ? 1.4 : 0.5,
      clearcoat: type === "alligator" ? 0.5 : 0.15, clearcoatRoughness: 0.4, sheen: 0.3,
    });
  }
  mat.side = THREE.DoubleSide;
  matCache.set(key, mat);
  return mat;
}
