// Интерактивный симулятор вибрографа (Watch Timing Machine & Chronometric Deviation Laboratory)
// Симуляция метрологического анализа хода: суточное отклонение (s/d), амплитуда баланса (градусы),
// ошибка выкачки (beat error, мс), угол подъема (lift angle) и тестирование в 6 позициях.

import { html, qs, qsa } from "../core/dom.js";
import { escapementPlayer } from "./audio-engine.js";

// Предустановленные профили калибров
export const CALIBER_PRESETS = [
  {
    id: "rolex-3235",
    name: "Rolex Calibre 3235",
    standard: "Rolex Superlative Chronometer (-2 / +2 сек/сутки)",
    vph: 28800,
    liftAngle: 52,
    baseRate: 0.8,
    baseAmplitude: 288,
    baseBeatError: 0.1,
    desc: "Спуск Chronergy из никель-фосфорного сплава, парамагнитная спираль Parachrom, баланс с винтами Microstella.",
  },
  {
    id: "omega-8800",
    name: "Omega Co-Axial 8800",
    standard: "METAS Master Chronometer (0 / +5 сек/сутки)",
    vph: 25200,
    liftAngle: 38, // Особый угол подъема для коаксиального спуска
    baseRate: 1.6,
    baseAmplitude: 275,
    baseBeatError: 0.0,
    desc: "Коаксиальный трехъярусный спуск Джорджа Дэниелса, кремниевая спираль Si14, антимагнетизм 15 000 Гаусс.",
  },
  {
    id: "zenith-3600",
    name: "Zenith El Primero 3600",
    standard: "COSC Chronometer (-4 / +6 сек/сутки)",
    vph: 36000,
    liftAngle: 52,
    baseRate: 2.2,
    baseAmplitude: 295,
    baseBeatError: 0.2,
    desc: "Высокочастотный автоматический хронограф (5 Гц, 10 ударов в секунду), анкерное колесо и паллеты из кремния.",
  },
  {
    id: "patek-240",
    name: "Patek Philippe 240",
    standard: "Клеймо Patek Philippe (-3 / +2 сек/сутки)",
    vph: 21600,
    liftAngle: 52,
    baseRate: 0.9,
    baseAmplitude: 282,
    baseBeatError: 0.1,
    desc: "Ультратонкий мануфактурный калибр с микроротором из 22-каратного золота и балансом Gyromax.",
  },
  {
    id: "grand-seiko-9s85",
    name: "Grand Seiko Hi-Beat 9S85",
    standard: "Grand Seiko Special Standard (-2 / +4 сек/сутки)",
    vph: 36000,
    liftAngle: 53,
    baseRate: 1.1,
    baseAmplitude: 298,
    baseBeatError: 0.1,
    desc: "Сплав пружины Spron 610, микроструктура деталей спуска MEMS с карманами для удержания смазки.",
  },
  {
    id: "vintage-unserviced",
    name: "Винтажный калибр (требует репассажа)",
    standard: "Не соответствует стандарту (требует сервиса)",
    vph: 18000,
    liftAngle: 50,
    baseRate: -14.5,
    baseAmplitude: 212,
    baseBeatError: 1.8,
    desc: "Загустевшая смазка цапф, смещение колонки спирали (высокая ошибка выкачки) и потеря амплитуды колебаний.",
  },
];

// Пространственные положения проверки (6 Positions)
export const POSITIONS = [
  { id: "CH", code: "CH", name: "Dial Up", label: "Циферблатом вверх", dRate: 0.0, dAmp: 0 },
  { id: "CB", code: "CB", name: "Dial Down", label: "Циферблатом вниз", dRate: -0.5, dAmp: -4 },
  { id: "9H", code: "9H", name: "Crown Left", label: "Головка влево (9H)", dRate: -2.8, dAmp: -34 },
  { id: "6H", code: "6H", name: "Crown Down", label: "Головка вниз (6H)", dRate: -1.4, dAmp: -36 },
  { id: "3H", code: "3H", name: "Crown Right", label: "Головка вправо (3H)", dRate: -3.4, dAmp: -42 },
  { id: "12H", code: "12H", name: "Crown Up", label: "Головка вверх (12H)", dRate: -2.1, dAmp: -38 },
];

export class TimegrapherSimulator {
  constructor({ container, presetId = "rolex-3235", onUpdate = null }) {
    this.container = container;
    this.preset = CALIBER_PRESETS.find((p) => p.id === presetId) || CALIBER_PRESETS[0];
    this.onUpdate = onUpdate;

    this.position = POSITIONS[0];
    this.powerReserve = 100; // 100%, 50%, 15%
    this.liftAngle = this.preset.liftAngle;
    this.vph = this.preset.vph;

    // Пользовательские регулировки
    this.regulatorOffset = 0; // регулировка градусником (-15 до +15 с/сутки)
    this.studHolderOffset = 0; // регулировка колонки спирали (-1.0 до +1.0 мс)

    // Хранилище замеров по позициям
    this.positionMeasurements = {};
    POSITIONS.forEach((pos) => {
      this.positionMeasurements[pos.id] = null;
    });

    this.isRunning = true;
    this.isMuted = true;
    this.dots = [];
    this.animFrameId = null;
    this.lastTickTime = performance.now();
    this.tickCounter = 0;

    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.recordCurrentPosition();
    this.startAnimation();
  }

  // Расчет текущих метрологических параметров
  getMetrics() {
    // Влияние завода на изохронизм
    let pwrRateLoss = 0;
    let pwrAmpLoss = 0;
    if (this.powerReserve < 30) {
      pwrRateLoss = -5.8;
      pwrAmpLoss = -48;
    } else if (this.powerReserve < 70) {
      pwrRateLoss = -1.2;
      pwrAmpLoss = -16;
    }

    // Итоговое суточное отклонение
    const rate = Number(
      (this.preset.baseRate + this.position.dRate + this.regulatorOffset + pwrRateLoss).toFixed(1)
    );

    // Итоговая амплитуда
    const calculatedAmp = Math.round(
      Math.max(160, Math.min(330, this.preset.baseAmplitude + this.position.dAmp + pwrAmpLoss))
    );

    // Ошибка выкачки
    const beatError = Number(
      Math.max(0.0, this.preset.baseBeatError + this.studHolderOffset).toFixed(1)
    );

    return {
      rate,
      amplitude: calculatedAmp,
      beatError,
      liftAngle: this.liftAngle,
      vph: this.vph,
      position: this.position,
      powerReserve: this.powerReserve,
    };
  }

  // Сохранить текущие параметры в матрицу позиций
  recordCurrentPosition() {
    const m = this.getMetrics();
    this.positionMeasurements[this.position.id] = {
      rate: m.rate,
      amplitude: m.amplitude,
      beatError: m.beatError,
    };
    this.updatePositionGrid();
    this.updateCertifications();
  }

  render() {
    this.container.innerHTML = html`
      <div class="timegrapher">
        <!-- Верхняя панель: выбор калибра и статус -->
        <div class="tg-head">
          <div class="tg-head__info">
            <span class="tg-tag"><i class="ph-light ph-gauge" aria-hidden="true"></i> Хронометрический виброграф</span>
            <h3 class="tg-title">${this.preset.name}</h3>
            <p class="tg-desc">${this.preset.desc}</p>
          </div>
          <div class="tg-head__actions">
            <select class="tg-select" id="tg-preset-select" aria-label="Выбор калибра для теста">
              ${CALIBER_PRESETS.map(
                (p) => html`<option value="${p.id}" ${p.id === this.preset.id ? "selected" : ""}>${p.name}</option>`
              )}
            </select>
            <button type="button" class="btn btn--sm btn--subtle tg-sound-toggle" id="tg-sound-btn" aria-label="Звук спуска">
              <i class="ph-light ${this.isMuted ? "ph-speaker-slash" : "ph-speaker-high"}" aria-hidden="true"></i>
              <span>${this.isMuted ? "Вкл. звук" : "Без звука"}</span>
            </button>
          </div>
        </div>

        <!-- Центральный дисплей вибрографа (CRT ЭЛТ-экран с лентой точек) -->
        <div class="tg-crt">
          <div class="tg-crt__bezel">
            <div class="tg-crt__hud">
              <div class="tg-hud-card">
                <span class="tg-hud-card__label">RATE (СУТОЧНЫЙ ХОД)</span>
                <span class="tg-hud-card__val tg-hud-card__val--rate" id="tg-val-rate">+0.0 s/d</span>
                <span class="tg-hud-card__sub" id="tg-sub-rate">Норма</span>
              </div>
              <div class="tg-hud-card">
                <span class="tg-hud-card__label">AMPLITUDE (АМПЛИТУДА)</span>
                <span class="tg-hud-card__val tg-hud-card__val--amp" id="tg-val-amp">288°</span>
                <span class="tg-hud-card__sub">Угол подъема: ${this.liftAngle}°</span>
              </div>
              <div class="tg-hud-card">
                <span class="tg-hud-card__label">BEAT ERROR (ВЫКАЧКА)</span>
                <span class="tg-hud-card__val tg-hud-card__val--beat" id="tg-val-beat">0.1 ms</span>
                <span class="tg-hud-card__sub" id="tg-sub-beat">Идеально</span>
              </div>
              <div class="tg-hud-card tg-hud-card--meta">
                <span class="tg-hud-card__label">ПАРАМЕТРЫ ЗАМЕРА</span>
                <div class="tg-hud-meta-row">
                  <span>ЧАСТОТА:</span> <strong id="tg-meta-vph">${this.vph} пк/ч</strong>
                </div>
                <div class="tg-hud-meta-row">
                  <span>ПОЗИЦИЯ:</span> <strong id="tg-meta-pos">${this.position.code} (${this.position.name})</strong>
                </div>
              </div>
            </div>

            <!-- Канвас осциллографической ленты -->
            <div class="tg-canvas-wrap">
              <canvas class="tg-canvas" id="tg-canvas" width="760" height="260"></canvas>
              <div class="tg-canvas-grid-overlay"></div>
            </div>

            <div class="tg-crt__foot">
              <span class="tg-crt__status"><span class="tg-pulse-dot"></span> СИГНАЛ ПЬЕЗОМИКРОФОНА АКТИВЕН</span>
              <span class="tg-crt__res">Швейцарский стандарт Witschi Chronoscope</span>
            </div>
          </div>
        </div>

        <!-- Консоль оператора: позиции, градусник, завод -->
        <div class="tg-controls">
          <!-- Выбор пространственного положения -->
          <div class="tg-ctrl-block">
            <div class="tg-ctrl-head">
              <span class="tg-ctrl-title"><i class="ph-light ph-compass" aria-hidden="true"></i> Пространственное положение (6 Positions)</span>
              <span class="tg-ctrl-hint">В вертикальных положениях трение цапф выше, амплитуда снижается</span>
            </div>
            <div class="tg-pos-buttons">
              ${POSITIONS.map(
                (pos) => html`
                  <button
                    type="button"
                    class="tg-pos-btn ${pos.id === this.position.id ? "is-active" : ""}"
                    data-pos-id="${pos.id}"
                  >
                    <span class="tg-pos-btn__code">${pos.code}</span>
                    <span class="tg-pos-btn__name">${pos.name}</span>
                    <span class="tg-pos-btn__desc">${pos.label}</span>
                  </button>
                `
              )}
            </div>
          </div>

          <!-- Регулировочные винты и завод пружины -->
          <div class="tg-tuning-grid">
            <!-- Градусник (регулировка точности) -->
            <div class="tg-tuning-card">
              <div class="tg-tuning-card__head">
                <span class="tg-tuning-card__title">Градусник баланса (Regulator Index)</span>
                <span class="tg-tuning-card__val" id="tg-reg-val">0.0 s/d</span>
              </div>
              <p class="tg-tuning-card__desc">Смещение активной длины волоска спирали баланса для ускорения или замедления хода.</p>
              <div class="tg-slider-wrap">
                <span class="tg-slider-bound">-15</span>
                <input
                  type="range"
                  id="tg-slider-reg"
                  min="-15"
                  max="15"
                  step="0.5"
                  value="${this.regulatorOffset}"
                  aria-label="Регулировка суточного хода градусником"
                />
                <span class="tg-slider-bound">+15</span>
              </div>
            </div>

            <!-- Колонка спирали (регулировка выкачки) -->
            <div class="tg-tuning-card">
              <div class="tg-tuning-card__head">
                <span class="tg-tuning-card__title">Колонка спирали (Stud Holder)</span>
                <span class="tg-tuning-card__val" id="tg-stud-val">0.0 ms</span>
              </div>
              <p class="tg-tuning-card__desc">Центровка нейтрального положения импульсного камня между ограничительными штифтами вилки.</p>
              <div class="tg-slider-wrap">
                <span class="tg-slider-bound">0.0</span>
                <input
                  type="range"
                  id="tg-slider-stud"
                  min="-0.8"
                  max="1.5"
                  step="0.1"
                  value="${this.studHolderOffset}"
                  aria-label="Регулировка выкачки баланса"
                />
                <span class="tg-slider-bound">+1.5</span>
              </div>
            </div>

            <!-- Запас хода / изохронизм -->
            <div class="tg-tuning-card">
              <div class="tg-tuning-card__head">
                <span class="tg-tuning-card__title">Завод пружины (Изохронизм)</span>
                <span class="tg-tuning-card__val" id="tg-pwr-val">${this.powerReserve}%</span>
              </div>
              <p class="tg-tuning-card__desc">При ослаблении пружины падает крутящий момент, амплитуда снижается и проявляется погрешность изохронизма.</p>
              <div class="tg-pwr-buttons">
                <button type="button" class="chip chip--sm ${this.powerReserve === 100 ? "is-active" : ""}" data-pwr="100">100% Полный</button>
                <button type="button" class="chip chip--sm ${this.powerReserve === 50 ? "is-active" : ""}" data-pwr="50">50% Рабочий</button>
                <button type="button" class="chip chip--sm ${this.powerReserve === 15 ? "is-active" : ""}" data-pwr="15">15% На исходе</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Матрица замеров в 6 позициях и проверка сертификатов -->
        <div class="tg-cert-section">
          <div class="tg-cert-head">
            <h4 class="tg-cert-title">Метрологический протокол испытаний в 6 положениях</h4>
            <button type="button" class="btn btn--xs btn--subtle" id="tg-measure-all-btn">
              <i class="ph-light ph-play" aria-hidden="true"></i> Измерить все 6 положений
            </button>
          </div>

          <div class="tg-positions-table-wrap">
            <table class="tg-pos-table" aria-label="Таблица замеров точности по положениям">
              <thead>
                <tr>
                  <th>Положение</th>
                  <th>Ориентация</th>
                  <th>Суточный ход (s/d)</th>
                  <th>Амплитуда (°)</th>
                  <th>Выкачка (ms)</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody id="tg-pos-table-body">
                <!-- Заполняется динамически -->
              </tbody>
            </table>
          </div>

          <!-- Сверка со стандартами точности -->
          <div class="tg-standards-grid" id="tg-standards-grid">
            <!-- Заполняется динамически -->
          </div>
        </div>

        <!-- Образовательный справочник метрологии -->
        <div class="tg-edu-accordion">
          <details class="tg-edu-item">
            <summary class="tg-edu-summary">
              <i class="ph-light ph-info" aria-hidden="true"></i> Что означают линии на экране вибрографа?
            </summary>
            <div class="tg-edu-body">
              <p>Каждый период колебания баланса состоит из двух полуколебаний: тик и так. Пьезомикрофон вибрографа улавливает три удара в каждом полуколебании: удар импульсного камня о паз вилки, импульс зуба анкерного колеса по паллете и запирание следующего зуба. Виброграф наносит по одной точке на каждое полуколебание.</p>
              <ul>
                <li><strong>Две параллельные горизонтальные линии</strong>: идеальный ход (суточное отклонение 0 s/d, ошибка выкачки минимальна).</li>
                <li><strong>Линии наклонены вверх вправо</strong>: часы спешат (положительный суточный ход +s/d).</li>
                <li><strong>Линии наклонены вниз вправо</strong>: часы отстают (отрицательный суточный ход -s/d).</li>
                <li><strong>Расстояние между двумя линиями</strong>: показывает ошибку выкачки (Beat Error). Чем больше расстояние, тем сильнее смещено нейтральное положение баланса.</li>
              </ul>
            </div>
          </details>

          <details class="tg-edu-item">
            <summary class="tg-edu-summary">
              <i class="ph-light ph-info" aria-hidden="true"></i> Почему амплитуда падает в вертикальных положениях?
            </summary>
            <div class="tg-edu-body">
              <p>В горизонтальных положениях (циферблатом вверх или вниз) тонкие цапфы оси баланса опираются своими закругленными полированными торцами на плоские накладные рубиновые камни (Endstones). Площадь контакта минимальна, и трение ничтожно мало. Амплитуда максимальна (275° - 310°).</p>
              <p>В вертикальных положениях (корона вниз, влево, вправо) ось баланса ложится боковой цилиндрической поверхностью на сквозные радиальные камни. Трение резко возрастает, забирая кинетическую энергию колебаний. Падение амплитуды на 30° - 45° является естественным физическим явлением для любого механического калибра.</p>
            </div>
          </details>

          <details class="tg-edu-item">
            <summary class="tg-edu-summary">
              <i class="ph-light ph-info" aria-hidden="true"></i> Зачем нужен точный угол подъема (Lift Angle)?
            </summary>
            <div class="tg-edu-body">
              <p>Угол подъема: это угол поворота баланса от момента соприкосновения импульсного камня с вилкой до момента выхода зуба анкерного колеса из зацепления. Виброграф вычисляет амплитуду по времени прохождения этого угла. Для большинства швейцарских калибров с анкерным спуском угол равен 50°-53° (ETA 2824: 50°, Rolex 3135/3235: 52°). Однако для трехъярусного коаксиального спуска Omega Co-Axial угол подъема составляет всего 38°! Если замерить Omega Co-Axial со стандартным углом 52°, прибор покажет ложную завышенную амплитуду свыше 360°.</p>
            </div>
          </details>
        </div>
      </div>
    `;

    this.canvas = qs("#tg-canvas", this.container);
    this.ctx = this.canvas?.getContext("2d");
  }

  bindEvents() {
    // Выбор предустановленного калибра
    const presetSelect = qs("#tg-preset-select", this.container);
    if (presetSelect) {
      presetSelect.addEventListener("change", (e) => {
        const found = CALIBER_PRESETS.find((p) => p.id === e.target.value);
        if (found) {
          this.preset = found;
          this.liftAngle = found.liftAngle;
          this.vph = found.vph;
          this.regulatorOffset = 0;
          this.studHolderOffset = 0;
          this.dots = [];
          this.recordCurrentPosition();
          this.render();
          this.bindEvents();
        }
      });
    }

    // Звук хода
    const soundBtn = qs("#tg-sound-btn", this.container);
    if (soundBtn) {
      soundBtn.addEventListener("click", () => {
        this.isMuted = !this.isMuted;
        const icon = qs("i", soundBtn);
        const span = qs("span", soundBtn);
        if (icon) icon.className = `ph-light ${this.isMuted ? "ph-speaker-slash" : "ph-speaker-high"}`;
        if (span) span.textContent = this.isMuted ? "Вкл. звук" : "Без звука";

        if (!this.isMuted) {
          escapementPlayer.start({
            type: "automatic",
            vph: this.vph,
            maxDurationSec: 30,
          });
        } else {
          escapementPlayer.stop();
        }
      });
    }

    // Выбор пространственного положения
    const posBtns = qsa(".tg-pos-btn", this.container);
    posBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const posId = btn.dataset.posId;
        const pos = POSITIONS.find((p) => p.id === posId);
        if (pos) {
          this.position = pos;
          posBtns.forEach((b) => b.classList.remove("is-active"));
          btn.classList.add("is-active");
          this.recordCurrentPosition();
          this.updateHUD();
        }
      });
    });

    // Регулировка градусником
    const sliderReg = qs("#tg-slider-reg", this.container);
    const regVal = qs("#tg-reg-val", this.container);
    if (sliderReg) {
      sliderReg.addEventListener("input", (e) => {
        this.regulatorOffset = parseFloat(e.target.value);
        if (regVal) regVal.textContent = `${this.regulatorOffset > 0 ? "+" : ""}${this.regulatorOffset.toFixed(1)} s/d`;
        this.recordCurrentPosition();
        this.updateHUD();
      });
    }

    // Регулировка колонки спирали
    const sliderStud = qs("#tg-slider-stud", this.container);
    const studVal = qs("#tg-stud-val", this.container);
    if (sliderStud) {
      sliderStud.addEventListener("input", (e) => {
        this.studHolderOffset = parseFloat(e.target.value);
        if (studVal) studVal.textContent = `${this.studHolderOffset > 0 ? "+" : ""}${this.studHolderOffset.toFixed(1)} ms`;
        this.recordCurrentPosition();
        this.updateHUD();
      });
    }

    // Кнопки завода пружины
    const pwrBtns = qsa("[data-pwr]", this.container);
    const pwrVal = qs("#tg-pwr-val", this.container);
    pwrBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.powerReserve = parseInt(btn.dataset.pwr, 10);
        pwrBtns.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        if (pwrVal) pwrVal.textContent = `${this.powerReserve}%`;
        this.recordCurrentPosition();
        this.updateHUD();
      });
    });

    // Кнопка замера всех 6 положений
    const measureAllBtn = qs("#tg-measure-all-btn", this.container);
    if (measureAllBtn) {
      measureAllBtn.addEventListener("click", () => {
        this.measureAllPositions();
      });
    }
  }

  // Быстрый замер по всем 6 позициям
  measureAllPositions() {
    POSITIONS.forEach((pos) => {
      const prevPos = this.position;
      this.position = pos;
      const m = this.getMetrics();
      this.positionMeasurements[pos.id] = {
        rate: m.rate,
        amplitude: m.amplitude,
        beatError: m.beatError,
      };
      this.position = prevPos;
    });
    this.updatePositionGrid();
    this.updateCertifications();
  }

  updateHUD() {
    const m = this.getMetrics();
    const rateEl = qs("#tg-val-rate", this.container);
    const ampEl = qs("#tg-val-amp", this.container);
    const beatEl = qs("#tg-val-beat", this.container);
    const subRateEl = qs("#tg-sub-rate", this.container);
    const subBeatEl = qs("#tg-sub-beat", this.container);
    const metaPosEl = qs("#tg-meta-pos", this.container);

    if (rateEl) {
      const sign = m.rate > 0 ? "+" : "";
      rateEl.textContent = `${sign}${m.rate.toFixed(1)} s/d`;
      rateEl.classList.toggle("is-positive", m.rate > 0);
      rateEl.classList.toggle("is-negative", m.rate < 0);
    }

    if (subRateEl) {
      if (Math.abs(m.rate) <= 2) subRateEl.textContent = "Превосходно (Superlative)";
      else if (m.rate >= -4 && m.rate <= 6) subRateEl.textContent = "COSC норма";
      else subRateEl.textContent = "Требуется подстройка";
    }

    if (ampEl) {
      ampEl.textContent = `${m.amplitude}°`;
      ampEl.classList.toggle("is-low", m.amplitude < 240);
    }

    if (beatEl) {
      beatEl.textContent = `${m.beatError.toFixed(1)} ms`;
      beatEl.classList.toggle("is-high", m.beatError > 0.6);
    }

    if (subBeatEl) {
      if (m.beatError <= 0.2) subBeatEl.textContent = "Идеально сбалансирован";
      else if (m.beatError <= 0.6) subBeatEl.textContent = "Приемлемо";
      else subBeatEl.textContent = "Смещение колонки спирали!";
    }

    if (metaPosEl) {
      metaPosEl.textContent = `${this.position.code} (${this.position.name})`;
    }
  }

  updatePositionGrid() {
    const tbody = qs("#tg-pos-table-body", this.container);
    if (!tbody) return;

    tbody.innerHTML = POSITIONS.map((pos) => {
      const data = this.positionMeasurements[pos.id];
      const isCurrent = pos.id === this.position.id;

      if (!data) {
        return html`
          <tr class="${isCurrent ? "is-current" : ""}">
            <td><strong>${pos.code}</strong></td>
            <td>${pos.label}</td>
            <td colspan="4" class="text-muted">Не замерено</td>
          </tr>
        `;
      }

      const sign = data.rate > 0 ? "+" : "";
      const isOk = Math.abs(data.rate) <= 6 && data.beatError <= 0.6 && data.amplitude >= 230;

      return html`
        <tr class="${isCurrent ? "is-current" : ""}">
          <td><strong>${pos.code}</strong></td>
          <td>${pos.label}</td>
          <td class="tg-rate-col ${data.rate >= 0 ? "is-pos" : "is-neg"}">${sign}${data.rate.toFixed(1)} s/d</td>
          <td>${data.amplitude}°</td>
          <td>${data.beatError.toFixed(1)} ms</td>
          <td>
            <span class="tg-status-badge ${isOk ? "tg-status-badge--pass" : "tg-status-badge--warn"}">
              ${isOk ? "В норме" : "Отклонение"}
            </span>
          </td>
        </tr>
      `;
    }).join("");
  }

  updateCertifications() {
    const container = qs("#tg-standards-grid", this.container);
    if (!container) return;

    const values = Object.values(this.positionMeasurements).filter(Boolean);
    if (values.length === 0) return;

    // Средний суточный ход
    const avgRate = values.reduce((acc, v) => acc + v.rate, 0) / values.length;
    // Максимальная позиционная дельта
    const rates = values.map((v) => v.rate);
    const delta = Math.max(...rates) - Math.min(...rates);
    // Минимальная амплитуда
    const minAmp = Math.min(...values.map((v) => v.amplitude));
    // Максимальная ошибка выкачки
    const maxBeat = Math.max(...values.map((v) => v.beatError));

    // Стандарты
    const coscPass = avgRate >= -4 && avgRate <= 6 && delta <= 10 && maxBeat <= 0.8;
    const metasPass = avgRate >= 0 && avgRate <= 5 && delta <= 5 && minAmp >= 220 && maxBeat <= 0.4;
    const rolexPass = avgRate >= -2 && avgRate <= 2 && delta <= 4 && maxBeat <= 0.4;
    const gsPass = avgRate >= -2 && avgRate <= 4 && delta <= 6;

    container.innerHTML = html`
      <div class="tg-cert-card ${coscPass ? "is-pass" : "is-fail"}">
        <div class="tg-cert-card__top">
          <span class="tg-cert-name">COSC Chronometer</span>
          <span class="tg-cert-badge">${coscPass ? "СООТВЕТСТВУЕТ" : "НЕ ПРОШЕЛ"}</span>
        </div>
        <div class="tg-cert-criteria">
          <span>Критерий: -4 / +6 сек/сутки, разброс &le;10 сек</span>
          <span>Факт: среднее ${avgRate > 0 ? "+" : ""}${avgRate.toFixed(1)} с/д, дельта ${delta.toFixed(1)} с/д</span>
        </div>
      </div>

      <div class="tg-cert-card ${metasPass ? "is-pass" : "is-fail"}">
        <div class="tg-cert-card__top">
          <span class="tg-cert-name">METAS Master Chronometer</span>
          <span class="tg-cert-badge">${metasPass ? "СООТВЕТСТВУЕТ" : "НЕ ПРОШЕЛ"}</span>
        </div>
        <div class="tg-cert-criteria">
          <span>Критерий: 0 / +5 сек/сутки (только в плюс!), разброс &le;5 сек</span>
          <span>Факт: среднее ${avgRate > 0 ? "+" : ""}${avgRate.toFixed(1)} с/д, дельта ${delta.toFixed(1)} с/д</span>
        </div>
      </div>

      <div class="tg-cert-card ${rolexPass ? "is-pass" : "is-fail"}">
        <div class="tg-cert-card__top">
          <span class="tg-cert-name">Rolex Superlative Chronometer</span>
          <span class="tg-cert-badge">${rolexPass ? "СООТВЕТСТВУЕТ" : "НЕ ПРОШЕЛ"}</span>
        </div>
        <div class="tg-cert-criteria">
          <span>Критерий: -2 / +2 сек/сутки во всех положениях</span>
          <span>Факт: диапазон от ${Math.min(...rates) > 0 ? "+" : ""}${Math.min(...rates).toFixed(1)} до ${Math.max(...rates) > 0 ? "+" : ""}${Math.max(...rates).toFixed(1)} с/д</span>
        </div>
      </div>

      <div class="tg-cert-card ${gsPass ? "is-pass" : "is-fail"}">
        <div class="tg-cert-card__top">
          <span class="tg-cert-name">Grand Seiko Special</span>
          <span class="tg-cert-badge">${gsPass ? "СООТВЕТСТВУЕТ" : "НЕ ПРОШЕЛ"}</span>
        </div>
        <div class="tg-cert-criteria">
          <span>Критерий: -2 / +4 сек/сутки (6 положений)</span>
          <span>Факт: среднее ${avgRate > 0 ? "+" : ""}${avgRate.toFixed(1)} с/д, дельта ${delta.toFixed(1)} с/д</span>
        </div>
      </div>
    `;
  }

  // Отрисовка осциллографической ленты точек
  startAnimation() {
    if (!this.ctx || !this.canvas) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const centerY = h / 2;

    const animate = (timestamp) => {
      if (!this.isRunning) return;

      const m = this.getMetrics();
      const beatsPerSec = m.vph / 3600;
      const intervalMs = 1000 / beatsPerSec;

      // Добавление новых точек по такту спуска
      if (timestamp - this.lastTickTime >= intervalMs) {
        this.lastTickTime = timestamp;
        this.tickCounter++;

        // Расстояние между параллельными линиями (ошибка выкачки)
        const separation = Math.max(0, m.beatError * 22);

        // Наклон линии (суточный ход)
        // При +10 с/сутки линия идет круто вверх
        const slope = (m.rate / 40);

        // Чередование тика и така
        const isTick = this.tickCounter % 2 === 0;
        const lineOffset = isTick ? -separation / 2 : separation / 2;

        this.dots.push({
          x: w,
          baseY: centerY + lineOffset,
          slope,
          alpha: 1.0,
          age: 0,
        });

        // Ограничиваем количество точек в буфере
        if (this.dots.length > 900) {
          this.dots.shift();
        }
      }

      // Сдвиг ленты влево (скорость протяжки ленты)
      const scrollSpeed = 1.1;
      this.dots.forEach((dot) => {
        dot.x -= scrollSpeed;
        dot.age += 1;
        dot.alpha = Math.max(0.15, 1.0 - (dot.age / 800));
      });

      // Удаление ушедших за левый край точек
      this.dots = this.dots.filter((d) => d.x > 0);

      // Отрисовка экрана
      this.ctx.fillStyle = "#080c09";
      this.ctx.fillRect(0, 0, w, h);

      // Сетка осциллографа (зеленый фосфорный оттенок)
      this.ctx.strokeStyle = "rgba(50, 224, 132, 0.08)";
      this.ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, h);
        this.ctx.stroke();
      }
      for (let y = 0; y < h; y += 30) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(w, y);
        this.ctx.stroke();
      }

      // Центральная нулевая направляющая линия
      this.ctx.strokeStyle = "rgba(50, 224, 132, 0.22)";
      this.ctx.setLineDash([4, 4]);
      this.ctx.beginPath();
      this.ctx.moveTo(0, centerY);
      this.ctx.lineTo(w, centerY);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      // Отрисовка светящихся точек
      this.dots.forEach((dot) => {
        // Текущая Y-координата с учетом наклона
        const distFromRight = (w - dot.x);
        const y = dot.baseY - (dot.slope * distFromRight);

        if (y >= 10 && y <= h - 10) {
          // Фосфорное свечение
          this.ctx.fillStyle = `rgba(50, 224, 132, ${dot.alpha * 0.4})`;
          this.ctx.beginPath();
          this.ctx.arc(dot.x, y, 2.5, 0, Math.PI * 2);
          this.ctx.fill();

          // Яркое ядро точки
          this.ctx.fillStyle = `rgba(180, 255, 215, ${dot.alpha})`;
          this.ctx.beginPath();
          this.ctx.arc(dot.x, y, 1.2, 0, Math.PI * 2);
          this.ctx.fill();
        }
      });

      this.animFrameId = requestAnimationFrame(animate);
    };

    this.animFrameId = requestAnimationFrame(animate);
  }

  destroy() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (!this.isMuted) {
      escapementPlayer.stop();
    }
  }
}
