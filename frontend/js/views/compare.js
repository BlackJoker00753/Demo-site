// Страница сравнения характеристик нескольких моделей часов.

import { api } from "../core/api.js";
import { html, qs, qsa } from "../core/dom.js";
import { photoImg, revealPhotos } from "../ui/photo.js";
import { formatMaterial } from "../ui/cards.js";
import { toast } from "../ui/toast.js";
import { usd, MOVEMENT, vph, hours, num } from "../core/format.js";
import { getComparedSlugs, toggleCompare, clearCompare, onCompareChange, hasCompare } from "../core/compare.js";

export default {
  layer: "page",
  currencyAware: true, // цены пересчитываются в mount без перерисовки страницы

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
          <div class="compare-actions">
            <button type="button" class="btn btn--ghost" id="share-compare-btn" title="Скопировать ссылку на это сравнение">
              <i class="ph-light ph-share-network" aria-hidden="true"></i>Поделиться
            </button>
            <button type="button" class="btn btn--ghost" id="clear-compare-btn">
              <i class="ph-light ph-trash" aria-hidden="true"></i>Очистить все
            </button>
          </div>
        </div>
      </header>

      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead>
            <tr>
              <th class="compare-th-metric">Параметр</th>
              ${watches.map((w) => html`
                <th class="compare-th-watch" data-col="${w.slug}">
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
              ${watches.map((w) => html`<td data-col="${w.slug}">${w.country_name || "-"}</td>`)}
            </tr>
            <tr>
              <td class="compare-metric">Материал корпуса</td>
              ${watches.map((w) => html`<td data-col="${w.slug}">${formatMaterial(w.material || w.case?.material) || "-"}</td>`)}
            </tr>
            <tr>
              <td class="compare-metric">Диаметр корпуса</td>
              ${watches.map((w) => html`<td data-col="${w.slug}"><b>${w.diameter_mm ? `${w.diameter_mm} мм` : "-"}</b></td>`)}
            </tr>
            <tr>
              <td class="compare-metric">Толщина корпуса</td>
              ${watches.map((w) => html`<td data-col="${w.slug}">${w.thickness_mm ? `${w.thickness_mm} мм` : "-"}</td>`)}
            </tr>
            <tr>
              <td class="compare-metric">Водозащита</td>
              ${watches.map((w) => html`<td data-col="${w.slug}"><b>${w.water_resistance_m ? `${w.water_resistance_m} м (${Math.round(w.water_resistance_m / 10)} бар)` : "-"}</b></td>`)}
            </tr>
            <tr>
              <td class="compare-metric">Тип механизма</td>
              ${watches.map((w) => html`<td data-col="${w.slug}">
                <span class="chip">${MOVEMENT[w.movement_type]?.short ?? w.movement_type}</span>
              </td>`)}
            </tr>
            <tr>
              <td class="compare-metric">Калибр</td>
              ${watches.map((w) => html`<td data-col="${w.slug}">
                <b>${w.movement?.name ?? "-"}</b>
                ${w.movement?.in_house ? html`<br><span class="chip chip--lume">Мануфактурный</span>` : ""}
              </td>`)}
            </tr>
            <tr>
              <td class="compare-metric">Запас хода</td>
              ${watches.map((w) => html`<td data-col="${w.slug}">${w.movement?.power_reserve_hours ? hours(w.movement.power_reserve_hours) : "-"}</td>`)}
            </tr>
            <tr>
              <td class="compare-metric">Частота баланса</td>
              ${watches.map((w) => html`<td data-col="${w.slug}">${w.frequency_vph ? vph(w.frequency_vph) : "-"}</td>`)}
            </tr>
            <tr>
              <td class="compare-metric">Усложнения</td>
              ${watches.map((w) => html`<td data-col="${w.slug}">
                ${w.complications?.length ? html`<div class="compare-comps">${w.complications.map((c) => html`<span class="chip">${c.name}</span>`)}</div>` : "Только время"}
              </td>`)}
            </tr>
            <tr>
              <td class="compare-metric">Год появления</td>
              ${watches.map((w) => html`<td data-col="${w.slug}">${w.year_introduced ? `с ${w.year_introduced} года` : "-"}</td>`)}
            </tr>
            <tr>
              <td class="compare-metric">Страница модели</td>
              ${watches.map((w) => html`<td data-col="${w.slug}">
                <a class="btn btn--small btn--primary" href="/watch/${w.slug}" data-link>Подробнее 3D</a>
              </td>`)}
            </tr>
          </tbody>
        </table>
      </div>
    </section>`;
  },

  mount(root, data, ctx) {
    revealPhotos(root);

    let currentWatches = data?.watches ? [...data.watches] : [];

    // Синхронизируем URL со списком часов, если есть выбранные модели
    if (currentWatches.length > 0) {
      const q = `?watches=${currentWatches.map((w) => w.slug).join(",")}`;
      if (location.search !== q) {
        history.replaceState(history.state, "", `/compare${q}`);
      }
    }

    const renderEmptyState = () => {
      root.innerHTML = this.render({ watches: [], empty: true });
      history.replaceState(history.state, "", "/compare");
    };

    root.addEventListener("click", (e) => {
      const shareBtn = e.target.closest("#share-compare-btn");
      if (shareBtn) {
        const shareUrl = `${location.origin}/compare?watches=${currentWatches.map((w) => w.slug).join(",")}`;
        const copyPromise = navigator.clipboard && navigator.clipboard.writeText
          ? navigator.clipboard.writeText(shareUrl)
          : Promise.reject(new Error("Clipboard API unavailable"));

        copyPromise.then(() => {
          const origHtml = shareBtn.innerHTML;
          shareBtn.innerHTML = `<i class="ph-light ph-check" aria-hidden="true"></i>Скопировано!`;
          shareBtn.classList.add("btn--lume");
          toast("Ссылка на сравнение скопирована в буфер обмена");
          setTimeout(() => {
            shareBtn.innerHTML = origHtml;
            shareBtn.classList.remove("btn--lume");
          }, 2000);
        }).catch(() => {
          prompt("Скопируйте ссылку на сравнение:", shareUrl);
        });
        return;
      }

      const removeBtn = e.target.closest("[data-remove]");
      if (removeBtn) {
        const slug = removeBtn.dataset.remove;
        toggleCompare(slug);
        currentWatches = currentWatches.filter((w) => w.slug !== slug);

        if (currentWatches.length === 0) {
          renderEmptyState();
        } else {
          // Динамически удаляем колонку без перезагрузки всей страницы
          qsa(`[data-col="${slug}"]`, root).forEach((el) => el.remove());
          const newSearch = `?watches=${currentWatches.map((w) => w.slug).join(",")}`;
          history.replaceState(history.state, "", `/compare${newSearch}`);
        }
        return;
      }

      if (e.target.closest("#clear-compare-btn")) {
        clearCompare();
        currentWatches = [];
        renderEmptyState();
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
