// Усложнение: что это, как устроено, кто придумал и какие часы атласа его умеют.

import { api } from "../core/api.js";
import { html, qs, qsa } from "../core/dom.js";
import { brands as brandsN, COMP_CATEGORY, DIFFICULTY, models, usd } from "../core/format.js";
import { reduced } from "../core/motion.js";
import { attachGallery, watchCard } from "../ui/cards.js";
import { photoCredit, photoImg, revealPhotos } from "../ui/photo.js";
import { diffMeter } from "./glossary.js";

export default {
  layer: "page",

  async data({ params }) {
    const [page, all] = await Promise.all([api.complication(params[0]), api.complications()]);
    return { ...page, all };
  },

  meta: ({ complication: c }) => ({
    title: `${c.name} (${c.name_en}): как устроено и в каких часах | Horologium`,
    crumbs: [{ label: "Глобус", href: "/" }, { label: "Усложнения", href: "/glossary" }, { label: c.name }],
  }),

  render({ complication: c, watches, all }) {
    // герой: культовая механическая модель со своим фото (у хронографа это Daytona, а не G-Shock)
    const score = (w) => (Math.max(w.photo.width, w.photo.height) < 1000 ? -6 : 0) + (w.icon ? 4 : 0) + (["automatic", "manual", "spring_drive"].includes(w.movement_type) ? 2 : 0) + (w.photo.context ? -8 : 0);
    const hero = watches.filter((w) => w.photo).sort((a, b) => score(b) - score(a) || b.price.usd - a.price.usd)[0];
    const prices = watches.map((w) => w.price.usd).filter(Boolean);
    const brands = new Set(watches.map((w) => w.brand)).size;
    const order = [...all].sort((a, b) => a.difficulty - b.difficulty || a.name.localeCompare(b.name, "ru"));
    const at = order.findIndex((x) => x.slug === c.slug);
    const prev = order[at - 1], next = order[at + 1];
    return html`<article class="topic">
      <header class="bhero topic__hero ${hero ? "" : "topic__hero--text"}">
        <div class="bhero__text">
          <p class="label" data-hero>${COMP_CATEGORY[c.category] ?? c.category} · ${DIFFICULTY[c.difficulty]}</p>
          <h1 class="display topic__name" data-hero>${c.name}</h1>
          <p class="topic__en" data-hero>${c.name_en}</p>
          <p class="lead" data-hero>${c.short}</p>
          <div class="bhero__price" data-hero>
            ${prices.length
              ? html`<div>
                  <span class="bhero__price-label">В атласе</span>
                  <span class="price bhero__avg num">${models(watches.length)}</span>
                </div>
                <div class="bhero__range">
                  <span>от <b class="num">${usd(Math.min(...prices))}</b></span>
                  <span>до <b class="num">${usd(Math.max(...prices))}</b></span>
                  <span class="muted">${brandsN(brands)}</span>
                </div>`
              : html`<p class="topic__empty">В атласе пока нет часов с этой функцией: её делают единицы мануфактур, а модели мы добавляем только с настоящими фото и проверенной ценой.</p>`}
          </div>
          <div class="bhero__cta" data-hero>
            ${watches.length ? html`<a class="btn" href="#models">Смотреть часы <i class="ph-light ph-arrow-down" aria-hidden="true"></i></a>` : ""}
            <a class="btn btn--ghost" href="/glossary">Все усложнения</a>
          </div>
        </div>
        ${hero
          ? html`<figure class="bhero__plate">
              <a class="bhero__frame" href="/watch/${hero.slug}" aria-label="${hero.brand_name} ${hero.name}" data-shared="w-${hero.slug}">
                ${photoImg(hero.photo, { eager: true, cls: "bhero__photo", sizes: "(max-width: 900px) 92vw, 46vw", alt: `${hero.brand_name} ${hero.name}` })}
              </a>
              <figcaption class="bhero__figcap">
                <a class="bhero__caption" href="/watch/${hero.slug}"><span>${hero.brand_name} ${hero.name}</span><span class="num">${usd(hero.price.usd)}</span></a>
                ${photoCredit(hero.photo)}
              </figcaption>
            </figure>`
          : ""}
      </header>

      <section class="topic__explain container" aria-label="Как устроено">
        <div class="topic__col" data-reveal>
          <h2 class="label">Что это</h2>
          <p class="topic__big">${c.description}</p>
        </div>
        <div class="topic__col" data-reveal style="--i:1">
          <h2 class="label">Как устроено</h2>
          <p>${c.how_it_works}</p>
          ${c.invented ? html`<h2 class="label topic__sub">Кто придумал</h2><p>${c.invented}</p>` : ""}
          <div class="topic__diff">
            ${diffMeter(c.difficulty, "dmeter--l")}
            <span><b>${DIFFICULTY[c.difficulty]}</b> · сложность ${c.difficulty} из 5</span>
          </div>
        </div>
      </section>

      ${watches.length
        ? html`<section class="catalog topic__models" id="models">
            <div class="container">
              <div class="catalog__head">
                <h2 class="display display--m">Часы с этой функцией</h2>
                <p class="muted catalog__count">${models(watches.length)}, от доступных к дорогим</p>
              </div>
              <div class="grid" data-grid>${watches.map((w, i) => watchCard(w, { showBrand: true, i }))}</div>
            </div>
          </section>`
        : ""}

      <nav class="topic__next container" aria-label="Другие усложнения">
        ${prev ? html`<a class="topic__nav" href="/complication/${prev.slug}"><small>Проще</small><span><i class="ph-light ph-arrow-left" aria-hidden="true"></i>${prev.name}</span></a>` : html`<span></span>`}
        ${next ? html`<a class="topic__nav topic__nav--next" href="/complication/${next.slug}"><small>Сложнее</small><span>${next.name}<i class="ph-light ph-arrow-right" aria-hidden="true"></i></span></a>` : ""}
      </nav>
    </article>`;
  },

  mount(root, { watches }, ctx = {}) {
    const g = window.gsap;
    revealPhotos(root);
    if (g && !reduced()) {
      g.from(qsa("[data-hero]", root), { y: 28, autoAlpha: 0, duration: 1.2, stagger: 0.07, ease: "expo.out", delay: 0.1 });
      const plate = qs(".bhero__plate", root) ?? qs(".bhero__stage", root);
      if (plate && !ctx.shared) g.from(plate, { autoAlpha: 0, y: 24, scale: 0.97, duration: 1.6, ease: "expo.out", delay: 0.2 });
    }
    const grid = qs("[data-grid]", root);
    let off = null;
    if (grid) attachGallery(grid, watches).then((fn) => (off = fn));
    return () => off?.();
  },
};
