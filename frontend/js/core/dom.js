// Мини-хелперы для DOM и безопасной HTML-шаблонизации.

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

class Raw {
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}
/** Вставить строку без экранирования (только для заведомо безопасной разметки). */
export const raw = (value) => new Raw(value);

const render = (v) => {
  if (v == null || v === false) return "";
  if (v instanceof Raw) return v.value;
  if (Array.isArray(v)) return v.map(render).join("");
  return esc(v);
};

/** Тегированный шаблон: html`<p>${text}</p>` экранирует значения, массивы склеивает. */
export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((v, i) => { out += render(v) + strings[i + 1]; });
  return raw(out);
}

export function setHTML(el, markup) {
  el.innerHTML = markup instanceof Raw ? markup.value : String(markup);
  return el;
}

export function on(el, event, selectorOrHandler, handler) {
  if (typeof selectorOrHandler === "function") {
    el.addEventListener(event, selectorOrHandler);
    return () => el.removeEventListener(event, selectorOrHandler);
  }
  const listener = (e) => {
    const target = e.target.closest(selectorOrHandler);
    if (target && el.contains(target)) handler(e, target);
  };
  el.addEventListener(event, listener);
  return () => el.removeEventListener(event, listener);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
