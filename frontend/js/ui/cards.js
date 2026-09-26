// Карточка модели часов: только настоящие фотографии. Если своего снимка нет,
// показывается родственная модель с пометкой, а без снимков вообще типографская заглушка.

import { html } from "../core/dom.js";
import { MOVEMENT, usd } from "../core/format.js";
import { photoImg, revealPhotos } from "./photo.js";
import { hasCompare } from "../core/compare.js";

export const MATERIAL_LABELS = {
  steel: "Сталь",
  rose_gold: "Розовое золото",
  yellow_gold: "Желтое золото",
  white_gold: "Белое золото",
  two_tone_yellow: "Биколор",
  two_tone_rose: "Биколор",
  platinum: "Платина",
  titanium: "Титан",
  ceramic: "Керамика",
  ceramic_black: "Керамика",
  ceramic_white: "Керамика",
  carbon: "Карбон",
  bronze: "Бронза",
  resin_black: "Полимер",
  resin_white: "Полимер",
  gold: "Золото",
  tantalum: "Тантал",
};

export function formatMaterial(mat) {
  if (!mat) return null;
  return MATERIAL_LABELS[mat] || mat;
}

export function watchCard(w, { showBrand = false, i = 0 } = {}) {
  const comps = w.complications.filter((c) => !["date", "small-seconds", "tachymeter"].includes(c.slug)).slice(0, 2);
  const inComp = hasCompare(w.slug);
  const matLabel = formatMaterial(w.material || w.render?.case?.material);
  return html`<a class="wcard" href="/watch/${w.slug}" data-slug="${w.slug}" data-type="${w.movement_type}"
      data-comps="${w.complications.map((c) => c.slug).join(" ")}" data-price="${w.price.usd}" data-year="${w.year_introduced ?? 9999}"
      style="--i:${i % 8}" data-reveal>
    <button type="button" class="wcard__compare" data-compare="${w.slug}" title="Сравнить модель" aria-label="Сравнить ${w.name}" aria-pressed="${String(inComp)}">
      <i class="ph-light ph-scales" aria-hidden="true"></i>
    </button>
    ${w.photo
      ? html`<div class="wcard__stage wcard__stage--photo" data-shared="w-${w.slug}">
          ${photoImg(w.photo, { cls: "wcard__photo", sizes: "(max-width: 700px) 92vw, (max-width: 1100px) 46vw, 380px", alt: `${w.brand_name} ${w.name}` })}
          ${w.photo.context ? html`<span class="wcard__badge" title="${w.photo.caption ?? ""}">Похожая модель</span>` : ""}
          ${w.teardown ? html`<span class="wcard__badge wcard__badge--td" title="На странице модели часы разбираются до каждой детали"><i class="ph-light ph-stack" aria-hidden="true"></i>До детали</span>` : ""}
        </div>`
      : html`<div class="wcard__stage wcard__stage--type" aria-hidden="true">
          <span class="wcard__mono">${w.brand_name}</span>
          <span class="wcard__type-name">${w.name}</span>
          <span class="wcard__type-note">Свободной фотографии пока нет</span>
        </div>`}
    <div class="wcard__body">
      <div class="wcard__top">
        <h3 class="wcard__name">${showBrand ? html`<small>${w.brand_name}</small>` : ""}${w.name}</h3>
        ${w.reference ? html`<span class="wcard__ref">${w.reference}</span>` : ""}
      </div>
      <div class="wcard__meta">
        <span class="chip">${MOVEMENT[w.movement_type]?.short ?? w.movement_type}</span>
        ${w.diameter_mm ? html`<span class="chip chip--spec" title="Диаметр корпуса">Ø ${w.diameter_mm} мм</span>` : ""}
        ${matLabel ? html`<span class="chip chip--spec" title="Материал корпуса">${matLabel}</span>` : ""}
        ${w.water_resistance_m ? html`<span class="chip chip--spec" title="Водозащита">${w.water_resistance_m} м</span>` : ""}
        ${w.in_house ? html`<span class="chip chip--lume">Свой калибр</span>` : ""}
        ${comps.map((c) => html`<span class="chip">${c.name}</span>`)}
      </div>
      <div class="wcard__foot">
        <span class="price wcard__price num">${usd(w.price.usd)}</span>
        <span class="price-kind">${w.year_introduced ? `с ${w.year_introduced}` : ""}</span>
      </div>
    </div>
  </a>`;
}

/** Параметры для фабрики 3D из карточки API. */
export const buildInfo = (w) => ({
  render: w.render,
  diameter: w.diameter_mm,
  thickness: w.thickness_mm ?? w.case?.thickness_mm ?? Math.max(9, w.diameter_mm * 0.3),
  movementType: w.movement_type,
  frequency: w.frequency_vph,
  logo: w.render?.logo,
  caption: w.collection && w.collection !== w.brand_name ? w.collection : null,
});

/** Подключить 3D-превью к карточкам без фото внутри root. Возвращает функцию очистки. */
export async function attachGallery(root, watches) {
  revealPhotos(root);
  if (!root.querySelector("[data-watch]")) return () => {};
  const { getGallery } = await import("../watch3d/gallery.js");
  const gallery = getGallery();
  const bySlug = new Map(watches.map((w) => [w.slug, w]));
  root.querySelectorAll("[data-watch]").forEach((el) => {
    const w = bySlug.get(el.dataset.watch);
    if (w) gallery.add(el, buildInfo(w));
  });
  return () => gallery.clear();
}
