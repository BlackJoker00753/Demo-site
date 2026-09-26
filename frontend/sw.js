// Сервис-воркер: офлайн-режим и быстрые повторные визиты.
//
//   страницы (HTML), код (/js, /css) и данные (/api)  сеть, а без сети кеш: правки видны сразу
//   библиотеки, шрифты, иконки                        кеш, в фоне обновление
//   фото, разборки, текстуры                          кеш (до MAX_MEDIA файлов), в фоне обновление
//
// Без сети открываются все страницы, которые уже смотрели: SPA-шелл берётся из кеша, данные тоже.

const VERSION = "v1";
const SHELL = `shell-${VERSION}`;
const STATIC = `static-${VERSION}`;
const MEDIA = `media-${VERSION}`;
const MAX_MEDIA = 400;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(["/", "/manifest.webmanifest", "/favicon.svg", "/assets/fonts/fonts.css"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL, STATIC, MEDIA]);
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

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request);
  const update = fetch(request).then((res) => {
    if (res.ok) cache.put(request, res.clone());
    return res;
  }).catch(() => null);
  return hit ?? (await update) ?? Response.error();
}

async function media(request) {
  const cache = await caches.open(MEDIA);
  const hit = await cache.match(request);
  const update = fetch(request).then(async (res) => {
    if (res.ok) {
      await cache.put(request, res.clone());
      // простое ограничение размера: удаляем самые старые записи
      const keys = await cache.keys();
      if (keys.length > MAX_MEDIA) await Promise.all(keys.slice(0, keys.length - MAX_MEDIA).map((k) => cache.delete(k)));
    }
    return res;
  }).catch(() => null);
  return hit ?? (await update) ?? Response.error();
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
  } else if (p.startsWith("/vendor/") || p.startsWith("/assets/fonts/") || p.startsWith("/assets/brand/") || p === "/favicon.svg") {
    event.respondWith(staleWhileRevalidate(request));
  } else if ((p.startsWith("/assets/teardown/") && p.endsWith(".json")) || p.startsWith("/assets/teardown-tasks/")) {
    event.respondWith(networkFirst(request, STATIC)); // меняются при пересборке
  } else if (p.startsWith("/assets/")) {
    event.respondWith(media(request));
  }
});
