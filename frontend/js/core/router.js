// SPA-роутер: History API, ленивые модули страниц, переходы и восстановление скролла.
//
// Модуль страницы экспортирует объект:
//   layer:  "globe" (глобус виден и интерактивен) | "page" (обычная страница поверх)
//   data(ctx)            → Promise с данными (грузится параллельно с анимацией ухода)
//   render(data, ctx)    → html-разметка
//   mount(root, data, ctx) → функция очистки (опционально)
//   meta(data, ctx)      → { title, crumbs: [{ label, href }] }
//
// Общий элемент: если у ссылки внутри есть [data-shared="key"] (фото в карточке), а на новой
// странице есть элемент с тем же ключом (рамка фото в шапке), снимок «перелетает» из карточки
// на своё место (FLIP). ctx.shared = key, чтобы страница не запускала свою анимацию появления фото.

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
  { name: "watches", re: /^\/watches\/?$/, load: () => import("../views/watches.js") },
  { name: "compare", re: /^\/compare\/?$/, load: () => import("../views/compare.js") },
  { name: "credits", re: /^\/credits\/?$/, load: () => import("../views/credits.js") },
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
    this.pendingShared = null;
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
    this.pendingShared = this.#captureShared(a);
    this.go(url.pathname + url.search);
  }

  /** Запомнить фото внутри ссылки, чтобы после перехода перенести его на новое место. */
  #captureShared(a) {
    const el = a.querySelector("[data-shared]");
    const img = el?.matches("img") ? el : el?.querySelector("img");
    if (!el || !img?.currentSrc || !img.complete || reduced()) return null;
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight || r.width < 40) return null;
    const cs = getComputedStyle(img);
    const ghost = document.createElement("div");
    ghost.className = "shared-ghost";
    ghost.innerHTML = `<img alt="" src="${img.currentSrc}" style="object-position:${cs.objectPosition}">`;
    // У фото в карточке своих скруглений нет (их даёт карточка): берём верхние углы ссылки.
    const own = getComputedStyle(el).borderRadius;
    const radius = own && own !== "0px" ? own : `${getComputedStyle(a).borderTopLeftRadius} ${getComputedStyle(a).borderTopRightRadius} 0 0`;
    Object.assign(ghost.style, {
      left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`,
      borderRadius: radius,
    });
    document.body.append(ghost);
    return { key: el.dataset.shared, ghost };
  }

  /** Перелёт снимка к новому месту. Цель скрыта, пока снимок летит. */
  async #flyShared(shared) {
    const g = gsap();
    const target = this.root.querySelector(`[data-shared="${CSS.escape(shared.key)}"]`);
    const { ghost } = shared;
    if (!g || !target) {
      g ? await g.to(ghost, { autoAlpha: 0, duration: 0.35, ease: "power2.out" }) : null;
      ghost.remove();
      return;
    }
    g.set(target, { autoAlpha: 0 });
    // Цель тоже двигается (страница въезжает снизу), поэтому её прямоугольник читается каждый кадр.
    const from = ghost.getBoundingClientRect();
    g.to(ghost, { borderRadius: getComputedStyle(target).borderRadius, duration: 1.1, ease: "expo.inOut" });
    const targetImg = target.querySelector("img");
    const endScale = targetImg ? +g.getProperty(targetImg, "scale") || 1 : 1;
    const ghostImg = ghost.querySelector("img");
    const startScale = 1;
    const p = { t: 0 };
    const lerp = (a, b) => a + (b - a) * p.t;
    await g.to(p, {
      t: 1, duration: 1.1, ease: "expo.inOut",
      onUpdate: () => {
        const r = target.getBoundingClientRect();
        ghost.style.left = `${lerp(from.left, r.left)}px`;
        ghost.style.top = `${lerp(from.top, r.top)}px`;
        ghost.style.width = `${lerp(from.width, r.width)}px`;
        ghost.style.height = `${lerp(from.height, r.height)}px`;
        ghostImg.style.transform = `scale(${lerp(startScale, endScale)})`;
      },
    });
    await g.to(target, { autoAlpha: 1, duration: 0.3, ease: "power1.out" });
    ghost.remove();
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

    const shared = push ? this.pendingShared : null;
    if (!push) this.pendingShared?.ghost.remove();
    this.pendingShared = null;
    const ctx = {
      params, path, from: prev?.name ?? null, globe: this.globe, router: this,
      search: new URLSearchParams(path.split("?")[1] || ""), shared: shared?.key ?? null,
    };
    const mod = await route.load();
    const view = mod.default;
    const dataPromise = Promise.resolve(view.data ? view.data(ctx) : null);
    dataPromise.catch(() => {}); // обработаем ниже

    const sameLayer = prev?.view.layer === view.layer;
    if (prev && !initial) await this.#leave(prev, view);
    if (token !== this.token) {
      shared?.ghost.remove();
      return;
    }

    prev?.cleanup?.();
    window.ScrollTrigger?.getAll().forEach((st) => st.kill());

    let data;
    try {
      data = await dataPromise;
    } catch (err) {
      shared?.ghost.remove();
      if (token !== this.token) return;
      this.#renderError(err);
      this.current = { name: "error", view: { layer: "page" }, key };
      return;
    }
    if (token !== this.token) {
      shared?.ghost.remove();
      return;
    }

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
    if (shared) this.#flyShared(shared);
    await this.#enter(view, { sameLayer, initial });
    window.ScrollTrigger?.refresh();
    this.listeners.forEach((fn) => fn(route.name, params));
    if (!initial) this.root.focus({ preventScroll: true });
  }

  async #leave(prev, nextView) {
    const g = gsap();
    if (!g || reduced()) return;
    const globeToGlobe = prev.view.layer === "globe" && nextView.layer === "globe";
    await g.to(this.root, {
      autoAlpha: 0,
      y: globeToGlobe ? 0 : -8,
      duration: globeToGlobe ? 0.2 : 0.24,
      ease: "power2.inOut",
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
      { autoAlpha: 0, y: view.layer === "globe" ? 0 : 12 },
      { autoAlpha: 1, y: 0, duration: initial ? 0.8 : sameLayer ? 0.45 : 0.55, ease: "power2.out", clearProps: "transform" },
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
