// Страна: камера пикирует к стране, спутниковый снимок, светящаяся граница,
// бренды на карте и панель с историей и списком брендов.

import { api } from "../core/api.js";
import { html, qs, qsa } from "../core/dom.js";
import { brands, models, TIER, usd } from "../core/format.js";

const PANEL_W = () => Math.min(460, window.innerWidth * 0.36);

function countryShift() {
  const w = window.innerWidth, h = window.innerHeight;
  if (w < 900) return { x: 0, y: h * 0.24 };
  return { x: (PANEL_W() + 40) / 2 + 20, y: 0 };
}

const SORTS = {
  fame: { label: "Известность", fn: (a, b) => 0 },
  price: { label: "Цена", fn: (a, b) => (a.prices.avg ?? 0) - (b.prices.avg ?? 0) },
  year: { label: "Год", fn: (a, b) => a.founded - b.founded },
};

function brandRow(b, i) {
  const p = b.prices;
  return html`<li style="--i:${i}">
    <a class="cbrand" href="/brand/${b.slug}" data-slug="${b.slug}">
      <span class="cbrand__name">${b.name}</span>
      <span class="cbrand__meta">${b.founded}, ${b.city}</span>
      <span class="cbrand__price">
        <span class="price num">${p.avg ? `≈ ${usd(p.avg)}` : "нет данных"}</span>
        <span class="price-range num">${p.min ? `${usd(p.min)} - ${usd(p.max)}` : ""}</span>
      </span>
      <span class="cbrand__tier">${TIER[b.tier] ?? ""}${b.watch_count ? `, ${models(b.watch_count)}` : ""}</span>
    </a>
  </li>`;
}

export default {
  layer: "globe",

  async data({ params }) {
    const [country, countries] = await Promise.all([api.country(params[0]), api.countries()]);
    return { country, countries };
  },

  meta: ({ country }) => ({
    title: `${country.name}: часовые бренды | Horologium`,
    crumbs: [{ label: "Глобус", href: "/" }, { label: country.name }],
  }),

  render({ country: c, countries }) {
    const others = countries.filter((x) => x.slug !== c.slug && x.brand_count);
    return html`
      <section class="country">
        <aside class="cpanel interactive" data-lenis-prevent>
          <a class="cpanel__back" href="/"><i class="ph-light ph-arrow-left" aria-hidden="true"></i>Глобус</a>
          <header class="cpanel__head" data-anim>
            <h1 class="display display--l">${c.name}</h1>
            <p class="cpanel__tagline">${c.tagline}</p>
          </header>

          <dl class="cpanel__facts" data-anim>
            <div><dt>Брендов в атласе</dt><dd class="num">${c.brand_count}</dd></div>
            <div><dt>Моделей</dt><dd class="num">${c.watch_count}</dd></div>
            ${c.prices.avg ? html`<div><dt>Средняя цена</dt><dd class="num">${usd(c.prices.avg)}</dd></div>` : ""}
            ${c.facts.slice(0, 3).map((f) => html`<div><dt>${f.label}</dt><dd>${f.value}</dd></div>`)}
          </dl>

          <div class="cpanel__section" data-anim>
            <div class="cpanel__brands-head">
              <h2 class="cpanel__h2">${brands(c.brand_count)}</h2>
              ${c.brands.length > 2
                ? html`<div class="seg" role="radiogroup" aria-label="Сортировка брендов">
                    ${Object.entries(SORTS).map(
                      ([k, s], i) => html`<button type="button" role="radio" aria-checked="${i === 0}" data-sort="${k}">${s.label}</button>`,
                    )}
                  </div>`
                : ""}
            </div>
            ${c.brands.length
              ? html`<ol class="cbrands" role="list">${c.brands.map(brandRow)}</ol>`
              : html`<p class="muted">Бренды этой страны появятся в атласе в ближайших обновлениях.</p>`}
          </div>

          <div class="cpanel__section prose" data-anim>
            <h2 class="cpanel__h2">История</h2>
            ${c.intro.map((p) => html`<p>${p}</p>`)}
          </div>

          ${c.cities.length
            ? html`<div class="cpanel__section" data-anim>
                <h2 class="cpanel__h2">Часовые города</h2>
                <ul class="ccities" role="list">
                  ${c.cities.map((x) => html`<li><b>${x.name}</b><span>${x.note ?? ""}</span></li>`)}
                </ul>
              </div>`
            : ""}

          <div class="cpanel__section">
            <h2 class="cpanel__h2">Другие страны</h2>
            <div class="cpanel__others">
              ${others.map((x) => html`<a class="chip" href="/country/${x.slug}">${x.name}</a>`)}
            </div>
          </div>
          <p class="cpanel__credit">Снимок: Sentinel-2 cloudless 2016 by EOX IT Services GmbH (CC BY 4.0). Границы: Natural Earth.</p>
        </aside>
      </section>`;
  },

  mount(root, { country: c }, { globe }) {
    const list = qs(".cbrands", root);
    const pins = c.brands.map((b) => ({ slug: b.slug, name: b.name, lat: b.lat, lon: b.lon, meta: String(b.founded), href: `/brand/${b.slug}` }));
    let alive = true;
    const offs = [];

    globe.whenReady(async (scene) => {
      await scene.focus(c, { shift: countryShift() });
      if (!alive) return;
      scene.setPins(pins);
      offs.push(scene.on("pin", (slug) => {
        qsa(".cbrand", root).forEach((a) => a.classList.toggle("is-hot", a.dataset.slug === slug));
      }));
    });

    root.addEventListener("pointerover", (e) => {
      const a = e.target.closest(".cbrand");
      if (a) globe.scene?.highlightPin(a.dataset.slug);
    });
    root.addEventListener("pointerout", (e) => {
      if (e.target.closest(".cbrand") && !e.relatedTarget?.closest?.(".cbrand")) globe.scene?.highlightPin(null);
    });

    // Сортировка брендов с FLIP-анимацией.
    const byslug = new Map(c.brands.map((b) => [b.slug, b]));
    qsa("[data-sort]", root).forEach((btn) =>
      btn.addEventListener("click", () => {
        qsa("[data-sort]", root).forEach((b) => b.setAttribute("aria-checked", b === btn));
        const items = qsa("li", list);
        const first = new Map(items.map((li) => [li, li.getBoundingClientRect().top]));
        const key = btn.dataset.sort;
        const sorted = key === "fame" ? c.brands : [...c.brands].sort(SORTS[key].fn);
        const order = sorted.map((b) => b.slug);
        items.sort((a, b) => order.indexOf(a.querySelector("a").dataset.slug) - order.indexOf(b.querySelector("a").dataset.slug)).forEach((li) => list.append(li));
        const g = window.gsap;
        items.forEach((li) => {
          const dy = first.get(li) - li.getBoundingClientRect().top;
          if (dy && g) g.fromTo(li, { y: dy }, { y: 0, duration: 0.7, ease: "expo.out" });
        });
        void byslug;
      }),
    );

    const g = window.gsap;
    if (g) {
      g.from(qs(".cpanel", root), { x: -40, autoAlpha: 0, duration: 1.2, ease: "expo.out", delay: 0.3 });
      g.from(qsa("[data-anim]", root), { y: 24, autoAlpha: 0, duration: 1.1, stagger: 0.08, ease: "expo.out", delay: 0.5 });
      g.from(qsa(".cbrands li", root), { y: 16, autoAlpha: 0, duration: 0.9, stagger: 0.04, ease: "expo.out", delay: 0.8 });
    }
    const onResize = () => globe.scene?.focused && globe.scene.setShift(countryShift(), 0.5);
    window.addEventListener("resize", onResize);

    return () => {
      alive = false;
      window.removeEventListener("resize", onResize);
      offs.forEach((off) => off());
      globe.scene?.clearPins();
    };
  },
};
