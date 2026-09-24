// Настоящие фотографии: адаптивный <img> и подпись с автором и лицензией.
//
// Файлы лежат в /assets/photos/<file>-{480,960,1600}.jpg (см. scripts/photos.py).
// Изображение проявляется, когда декодировано (класс is-loaded), без скачка вёрстки:
// width/height заданы заранее.

import { html } from "../core/dom.js";

const SIZES = [480, 960, 1600];
const src = (p, w) => `/assets/photos/${p.file}-${w}.jpg`;

/** Адаптивное фото. sizes подсказывает браузеру ширину слота. */
export function photoImg(p, { sizes = "(max-width: 700px) 100vw, 480px", cls = "", eager = false, alt = "" } = {}) {
  if (!p) return "";
  const [fx, fy] = p.focus ?? [0.5, 0.5];
  const avail = SIZES.filter((w) => w <= Math.max(p.width, p.height) || w === SIZES[0]);
  return html`<img class="photo ${cls}" src="${src(p, 960)}" srcset="${avail.map((w) => `${src(p, w)} ${w}w`).join(", ")}"
    sizes="${sizes}" width="${p.width}" height="${p.height}" alt="${alt || p.title || ""}"
    style="object-position:${Math.round(fx * 100)}% ${Math.round(fy * 100)}%"
    loading="${eager ? "eager" : "lazy"}" decoding="async" ${eager ? html`fetchpriority="high"` : ""} data-photo>`;
}

/** Короткая подпись: «Фото: автор, CC BY-SA 4.0» со ссылкой на исходник. */
export function photoCredit(p, { cls = "" } = {}) {
  if (!p) return "";
  return html`<span class="credit ${cls}">
    ${p.caption || p.context ? html`<span class="credit__note">${p.context ? "Похожая модель: " : ""}${p.caption ?? ""}</span>` : ""}
    <span>Фото: ${p.source_url ? html`<a href="${p.source_url}" target="_blank" rel="noopener" data-external>${p.author}</a>` : p.author},
    ${p.license_url ? html`<a href="${p.license_url}" target="_blank" rel="noopener" data-external>${p.license}</a>` : p.license}</span>
  </span>`;
}

/** Проявлять фото после декодирования (вызывать в mount). */
export function revealPhotos(root) {
  root.querySelectorAll("img[data-photo]").forEach((img) => {
    const done = () => img.classList.add("is-loaded");
    if (img.complete && img.naturalWidth) done();
    else {
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", () => img.classList.add("is-broken"), { once: true });
    }
  });
}
