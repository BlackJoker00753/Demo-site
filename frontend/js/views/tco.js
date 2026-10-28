// Страница калькулятора ликвидности, вторичной стоимости и совокупной стоимости владения (TCO)

import { api } from "../core/api.js";
import { html, qs } from "../core/dom.js";
import { usd, PRICE_KIND } from "../core/format.js";
import { photoImg, revealPhotos } from "../ui/photo.js";
import { TcoCalculator } from "../ui/tco-calc.js";
import { TCO_PRESETS, BRAND_RETENTION_PROFILES } from "../core/tco.js";

export default {
  layer: "page",
  currencyAware: true,

  async data(ctx) {
    const watches = await api.watches();
    const watchSlug = ctx.search.get("watch") || "rolex-submariner";
    // An unknown selection must never become an unrelated watch.
    const selectedWatch = watches.some(w => w.slug === watchSlug) ? await api.watch(watchSlug) : null;
    return { watches, selectedWatch, invalidWatch: selectedWatch ? null : watchSlug };
  },

  meta: () => ({
    title: "Стоимость владения часами: сценарий расходов | Horologium",
    crumbs: [{ label: "Глобус", href: "/" }, { label: "Каталог", href: "/watches" }, { label: "Калькулятор TCO" }],
  }),

  render({ watches, selectedWatch, invalidWatch }) {
    const sw = selectedWatch;
    const photo = sw?.photos?.find((p) => !p.context) ?? sw?.photos?.[0];

    return html`
      <section class="tco-page container">
        <header class="tco-page__head">
          <h1 class="display display--l" data-reveal>Стоимость владения часами</h1>
          <p class="lead" data-reveal>
            Оцените покупку, обслуживание и предполагаемую продажу часов. Результат зависит от выбранных допущений; это учебный сценарий, а не рыночный прогноз.
          </p>

          <!-- Быстрые пресеты популярных моделей -->
          <details class="tco-presets"><summary>Популярные модели</summary>
            <div class="tco-presets__list">
              ${TCO_PRESETS.map(([slug, label]) => html`<a href="/tco?watch=${slug}" class="chip ${sw?.slug === slug ? "chip--lume is-active" : ""}" data-link>${label}</a>`)}
            </div>
          </details>

          <!-- Селектор любой модели из каталога -->
          <div class="tco-watch-selector-card" data-reveal>
            <div class="tco-watch-selector-inner">
              <label for="tco-select-watch" class="tco-selector-label">Выберите модель из ${watches.length} часов:</label>
              <select id="tco-select-watch" class="tco-select">
                ${!sw ? html`<option value="" selected disabled>Выберите часы</option>` : ""}
                ${watches.map(
                  (w) => html`
                    <option value="${w.slug}" ${w.slug === sw?.slug ? "selected" : ""}>
                      ${w.brand_name} - ${w.name} (${usd(w.price.usd)})
                    </option>
                  `
                )}
              </select>
            </div>
            ${sw?.slug
              ? html`
                  <div class="tco-selected-preview">
                    ${photo ? html`<div class="tco-selected-thumb">${photoImg(photo, { sizes: "64px", alt: sw.name })}</div>` : ""}
                    <div class="tco-selected-info">
                      <h4><a href="/watch/${sw.slug}" data-link>${sw.brand_name} ${sw.name}</a></h4>
                      <p class="muted">
                        ${PRICE_KIND[sw.price.kind] || "Цена"}: <b class="num">${usd(sw.price.usd)}</b> | Калибр: <b>${sw.movement?.caliber || "Механический"}</b>
                      </p>
                    </div>
                  </div>
                `
              : ""}
          </div>
        </header>

        ${invalidWatch ? html`<p class="tco-selection-error" role="alert">Модель «${invalidWatch}» не найдена. Выберите часы из списка выше.</p>` : ""}
        <!-- Контейнер интерактивного калькулятора -->
        <div id="tco-main-calc-mount" class="tco-page__calc-mount" data-reveal></div>

        <a class="link-arrow" href="/methodology" data-link>Как устроен расчёт и какие данные он использует<i class="ph-light ph-arrow-right" aria-hidden="true"></i></a>
        <details class="tco-profiles">
          <summary>Условные профили брендов</summary>
          <p class="muted">Это входные коэффициенты учебной модели. Они не измеряют скорость продажи и не подтверждают будущую цену конкретных часов.</p>
          <div class="tco-timeline-table-wrap">
            <table class="tco-table">
              <thead><tr><th>Профиль</th><th>Коэффициент через 5 лет</th><th>Условное изменение после 5 лет</th></tr></thead>
              <tbody>${Object.values(BRAND_RETENTION_PROFILES).map(p => html`<tr><td>${p.name}</td><td>${Math.round(p.baseRetention5y * 100)}%</td><td>${p.baseRetention5y >= 1 ? `${+(p.appreciationRate * 100).toFixed(1)}% в год` : "−1,5% в год, с нижней границей"}</td></tr>`)}</tbody>
            </table>
          </div>
        </details>

      </section>
    `;
  },

  mount(root, { watches, selectedWatch }) {
    const sw = selectedWatch;
    const mountEl = qs("#tco-main-calc-mount", root);
    let calc = null;

    if (mountEl && sw) {
      calc = new TcoCalculator({
        container: mountEl,
        watch: sw,
        initialPriceUsd: sw.price?.usd || 10000,
        brandSlug: sw.brand,
        brandName: sw.brand_name,
        complications: sw.complications || [],
        movementType: sw.movement?.type || "automatic",
      });
    }

    // Обработка селектора часов
    const select = qs("#tco-select-watch", root);
    if (select) {
      select.addEventListener("change", (e) => {
        const val = e.target.value;
        if (val) {
          const router = window.__horologium?.router;
          if (router) {
            router.go(`/tco?watch=${val}`);
          } else {
            location.href = `/tco?watch=${val}`;
          }
        }
      });
    }

    revealPhotos(root);

    return () => {
      if (calc) calc.destroy();
    };
  },
};
