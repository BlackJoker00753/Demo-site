// Интерактивный калькулятор ликвидности, вторичной стоимости и совокупной стоимости владения (TCO)
// Модуль для страниц моделей часов и отдельного аналитического раздела.

import { qs, qsa } from "../core/dom.js";
import { usd } from "../core/format.js";
import {
  SERVICE_COMPLICATION_TIERS,
  CONDITION_MODIFIERS,
  WEAR_FREQUENCIES,
  detectServiceTier,
  getBrandProfile,
  calculateWatchTCO,
} from "../core/tco.js";

export class TcoCalculator {
  constructor({
    container,
    watch = null,
    initialPriceUsd = 10000,
    brandSlug = "rolex",
    brandName = "Rolex",
    complications = [],
    movementType = "automatic",
    compact = false,
  }) {
    this.container = container;
    this.watch = watch;
    this.compact = compact;

    this.priceUsd = Number(initialPriceUsd) || (watch?.price?.usd ?? 10000);
    this.brandSlug = brandSlug || (watch?.brand ?? "rolex");
    this.brandName = brandName || (watch?.brand_name ?? "Rolex");

    const detectedTier = detectServiceTier(complications || watch?.complications || [], movementType || watch?.movement?.type || "automatic");

    this.state = {
      years: 5,
      serviceTierId: detectedTier,
      conditionId: "good_fullset",
      wearFrequencyId: "daily",
      includeInsurance: false,
      annualInflation: 0.025,
      customPriceUsd: this.priceUsd,
    };
    this.historyKey = watch?.slug || this.brandSlug;
    const saved = history.state?.tco?.[this.historyKey];
    if (saved && typeof saved === "object") {
      if (Number.isInteger(saved.years) && saved.years >= 1 && saved.years <= 15) this.state.years = saved.years;
      if (Number.isFinite(saved.customPriceUsd) && saved.customPriceUsd > 0) this.state.customPriceUsd = saved.customPriceUsd;
      for (const [key, values] of [["serviceTierId", SERVICE_COMPLICATION_TIERS], ["conditionId", CONDITION_MODIFIERS], ["wearFrequencyId", WEAR_FREQUENCIES]]) {
        if (Object.hasOwn(values, saved[key])) this.state[key] = saved[key];
      }
      this.state.includeInsurance = saved.includeInsurance === true;
    }

    this.currencyUnsub = null;
    this.render();
    this.bind();
  }

  destroy() {
    if (this.currencyUnsub) {
      this.currencyUnsub();
      this.currencyUnsub = null;
    }
    if (this.container) {
      this.container.innerHTML = "";
    }
  }

  calculate() {
    return calculateWatchTCO({
      retailPriceUsd: this.state.customPriceUsd,
      brandSlug: this.brandSlug,
      years: this.state.years,
      serviceTierId: this.state.serviceTierId,
      conditionId: this.state.conditionId,
      wearFrequencyId: this.state.wearFrequencyId,
      includeInsurance: this.state.includeInsurance,
      annualInflation: this.state.annualInflation,
    });
  }

  render() {
    const active = this.container.contains(document.activeElement) ? document.activeElement : null;
    const option = ["years", "wear", "cond", "tier"].find(key => active?.hasAttribute(`data-${key}`));
    const focusSelector = active?.id ? `#${CSS.escape(active.id)}`
      : option ? `[data-${option}="${CSS.escape(active.getAttribute(`data-${option}`))}"]` : null;
    const openPanels = [...this.container.querySelectorAll('details[data-tco-panel][open]')].map(el => el.dataset.tcoPanel);
    const res = this.calculate();
    const brandProfile = getBrandProfile(this.brandSlug);

    const tierBadgeClass =
      brandProfile.tier === "blue-chip"
        ? "tco-tier-badge--emerald"
        : brandProfile.tier === "high-luxury" || brandProfile.tier === "strong-luxury" || brandProfile.tier === "collector-indie" || brandProfile.tier === "tool-cult"
        ? "tco-tier-badge--gold"
        : "tco-tier-badge--blue";

    const isProfit = res.isNetProfit;
    const profitDeltaUsd = res.residualValueUsd - res.retailPriceUsd;

    this.container.innerHTML = `
      <div class="tco-box">
        <header class="tco-box__head">
          <div class="tco-box__title-row">
            <div class="tco-box__title-col">
              <h3 class="display display--s tco-box__title">Стоимость владения</h3>
            </div>
            <div class="tco-tier-badge ${tierBadgeClass}">
              <i class="ph-light ph-chart-line-up" aria-hidden="true"></i>
              <span>Профиль сценария: ${brandProfile.name}</span>
            </div>
          </div>
          <p class="tco-box__desc">
            Учебная оценка по заданным коэффициентам: покупка и расходы минус предполагаемая цена продажи. Коэффициенты бренда не являются прогнозом конкретной модели.
          </p>
        </header>

        <div class="tco-live-summary" role="status" aria-live="polite">
          <span>За ${this.state.years} ${this.formatYearsText(this.state.years)} после продажи</span>
          <strong>${usd(res.netTcoUsd)}</strong><span>${usd(res.costPerDayUsd, { fractionDigits: 2 })} в день носки</span>
        </div>
        <!-- Основная панель интерактивного управления -->
        <div class="tco-controls">
          <!-- 1. Срок владения (горизонт) -->
          <div class="tco-control-group">
            <div class="tco-control-label">
              <span>Горизонт владения:</span>
              <strong class="tco-val-highlight" id="tco-years-val">${this.state.years} ${this.formatYearsText(this.state.years)}</strong>
            </div>
            <div class="tco-pills" role="group" aria-label="Срок владения">
              ${[5, 10, 15]
                .map(
                  (y) => `
                <button type="button" class="chip tco-pill ${this.state.years === y ? "is-active" : ""}" data-years="${y}" aria-pressed="${this.state.years === y}">
                  ${y} лет
                </button>
              `
                )
                .join("")}
            </div>
            <div class="tco-slider-wrap">
              <input type="range" class="tco-slider" id="tco-years-slider" min="1" max="15" step="1" value="${this.state.years}" aria-label="Горизонт лет">
              <div class="tco-slider-labels">
                <span>1 год</span>
                <span>5 лет</span>
                <span>10 лет</span>
                <span>15 лет</span>
              </div>
            </div>
            <div class="tco-price-input-row">
              <label for="tco-price-input">Базовая цена покупки:</label>
              <div class="tco-price-input-box">
                <span class="tco-price-sym">$</span>
                <input type="number" id="tco-price-input" min="1" step="0.01" value="${this.state.customPriceUsd}" aria-label="Цена покупки USD">
              </div>
            </div>
          </div>

          <details class="tco-options" data-tco-panel="options"><summary>Состояние, носка и обслуживание</summary><div class="tco-options__grid">
          <!-- 2. Частота носки на руке -->
          <div class="tco-control-group">
            <div class="tco-control-label">
              <span>Частота носки на запястье:</span>
              <strong class="tco-val-highlight">${res.wearFrequency.daysPerYear} дн / год</strong>
            </div>
            <div class="tco-pills tco-pills--options" role="group" aria-label="Частота носки">
              ${Object.values(WEAR_FREQUENCIES)
                .map(
                  (wf) => `
                <button type="button" class="chip tco-pill ${this.state.wearFrequencyId === wf.id ? "is-active" : ""}" data-wear="${wf.id}" aria-pressed="${this.state.wearFrequencyId === wf.id}" title="${wf.desc}">
                  ${wf.name}
                </button>
              `
                )
                .join("")}
            </div>
          </div>

          <!-- 3. Комплектность и состояние -->
          <div class="tco-control-group">
            <div class="tco-control-label">
              <span>Состояние и комплектность:</span>
              <strong class="tco-val-highlight">${res.condition.badge}</strong>
            </div>
            <div class="tco-pills tco-pills--options" role="group" aria-label="Состояние часов">
              ${Object.values(CONDITION_MODIFIERS)
                .map(
                  (c) => `
                <button type="button" class="chip tco-pill ${this.state.conditionId === c.id ? "is-active" : ""}" data-cond="${c.id}" aria-pressed="${this.state.conditionId === c.id}">
                  ${c.name}
                </button>
              `
                )
                .join("")}
            </div>
          </div>

          <!-- 4. Класс усложнений механизма (стоимость репассажа) -->
          <div class="tco-control-group">
            <div class="tco-control-label">
              <span>Класс усложнений (репассаж):</span>
              <strong class="tco-val-highlight">${res.serviceTier.name} (${usd(res.serviceTier.baseCostUsd)} раз в ${res.serviceTier.intervalYears} лет)</strong>
            </div>
            <div class="tco-pills tco-pills--options" role="group" aria-label="Класс обслуживания">
              ${Object.values(SERVICE_COMPLICATION_TIERS)
                .map(
                  (st) => `
                <button type="button" class="chip tco-pill ${this.state.serviceTierId === st.id ? "is-active" : ""}" data-tier="${st.id}" aria-pressed="${this.state.serviceTierId === st.id}" title="${st.note}">
                  ${st.name}
                </button>
              `
                )
                .join("")}
            </div>
          </div>

          <!-- 5. Дополнительные параметры -->
          <div class="tco-control-group tco-control-group--inline">
            <label class="tco-toggle-label">
              <input type="checkbox" id="tco-insurance-toggle" ${this.state.includeInsurance ? "checked" : ""}>
              <span>Страхование коллекции (1.2% в год)</span>
            </label>

          </div>
          </div></details>
        </div>

        <!-- 4 Ключевые карточки результатов -->
        <div class="tco-metrics-grid">
          <!-- Карточка 1: Остаточная рыночная стоимость -->
          <div class="tco-metric-card">
            <span class="tco-metric-card__label">Предполагаемая цена продажи</span>
            <div class="tco-metric-card__val num" id="tco-residual-val">${usd(res.residualValueUsd)}</div>
            <div class="tco-metric-card__badge ${res.retentionRate >= 100 ? "tco-badge--green" : "tco-badge--gold"}">
              <i class="ph-light ${res.retentionRate >= 100 ? "ph-trend-up" : "ph-shield-check"}" aria-hidden="true"></i>
              <span>${res.retentionRate}% от цены покупки ${profitDeltaUsd > 0 ? `(+${usd(profitDeltaUsd)})` : `(-${usd(Math.abs(profitDeltaUsd))})`}</span>
            </div>
            <p class="tco-metric-card__hint">Значение сценария через ${this.state.years} ${this.formatYearsText(this.state.years)}, полученное из коэффициента профиля и выбранного состояния.</p>
          </div>

          <!-- Карточка 2: Затраты на ТО и обслуживание -->
          <div class="tco-metric-card">
            <span class="tco-metric-card__label">Затраты на ТО и уход</span>
            <div class="tco-metric-card__val num" id="tco-maintenance-val">${usd(res.totalMaintenanceCostUsd)}</div>
            <div class="tco-metric-card__breakdown">
              <span>Репассаж: <b>${usd(res.totalServiceCostUsd)}</b></span>
              <span>Водозащита: <b>${usd(res.totalWaterTestCostUsd)}</b></span>
              ${this.state.includeInsurance ? `<span>Страховка: <b>${usd(res.totalInsuranceCostUsd)}</b></span>` : ""}
            </div>
            <p class="tco-metric-card__hint">Условный сервис каждые ${res.serviceTier.intervalYears} лет, проверка водозащиты раз в 2 года и выбранная страховка.</p>
          </div>

          <!-- Карточка 3: Чистая совокупная стоимость владения (TCO) -->
          <div class="tco-metric-card ${isProfit ? "tco-metric-card--profit" : ""}">
            <span class="tco-metric-card__label">Расходы после продажи (${this.state.years} лет)</span>
            <div class="tco-metric-card__val num ${isProfit ? "tco-val--profit" : ""}" id="tco-net-tco-val">
              ${usd(res.netTcoUsd)}
            </div>
            <div class="tco-metric-card__badge ${isProfit ? "tco-badge--green" : "tco-badge--neutral"}">
              ${isProfit ? "Отрицательные расходы в сценарии" : "Совокупные расходы в сценарии"}
            </div>
            <p class="tco-metric-card__hint">
              ${isProfit
                ? "При заданной цене продажи итог отрицательный. Фактическая стоимость продажи и расходы могут отличаться."
                : "Цена покупки плюс обслуживание и страховка, минус предполагаемая цена продажи."}
            </p>
          </div>

          <!-- Карточка 4: Стоимость одного дня на руке (Cost Per Day) -->
          <div class="tco-metric-card tco-metric-card--hero">
            <span class="tco-metric-card__label">Стоимость одного дня носки</span>
            <div class="tco-metric-card__hero-num num" id="tco-day-val">
              ${usd(res.costPerDayUsd, { fractionDigits: 2 })}
              <small>/ день</small>
            </div>
            <div class="tco-metric-card__badge ${isProfit ? "tco-badge--green" : "tco-badge--blue"}">
              Итог ÷ число дней носки
            </div>
            <p class="tco-metric-card__hint">
              За ${this.state.years} ${this.formatYearsText(this.state.years)} часы будут на вашей руке ${res.totalDaysWorn.toLocaleString("ru-RU")} дней.
            </p>
          </div>
        </div>

        <p class="tco-equation">Покупка ${usd(res.retailPriceUsd)} + расходы ${usd(res.totalMaintenanceCostUsd)} − продажа ${usd(res.residualValueUsd)} = ${usd(res.netTcoUsd)}</p>

        <!-- Годовая таблица эволюции стоимости -->
        <div class="tco-timeline-table-wrap">
          <h4 class="tco-table-title">Тот же сценарий на разных сроках</h4>
          <table class="tco-table">
            <thead>
              <tr>
                <th>Горизонт</th>
                <th>Удержание</th>
                <th>Цена продажи</th>
                <th>Все расходы</th>
                <th>После продажи</th>
                <th>Цена в день</th>
              </tr>
            </thead>
            <tbody>
              ${res.timeline
                .map(
                  (row) => `
                <tr class="${row.year === this.state.years ? "is-selected-year" : ""}">
                  <td><b>${row.year} ${this.formatYearsText(row.year)}</b></td>
                  <td><span class="chip chip--sm ${row.retentionRate >= 100 ? "chip--lume" : ""}">${row.retentionRate}%</span></td>
                  <td class="num">${usd(row.residualValueUsd)}</td>
                  <td class="num">${usd(row.maintenanceUsd)}</td>
                  <td class="num ${row.netTcoUsd < 0 ? "tco-val--profit" : ""}">${usd(row.netTcoUsd)}</td>
                  <td class="num"><b>${usd(row.costPerDayUsd, { fractionDigits: 2 })}</b></td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <details class="tco-assumptions" data-tco-panel="assumptions">
          <summary>Допущения этого расчёта</summary>
          <a class="link-arrow" href="/methodology" data-link>Методика и ограничения</a>
          <p>Стоимость продажи рассчитывается из условного профиля ${brandProfile.name} и состояния часов. Датированной выборки сделок по выбранной модели здесь нет.</p>
          <p>В расчёте: сервис ${usd(res.serviceTier.baseCostUsd)} раз в ${res.serviceTier.intervalYears} лет, тест водозащиты $80 раз в 2 года, рост этих расходов ${+(this.state.annualInflation * 100).toFixed(1)}% в год. Страховка при включении: 1,2% от сценарной стоимости за каждый год. Комиссия продажи, налоги и ремонт после повреждений не включены.</p>
          <p>Итог и строки таблицы используют одинаковые правила. Каждая категория расходов округляется до доллара, затем суммы складываются. Общий результат делится на число дней носки.</p>
        </details>

      </div>
    `;
    for (const panel of openPanels) this.container.querySelector(`[data-tco-panel="${panel}"]`)?.setAttribute("open", "");
    if (focusSelector) this.container.querySelector(focusSelector)?.focus({ preventScroll: true });
    history.replaceState({ ...history.state, tco: { ...history.state?.tco, [this.historyKey]: { ...this.state } } }, "");
  }

  bind() {
    // Слушатель смены валюты в шапке
    const refreshCurrency = () => {
      this.render();
      this.bindEvents();
    };
    window.addEventListener("currencychange", refreshCurrency);
    this.currencyUnsub = () => window.removeEventListener("currencychange", refreshCurrency);

    this.bindEvents();
  }

  bindEvents() {
    // Переключение лет кнопками
    qsa("[data-years]", this.container).forEach((btn) => {
      btn.addEventListener("click", () => {
        const y = Number(btn.dataset.years);
        if (y && this.state.years !== y) {
          this.state.years = y;
          this.render();
          this.bindEvents();
        }
      });
    });

    // Ползунок лет
    const slider = qs("#tco-years-slider", this.container);
    if (slider) {
      slider.addEventListener("input", (e) => {
        const val = Number(e.target.value);
        if (val && this.state.years !== val) {
          this.state.years = val;
          this.render();
          this.bindEvents();
        }
      });
    }

    // Частота носки
    qsa("[data-wear]", this.container).forEach((btn) => {
      btn.addEventListener("click", () => {
        const w = btn.dataset.wear;
        if (w && this.state.wearFrequencyId !== w) {
          this.state.wearFrequencyId = w;
          this.render();
          this.bindEvents();
        }
      });
    });

    // Состояние часов
    qsa("[data-cond]", this.container).forEach((btn) => {
      btn.addEventListener("click", () => {
        const c = btn.dataset.cond;
        if (c && this.state.conditionId !== c) {
          this.state.conditionId = c;
          this.render();
          this.bindEvents();
        }
      });
    });

    // Класс ТО
    qsa("[data-tier]", this.container).forEach((btn) => {
      btn.addEventListener("click", () => {
        const t = btn.dataset.tier;
        if (t && this.state.serviceTierId !== t) {
          this.state.serviceTierId = t;
          this.render();
          this.bindEvents();
        }
      });
    });

    // Чекбокс страховки
    const insToggle = qs("#tco-insurance-toggle", this.container);
    if (insToggle) {
      insToggle.addEventListener("change", (e) => {
        this.state.includeInsurance = e.target.checked;
        this.render();
        this.bindEvents();
      });
    }

    // Ввод цены
    const priceInput = qs("#tco-price-input", this.container);
    if (priceInput) {
      priceInput.addEventListener("change", (e) => {
        const val = Number(e.target.value);
        if (val && val > 0) {
          this.state.customPriceUsd = val;
          this.render();
          this.bindEvents();
        }
      });
    }
  }

  formatYearsText(years) {
    if (years === 1) return "год";
    if (years >= 2 && years <= 4) return "года";
    return "лет";
  }

}
