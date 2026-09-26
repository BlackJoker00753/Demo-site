// Точка входа фронтенда.

import { api } from "./core/api.js";
import { applyRates, getActiveCurrency } from "./core/format.js";
import { Router } from "./core/router.js";
import { initScroll } from "./core/scroll.js";
import { observeReveals } from "./core/motion.js";
import { initNav } from "./ui/nav.js";
import { initSearch } from "./ui/search.js";

document.documentElement.classList.add("js");

/** Обёртка над глобусом: страницы могут обращаться к нему до окончания загрузки. */
class GlobeHost {
  constructor() {
    this.scene = null;
    this.mode = "visible";
    this.layer = document.getElementById("globe-layer");
    this.ready = new Promise((resolve, reject) => { this._resolve = resolve; this._reject = reject; });
    this.ready.catch(() => {});
  }
  attach(scene) {
    this.scene = scene;
    scene.setMode(this.mode);
    this._resolve(scene);
  }
  fail(err) {
    console.warn("Globe unavailable:", err);
    this.layer.classList.add("is-failed");
    this._reject(err);
  }
  /** Выполнить fn(scene), когда глобус готов. Возвращает промис результата. */
  whenReady(fn) {
    return this.ready.then(fn, () => null);
  }
  setMode(mode) {
    this.mode = mode;
    if (this.scene) this.scene.setMode(mode);
    else {
      this.layer.classList.toggle("is-hidden", mode === "hidden");
      if (mode !== "hidden") this.onNeed?.(); // глобус понадобился раньше фоновой загрузки
    }
  }
}

async function boot() {
  initScroll();
  const nav = initNav();
  const globe = new GlobeHost();
  const router = new Router({
    root: document.getElementById("view"),
    globe,
    onMeta: (meta, route) => nav.update(meta, route),
  });
  initSearch(router);
  // Отладочный доступ из консоли: __horologium.globe.scene, __horologium.router
  window.__horologium = { globe, router };
  router.onChange(() => observeReveals(document.getElementById("view")));
  // Шрифты меняют высоту блоков: пересчитать позиции ScrollTrigger после загрузки.
  document.fonts?.ready.then(() => window.ScrollTrigger?.refresh());

  // Глобус: на главной и странице страны грузится сразу, вместе с первой страницей. На остальных
  // (модель, бренд, каталог) он не нужен сразу: ~4 МБ текстур и геоданных ждут простоя браузера
  // или перехода на глобус, чтобы не мешать загрузке фото и разборки.
  let globeBoot = null;
  const bootGlobe = () =>
    (globeBoot ??= (async () => {
      const [{ GlobeScene }, countries] = await Promise.all([import("./globe/scene.js"), api.countries()]);
      const scene = new GlobeScene(document.getElementById("globe-canvas"), document.getElementById("globe-markers"));
      await scene.init(countries);
      scene.on("click", (hit) => {
        if (hit.country && !location.pathname.endsWith(`/country/${hit.country.slug}`)) router.go(`/country/${hit.country.slug}`);
      });
      globe.attach(scene);
    })().catch((err) => globe.fail(err)));
  const isGlobePath = (p) => ["/", ""].includes(p) || p.startsWith("/country/");
  const needsGlobe = isGlobePath(location.pathname);
  if (needsGlobe) bootGlobe();
  else {
    globe.onNeed = bootGlobe;
    const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 1500));
    setTimeout(() => idle(() => bootGlobe(), { timeout: 8000 }), 6000);
  }

  // Курсы валют: для долларов не нужны, для остальных ждём их (недолго) до первой отрисовки.
  const rates = api.rates().then(applyRates).catch(() => {});
  if (getActiveCurrency().code !== "USD") await Promise.race([rates, new Promise((r) => setTimeout(r, 800))]);
  // Смена валюты: страницы, которые не пересчитывают цены сами, перерисовываются на месте.
  window.addEventListener("currencychange", () => {
    if (!router.current?.view?.currencyAware) router.refresh();
  });

  const first = router.start();
  const intro = document.getElementById("intro");
  const ticks = intro.querySelector(".intro__ticks");
  ticks.innerHTML = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    const r1 = 48, r2 = i % 3 === 0 ? 42 : 45;
    return `<line x1="${60 + Math.sin(a) * r1}" y1="${60 - Math.cos(a) * r1}" x2="${60 + Math.sin(a) * r2}" y2="${60 - Math.cos(a) * r2}"/>`;
  }).join("");
  await Promise.race([Promise.all([first, needsGlobe ? globeBoot : null]), new Promise((r) => setTimeout(r, 4500))]);
  intro.classList.add("is-done");
  setTimeout(() => intro.remove(), 1200);
}

boot();

// Офлайн-режим и быстрые повторные визиты (frontend/sw.js). На localhost тоже: так его видно при разработке.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
