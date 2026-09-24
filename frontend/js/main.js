// Точка входа фронтенда.

import { api } from "./core/api.js";
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
    else this.layer.classList.toggle("is-hidden", mode === "hidden");
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

  // Глобус грузится параллельно с первой страницей.
  const globeBoot = (async () => {
    const [{ GlobeScene }, countries] = await Promise.all([import("./globe/scene.js"), api.countries()]);
    const scene = new GlobeScene(document.getElementById("globe-canvas"), document.getElementById("globe-markers"));
    await scene.init(countries);
    scene.on("click", (hit) => {
      if (hit.country && !location.pathname.endsWith(`/country/${hit.country.slug}`)) router.go(`/country/${hit.country.slug}`);
    });
    globe.attach(scene);
  })().catch((err) => globe.fail(err));

  const first = router.start();
  const intro = document.getElementById("intro");
  const ticks = intro.querySelector(".intro__ticks");
  ticks.innerHTML = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    const r1 = 48, r2 = i % 3 === 0 ? 42 : 45;
    return `<line x1="${60 + Math.sin(a) * r1}" y1="${60 - Math.cos(a) * r1}" x2="${60 + Math.sin(a) * r2}" y2="${60 - Math.cos(a) * r2}"/>`;
  }).join("");
  const needsGlobe = ["/", ""].includes(location.pathname) || location.pathname.startsWith("/country/");
  await Promise.race([Promise.all([first, needsGlobe ? globeBoot : null]), new Promise((r) => setTimeout(r, 4500))]);
  intro.classList.add("is-done");
  setTimeout(() => intro.remove(), 1200);
}

boot();
