// Главная: глобус, заголовок и список стран.

import { api } from "../core/api.js";
import { html, qsa } from "../core/dom.js";
import { brands, usd } from "../core/format.js";

const isMobile = () => window.innerWidth < 760;

export function homeShift() {
  const w = window.innerWidth, h = window.innerHeight;
  if (isMobile()) return { x: 0, y: h * 0.16 };
  return { x: w > 1100 ? w * 0.1 : 0, y: 0 };
}

export default {
  layer: "globe",

  async data() {
    const [countries, stats] = await Promise.all([api.countries(), api.stats()]);
    return { countries, stats };
  },

  meta: () => ({ title: "Horologium: атлас часового искусства", crumbs: [] }),

  render({ countries, stats }) {
    const withBrands = countries.filter((c) => c.brand_count > 0);
    return html`
      <section class="home">
        <div class="home__hero interactive">
          <p class="label" data-anim>Атлас часового искусства</p>
          <h1 class="display display--xl home__title" data-anim>Откуда приходит <em>время</em></h1>
          <p class="lead home__lead" data-anim>Выберите страну на глобусе и откройте её мануфактуры, модели, механизмы и актуальные цены.</p>
          <div class="home__cta" data-anim>
            <a class="btn" href="/country/switzerland">Начать со Швейцарии <i class="ph-light ph-arrow-right" aria-hidden="true"></i></a>
            <button class="btn btn--ghost" type="button" data-open-search><i class="ph-light ph-magnifying-glass" aria-hidden="true"></i>Найти модель</button>
          </div>
        </div>

        <nav class="home__countries interactive" aria-label="Страны">
          <ol role="list">
            ${countries.map(
              (c, i) => html`<li style="--i:${i}">
                <a class="hcountry ${c.brand_count ? "" : "is-empty"}" href="/country/${c.slug}" data-slug="${c.slug}">
                  <span class="hcountry__name">${c.name}</span>
                  <span class="hcountry__meta">${c.brand_count ? brands(c.brand_count) : "скоро"}</span>
                  <span class="hcountry__price num">${c.prices.min ? `от\u00a0${usd(c.prices.min)}` : ""}</span>
                </a>
              </li>`,
            )}
          </ol>
        </nav>

        <dl class="home__stats interactive" data-anim>
          <div><dt>Страны</dt><dd class="num">${withBrands.length}</dd></div>
          <div><dt>Бренды</dt><dd class="num">${stats.brands}</dd></div>
          <div><dt>Модели</dt><dd class="num">${stats.watches}</dd></div>
          <div><dt>Калибры</dt><dd class="num">${stats.movements}</dd></div>
        </dl>
        <p class="home__hint interactive"><i class="ph-light ph-hand-grabbing" aria-hidden="true"></i>Вращайте глобус и нажмите на подсвеченную страну</p>
      </section>`;
  },

  mount(root, { countries }, { globe, from }) {
    const bySlug = new Map(countries.map((c) => [c.slug, c]));
    globe.whenReady(() => globe.scene.overview({ shift: homeShift() }));

    const links = qsa(".hcountry", root);
    const offHover = globe.whenReady(() =>
      globe.scene.on("hover", (country) => {
        links.forEach((a) => a.classList.toggle("is-hot", country?.slug === a.dataset.slug));
      }),
    );
    links.forEach((a) => {
      const c = bySlug.get(a.dataset.slug);
      a.addEventListener("pointerenter", () => {
        if (!globe.scene?.ready) return;
        globe.scene.preview(c.iso_a3);
        globe.scene.peek(c);
      });
      a.addEventListener("pointerleave", () => {
        if (!globe.scene?.ready) return;
        globe.scene.preview(null);
        globe.scene.release();
      });
    });
    root.querySelector("[data-open-search]")?.addEventListener("click", () => document.getElementById("search-open").click());

    const g = window.gsap;
    if (g && from !== "country") {
      g.from(qsa("[data-anim]", root), { autoAlpha: 0, y: 30, duration: 1.3, stagger: 0.09, ease: "expo.out", delay: 0.15 });
      g.from(qsa(".home__countries li", root), { autoAlpha: 0, x: 24, duration: 1.1, stagger: 0.05, ease: "expo.out", delay: 0.35 });
    }
    const onResize = () => globe.scene?.ready && !globe.scene.focused && globe.scene.setShift(homeShift(), 0.6);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      Promise.resolve(offHover).then((off) => typeof off === "function" && off());
      globe.scene?.preview(null);
    };
  },
};
