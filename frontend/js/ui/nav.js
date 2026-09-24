// Верхняя навигация: хлебные крошки и «стеклянный» фон после начала скролла.

import { html, setHTML } from "../core/dom.js";

export function initNav() {
  const nav = document.getElementById("nav");
  const crumbs = document.getElementById("crumbs");

  // Сторожевой элемент вверху документа: как только он уходит из кадра, навигация становится плотной.
  const sentinel = document.createElement("div");
  sentinel.style.cssText = "position:absolute;top:0;left:0;width:1px;height:48px;pointer-events:none;";
  document.body.prepend(sentinel);
  new IntersectionObserver(([e]) => nav.classList.toggle("is-solid", !e.isIntersecting && nav.dataset.layer !== "globe")).observe(sentinel);

  return {
    update(meta, routeName) {
      nav.dataset.layer = routeName === "home" || routeName === "country" ? "globe" : "page";
      if (nav.dataset.layer === "globe") nav.classList.remove("is-solid");
      const items = meta.crumbs ?? [];
      setHTML(
        crumbs,
        html`${items.map((c, i) =>
          i === items.length - 1
            ? html`<span aria-current="page">${c.label}</span>`
            : html`<a href="${c.href}">${c.label}</a><span class="sep" aria-hidden="true">/</span>`,
        )}`,
      );
    },
  };
}
