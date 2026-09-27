// Страница калькулятора ликвидности, вторичной стоимости и совокупной стоимости владения (TCO)

import { api } from "../core/api.js";
import { html, qs, qsa } from "../core/dom.js";
import { usd, onCurrencyChange } from "../core/format.js";
import { photoImg, revealPhotos } from "../ui/photo.js";
import { TcoCalculator } from "../ui/tco-calc.js";
import { BRAND_RETENTION_PROFILES } from "../core/tco.js";

export default {
  layer: "page",
  currencyAware: true,

  async data(ctx) {
    const watches = await api.watches().catch(() => []);
    const params = new URLSearchParams(location.search);
    const watchSlug = params.get("watch") || "rolex-submariner-date";

    let selectedWatch = null;
    if (watchSlug) {
      selectedWatch = await api.watch(watchSlug).catch(() => null);
    }
    if (!selectedWatch && watches.length) {
      selectedWatch = await api.watch(watches[0].slug).catch(() => null);
    }

    return {
      watches,
      selectedWatch,
    };
  },

  meta: () => ({
    title: "Калькулятор ликвидности и стоимости владения часов (TCO) | Horologium",
    crumbs: [{ label: "Глобус", href: "/" }, { label: "Каталог", href: "/watches" }, { label: "Калькулятор TCO" }],
  }),

  render({ watches, selectedWatch }) {
    const sw = selectedWatch || watches[0] || {};
    const photo = sw.photos?.find((p) => !p.context) ?? sw.photos?.[0];

    return html`
      <section class="tco-page container">
        <header class="tco-page__head">
          <p class="label" data-reveal><i class="ph-light ph-scales" aria-hidden="true"></i> Аналитика вторичного рынка</p>
          <h1 class="display display--l" data-reveal>Калькулятор ликвидности и стоимости владения (TCO)</h1>
          <p class="lead" data-reveal>
            Точный расчет сохранения капитала, темпов амортизации, стоимости регламентного сервиса за 5, 10 и 15 лет, а также метрика реальной стоимости одного дня носки часов на запястье.
          </p>

          <!-- Быстрые пресеты популярных моделей -->
          <div class="tco-presets" data-reveal>
            <span class="muted">Популярные модели для расчета:</span>
            <div class="tco-presets__list">
              <a href="/tco?watch=rolex-submariner-date" class="chip ${sw.slug === "rolex-submariner-date" ? "chip--lume is-active" : ""}" data-link>Rolex Submariner</a>
              <a href="/tco?watch=omega-speedmaster-professional" class="chip ${sw.slug === "omega-speedmaster-professional" ? "chip--lume is-active" : ""}" data-link>Omega Moonwatch</a>
              <a href="/tco?watch=patek-philippe-nautilus-5811" class="chip ${sw.slug === "patek-philippe-nautilus-5811" ? "chip--lume is-active" : ""}" data-link>Patek Nautilus</a>
              <a href="/tco?watch=fp-journe-chronometre-souverain" class="chip ${sw.slug === "fp-journe-chronometre-souverain" ? "chip--lume is-active" : ""}" data-link>F.P. Journe</a>
              <a href="/tco?watch=cartier-santos-de-cartier" class="chip ${sw.slug === "cartier-santos-de-cartier" ? "chip--lume is-active" : ""}" data-link>Cartier Santos</a>
              <a href="/tco?watch=tudor-black-bay-58" class="chip ${sw.slug === "tudor-black-bay-58" ? "chip--lume is-active" : ""}" data-link>Tudor BB58</a>
              <a href="/tco?watch=grand-seiko-snowflake" class="chip ${sw.slug === "grand-seiko-snowflake" ? "chip--lume is-active" : ""}" data-link>Grand Seiko</a>
              <a href="/tco?watch=audemars-piguet-royal-oak-jumbo" class="chip ${sw.slug === "audemars-piguet-royal-oak-jumbo" ? "chip--lume is-active" : ""}" data-link>AP Royal Oak</a>
            </div>
          </div>

          <!-- Селектор любой модели из каталога -->
          <div class="tco-watch-selector-card" data-reveal>
            <div class="tco-watch-selector-inner">
              <label for="tco-select-watch" class="tco-selector-label">Выберите модель из 112 часов каталога:</label>
              <select id="tco-select-watch" class="tco-select">
                ${watches.map(
                  (w) => html`
                    <option value="${w.slug}" ${w.slug === sw.slug ? "selected" : ""}>
                      ${w.brand_name} - ${w.name} (${usd(w.price.usd)})
                    </option>
                  `
                )}
              </select>
            </div>
            ${sw.slug
              ? html`
                  <div class="tco-selected-preview">
                    ${photo ? html`<div class="tco-selected-thumb">${photoImg(photo, { sizes: "64px", alt: sw.name })}</div>` : ""}
                    <div class="tco-selected-info">
                      <h4><a href="/watch/${sw.slug}" data-link>${sw.brand_name} ${sw.name}</a></h4>
                      <p class="muted">
                        Ритейл: <b class="num">${usd(sw.price.usd)}</b> | Калибр: <b>${sw.movement?.caliber || "Механический"}</b>
                      </p>
                    </div>
                  </div>
                `
              : ""}
          </div>
        </header>

        <!-- Контейнер интерактивного калькулятора -->
        <div id="tco-main-calc-mount" class="tco-page__calc-mount" data-reveal></div>

        <!-- Сравнительная матрица ликвидности по эшелонам брендов -->
        <section class="tco-matrix-section" data-reveal>
          <div class="tco-matrix-head">
            <span class="label">Рыночные ориентиры</span>
            <h2 class="display display--m">Эшелоны удержания стоимости часовых брендов</h2>
            <p class="muted">Фактические диапазоны вторичной ликвидности на дистанции 5 лет по статистике мировых часовых бирж.</p>
          </div>

          <div class="tco-matrix-grid">
            <div class="tco-matrix-card tco-matrix-card--bluechip">
              <div class="tco-matrix-card__badge">95% - 150%+</div>
              <h3>Blue-Chip и Инвестиционный класс</h3>
              <p class="tco-matrix-card__brands">F.P. Journe, Rolex, Patek Philippe, Audemars Piguet</p>
              <p class="tco-matrix-card__desc">
                Часы этого сегмента удерживают 100% стоимости или торгуются со значительной премией к ритейлу сразу после выхода из бутика. Ограниченные тиражи и глобальный спрос создают эффект инвестиционного защитного актива.
              </p>
            </div>

            <div class="tco-matrix-card tco-matrix-card--high">
              <div class="tco-matrix-card__badge">70% - 95%</div>
              <h3>Высокая мануфактурная ликвидность</h3>
              <p class="tco-matrix-card__brands">Vacheron Constantin, A. Lange & Söhne, Cartier, Omega, Tudor, Chaykin</p>
              <p class="tco-matrix-card__desc">
                Культовые серии (Speedmaster Moonwatch, Santos, Tank, Black Bay, Overseas) сохраняют до 85% стоимости на вторичном рынке. Высокая ликвидность позволяет быстро продать часы без критических финансовых потерь.
              </p>
            </div>

            <div class="tco-matrix-card tco-matrix-card--main">
              <div class="tco-matrix-card__badge">55% - 72%</div>
              <h3>Классический премиальный люкс</h3>
              <p class="tco-matrix-card__brands">IWC, Breitling, Panerai, Jaeger-LeCoultre, Zenith, Grand Seiko, Blancpain</p>
              <p class="tco-matrix-card__desc">
                При покупке в бутике амортизация первого года составляет 25-35%, после чего цена стабилизируется на плато. Идеальный сегмент для покупки в состоянии «Like New» на вторичном рынке с максимальной выгодой.
              </p>
            </div>

            <div class="tco-matrix-card tco-matrix-card--access">
              <div class="tco-matrix-card__badge">45% - 62%</div>
              <h3>Доступная роскошь и инструмент</h3>
              <p class="tco-matrix-card__brands">Longines, TAG Heuer, NOMOS, Sinn, Oris, Tissot, Seiko, Casio</p>
              <p class="tco-matrix-card__desc">
                Массовые тиражи и широкая доступность в ритейле. Немецкий бренд Sinn выделяется повышенной устойчивостью (до 75%) благодаря технологиям закалки Tegiment и культовому статусу среди дайверов.
              </p>
            </div>
          </div>
        </section>

        <!-- 5 правил сохранения стоимости часов -->
        <section class="tco-rules-section" data-reveal>
          <h2 class="display display--m">5 правил сохранения вторичной стоимости часов</h2>
          <div class="tco-rules-grid">
            <div class="tco-rule-card">
              <span class="tco-rule-num">01</span>
              <h4>Храните полный комплект (Full Set)</h4>
              <p>Оригинальная коробка, гарантийная карта, буклет и оригинальный кассовый чек прибавляют от 10% до 15% к стоимости часов при перепродаже.</p>
            </div>
            <div class="tco-rule-card">
              <span class="tco-rule-num">02</span>
              <h4>Откажитесь от грубой полировки</h4>
              <p>Агрессивная полировка «съедает» заводскую геометрию корпуса и фаски. Коллекционеры платят на 20% дороже за корпус с естественными царапинами, но в оригинальном металле (Unpolished).</p>
            </div>
            <div class="tco-rule-card">
              <span class="tco-rule-num">03</span>
              <h4>Регулярный тест водозащиты</h4>
              <p>Раз в 1-2 года проверяйте герметичность в сухой барокамере и меняйте прокладки. Проникновение влаги и окисление циферблата обесценивает часы на 40-70%.</p>
            </div>
            <div class="tco-rule-card">
              <span class="tco-rule-num">04</span>
              <h4>Сохраняйте снятые звенья браслета</h4>
              <p>Полноразмерный браслет со всеми звеньями подходит любому покупателю. Докупка оригинальных звеньев Rolex или Omega стоит от $150 до $600 за штуку.</p>
            </div>
            <div class="tco-rule-card">
              <span class="tco-rule-num">05</span>
              <h4>Фиксируйте историю сервиса</h4>
              <p>Акты работ и чеки официального репассажа с распечаткой вибрографа подтверждают идеальное техническое состояние механизма и снимают любые сомнения покупателя.</p>
            </div>
          </div>
        </section>
      </section>
    `;
  },

  mount(root, { watches, selectedWatch }) {
    const sw = selectedWatch || watches[0];
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
