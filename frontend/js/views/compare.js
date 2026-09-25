// Страница сравнения характеристик нескольких моделей часов.

import { api } from "../core/api.js";
import { html, qs, qsa } from "../core/dom.js";
import { photoImg, revealPhotos } from "../ui/photo.js";
import { usd, MOVEMENT, vph, hours, num } from "../core/format.js";
import { getComparedSlugs, toggleCompare, clearCompare, onCompareChange } from "../core/compare.js";

export default {
  layer: "page",

  async data(ctx) {
    const params = new URLSearchParams(location.search);
    const qList = params.get("watches") ? params.get("watches").split(",").filter(Boolean) : [];
    const slugs = qList.length ? qList : getComparedSlugs();

    if (!slugs.length) {
      return { watches: [], empty: true };
    }

    const watches = (
      await Promise.all(
        slugs.map((s) => api.watch(s).catch(() => null))
      )
    ).filter(Boolean);

    return { watches, empty: watches.length === 0 };
  },

  meta: () => ({
    title: "Сравнение моделей часов | Horologium",
    crumbs: [{ label: "Глобус", href: "/" }, { label: "Каталог", href: "/watches" }, { label: "Сравнение моделей" }],
  }),

  render({ watches, empty }) {
    if (empty) {
      return html`<section class="compare-page container">
        <header class="compare-page__head">
          <p class="label" data-reveal>Сравнение моделей</p>
          <h1 class="display display--l" data-reveal>Нет выбранных часов</h1>
          <p class="lead" data-reveal>Выберите до 4 моделей в каталоге или на страницах часов, чтобы сравнить их габариты, калибры, водозащиту и цены.</p>
          <div class="compare-empty__actions" data-reveal>
            <a class="btn btn--primary" href="/watches" data-link>Открыть каталог</a>
            <div class="compare-presets">
              <span class="muted">Популярные сравнения:</span>
              <a href="/compare?watches=rolex-submariner,omega-seamaster-diver-300m" class="chip chip--lume" data-link>Rolex Submariner vs Omega Seamaster</a>
              <a href="/compare?watches=patek-philippe-nautilus-5811,audemars-piguet-royal-oak-jumbo" class="chip chip--lume" data-link>Patek Nautilus vs AP Royal Oak</a>
            </div>
          </div>
        </header>
      </section>`;
    }

    return html`<section class="compare-page container">
      <header class="compare-page__head">
        <div class="compare-page__top">
          <div>
            <p class="label" data-reveal>Сравнение моделей</p>
            <h1 class="display display--l" data-reveal>Сопоставление характеристик</h1>
          </div>
          <button type="button" class="btn btn--ghost" id="clear-compare-btn">
            <i class="ph-light ph-trash" aria-hidden="true"></i>Очистить все
          </button>
        </div>
      </header>

      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead>
            <tr>
              <th class="compare-th-metric">Параметр</th>
              ${watches.map((w) => html`
                <th class="compare-th-watch">
                  <div class="compare-card">
                    <button type="button" class="compare-remove" data-remove="${w.slug}" title="Убрать из сравнения" aria-label="Убрать ${w.name}">
                      <i class="ph-light ph-x" aria-hidden="true"></i>
                    </button>
                    <a href="/watch/${w.slug}" data-link class="compare-card__img">
                      ${w.photos?.[0] ? photoImg(w.photos[0], { sizes: "220px", alt: w.name }) : ""}
                    </a>
                    <span class="compare-card__brand">${w.brand_name}</span>
                    <a href="/watch/${w.slug}" data-link class="compare-card__title">${w.name}</a>
                    <span class="compare-card__price num">${usd(w.price?.usd)}</span>
                  </div>
                </th>
              `)}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="compare-metric">Страна производства</td>
              ${watches.map((w) => html`<td>${w.country_name || "—"}</td>`)}
            </tr>
            <tr>
              <td class="compare-metric">Диаметр корпуса</td>
              ${watches.map((w) => html`<td><b>${w.diameter_mm ? `${w.diameter_mm} мм` : "—"}</b></td>`)}
            </tr>
            <tr>
              <td class="compare-metric">Толщина корпуса</td>
              ${watches.map((w) => html`<td>${w.thickness_mm ? `${w.thickness_mm} мм` : "—"}</td>`)}
            </tr>
            <tr>
              <td class="compare-metric">Водозащита</td>
              ${watches.map((w) => html`<td><b>${w.water_resistance_m ? `${w.water_resistance_m} м (${Math.round(w.water_resistance_m / 10)} бар)` : "—"}</b></td>`)}
            </tr>
            <tr>
              <td class="compare-metric">Тип механизма</td>
              ${watches.map((w) => html`<td>
                <span class="chip">${MOVEMENT[w.movement_type]?.short ?? w.movement_type}</span>
              </td>`)}
            </tr>
            <tr>
              <td class="compare-metric">Калибр</td>
              ${watches.map((w) => html`<td>
                <b>${w.movement?.name ?? "—"}</b>
                ${w.movement?.in_house ? html`<br><span class="chip chip--lume">Мануфактурный</span>` : ""}
              </td>`)}
            </tr>
            <tr>
              <td class="compare-metric">Запас хода</td>
              ${watches.map((w) => html`<td>${w.movement?.power_reserve_hours ? hours(w.movement.power_reserve_hours) : "—"}</td>`)}
            </tr>
            <tr>
              <td class="compare-metric">Частота баланса</td>
              ${watches.map((w) => html`<td>${w.frequency_vph ? vph(w.frequency_vph) : "—"}</td>`)}
            </tr>
            <tr>
              <td class="compare-metric">Усложнения</td>
              ${watches.map((w) => html`<td>
                ${w.complications?.length ? html`<div class="compare-comps">${w.complications.map((c) => html`<span class="chip">${c.name}</span>`)}</div>` : "Только время"}
              </td>`)}
            </tr>
            <tr>
              <td class="compare-metric">Год появления</td>
              ${watches.map((w) => html`<td>${w.year_introduced ? `с ${w.year_introduced} года` : "—"}</td>`)}
            </tr>
            <tr>
              <td class="compare-metric">Страница модели</td>
              ${watches.map((w) => html`<td>
                <a class="btn btn--small btn--primary" href="/watch/${w.slug}" data-link>Подробнее 3D</a>
              </td>`)}
            </tr>
          </tbody>
        </table>
      </div>
    </section>`;
  },

  mount(root) {
    revealPhotos(root);

    root.addEventListener("click", (e) => {
      const removeBtn = e.target.closest("[data-remove]");
      if (removeBtn) {
        const slug = removeBtn.dataset.remove;
        toggleCompare(slug);
        location.reload();
        return;
      }

      if (e.target.closest("#clear-compare-btn")) {
        clearCompare();
        location.href = "/compare";
      }
    });

    const onCur = () => {
      qsa(".compare-card__price", root).forEach((el) => {
        // trigger format update
      });
    };
    window.addEventListener("currencychange", onCur);

    return () => {
      window.removeEventListener("currencychange", onCur);
    };
  },
};
