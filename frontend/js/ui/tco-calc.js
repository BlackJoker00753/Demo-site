// Интерактивный калькулятор ликвидности, вторичной стоимости и совокупной стоимости владения (TCO)
// Модуль для страниц моделей часов и отдельного аналитического раздела.

import { html, qs, qsa } from "../core/dom.js";
import { usd, onCurrencyChange } from "../core/format.js";
import {
  BRAND_RETENTION_PROFILES,
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
              <span class="label"><i class="ph-light ph-calculator" aria-hidden="true"></i> Экономика владения и ликвидность</span>
              <h3 class="display display--s tco-box__title">Калькулятор вторичной стоимости и TCO</h3>
            </div>
            <div class="tco-tier-badge ${tierBadgeClass}">
              <i class="ph-light ph-chart-line-up" aria-hidden="true"></i>
              <span>${brandProfile.name}: ${brandProfile.tierName} (${brandProfile.rangeLabel})</span>
            </div>
          </div>
          <p class="tco-box__desc">
            Расчет амортизации, остаточной рыночной цены и совокупных затрат на регламентное обслуживание за 5, 10 и 15 лет по реальной статистике часового рынка.
          </p>
        </header>

        <!-- Основная панель интерактивного управления -->
        <div class="tco-controls">
          <!-- 1. Срок владения (горизонт) -->
          <div class="tco-control-group">
            <div class="tco-control-label">
              <span>Горизонт владения:</span>
              <strong class="tco-val-highlight" id="tco-years-val">${this.state.years} ${this.formatYearsText(this.state.years)}</strong>
            </div>
            <div class="tco-pills" role="radiogroup" aria-label="Срок владения">
              ${[5, 10, 15]
                .map(
                  (y) => `
                <button type="button" class="chip tco-pill ${this.state.years === y ? "is-active" : ""}" data-years="${y}">
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
          </div>

          <!-- 2. Частота носки на руке -->
          <div class="tco-control-group">
            <div class="tco-control-label">
              <span>Частота носки на запястье:</span>
              <strong class="tco-val-highlight">${res.wearFrequency.daysPerYear} дн / год</strong>
            </div>
            <div class="tco-pills" role="radiogroup" aria-label="Частота носки">
              ${Object.values(WEAR_FREQUENCIES)
                .map(
                  (wf) => `
                <button type="button" class="chip tco-pill ${this.state.wearFrequencyId === wf.id ? "is-active" : ""}" data-wear="${wf.id}" title="${wf.desc}">
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
            <div class="tco-pills" role="radiogroup" aria-label="Состояние часов">
              ${Object.values(CONDITION_MODIFIERS)
                .map(
                  (c) => `
                <button type="button" class="chip tco-pill ${this.state.conditionId === c.id ? "is-active" : ""}" data-cond="${c.id}">
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
            <div class="tco-pills" role="radiogroup" aria-label="Класс обслуживания">
              ${Object.values(SERVICE_COMPLICATION_TIERS)
                .map(
                  (st) => `
                <button type="button" class="chip tco-pill ${this.state.serviceTierId === st.id ? "is-active" : ""}" data-tier="${st.id}" title="${st.note}">
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
            <div class="tco-price-input-row">
              <label for="tco-price-input">Базовая цена покупки:</label>
              <div class="tco-price-input-box">
                <span class="tco-price-sym">$</span>
                <input type="number" id="tco-price-input" min="50" step="100" value="${this.state.customPriceUsd}" aria-label="Цена покупки USD">
              </div>
            </div>
          </div>
        </div>

        <!-- 4 Ключевые карточки результатов -->
        <div class="tco-metrics-grid">
          <!-- Карточка 1: Остаточная рыночная стоимость -->
          <div class="tco-metric-card">
            <span class="tco-metric-card__label">Остаточная стоимость (${this.state.years} лет)</span>
            <div class="tco-metric-card__val num" id="tco-residual-val">${usd(res.residualValueUsd)}</div>
            <div class="tco-metric-card__badge ${res.retentionRate >= 100 ? "tco-badge--green" : "tco-badge--gold"}">
              <i class="ph-light ${res.retentionRate >= 100 ? "ph-trend-up" : "ph-shield-check"}" aria-hidden="true"></i>
              <span>${res.retentionRate}% от ритейла ${profitDeltaUsd > 0 ? `(+${usd(profitDeltaUsd)})` : `(-${usd(Math.abs(profitDeltaUsd))})`}</span>
            </div>
            <p class="tco-metric-card__hint">Расчетная стоимость модели на вторичном рынке при продаже через ${this.state.years} ${this.formatYearsText(this.state.years)}.</p>
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
            <p class="tco-metric-card__hint">Включает регламентные переборки механизма каждые ${res.serviceTier.intervalYears} лет и проверку герметичности с заменой сальников.</p>
          </div>

          <!-- Карточка 3: Чистая совокупная стоимость владения (TCO) -->
          <div class="tco-metric-card ${isProfit ? "tco-metric-card--profit" : ""}">
            <span class="tco-metric-card__label">Чистый TCO (${this.state.years} лет)</span>
            <div class="tco-metric-card__val num ${isProfit ? "tco-val--profit" : ""}" id="tco-net-tco-val">
              ${isProfit ? `+${usd(Math.abs(res.netTcoUsd))}` : usd(res.netTcoUsd)}
            </div>
            <div class="tco-metric-card__badge ${isProfit ? "tco-badge--green" : "tco-badge--neutral"}">
              ${isProfit ? "Чистый финансовый прирост" : "Совокупные чистые затраты"}
            </div>
            <p class="tco-metric-card__hint">
              ${isProfit
                ? "Прирост рыночной стоимости полностью перекрывает цену покупки и расходы на сервис."
                : "Реальная разница между ценой покупки, потерей стоимости и всеми расходами на сервис."}
            </p>
          </div>

          <!-- Карточка 4: Стоимость одного дня на руке (Cost Per Day) -->
          <div class="tco-metric-card tco-metric-card--hero">
            <span class="tco-metric-card__label">Стоимость одного дня носки</span>
            <div class="tco-metric-card__hero-num num" id="tco-day-val">
              ${isProfit ? `+${usd(Math.abs(res.costPerDayUsd))}` : usd(res.costPerDayUsd)}
              <small>/ день</small>
            </div>
            <div class="tco-metric-card__badge ${isProfit ? "tco-badge--green" : "tco-badge--blue"}">
              ${isProfit ? "Часы приносят капитал на запястье" : this.getDayCostAnalogy(res.costPerDayUsd)}
            </div>
            <p class="tco-metric-card__hint">
              За ${this.state.years} ${this.formatYearsText(this.state.years)} часы будут на вашей руке ${res.totalDaysWorn.toLocaleString("ru-RU")} дней.
            </p>
          </div>
        </div>

        <!-- Визуальная структура стоимости (Интерактивная диаграмма) -->
        <div class="tco-breakdown-section">
          <div class="tco-breakdown-head">
            <span class="label">Структура баланса капитала</span>
            <span class="tco-breakdown-sum">Ритейл: ${usd(res.retailPriceUsd)} | Вторичный возврат: ${usd(res.residualValueUsd)}</span>
          </div>
          <div class="tco-bar-track" role="img" aria-label="Диаграмма распределения стоимости">
            <div class="tco-bar-seg tco-bar-seg--retention" style="width: ${Math.min(100, (res.residualValueUsd / (res.retailPriceUsd + res.totalMaintenanceCostUsd)) * 100)}%" title="Остаточная стоимость: ${usd(res.residualValueUsd)}"></div>
            <div class="tco-bar-seg tco-bar-seg--service" style="width: ${Math.min(100, (res.totalMaintenanceCostUsd / (res.retailPriceUsd + res.totalMaintenanceCostUsd)) * 100)}%" title="Обслуживание: ${usd(res.totalMaintenanceCostUsd)}"></div>
          </div>
          <div class="tco-bar-legend">
            <span class="tco-legend-item"><i class="tco-dot tco-dot--emerald"></i> Сохраняемый капитал (${res.retentionRate}%)</span>
            <span class="tco-legend-item"><i class="tco-dot tco-dot--gold"></i> Регламентное ТО (${usd(res.totalMaintenanceCostUsd)})</span>
            <span class="tco-legend-item"><i class="tco-dot tco-dot--slate"></i> Амортизация (${res.netDepreciationUsd > 0 ? usd(res.netDepreciationUsd) : "$0"})</span>
          </div>
        </div>

        <!-- Годовая таблица эволюции стоимости -->
        <div class="tco-timeline-table-wrap">
          <h4 class="tco-table-title">Хроника удержания стоимости по горизонтам</h4>
          <table class="tco-table">
            <thead>
              <tr>
                <th>Горизонт</th>
                <th>Удержание</th>
                <th>Рыночная цена</th>
                <th>Стоимость ТО</th>
                <th>Чистый TCO</th>
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
                  <td class="num ${row.netTcoUsd < 0 ? "tco-val--profit" : ""}">${row.netTcoUsd < 0 ? `+${usd(Math.abs(row.netTcoUsd))}` : usd(row.netTcoUsd)}</td>
                  <td class="num"><b>${row.costPerDayUsd < 0 ? `+${usd(Math.abs(row.costPerDayUsd))}` : usd(row.costPerDayUsd)}</b></td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <!-- Экспертная справка о бренде и рекомендации -->
        <div class="tco-insight-box">
          <div class="tco-insight-icon">
            <i class="ph-light ph-info" aria-hidden="true"></i>
          </div>
          <div class="tco-insight-text">
            <h5>Аналитика ликвидности: ${brandProfile.name}</h5>
            <p>${brandProfile.summary}</p>
            <p class="tco-insight-rules">
              <b>Золотое правило сохранения стоимости:</b> сохраняйте оригинальную коробку, заводской чек и гарантийную карту (Full Set дает +10% к цене на вторичном рынке). Избегайте частых грубых полировок корпуса: оригинальные нетронутые грани с заводскими фасками ценятся коллекционерами на 15-20% выше полированных экземпляров.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  bind() {
    // Слушатель смены валюты в шапке
    this.currencyUnsub = onCurrencyChange(() => {
      this.render();
      this.bindEvents();
    });

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

  getDayCostAnalogy(costPerDay) {
    if (costPerDay <= 0) return "Прибыльное вложение";
    if (costPerDay < 1.0) return "Дешевле жетона метро в день";
    if (costPerDay < 3.0) return "Дешевле утренней чашки эспрессо";
    if (costPerDay < 7.0) return "Сопоставимо с чашкой латте";
    if (costPerDay < 15.0) return "Сопоставимо с деловым обедом";
    return "Статус исключительного владения";
  }
}
