// География: перевод широты/долготы в 3D и обратно, загрузка границ и ID-карты стран.
//
// Соглашение совпадает с UV-развёрткой THREE.SphereGeometry и равнопромежуточной
// текстурой: долгота 0 смотрит в +X, долгота -90 в +Z, северный полюс в +Y.

import * as THREE from "three";
import { asset } from "../core/api.js";

const DEG = Math.PI / 180;

export function lonLatToVec3(lon, lat, r = 1, target = new THREE.Vector3()) {
  const phi = lat * DEG;
  const lam = lon * DEG;
  return target.set(r * Math.cos(phi) * Math.cos(lam), r * Math.sin(phi), -r * Math.cos(phi) * Math.sin(lam));
}

export function vec3ToLonLat(v) {
  const r = v.length();
  return { lat: Math.asin(v.y / r) / DEG, lon: Math.atan2(-v.z, v.x) / DEG };
}

/** Пересечение луча со сферой радиуса r в начале координат (ближайшая точка). */
export function raySphere(ray, r = 1) {
  const o = ray.origin, d = ray.direction;
  const b = o.dot(d);
  const c = o.lengthSq() - r * r;
  const disc = b * b - c;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  return t > 0 ? o.clone().addScaledVector(d, t) : null;
}

export const loadWorld = () => asset("/assets/geo/world-50m.json");
export const loadCountryShape = (slug) => asset(`/assets/geo/countries/${slug}.json`);
export const loadFrames = () => asset("/assets/countries/frames.json");

/** CPU-копия ID-карты стран для мгновенного пикинга (2048×1024, без сглаживания). Строится в фоновом
 *  потоке (picker-worker.js); без OffscreenCanvas (старый Safari) на главном, когда браузер свободен. */
export async function loadIdPicker(url = "/assets/earth/country-ids-2k.png") {
  const { w, h, ids } = typeof OffscreenCanvas !== "undefined" ? await pickerInWorker(url).catch(() => pickerHere(url)) : await pickerHere(url);
  return {
    idAt(lon, lat) {
      const x = Math.min(w - 1, Math.max(0, Math.floor(((lon + 180) / 360) * w)));
      const y = Math.min(h - 1, Math.max(0, Math.floor(((90 - lat) / 180) * h)));
      return ids[y * w + x];
    },
  };
}

function pickerInWorker(url) {
  return new Promise((ok, fail) => {
    const worker = new Worker(new URL("./picker-worker.js", import.meta.url));
    worker.onmessage = ({ data }) => {
      worker.terminate();
      data.error ? fail(new Error(data.error)) : ok(data);
    };
    worker.onerror = (e) => {
      worker.terminate();
      fail(e);
    };
    worker.postMessage({ url: new URL(url, location.href).href });
  });
}

async function pickerHere(url) {
  await new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(r, { timeout: 3000 }) : setTimeout(r, 300)));
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  await img.decode();
  const w = img.naturalWidth, h = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  const px = ctx.getImageData(0, 0, w, h).data;
  const ids = new Uint16Array(w * h);
  for (let i = 0, j = 0; i < ids.length; i++, j += 4) ids[i] = px[j] + px[j + 1] * 256;
  return { w, h, ids };
}

/** Все границы одним буфером отрезков (для тонких линий на глобусе). */
export function bordersGeometry(countries, r = 1.0015, filter = () => true) {
  const pts = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  for (const c of countries) {
    if (!filter(c)) continue;
    for (const ring of c.rings) {
      for (let i = 0; i + 3 < ring.length; i += 2) {
        lonLatToVec3(ring[i], ring[i + 1], r, a);
        lonLatToVec3(ring[i + 2], ring[i + 3], r, b);
        pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

/** Точки кольца (lon,lat,…) → массив xyz для Line2, с уплотнением длинных отрезков. */
export function ringPositions(ring, r) {
  const out = [];
  const v = new THREE.Vector3();
  for (let i = 0; i + 1 < ring.length; i += 2) {
    const lon = ring[i], lat = ring[i + 1];
    if (i >= 2) {
      const plon = ring[i - 2], plat = ring[i - 1];
      const steps = Math.ceil(Math.max(Math.abs(lon - plon), Math.abs(lat - plat)) / 0.5);
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        lonLatToVec3(plon + (lon - plon) * t, plat + (lat - plat) * t, r, v);
        out.push(v.x, v.y, v.z);
      }
    }
    lonLatToVec3(lon, lat, r, v);
    out.push(v.x, v.y, v.z);
  }
  return out;
}

/** Площадь кольца в градусах² (для отсева мелких островов при рисовании). */
export function ringArea(ring) {
  let s = 0;
  for (let i = 0; i + 3 < ring.length; i += 2) s += ring[i] * ring[i + 3] - ring[i + 2] * ring[i + 1];
  return Math.abs(s / 2);
}
