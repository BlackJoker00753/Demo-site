// Калибр: характеристики механизма, чем он особенный и какие часы атласа на нём работают.

import { api } from "../core/api.js";
import { html, qs, qsa } from "../core/dom.js";
import { hours, models, MOVEMENT, num, usd, vph } from "../core/format.js";
import { countUp, reduced } from "../core/motion.js";
import { attachGallery, watchCard } from "../ui/cards.js";
import { photoCredit, photoImg, revealPhotos } from "../ui/photo.js";

const MECH = new Set(["automatic", "manual", "spring_drive"]);

export default {
  layer: "page",

  data: ({ params }) => api.movement(params[0]),

  meta: ({ movement: m, watches }) => {
    const w = watches[0];
    return {
      title: `Калибр ${m.caliber}: характеристики и часы | Horologium`,
      crumbs: [
        { label: "Глобус", href: "/" },
        ...(w ? [{ label: w.brand_name, href: `/brand/${w.brand}` }] : []),
        { label: m.caliber },
      ],
    };
  },

  render({ movement: m, watches }) {
    const hero = watches.find((w) => w.photo && !w.photo.context) ?? watches.find((w) => w.photo);
    const brand = watches[0];
    const mech = MECH.has(m.type);
    return html`<article class="topic">
      <header class="bhero topic__hero">
        <div class="bhero__text">
          <p class="label" data-hero>Калибр · ${MOVEMENT[m.type]?.label ?? m.type}</p>
          <h1 class="display topic__name topic__name--caliber" data-hero>${m.caliber}</h1>
          <div class="wmove__badges" data-hero>
            ${m.in_house
              ? html`<span class="chip chip--lume"><i class="ph-light ph-seal-check" aria-hidden="true"></i>Мануфактурный калибр ${m.maker}</span>`
              : html`<span class="chip"><i class="ph-light ph-factory" aria-hidden="true"></i>Производитель: ${m.maker}</span>`}
            ${m.base ? html`<span class="chip">Основа: ${m.base}</span>` : ""}
            ${m.certification ? html`<span class="chip">${m.certification}</span>` : ""}
            ${m.year ? html`<span class="chip">С ${m.year} года</span>` : ""}
          </div>
          ${m.description ? html`<p class="lead" data-hero>${m.description}</p>` : ""}
          <div class="bhero__cta" data-hero>
            ${watches.length ? html`<a class="btn" href="#models">${watches.length === 1 ? "Часы с этим калибром" : `${models(watches.length)} с этим калибром`} <i class="ph-light ph-arrow-down" aria-hidden="true"></i></a>` : ""}
            ${brand ? html`<a class="btn btn--ghost" href="/brand/${brand.brand}">${brand.brand_name}</a>` : ""}
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
          : html`<div class="bhero__stage bhero__stage--type" aria-hidden="true"><span class="bhero__type">${m.caliber}</span></div>`}
      </header>

      <section class="wmove container topic__specs" aria-label="Характеристики">
        <div class="wmove__grid">
          ${m.power_reserve_h
            ? html`<div class="wmove__gauge" data-reveal>
                <svg viewBox="0 0 200 200" aria-hidden="true">
                  <circle cx="100" cy="100" r="86" class="gauge__track"></circle>
                  <circle cx="100" cy="100" r="86" class="gauge__arc" data-gauge="${Math.min(1, m.power_reserve_h / 168)}"></circle>
                </svg>
                <div class="wmove__gauge-text"><span class="num" data-count-num="${m.power_reserve_h}">${num(m.power_reserve_h)}</span><small>${hours(m.power_reserve_h).split(" ").slice(1).join(" ")} запаса хода</small></div>
              </div>`
            : html`<div class="wmove__gauge wmove__gauge--quartz" data-reveal><i class="ph-thin ${MOVEMENT[m.type]?.icon}" aria-hidden="true"></i><small>${MOVEMENT[m.type]?.label}</small></div>`}
          <div class="wmove__info">
            <h2 class="display display--s" data-reveal>Характеристики</h2>
            <dl class="wmove__facts" data-reveal>
              <div><dt>Тип</dt><dd>${MOVEMENT[m.type]?.label ?? m.type}</dd></div>
              <div><dt>Производитель</dt><dd>${m.maker}${m.in_house ? ", своё производство" : ""}</dd></div>
              ${m.power_reserve_h ? html`<div><dt>Запас хода</dt><dd>${hours(m.power_reserve_h)}</dd></div>` : ""}
              ${m.frequency_vph ? html`<div><dt>Частота</dt><dd>${vph(m.frequency_vph)}</dd></div>` : ""}
              ${m.jewels ? html`<div><dt>Камни</dt><dd>${m.jewels}</dd></div>` : ""}
              ${m.accuracy ? html`<div><dt>Точность</dt><dd>${m.accuracy}</dd></div>` : ""}
              ${m.certification ? html`<div><dt>Сертификат</dt><dd>${m.certification}</dd></div>` : ""}
              ${m.year ? html`<div><dt>Год калибра</dt><dd>${m.year}</dd></div>` : ""}
              ${m.diameter_mm ? html`<div><dt>Диаметр</dt><dd>${String(m.diameter_mm).replace(".", ",")} мм</dd></div>` : ""}
              ${m.thickness_mm ? html`<div><dt>Высота</dt><dd>${String(m.thickness_mm).replace(".", ",")} мм</dd></div>` : ""}
              ${m.base ? html`<div><dt>Основа</dt><dd>${m.base}</dd></div>` : ""}
            </dl>
            ${mech && m.frequency_vph
              ? html`<div class="beat" data-reveal style="--beat:${(7200 / m.frequency_vph).toFixed(4)}s">
                  <span class="beat__wheel" aria-hidden="true"></span>
                  <span>Баланс делает ${num(m.frequency_vph)} полуколебаний в час. Это ${Math.round(m.frequency_vph / 3600)} шагов секундной стрелки в секунду.</span>
                </div>`
              : ""}
            ${m.features.length ? html`<ul class="wmove__features" role="list" data-reveal>${m.features.map((f) => html`<li>${f}</li>`)}</ul>` : ""}
          </div>
        </div>
      </section>

      ${watches.length
        ? html`<section class="catalog topic__models" id="models">
            <div class="container">
              <div class="catalog__head">
                <h2 class="display display--m">${watches.length === 1 ? "Часы с этим калибром" : "Часы на этом калибре"}</h2>
                <p class="muted catalog__count">${models(watches.length)}</p>
              </div>
              <div class="grid" data-grid>${watches.map((w, i) => watchCard(w, { showBrand: true, i }))}</div>
            </div>
          </section>`
        : ""}

      <nav class="bnext container" aria-label="Дальше">
        ${brand ? html`<a class="link-arrow" href="/brand/${brand.brand}"><i class="ph-light ph-arrow-left" aria-hidden="true"></i>Все модели ${brand.brand_name}</a>` : ""}
        <a class="link-arrow" href="/watches">Каталог всех часов <i class="ph-light ph-arrow-right" aria-hidden="true"></i></a>
      </nav>
    </article>`;
  },

  mount(root, { watches }, ctx = {}) {
    const g = window.gsap;
    const ST = window.ScrollTrigger;
    const still = !g || reduced();
    revealPhotos(root);
    if (!still) {
      g.from(qsa("[data-hero]", root), { y: 28, autoAlpha: 0, duration: 1.2, stagger: 0.07, ease: "expo.out", delay: 0.1 });
      const plate = qs(".bhero__plate", root) ?? qs(".bhero__stage", root);
      if (plate && !ctx.shared) g.from(plate, { autoAlpha: 0, y: 24, scale: 0.97, duration: 1.6, ease: "expo.out", delay: 0.2 });
    }
    // шкала запаса хода и число часов, как на странице модели
    qsa("[data-count-num]", root).forEach((el) => {
      if (still || !ST) return;
      ST.create({ trigger: el, start: "top 85%", once: true, onEnter: () => countUp(el, +el.dataset.countNum, { duration: 1.6 }) });
    });
    qsa("[data-gauge]", root).forEach((c) => {
      const len = 2 * Math.PI * 86;
      const target = len * (1 - +c.dataset.gauge);
      c.style.strokeDasharray = `${len}`;
      c.style.strokeDashoffset = `${still || !ST ? target : len}`;
      if (!still && ST) ST.create({ trigger: c, start: "top 85%", once: true, onEnter: () => g.to(c, { strokeDashoffset: target, duration: 2, ease: "expo.out" }) });
    });
    const grid = qs("[data-grid]", root);
    let off = null;
    if (grid) attachGallery(grid, watches).then((fn) => (off = fn));
    return () => off?.();
  },
};
