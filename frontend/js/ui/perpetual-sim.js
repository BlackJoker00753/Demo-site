// Интерактивный кинематический симулятор вечного календаря (Perpetual Calendar Mechanics & Secular Matrix)
// Демонстрация работы программного колеса на 48 месяцев, большого рычага, мгновенного прыжка даты
// и високосного цикла Григорианского календаря.

import { html, qs, qsa } from "../core/dom.js";
import { playPusherClick } from "./audio-engine.js";

const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

const WEEKDAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

// Сценарии для тестирования вечного календаря
export const SCENARIOS = [
  {
    id: "feb-standard",
    name: "28 фев 2025 -> 1 мар (Невисокосный)",
    year: 2025,
    month: 2,
    date: 28,
    desc: "Щуп большого рычага падает в глубокую впадину 28 дней. В полночь дата мгновенно перескакивает через 29, 30 и 31 сразу на 1 марта.",
  },
  {
    id: "feb-leap",
    name: "28 фев 2024 -> 29 фев (Високосный год)",
    year: 2024,
    month: 2,
    date: 28,
    desc: "На 48-месячном колесе выступ високосного сектора удерживает рычаг: календарь открывает 29 февраля.",
  },
  {
    id: "leap-to-march",
    name: "29 фев 2024 -> 1 мар (Конец високосного)",
    year: 2024,
    month: 2,
    date: 29,
    desc: "Переход с 29 февраля на 1 марта. Рычаг сбрасывает гребенку даты на 1 число.",
  },
  {
    id: "short-month",
    name: "30 апр -> 1 мая (Короткий 30-дневный месяц)",
    year: 2025,
    month: 4,
    date: 30,
    desc: "Средняя глубина выреза на программном колесе: дата перескакивает 31-е число за один такт.",
  },
  {
    id: "new-year",
    name: "31 дек 2024 -> 1 янв 2025 (Смена года)",
    year: 2024,
    month: 12,
    date: 31,
    desc: "Синхронный прыжок всех указателей: даты, месяца и шага високосного цикла (с 4 на 1).",
  },
  {
    id: "secular-2100",
    name: "28 фев 2100 (Вековой рубеж Григорианского правила)",
    year: 2100,
    month: 2,
    date: 28,
    desc: "2100 год делится на 4, но не делится на 400. Обычный вечный календарь ошибочно покажет 29 февраля. Секулярный механизм сразу перейдет на 1 марта.",
  },
];

export class PerpetualCalendarSimulator {
  constructor({ container, initialScenario = "feb-standard", isAnnual = false }) {
    this.container = container;
    this.isAnnual = isAnnual; // режим годового календаря (для сравнения)
    this.viewMode = "dial"; // "dial" или "skeleton"
    this.isSecularMode = false; // режим векового секулярного календаря (правило 2100 года)

    const sc = SCENARIOS.find((s) => s.id === initialScenario) || SCENARIOS[0];
    this.year = sc.year;
    this.month = sc.month;
    this.date = sc.date;

    this.isPlaying = false;
    this.playInterval = null;

    this.init();
  }

  // Расчет дня недели по формуле Целлера / Григорианскому календарю
  getDayOfWeek(year, month, date) {
    const d = new Date(year, month - 1, date);
    const day = d.getDay(); // 0 = вс, 1 = пн
    return day === 0 ? 7 : day;
  }

  // Проверка високосного года
  isLeapYear(year, isSecular = this.isSecularMode) {
    if (this.isAnnual) return false; // годовой календарь не знает високосных лет
    if (!isSecular) {
      // Стандартный вечный календарь: любой год, кратный 4
      return year % 4 === 0;
    }
    // Секулярный календарь (Григорианское правило 400 лет)
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  // Количество дней в текущем месяце
  getDaysInMonth(year, month) {
    if (month === 2) {
      return this.isLeapYear(year) ? 29 : 28;
    }
    if ([4, 6, 9, 11].includes(month)) {
      return 30;
    }
    return 31;
  }

  // Фаза Луны в днях (0.0 - 29.53)
  getMoonPhase(year, month, date) {
    // Астрономическая опорная дата: новолуние 11 января 2024
    const base = new Date(2024, 0, 11, 11, 57).getTime();
    const current = new Date(year, month - 1, date, 12, 0).getTime();
    const diffDays = (current - base) / (1000 * 60 * 60 * 24);
    const synodic = 29.53058867;
    let phase = diffDays % synodic;
    if (phase < 0) phase += synodic;
    return phase;
  }

  // Цикл високосного года (1, 2, 3, 4)
  getLeapCycleYear(year) {
    const rem = year % 4;
    return rem === 0 ? 4 : rem;
  }

  // Шаг вперед на 1 день с имитацией полночного прыжка рычага
  advanceDay() {
    playPusherClick(false);
    const maxDays = this.getDaysInMonth(this.year, this.month);

    if (this.date < maxDays) {
      this.date++;
    } else {
      // Переход на следующий месяц
      this.date = 1;
      if (this.month < 12) {
        this.month++;
      } else {
        this.month = 1;
        this.year++;
      }
    }
    this.update();
  }

  // Шаг назад на 1 день
  regressDay() {
    playPusherClick(false);
    if (this.date > 1) {
      this.date--;
    } else {
      if (this.month > 1) {
        this.month--;
      } else {
        this.month = 12;
        this.year--;
      }
      this.date = this.getDaysInMonth(this.year, this.month);
    }
    this.update();
  }

  // Переход к выбранному сценарию
  setScenario(id) {
    const sc = SCENARIOS.find((s) => s.id === id);
    if (sc) {
      this.year = sc.year;
      this.month = sc.month;
      this.date = sc.date;
      this.update();
    }
  }

  // Переключение быстрой перемотки времени
  togglePlay() {
    this.isPlaying = !this.isPlaying;
    const btn = qs("#qp-play-btn", this.container);
    if (btn) {
      btn.innerHTML = this.isPlaying
        ? `<i class="ph-light ph-pause" aria-hidden="true"></i> Остановить`
        : `<i class="ph-light ph-play" aria-hidden="true"></i> Автоход времени`;
    }

    if (this.isPlaying) {
      this.playInterval = setInterval(() => {
        this.advanceDay();
      }, 350);
    } else {
      if (this.playInterval) {
        clearInterval(this.playInterval);
        this.playInterval = null;
      }
    }
  }

  init() {
    this.render();
    this.bindEvents();
    this.update();
  }

  render() {
    this.container.innerHTML = html`
      <div class="qp-sim">
        <!-- Шапка панели управления симулятором -->
        <div class="qp-head">
          <div class="qp-head__info">
            <span class="chip chip--lume"><i class="ph-light ph-calendar-check" aria-hidden="true"></i> Механика Quantième Perpétuel</span>
            <h3 class="qp-title">Кинематика вечного календаря</h3>
            <p class="qp-desc">
              Механический компьютер с памятью на 1461 день: взаимодействие программного колеса на 48 месяцев, щупа большого рычага и 59-зубого лунного диска.
            </p>
          </div>

          <div class="qp-head__modes">
            <div class="seg" role="tablist" aria-label="Вид отображения">
              <button
                type="button"
                class="seg__btn ${this.viewMode === "dial" ? "is-active" : ""}"
                id="qp-view-dial-btn"
                role="tab"
              >
                <i class="ph-light ph-clock" aria-hidden="true"></i> Циферблат
              </button>
              <button
                type="button"
                class="seg__btn ${this.viewMode === "skeleton" ? "is-active" : ""}"
                id="qp-view-skel-btn"
                role="tab"
              >
                <i class="ph-light ph-gear-six" aria-hidden="true"></i> Рентген колеса 48м
              </button>
            </div>
          </div>
        </div>

        <!-- Центральный интерактивный блок: Циферблат или Рентген -->
        <div class="qp-stage-card">
          <!-- Режим циферблата -->
          <div class="qp-dial-view ${this.viewMode === "dial" ? "" : "is-hidden"}" id="qp-dial-view">
            <div class="qp-dial">
              <!-- Лунный указатель (на 6 часов) -->
              <div class="qp-subdial qp-subdial--moon">
                <div class="qp-moon-aperture">
                  <div class="qp-moon-disc" id="qp-moon-disc">
                    <span class="qp-moon-sphere qp-moon-sphere--1"></span>
                    <span class="qp-moon-sphere qp-moon-sphere--2"></span>
                    <span class="qp-moon-stars">★ ★ ✦ ★ ✦</span>
                  </div>
                  <div class="qp-moon-mask"></div>
                </div>
                <span class="qp-subdial__label">ФАЗА ЛУНЫ</span>
                <span class="qp-subdial__val" id="qp-moon-text">14.8 дн (Полнолуние)</span>
              </div>

              <!-- День недели (на 9 часов) -->
              <div class="qp-subdial qp-subdial--day">
                <div class="qp-scale-ring">
                  ${WEEKDAY_NAMES.map((d, i) => html`<span class="qp-tick-label" style="--rot:${i * 51.4 - 154}deg">${d}</span>`)}
                </div>
                <div class="qp-hand" id="qp-hand-day" style="transform: rotate(0deg)"></div>
                <span class="qp-subdial__label">ДЕНЬ НЕДЕЛИ</span>
                <span class="qp-subdial__val" id="qp-day-text">Пятница</span>
              </div>

              <!-- Месяц и високосный цикл (на 12 часов) -->
              <div class="qp-subdial qp-subdial--month">
                <div class="qp-scale-ring">
                  ${MONTH_NAMES.map((m, i) => html`<span class="qp-tick-label qp-tick-label--sm" style="--rot:${i * 30}deg">${m.slice(0, 3)}</span>`)}
                </div>
                <div class="qp-hand" id="qp-hand-month" style="transform: rotate(0deg)"></div>
                <!-- Внутренний субциферблат високосного цикла -->
                <div class="qp-leap-sub">
                  <span class="qp-leap-tick" style="--lrot:0deg">1</span>
                  <span class="qp-leap-tick" style="--lrot:90deg">2</span>
                  <span class="qp-leap-tick" style="--lrot:180deg">3</span>
                  <span class="qp-leap-tick qp-leap-tick--l" style="--lrot:270deg">L</span>
                  <div class="qp-leap-hand" id="qp-hand-leap"></div>
                </div>
                <span class="qp-subdial__label">МЕСЯЦ И ЦИКЛ</span>
                <span class="qp-subdial__val" id="qp-month-text">Февраль (Год 1)</span>
              </div>

              <!-- Число месяца (на 3 часа) -->
              <div class="qp-subdial qp-subdial--date">
                <div class="qp-date-display">
                  <span class="qp-date-big" id="qp-date-num">28</span>
                </div>
                <span class="qp-subdial__label">ЧИСЛО МЕСЯЦА</span>
                <span class="qp-subdial__val" id="qp-date-max">из 28 дней</span>
              </div>

              <!-- Центральный индикатор года -->
              <div class="qp-center-info">
                <span class="qp-year-val" id="qp-year-val">2025</span>
                <span class="qp-leap-badge" id="qp-leap-badge">Обычный год</span>
              </div>
            </div>
          </div>

          <!-- Режим рентгена кинематики (48-Month Cam & Grand Lever) -->
          <div class="qp-skel-view ${this.viewMode === "skeleton" ? "" : "is-hidden"}" id="qp-skel-view">
            <div class="qp-skel-canvas-wrap">
              <svg class="qp-skel-svg" viewBox="0 0 600 400" aria-label="Схема программного колеса на 48 месяцев и рычагов">
                <!-- Фон механизма -->
                <circle cx="300" cy="200" r="185" fill="#0b0e12" stroke="rgba(214,224,234,0.12)" stroke-width="2" />
                
                <!-- Программное колесо на 48 месяцев -->
                <g id="qp-svg-48m-wheel" transform="translate(300, 200)">
                  <circle cx="0" cy="0" r="120" fill="#141920" stroke="#d8c08a" stroke-width="2" />
                  <!-- 48 секторов и вырезы глубин -->
                  <g id="qp-svg-sectors"></g>
                  <circle cx="0" cy="0" r="28" fill="#1b222c" stroke="#d8c08a" stroke-width="1.5" />
                  <text x="0" y="5" font-size="11" fill="#d8c08a" text-anchor="middle" font-family="monospace">48-MONTH</text>
                </g>

                <!-- Большой рычаг со щупом (Grand Lever) -->
                <g id="qp-svg-grand-lever">
                  <!-- Рычаг -->
                  <path id="qp-svg-lever-path" d="M 120 180 Q 200 120 280 88 L 300 82" fill="none" stroke="#9fe9c4" stroke-width="5" stroke-linecap="round" />
                  <!-- Щуп рычага, касающийся колеса -->
                  <circle id="qp-svg-beak" cx="300" cy="82" r="7" fill="#9fe9c4" />
                  <!-- Штифт опоры -->
                  <circle cx="120" cy="180" r="6" fill="#e8ebee" stroke="#32e084" stroke-width="2" />
                  <!-- Текст над щупом -->
                  <text id="qp-svg-feeler-label" x="312" y="78" font-size="12" fill="#9fe9c4" font-family="monospace">Щуп рычага: 28 дней</text>
                </g>

                <!-- 31-зубое колесо даты -->
                <g transform="translate(480, 200)">
                  <circle cx="0" cy="0" r="50" fill="#10151c" stroke="rgba(159,233,196,0.3)" stroke-width="2" />
                  <text x="0" y="5" font-size="12" fill="#9fe9c4" text-anchor="middle" font-family="monospace">DATE 1-31</text>
                  <circle id="qp-svg-date-pin" cx="0" cy="-42" r="5" fill="#32e084" />
                </g>
              </svg>
            </div>
            <div class="qp-skel-legend">
              <span class="qp-skel-item"><span class="qp-skel-dot" style="background:#d8c08a"></span> Программное колесо на 48 месяцев (1 оборот за 4 года)</span>
              <span class="qp-skel-item"><span class="qp-skel-dot" style="background:#9fe9c4"></span> Большой рычаг (Grand Levier) со щупом глубины выреза</span>
              <span class="qp-skel-item"><span class="qp-skel-dot" style="background:#32e084"></span> Шаг колеса даты (мгновенный прыжок в полночь)</span>
            </div>
          </div>
        </div>

        <!-- Панель управления временем и сценариями -->
        <div class="qp-console">
          <!-- Кнопки управления временем -->
          <div class="qp-time-bar">
            <button type="button" class="btn btn--subtle" id="qp-prev-btn" title="Предыдущий день">
              <i class="ph-light ph-caret-left" aria-hidden="true"></i> -1 день
            </button>
            <button type="button" class="btn btn--primary" id="qp-next-btn" title="Следующий день">
              Прыжок в полночь (+1 день) <i class="ph-light ph-caret-right" aria-hidden="true"></i>
            </button>
            <button type="button" class="btn btn--ghost" id="qp-play-btn">
              <i class="ph-light ph-play" aria-hidden="true"></i> Автоход времени
            </button>
          </div>

          <!-- Переключатель секулярного календаря (2100 год) -->
          <div class="qp-secular-toggle">
            <label class="qp-checkbox-label">
              <input type="checkbox" id="qp-secular-checkbox" ${this.isSecularMode ? "checked" : ""} />
              <span><strong>Секулярный режим (Secular Calendar)</strong>: механический учет векового правила Григорианского календаря (2100 год невисокосный)</span>
            </label>
          </div>

          <!-- Готовые сценарии тестирования -->
          <div class="qp-scenarios">
            <span class="qp-scenarios__title"><i class="ph-light ph-bookmark-simple" aria-hidden="true"></i> Ключевые критические сценарии календаря:</span>
            <div class="qp-scenarios__grid">
              ${SCENARIOS.map(
                (s) => html`
                  <button
                    type="button"
                    class="qp-sc-btn"
                    data-scenario-id="${s.id}"
                  >
                    <span class="qp-sc-btn__name">${s.name}</span>
                    <span class="qp-sc-btn__desc">${s.desc}</span>
                  </button>
                `
              )}
            </div>
          </div>
        </div>

        <!-- Сравнительная таблица: Простой vs Годовой vs Вечный vs Секулярный -->
        <div class="qp-comparison-card">
          <h4 class="qp-comp-title">Иерархия календарных усложнений в часовом искусстве</h4>
          <div class="qp-table-wrap">
            <table class="qp-table" aria-label="Сравнение типов календарей">
              <thead>
                <tr>
                  <th>Тип календаря</th>
                  <th>Ручная корректировка</th>
                  <th>Учет 30/31 дня</th>
                  <th>Учет 28/29 февраля</th>
                  <th>Правило 2100 года</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Простой календарь (Date)</strong></td>
                  <td>5 раз в год (каждый короткий месяц)</td>
                  <td>Нет (всегда считает до 31)</td>
                  <td>Нет</td>
                  <td>Нет</td>
                </tr>
                <tr>
                  <td><strong>Годовой календарь (Annual Calendar)</strong></td>
                  <td>1 раз в год (1 марта)</td>
                  <td>Да (механически помнит 30 и 31)</td>
                  <td>Нет (требует перевода с февраля)</td>
                  <td>Нет</td>
                </tr>
                <tr class="is-highlight">
                  <td><strong>Вечный календарь (Perpetual Calendar)</strong></td>
                  <td>1 раз в 100 лет (до 28 февраля 2100 года)</td>
                  <td>Да (полностью автономен)</td>
                  <td>Да (цикл 48 месяцев с 29 февраля)</td>
                  <td>Требует коррекции 1 марта 2100 года</td>
                </tr>
                <tr>
                  <td><strong>Секулярный календарь (Secular / Eternal)</strong></td>
                  <td>Не требуется до 4000+ года</td>
                  <td>Да</td>
                  <td>Да</td>
                  <td>Да (механическое 400-летнее колесо)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this.renderSvgSectors();
  }

  // Отрисовка секторов 48-месячного колеса в SVG
  renderSvgSectors() {
    const container = qs("#qp-svg-sectors", this.container);
    if (!container) return;

    let elements = "";
    for (let i = 0; i < 48; i++) {
      const angle = (i * 360) / 48;
      const monthIdx = i % 12;
      const cycleYear = Math.floor(i / 12) + 1;

      // Глубина выреза
      let depthRadius = 112; // 31 день (самый мелкий)
      let color = "rgba(216, 192, 138, 0.4)";

      if ([3, 5, 8, 10].includes(monthIdx)) {
        depthRadius = 96; // 30 дней (средний)
        color = "rgba(159, 233, 196, 0.6)";
      } else if (monthIdx === 1) {
        // Февраль
        if (cycleYear === 4) {
          depthRadius = 84; // 29 дней (високосный февраль)
          color = "#32e084";
        } else {
          depthRadius = 72; // 28 дней (глубокий обычный февраль)
          color = "#f2a39b";
        }
      }

      // Радиусная риска сектора
      const rad = (angle * Math.PI) / 180;
      const x1 = Math.cos(rad) * depthRadius;
      const y1 = Math.sin(rad) * depthRadius;
      const x2 = Math.cos(rad) * 120;
      const y2 = Math.sin(rad) * 120;

      elements += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="2.5" />`;
    }

    container.innerHTML = elements;
  }

  bindEvents() {
    // Переключение режимов циферблат / рентген
    const dialBtn = qs("#qp-view-dial-btn", this.container);
    const skelBtn = qs("#qp-view-skel-btn", this.container);
    const dialView = qs("#qp-dial-view", this.container);
    const skelView = qs("#qp-skel-view", this.container);

    if (dialBtn && skelBtn) {
      dialBtn.addEventListener("click", () => {
        this.viewMode = "dial";
        dialBtn.classList.add("is-active");
        skelBtn.classList.remove("is-active");
        dialView?.classList.remove("is-hidden");
        skelView?.classList.add("is-hidden");
      });

      skelBtn.addEventListener("click", () => {
        this.viewMode = "skeleton";
        skelBtn.classList.add("is-active");
        dialBtn.classList.remove("is-active");
        skelView?.classList.remove("is-hidden");
        dialView?.classList.add("is-hidden");
        this.updateSkeleton();
      });
    }

    // Кнопки управления временем
    const nextBtn = qs("#qp-next-btn", this.container);
    const prevBtn = qs("#qp-prev-btn", this.container);
    const playBtn = qs("#qp-play-btn", this.container);

    if (nextBtn) nextBtn.addEventListener("click", () => this.advanceDay());
    if (prevBtn) prevBtn.addEventListener("click", () => this.regressDay());
    if (playBtn) playBtn.addEventListener("click", () => this.togglePlay());

    // Чекбокс секулярного режима
    const secularCb = qs("#qp-secular-checkbox", this.container);
    if (secularCb) {
      secularCb.addEventListener("change", (e) => {
        this.isSecularMode = e.target.checked;
        this.update();
      });
    }

    // Кнопки готовых сценариев
    const scBtns = qsa(".qp-sc-btn", this.container);
    scBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.scenarioId;
        this.setScenario(id);
      });
    });
  }

  // Обновление состояния всех стрелок и меток
  update() {
    const dayOfWeek = this.getDayOfWeek(this.year, this.month, this.date);
    const maxDays = this.getDaysInMonth(this.year, this.month);
    const leapCycle = this.getLeapCycleYear(this.year);
    const moonPhase = this.getMoonPhase(this.year, this.month, this.date);
    const isLeap = this.isLeapYear(this.year);

    // 1. День недели
    const handDay = qs("#qp-hand-day", this.container);
    const textDay = qs("#qp-day-text", this.container);
    if (handDay) {
      // 7 позиций: -154deg до +154deg
      const deg = (dayOfWeek - 1) * 51.4 - 154;
      handDay.style.transform = `rotate(${deg}deg)`;
    }
    if (textDay) {
      const fullDays = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
      textDay.textContent = fullDays[dayOfWeek - 1];
    }

    // 2. Месяц и високосный цикл
    const handMonth = qs("#qp-hand-month", this.container);
    const handLeap = qs("#qp-hand-leap", this.container);
    const textMonth = qs("#qp-month-text", this.container);
    if (handMonth) {
      const mDeg = (this.month - 1) * 30 + (this.date / maxDays) * 28;
      handMonth.style.transform = `rotate(${mDeg}deg)`;
    }
    if (handLeap) {
      const lDeg = (leapCycle - 1) * 90;
      handLeap.style.transform = `rotate(${lDeg}deg)`;
    }
    if (textMonth) {
      const cycleName = leapCycle === 4 ? "Високосный (L)" : `Год ${leapCycle} в цикле`;
      textMonth.textContent = `${MONTH_NAMES[this.month - 1]} (${cycleName})`;
    }

    // 3. Число месяца
    const dateNum = qs("#qp-date-num", this.container);
    const dateMax = qs("#qp-date-max", this.container);
    if (dateNum) dateNum.textContent = this.date;
    if (dateMax) dateMax.textContent = `из ${maxDays} дней`;

    // 4. Год и статус
    const yearVal = qs("#qp-year-val", this.container);
    const leapBadge = qs("#qp-leap-badge", this.container);
    if (yearVal) yearVal.textContent = this.year;
    if (leapBadge) {
      if (this.year === 2100 && !this.isSecularMode) {
        leapBadge.textContent = "2100: ошибка обычного календаря (+1 лишний день)";
        leapBadge.className = "qp-leap-badge is-error";
      } else if (isLeap) {
        leapBadge.textContent = "Високосный год (29 дней)";
        leapBadge.className = "qp-leap-badge is-leap";
      } else {
        leapBadge.textContent = `Обычный год (${leapCycle}/4)`;
        leapBadge.className = "qp-leap-badge";
      }
    }

    // 5. Фаза Луны
    const moonDisc = qs("#qp-moon-disc", this.container);
    const moonText = qs("#qp-moon-text", this.container);
    if (moonDisc) {
      // 1 оборот за 59 дней (два лунных цикла)
      const moonRot = (moonPhase / 29.53) * 180;
      moonDisc.style.transform = `rotate(${moonRot}deg)`;
    }
    if (moonText) {
      let phaseName = "Новолуние";
      if (moonPhase > 28 || moonPhase < 1.5) phaseName = "Новолуние";
      else if (moonPhase < 6.5) phaseName = "Молодая луна";
      else if (moonPhase < 8.5) phaseName = "Первая четверть";
      else if (moonPhase < 13.5) phaseName = "Растущая луна";
      else if (moonPhase < 16.0) phaseName = "Полнолуние";
      else if (moonPhase < 21.0) phaseName = "Убывающая луна";
      else if (moonPhase < 23.0) phaseName = "Последняя четверть";
      else phaseName = "Старая луна";

      moonText.textContent = `${moonPhase.toFixed(1)} дн (${phaseName})`;
    }

    // 6. Обновление рентгена колеса 48 месяцев
    this.updateSkeleton();
  }

  // Обновление рентген-схемы
  updateSkeleton() {
    const wheel = qs("#qp-svg-48m-wheel", this.container);
    const beak = qs("#qp-svg-beak", this.container);
    const leverPath = qs("#qp-svg-lever-path", this.container);
    const feelerLabel = qs("#qp-svg-feeler-label", this.container);
    const datePin = qs("#qp-svg-date-pin", this.container);

    if (!wheel) return;

    // Позиция месяца в 48-месячном цикле (0 - 47)
    const cycleYear = this.getLeapCycleYear(this.year);
    const cycleIndex = (cycleYear - 1) * 12 + (this.month - 1);

    // Угол поворота 48-месячного колеса
    const wheelRot = -(cycleIndex * 360) / 48;
    wheel.setAttribute("transform", `translate(300, 200) rotate(${wheelRot.toFixed(1)})`);

    // Глубина текущего выреза под щупом (в верхней точке колеса, x=300, y=200-R)
    let depthR = 112;
    let label = "31 день (мелкий вырез)";

    if ([3, 5, 8, 10].includes(this.month - 1)) {
      depthR = 96;
      label = "30 дней (средний вырез)";
    } else if (this.month === 2) {
      if (this.isLeapYear(this.year)) {
        depthR = 84;
        label = "29 дней (високосный выступ)";
      } else {
        depthR = 72;
        label = "28 дней (глубокий вырез)";
      }
    }

    const beakY = 200 - depthR;
    if (beak) {
      beak.setAttribute("cy", beakY);
    }
    if (leverPath) {
      leverPath.setAttribute("d", `M 120 180 Q 200 120 280 ${beakY + 6} L 300 ${beakY}`);
    }
    if (feelerLabel) {
      feelerLabel.setAttribute("y", beakY - 8);
      feelerLabel.textContent = `Щуп: ${label}`;
    }

    // Поворот пина колеса даты
    if (datePin) {
      const dDeg = (this.date / 31) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(dDeg) * 42;
      const py = Math.sin(dDeg) * 42;
      datePin.setAttribute("cx", px.toFixed(1));
      datePin.setAttribute("cy", py.toFixed(1));
    }
  }

  destroy() {
    this.isPlaying = false;
    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
  }
}

// Функции для бесшовного монтирования на страницах усложнений
export function renderPerpetualSimulator(complicationSlug = "perpetual-calendar") {
  const isAnnual = complicationSlug === "annual-calendar";
  return html`<div class="perpetual-sim-widget" data-sim-type="${complicationSlug}" data-reveal></div>`;
}

export function mountPerpetualSimulator(root) {
  const containers = qsa(".perpetual-sim-widget", root);
  const instances = [];

  containers.forEach((el) => {
    const isAnnual = el.dataset.simType === "annual-calendar";
    const sim = new PerpetualCalendarSimulator({
      container: el,
      initialScenario: isAnnual ? "short-month" : "feb-standard",
      isAnnual,
    });
    instances.push(sim);
  });

  return () => {
    instances.forEach((inst) => inst.destroy());
  };
}
