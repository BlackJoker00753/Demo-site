// Сервис-воркер: офлайн-режим и быстрые повторные визиты.
//
//   страницы (HTML), код (/js, /css) и данные (/api)  сеть, а без сети кеш: правки видны сразу
//   библиотеки, шрифты, иконки                        кеш; обновляются сменой VERSION
//   фото, разборки, текстуры                          кеш (до MAX_MEDIA файлов), без повторной загрузки
//
// Фон не трогаем: раньше каждое фото из кеша ещё и скачивалось заново «на всякий случай», и каждая
// страница тянула свои снимки дважды. Файлы ассетов меняются редко; при замене меняем VERSION.
//
// Без сети открываются все страницы, которые уже смотрели: SPA-шелл берётся из кеша, данные тоже.

const VERSION = "v5-catalogue-workshops";
const SHELL = `shell-${VERSION}`;
const STATIC = `static-${VERSION}`;
const MEDIA = `media-${VERSION}`;
const WORKSHOPS = `workshops-${VERSION}`;
const MAX_MEDIA = 400;
const MAX_WORKSHOPS = 6;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(["/", "/manifest.webmanifest", "/favicon.svg", "/assets/fonts/fonts.css", "/assets/icons/icons.css"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL, STATIC, MEDIA, WORKSHOPS]);
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    const hit = (await cache.match(request)) ?? (fallbackUrl && (await caches.match(fallbackUrl)));
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) {
    // A full device cache must not turn a successful model download into a failed load.
    await cache.put(request, res.clone()).catch(() => {});
    if (cacheName === MEDIA) trim();
    if (cacheName === WORKSHOPS) {
      const keys = await cache.keys();
      await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_WORKSHOPS)).map(key => cache.delete(key)));
    }
  }
  return res;
}

// ограничение размера кеша медиа: не на каждый запрос, а не чаще раза в 30 секунд
let trimAt = 0;
async function trim() {
  if (Date.now() - trimAt < 30000) return;
  trimAt = Date.now();
  const cache = await caches.open(MEDIA);
  const keys = await cache.keys();
  if (keys.length > MAX_MEDIA) await Promise.all(keys.slice(0, keys.length - MAX_MEDIA).map((k) => cache.delete(k)));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  const p = url.pathname;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, SHELL, "/"));
  } else if (p.startsWith("/api/") || p.startsWith("/js/") || p.startsWith("/css/") || p === "/manifest.webmanifest") {
    event.respondWith(networkFirst(request, STATIC));
  } else if (p.startsWith("/vendor/") || p.startsWith("/assets/fonts/") || p.startsWith("/assets/icons/") || p.startsWith("/assets/brand/") || p === "/favicon.svg") {
    event.respondWith(cacheFirst(request, STATIC));
  } else if ((p.startsWith("/assets/teardown/") && p.endsWith(".json")) || p.startsWith("/assets/teardown-tasks/")) {
    event.respondWith(networkFirst(request, STATIC)); // меняются при пересборке
  } else if (p.startsWith("/assets/workshop/") && p.endsWith(".glb")) {
    event.respondWith(cacheFirst(request, WORKSHOPS));
  } else if (p.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request, MEDIA));
  }
});
