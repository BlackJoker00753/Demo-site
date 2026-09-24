// SPA-роутер: History API, ленивые модули страниц, переходы и восстановление скролла.
//
// Модуль страницы экспортирует объект:
//   layer:  "globe" (глобус виден и интерактивен) | "page" (обычная страница поверх)
//   data(ctx)            → Promise с данными (грузится параллельно с анимацией ухода)
//   render(data, ctx)    → html-разметка
//   mount(root, data, ctx) → функция очистки (опционально)
//   meta(data, ctx)      → { title, crumbs: [{ label, href }] }

import { gsap, reduced } from "./motion.js";
import { scrollTop, getLenis } from "./scroll.js";
import { setHTML, html } from "./dom.js";

const ROUTES = [
  { name: "home", re: /^\/$/, load: () => import("../views/home.js") },
  { name: "country", re: /^\/country\/([a-z0-9-]+)\/?$/, load: () => import("../views/country.js") },
  { name: "brand", re: /^\/brand\/([a-z0-9-]+)\/?$/, load: () => import("../views/brand.js") },
  { name: "watch", re: /^\/watch\/([a-z0-9-]+)\/?$/, load: () => import("../views/watch.js") },
  { name: "complication", re: /^\/complication\/([a-z0-9-]+)\/?$/, load: () => import("../views/complication.js") },
  { name: "glossary", re: /^\/glossary\/?$/, load: () => import("../views/glossary.js") },
  { name: "movement", re: /^\/movement\/([a-z0-9-]+)\/?$/, load: () => import("../views/movement.js") },
  { name: "lab", re: /^\/lab\/?$/, load: () => import("../views/lab.js") },
];

const NOT_FOUND = { name: "404", load: () => import("../views/not-found.js") };

export class Router {
  constructor({ root, globe, onMeta }) {
    this.root = root;
    this.globe = globe;
    this.onMeta = onMeta;
    this.current = null; // { name, view, cleanup, key }
    this.token = 0;
    this.scrollMemory = new Map();
    this.listeners = new Set();
  }

  start() {
    history.scrollRestoration = "manual";
    document.addEventListener("click", (e) => this.#onClick(e));
    window.addEventListener("popstate", (e) => this.go(location.pathname + location.search, { push: false, key: e.state?.key }));
    const key = this.#key();
    history.replaceState({ key }, "", location.href);
    return this.go(location.pathname + location.search, { push: false, key, initial: true });
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  #key() {
    return Math.random().toString(36).slice(2, 10);
  }

  #onClick(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest("a[href]");
    if (!a || a.target === "_blank" || a.hasAttribute("download") || a.dataset.external !== undefined) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
    e.preventDefault();
    if (url.pathname + url.search === location.pathname + location.search) return;
    this.go(url.pathname + url.search);
  }

  #match(path) {
    const pathname = path.split("?")[0];
    for (const r of ROUTES) {
      const m = pathname.match(r.re);
      if (m) return { route: r, params: m.slice(1) };
    }
    return { route: NOT_FOUND, params: [] };
  }

  async go(path, { push = true, key, initial = false } = {}) {
    const token = ++this.token;
    const { route, params } = this.#match(path);
    const prev = this.current;

    if (prev) this.scrollMemory.set(prev.key, window.scrollY);
    if (push) {
      key = this.#key();
      history.pushState({ key }, "", path);
    }

    const ctx = { params, path, from: prev?.name ?? null, globe: this.globe, router: this, search: new URLSearchParams(path.split("?")[1] || "") };
    const mod = await route.load();
    const view = mod.default;
    const dataPromise = Promise.resolve(view.data ? view.data(ctx) : null);
    dataPromise.catch(() => {}); // обработаем ниже

    const sameLayer = prev?.view.layer === view.layer;
    if (prev && !initial) await this.#leave(prev, view);
    if (token !== this.token) return;

    prev?.cleanup?.();
    window.ScrollTrigger?.getAll().forEach((st) => st.kill());

    let data;
    try {
      data = await dataPromise;
    } catch (err) {
      if (token !== this.token) return;
      this.#renderError(err);
      this.current = { name: "error", view: { layer: "page" }, key };
      return;
    }
    if (token !== this.token) return;

    this.globe?.setMode(view.layer === "globe" ? "visible" : "hidden");
    this.root.dataset.layer = view.layer;
    this.root.dataset.route = route.name;
    setHTML(this.root, view.render(data, ctx));

    const restore = !push && this.scrollMemory.has(key) ? this.scrollMemory.get(key) : 0;
    if (restore) {
      getLenis()?.scrollTo(restore, { immediate: true, force: true });
      if (!getLenis()) window.scrollTo(0, restore);
    } else scrollTop(true);

    const meta = view.meta ? view.meta(data, ctx) : { title: "Horologium" };
    document.title = meta.title;
    this.onMeta?.(meta, route.name);

    const cleanup = view.mount ? view.mount(this.root, data, ctx) : null;
    this.current = { name: route.name, view, cleanup, key };
    await this.#enter(view, { sameLayer, initial });
    window.ScrollTrigger?.refresh();
    this.listeners.forEach((fn) => fn(route.name, params));
    if (!initial) this.root.focus({ preventScroll: true });
  }

  async #leave(prev, nextView) {
    const g = gsap();
    if (!g || reduced()) return;
    const toGlobe = nextView.layer === "globe";
    await g.to(this.root, {
      autoAlpha: 0,
      y: prev.view.layer === "globe" && toGlobe ? 0 : -18,
      duration: prev.view.layer === "globe" && toGlobe ? 0.3 : 0.42,
      ease: "power2.in",
    });
  }

  async #enter(view, { sameLayer, initial }) {
    const g = gsap();
    if (!g || reduced()) {
      this.root.style.opacity = 1;
      this.root.style.visibility = "visible";
      return;
    }
    g.set(this.root, { clearProps: "transform" });
    await g.fromTo(
      this.root,
      { autoAlpha: 0, y: view.layer === "globe" ? 0 : 28 },
      { autoAlpha: 1, y: 0, duration: initial ? 1.2 : sameLayer ? 0.7 : 0.9, ease: "expo.out", clearProps: "transform" },
    );
  }

  #renderError(err) {
    this.globe?.setMode("hidden");
    const notFound = err?.status === 404;
    setHTML(
      this.root,
      html`<section class="error-state">
        <h1 class="display display--m">${notFound ? "Такой страницы нет" : "Что-то пошло не так"}</h1>
        <p>${notFound ? "Возможно, модель переименовали или ссылка устарела." : err?.message || "Попробуйте обновить страницу."}</p>
        <a class="btn" href="/">К глобусу</a>
      </section>`,
    );
    gsap()?.to(this.root, { autoAlpha: 1, y: 0, duration: 0.4 });
    this.root.style.opacity = 1;
    this.root.style.visibility = "visible";
  }
}
