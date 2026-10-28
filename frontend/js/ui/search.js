// Поиск-палитра: ⌘K / Ctrl+K / «/». Клавиатурная навигация, группы результатов.

import { api } from "../core/api.js";
import { html, setHTML } from "../core/dom.js";
import { lockScroll } from "../core/scroll.js";

const KIND = {
  country: { label: "Страны", icon: "ph-globe-hemisphere-east" },
  brand: { label: "Бренды", icon: "ph-crown-simple" },
  watch: { label: "Модели", icon: "ph-watch" },
  complication: { label: "Усложнения", icon: "ph-gear-six" },
  movement: { label: "Калибры", icon: "ph-circles-three" },
};

export function initSearch(router) {
  const dialog = document.getElementById("search");
  const input = document.getElementById("search-input");
  const results = document.getElementById("search-results");
  const opener = document.getElementById("search-open");
  let hits = [];
  let active = 0;
  let timer = 0;
  let lastFocus = null;
  let seq = 0;
  let inertState = [];

  function open() {
    if (!dialog.hidden) return;
    lastFocus = document.activeElement;
    dialog.hidden = false;
    inertState = [...document.body.children].filter(el => el !== dialog && el.tagName !== "SCRIPT").map(el => [el, el.inert]);
    inertState.forEach(([el]) => { el.inert = true; });
    lockScroll(true);
    input.value = "";
    renderEmpty("Начните вводить название бренда, модели, референс или усложнение.");
    window.gsap?.fromTo(dialog.querySelector(".search__panel"), { y: -12, opacity: 0, scale: 0.98 }, { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: "expo.out" });
    window.gsap?.fromTo(dialog.querySelector(".search__backdrop"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 });
    input.focus({ preventScroll: true });
  }

  function close() {
    if (dialog.hidden) return;
    dialog.hidden = true;
    clearTimeout(timer); seq++;
    inertState.forEach(([el, value]) => { el.inert = value; });
    inertState = [];
    lockScroll(false);
    lastFocus?.focus?.();
  }

  function renderEmpty(text) {
    hits = [];
    input.removeAttribute("aria-activedescendant");
    input.setAttribute("aria-expanded", "false");
    setHTML(results, html`<div class="search__empty">${text}</div>`);
  }

  function render() {
    if (!hits.length) return renderEmpty("Ничего не нашлось. Попробуйте иначе: «Сабмаринер», «хронограф», «Япония».");
    const groups = {};
    hits.forEach((h, i) => (groups[h.kind] ??= []).push([h, i]));
    setHTML(
      results,
      Object.entries(groups).map(
        ([kind, items]) => html`<div class="search__group label">${KIND[kind]?.label ?? kind}</div>
          ${items.map(
            ([h, i]) => html`<a class="search__hit" href="${h.url}" role="option" id="hit-${i}" aria-selected="${i === active}">
              <i class="ph-light ${KIND[h.kind]?.icon ?? "ph-circle"}" aria-hidden="true"></i>
              <span>${h.title}<small>${h.subtitle}</small></span>
              <i class="ph-light ph-arrow-up-right" aria-hidden="true"></i>
            </a>`,
          )}`,
      ),
    );
    input.setAttribute("aria-expanded", "true");
    input.setAttribute("aria-activedescendant", `hit-${active}`);
  }

  function select(i) {
    if (!hits.length) return;
    active = (i + hits.length) % hits.length;
    input.setAttribute("aria-activedescendant", `hit-${active}`);
    results.querySelectorAll(".search__hit").forEach((el) => el.setAttribute("aria-selected", el.id === `hit-${active}`));
    results.querySelector(`#hit-${active}`)?.scrollIntoView({ block: "nearest" });
  }

  input.addEventListener("input", () => {
    clearTimeout(timer);
    const my = ++seq;
    const q = input.value.trim();
    if (q.length < 2) return renderEmpty("Начните вводить название бренда, модели, референс или усложнение.");
    timer = setTimeout(async () => {
      try {
        const data = await api.search(q);
        if (my !== seq) return;
        hits = data;
        active = 0;
        render();
      } catch {
        if (my === seq) renderEmpty("Поиск временно недоступен. Проверьте соединение и повторите запрос.");
      }
    }, 140);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); select(active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); select(active - 1); }
    else if (e.key === "Enter" && hits[active]) {
      e.preventDefault();
      close();
      router.go(hits[active].url);
    }
  });

  results.addEventListener("click", (e) => {
    if (e.target.closest(".search__hit")) close();
  });
  dialog.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) close(); });
  document.getElementById("search-close")?.addEventListener("click", close);
  dialog.addEventListener("keydown", event => {
    if (event.key !== "Tab") return;
    const controls = [...dialog.querySelectorAll('input,button,a[href]')].filter(el => el.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  opener.addEventListener("click", open);

  document.addEventListener("keydown", (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); dialog.hidden ? open() : close(); }
    else if (e.key === "/" && !typing) { e.preventDefault(); open(); }
    else if (e.key === "Escape" && !dialog.hidden) { e.preventDefault(); close(); }
  });

  return { open, close };
}
