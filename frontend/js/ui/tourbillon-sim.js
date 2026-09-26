// Интерактивный симулятор гравитационной компенсации турбийона (Tourbillon Gravity Compensation & Multi-Axis Laboratory)
// Физическая модель компенсации позиционной погрешности хода баланса за счет непрерывного вращения каретки на 360 градусов.

import { html, qs, qsa } from "../core/dom.js";
import { escapementPlayer } from "./audio-engine.js";

export const TOURBILLON_PRESETS = [
  {
    id: "breguet-classic",
    name: "Классический турбийон Бреге (1801)",
    periodSec: 60,
    tiltAngle: 0,
    type: "classic",
    vph: 21600,
    cageWeightMg: 280,
    desc: "Каретка из титана и вороненой стали совершает 1 оборот ровно за 60 секунд. Верхний и нижний полированные стальные мосты.",
  },
  {
    id: "flying-tourbillon",
    name: "Парящий турбийон Альфреда Хельвига (1920)",
    periodSec: 60,
    tiltAngle: 0,
    type: "flying",
    vph: 28800,
    cageWeightMg: 220,
    desc: "Консольное крепление каретки исключительно на нижнем шарикоподшипнике без верхнего моста, открывающее панорамный обзор на спуск.",
  },
  {
    id: "greubel-incline",
    name: "Наклонный турбийон 24 секунды (Greubel Forsey)",
    periodSec: 24,
    tiltAngle: 25,
    type: "incline",
    vph: 21600,
    cageWeightMg: 390,
    desc: "Каретка наклонена под углом 25 градусов и вращается с повышенной скоростью (24 сек на оборот), предотвращая гравитационный застой при любом положении руки.",
  },
  {
    id: "fixed-carriage",
    name: "Заблокированная каретка (Обычные часы без турбийона)",
    periodSec: 0, // Не вращается
    tiltAngle: 0,
    type: "fixed",
    vph: 28800,
    cageWeightMg: 0,
    desc: "Демонстрация работы спуска без компенсации: в вертикальном положении гравитация непрерывно тянет неуравновешенную точку баланса, накапливая ошибку.",
  },
];

export class TourbillonSimulator {
  constructor({ container, presetId = "breguet-classic" }) {
    this.container = container;
    this.preset = TOURBILLON_PRESETS.find((p) => p.id === presetId) || TOURBILLON_PRESETS[0];

    this.watchTilt = 90; // Угол наклона корпуса в пространстве (0° = горизонтально плашмя, 90° = вертикально в кармане/на руке)
    this.speedMultiplier = 1; // 1x (реальное время 60с) или 5x (ускоренное)
    this.isAudioActive = false;

    // Внутренние кинематические переменные
    this.cageAngle = 0; // Текущий угол поворота каретки (радианы)
    this.balanceAngle = 0; // Текущий угол поворота баланса
    this.balancePhase = 0;
    this.lastTime = performance.now();
    this.isRunning = true;
    this.animId = null;

    // Буфер истории мгновенной погрешности для отрисовки синусоиды
    this.errorHistory = [];
    this.maxHistoryPoints = 160;

    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.canvas = qs("#tb-canvas", this.container);
    this.graphCanvas = qs("#tb-graph-canvas", this.container);
    this.ctx = this.canvas?.getContext("2d");
    this.graphCtx = this.graphCanvas?.getContext("2d");
    this.startLoop();
  }

  // Расчет физической мгновенной гравитационной погрешности
  getPhysicsMetrics() {
    // В горизонтальном положении (0°) гравитация действует перпендикулярно плоскости вращения, ошибка равна нулю
    const tiltSin = Math.sin((this.watchTilt * Math.PI) / 180);
    const maxAmplitudeDeviation = 16.5; // Максимальная статическая погрешность (с/сутки)

    let instantError = 0;
    if (this.preset.periodSec === 0) {
      // Заблокированная каретка: постоянный гравитационный сдвиг
      instantError = maxAmplitudeDeviation * tiltSin;
    } else {
      // Вращающаяся каретка: синусоидальная модуляция в зависимости от фазы вращения каретки
      instantError = maxAmplitudeDeviation * tiltSin * Math.cos(this.cageAngle);
    }

    // Эффективность компенсации
    const compensationEfficiency = this.preset.periodSec === 0 ? 0 : Math.round(98.2 * tiltSin);

    return {
      tiltSin,
      instantError,
      compensationEfficiency,
      cageRpm: this.preset.periodSec > 0 ? (60 / this.preset.periodSec).toFixed(1) : 0,
    };
  }

  render() {
    this.container.innerHTML = html`
      <div class="tourbillon-sim">
        <!-- Шапка панели симулятора турбийона -->
        <div class="tb-head">
          <div class="tb-head__info">
            <span class="chip chip--lume"><i class="ph-light ph-atom" aria-hidden="true"></i> Механика регулятора Breguet 1801</span>
            <h3 class="tb-title">${this.preset.name}</h3>
            <p class="tb-desc">${this.preset.desc}</p>
          </div>

          <div class="tb-head__actions">
            <select class="tg-select" id="tb-preset-select" aria-label="Конфигурация турбийона">
              ${TOURBILLON_PRESETS.map(
                (p) => html`<option value="${p.id}" ${p.id === this.preset.id ? "selected" : ""}>${p.name}</option>`
              )}
            </select>
            <button type="button" class="btn btn--sm btn--subtle" id="tb-sound-btn" aria-label="Звук спуска">
              <i class="ph-light ${this.isAudioActive ? "ph-speaker-high" : "ph-speaker-slash"}" aria-hidden="true"></i>
              <span>${this.isAudioActive ? "Без звука" : "Вкл. звук"}</span>
            </button>
          </div>
        </div>

        <!-- Центральный визуализатор каретки и гравитационного вектора -->
        <div class="tb-stage-grid">
          <!-- Холст кинематики каретки турбийона -->
          <div class="tb-canvas-card">
            <div class="tb-canvas-wrap">
              <canvas id="tb-canvas" width="460" height="460" class="tb-canvas" aria-label="Вращение каретки турбийона"></canvas>
              
              <!-- Индикатор гравитационного вектора g -->
              <div class="tb-gravity-vector" id="tb-gravity-vector">
                <span class="tb-gravity-arrow">↓</span>
                <span class="tb-gravity-label">Вектор гравитации Земли (g)</span>
              </div>
            </div>
            
            <div class="tb-stage-foot">
              <span class="tb-metric-chip">Скорость каретки: <strong id="tb-cage-speed">${this.preset.periodSec > 0 ? `${this.preset.periodSec} сек/об` : "Заблокирована"}</strong></span>
              <span class="tb-metric-chip">Масса каретки: <strong>${this.preset.cageWeightMg ? `${this.preset.cageWeightMg} мг` : "Н/Д"}</strong></span>
            </div>
          </div>

          <!-- Панель анализа компенсации и осциллограмма погрешности -->
          <div class="tb-analytics-card">
            <h4 class="tb-analytics-title">Динамика компенсации позиционной ошибки</h4>
            <p class="tb-analytics-desc">
              В статичном положении смещенный центр тяжести волоска непрерывно искажает ход. При вращении каретки ускорение в верхней точке в точности нейтрализуется замедлением в нижней точке, обнуляя суммарную суточную погрешность за полный оборот.
            </p>

            <!-- График синусоиды ошибки хода -->
            <div class="tb-graph-wrap">
              <canvas id="tb-graph-canvas" width="460" height="150" class="tb-graph-canvas" aria-label="Осциллограмма ошибки хода"></canvas>
              <div class="tb-graph-labels">
                <span>+20 с/д (опережение)</span>
                <span>0 с/д (идеальный изохронизм)</span>
                <span>-20 с/д (отставание)</span>
              </div>
            </div>

            <!-- Телеметрия компенсации -->
            <div class="tb-metrics-grid">
              <div class="tb-metric-box">
                <span class="tb-metric-box__label">МГНОВЕННОЕ ОТКЛОНЕНИЕ</span>
                <span class="tb-metric-box__val" id="tb-val-instant">+0.0 s/d</span>
                <span class="tb-metric-box__sub">Фаза каретки: <span id="tb-val-phase">0°</span></span>
              </div>
              <div class="tb-metric-box">
                <span class="tb-metric-box__label">СУММАРНАЯ ОШИБКА ЗА ЦИКЛ</span>
                <span class="tb-metric-box__val tb-metric-box__val--good" id="tb-val-net">0.0 s/d</span>
                <span class="tb-metric-box__sub">Интеграл гравитации: 0</span>
              </div>
              <div class="tb-metric-box">
                <span class="tb-metric-box__label">КОМПЕНСАЦИЯ ГРАВИТАЦИИ</span>
                <span class="tb-metric-box__val tb-metric-box__val--accent" id="tb-val-comp">98%</span>
                <span class="tb-metric-box__sub">Эффект нейтрализации</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Консоль оператора: угол наклона часов и скорость симуляции -->
        <div class="tb-controls-card">
          <div class="tb-ctrl-row">
            <div class="tb-ctrl-label-col">
              <span class="tb-ctrl-name"><i class="ph-light ph-device-rotate" aria-hidden="true"></i> Пространственное положение часов</span>
              <span class="tb-ctrl-hint">В горизонтальном положении (0°) гравитация действует перпендикулярно балансу и ошибка минимальна. В вертикальном (90°) влияние гравитации достигает максимума.</span>
            </div>
            <div class="tb-ctrl-slider-col">
              <div class="tg-slider-wrap">
                <span class="tg-slider-bound">0° (Плашмя)</span>
                <input
                  type="range"
                  id="tb-slider-tilt"
                  min="0"
                  max="90"
                  step="5"
                  value="${this.watchTilt}"
                  aria-label="Угол наклона часов в пространстве"
                />
                <span class="tg-slider-bound">90° (Вертикально)</span>
              </div>
              <span class="tb-slider-feedback" id="tb-tilt-feedback">${this.watchTilt}° (Вертикально)</span>
            </div>
          </div>

          <div class="tb-ctrl-row tb-ctrl-row--border">
            <div class="tb-ctrl-label-col">
              <span class="tb-ctrl-name"><i class="ph-light ph-gauge" aria-hidden="true"></i> Скорость визуализации</span>
              <span class="tb-ctrl-hint">Реальное время (60 секунд на оборот) или ускоренный режим для наглядности вращения.</span>
            </div>
            <div class="tb-speed-buttons">
              <button type="button" class="chip chip--sm ${this.speedMultiplier === 1 ? "is-active" : ""}" data-speed="1">1x (Реальное время 60с)</button>
              <button type="button" class="chip chip--sm ${this.speedMultiplier === 3 ? "is-active" : ""}" data-speed="3">3x (20 секунд)</button>
              <button type="button" class="chip chip--sm ${this.speedMultiplier === 6 ? "is-active" : ""}" data-speed="6">6x (10 секунд)</button>
            </div>
          </div>
        </div>

        <!-- Историко-инженерный ликбез о турбийоне -->
        <div class="tg-edu-accordion">
          <details class="tg-edu-item">
            <summary class="tg-edu-summary">
              <i class="ph-light ph-question" aria-hidden="true"></i> Нужен ли турбийон в современных наручных часах?
            </summary>
            <div class="tg-edu-body">
              <p>Абрахам-Луи Бреге изобрел турбийон в 1801 году исключительно для карманных часов, которые часами висели в жилетном кармане джентльмена вертикально головкой вверх. В этом статичном положении гравитация непрерывно деформировала волосок баланса в одну сторону.</p>
              <p>Наручные часы непрерывно меняют ориентацию в пространстве во время движений руки, поэтому гравитационная погрешность частично компенсируется естественной ноской. В XXI веке турбийон перешел в статус вершины механического искусства, демонстрируя способность мануфактуры изготовить каретку весом всего 0.2-0.3 грамма из десятков деталей и настроить свободное колебание баланса в трех измерениях.</p>
            </div>
          </details>

          <details class="tg-edu-item">
            <summary class="tg-edu-summary">
              <i class="ph-light ph-question" aria-hidden="true"></i> В чем отличие турбийона от карусели (Karrusel)?
            </summary>
            <div class="tg-edu-body">
              <p>Оба механизма вращают спусковой узел для компенсации гравитации, но имеют разную кинематическую схему:</p>
              <ul>
                <li><strong>Турбийон (Breguet)</strong>: каретка приводится во вращение четвертым колесом (секундным колесом механизма), а триб анкерного колеса обкатывается вокруг неподвижного центрального колеса. Скорость вращения жестко задана (обычно 1 оборот в минуту).</li>
                <li><strong>Карусель (Karrusel, Бонник Боннесен, 1892)</strong>: каретка приводится в движение через отдельную промежуточную колесную передачу прямо от заводного барабана, независимо от привода анкерного колеса. Карусель менее чувствительна к ударам и обычно вращается медленнее (например, 1 оборот за 42-60 минут).</li>
              </ul>
            </div>
          </details>

          <details class="tg-edu-item">
            <summary class="tg-edu-summary">
              <i class="ph-light ph-question" aria-hidden="true"></i> Почему каретку турбийона изготавливают из титана?
            </summary>
            <div class="tg-edu-body">
              <p>Энергия для вращения каретки берется непосредственно от ходовой пружины через колесную передачу механизма. Если каретка будет тяжелой (из стали или латуни), огромный момент инерции «съест» амплитуду колебаний баланса и сократит запас хода часов вдвое. Применение аэрокосмического титана Grade 5, бериллия или алюминия позволяет снизить вес всей каретки в сборе с анкерной вилкой и балансом до невероятных 0.28 грамма!</p>
            </div>
          </details>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Выбор конфигурации турбийона
    const select = qs("#tb-preset-select", this.container);
    if (select) {
      select.addEventListener("change", (e) => {
        const found = TOURBILLON_PRESETS.find((p) => p.id === e.target.value);
        if (found) {
          this.preset = found;
          this.render();
          this.bindEvents();
          this.canvas = qs("#tb-canvas", this.container);
          this.graphCanvas = qs("#tb-graph-canvas", this.container);
          this.ctx = this.canvas?.getContext("2d");
          this.graphCtx = this.graphCanvas?.getContext("2d");
        }
      });
    }

    // Звук работы спуска
    const soundBtn = qs("#tb-sound-btn", this.container);
    if (soundBtn) {
      soundBtn.addEventListener("click", () => {
        this.isAudioActive = !this.isAudioActive;
        const icon = qs("i", soundBtn);
        const span = qs("span", soundBtn);
        if (icon) icon.className = `ph-light ${this.isAudioActive ? "ph-speaker-high" : "ph-speaker-slash"}`;
        if (span) span.textContent = this.isAudioActive ? "Без звука" : "Вкл. звук";

        if (this.isAudioActive) {
          escapementPlayer.start({
            type: "manual",
            vph: this.preset.vph,
            maxDurationSec: 30,
          });
        } else {
          escapementPlayer.stop();
        }
      });
    }

    // Ползунок наклона корпуса
    const tiltSlider = qs("#tb-slider-tilt", this.container);
    const tiltFeedback = qs("#tb-tilt-feedback", this.container);
    if (tiltSlider) {
      tiltSlider.addEventListener("input", (e) => {
        this.watchTilt = parseInt(e.target.value, 10);
        if (tiltFeedback) {
          if (this.watchTilt === 0) tiltFeedback.textContent = "0° (Горизонтально плашмя)";
          else if (this.watchTilt === 90) tiltFeedback.textContent = "90° (Вертикально в кармане)";
          else tiltFeedback.textContent = `${this.watchTilt}° (Под углом)`;
        }
      });
    }

    // Кнопки скорости
    const speedBtns = qsa("[data-speed]", this.container);
    speedBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.speedMultiplier = parseInt(btn.dataset.speed, 10);
        speedBtns.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
      });
    });
  }

  startLoop() {
    const loop = (now) => {
      if (!this.isRunning) return;
      const dt = (now - this.lastTime) / 1000;
      this.lastTime = now;

      this.updateKinematics(dt);
      this.drawCarriage();
      this.drawGraph();
      this.updateTelemetry();

      this.animId = requestAnimationFrame(loop);
    };

    this.animId = requestAnimationFrame(loop);
  }

  // Обновление физических углов
  updateKinematics(dt) {
    // Вращение каретки
    if (this.preset.periodSec > 0) {
      const cageAngularSpeed = ((Math.PI * 2) / this.preset.periodSec) * this.speedMultiplier;
      this.cageAngle = (this.cageAngle + cageAngularSpeed * dt) % (Math.PI * 2);
    } else {
      this.cageAngle = 0;
    }

    // Быстрые колебания баланса (21600 или 28800 пк/ч -> 3 Гц или 4 Гц)
    const freqHz = this.preset.vph / 7200;
    this.balancePhase += dt * freqHz * Math.PI * 2;
    // Размах амплитуды ~280 градусов = 2.44 рад
    this.balanceAngle = 2.44 * Math.sin(this.balancePhase);

    // Добавление точки в историю погрешности
    const metrics = this.getPhysicsMetrics();
    this.errorHistory.push(metrics.instantError);
    if (this.errorHistory.length > this.maxHistoryPoints) {
      this.errorHistory.shift();
    }
  }

  // Отрисовка каретки турбийона на холсте
  drawCarriage() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    // 1. Неподвижный внешний обод (Fixed Ring & Scale)
    ctx.save();
    ctx.translate(cx, cy);

    ctx.strokeStyle = "rgba(214, 224, 234, 0.12)";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(0, 0, 190, 0, Math.PI * 2);
    ctx.stroke();

    // Секундные риски неподвижной шкалы
    for (let i = 0; i < 60; i++) {
      const rad = (i * Math.PI) / 30;
      const isMajor = i % 5 === 0;
      const r1 = isMajor ? 172 : 180;
      const r2 = 196;
      ctx.strokeStyle = isMajor ? "#d8c08a" : "rgba(214, 224, 234, 0.25)";
      ctx.lineWidth = isMajor ? 2.5 : 1;
      ctx.beginPath();
      ctx.moveTo(Math.cos(rad) * r1, Math.sin(rad) * r1);
      ctx.lineTo(Math.cos(rad) * r2, Math.sin(rad) * r2);
      ctx.stroke();
    }

    // 2. Вращающаяся каретка турбийона
    ctx.rotate(this.cageAngle);

    // Наклонный эффект для Greubel Forsey (овал проекции)
    if (this.preset.type === "incline") {
      ctx.scale(1.0, 0.88);
    }

    // Внешнее титановое кольцо каретки
    ctx.strokeStyle = "#c9ced4";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 155, 0, Math.PI * 2);
    ctx.stroke();

    // Три изящных изогнутых плеча каретки (Breguet Lyre)
    for (let i = 0; i < 3; i++) {
      const armRot = (i * Math.PI * 2) / 3;
      ctx.save();
      ctx.rotate(armRot);
      ctx.fillStyle = "rgba(200, 206, 212, 0.85)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(40, 25, 100, 30, 155, 0);
      ctx.bezierCurveTo(100, -15, 40, -10, 0, 0);
      ctx.fill();

      // Полированные зеркальные фаски
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    // 3. Колеблющееся балансовое колесо (Balance Wheel)
    ctx.save();
    ctx.rotate(this.balanceAngle);

    // Обод баланса из сплава Glucydur
    ctx.strokeStyle = "#d8c08a";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 130, 0, Math.PI * 2);
    ctx.stroke();

    // Регулировочные золотые винты Microstella по периметру баланса
    for (let i = 0; i < 16; i++) {
      const sRad = (i * Math.PI) / 8;
      const sx = Math.cos(sRad) * 133;
      const sy = Math.sin(sRad) * 133;
      ctx.fillStyle = "#fff2b0";
      ctx.beginPath();
      ctx.arc(sx, sy, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2 перекладины баланса
    ctx.strokeStyle = "#d8c08a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-130, 0);
    ctx.lineTo(130, 0);
    ctx.moveTo(0, -130);
    ctx.lineTo(0, 130);
    ctx.stroke();

    // Спираль Бреге (Hairspring Spiral)
    ctx.strokeStyle = "#4ea8de"; // Вороненая кремниевая/синяя спираль
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    let a = 0;
    for (let theta = 0; theta < Math.PI * 10; theta += 0.15) {
      a += 0.7;
      const x = Math.cos(theta) * a;
      const y = Math.sin(theta) * a;
      if (theta === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Тяжелая точка дисбаланса (Unbalance point), демонстрирующая смещение центра масс
    ctx.fillStyle = "#f2a39b";
    ctx.beginPath();
    ctx.arc(115, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore(); // Конец вращения баланса

    // 4. Анкерное колесо и рубиновые паллеты внутри каретки
    ctx.save();
    ctx.translate(65, -45);
    ctx.rotate(this.cageAngle * 4);
    // Анкерное колесо
    ctx.strokeStyle = "#32e084";
    ctx.lineWidth = 2;
    for (let t = 0; t < 15; t++) {
      const tr = (t * Math.PI * 2) / 15;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(tr) * 28, Math.sin(tr) * 28);
      ctx.stroke();
    }
    ctx.restore();

    // 5. Центральный рубиновый накладной камень и шатон (Endstone Jewel)
    ctx.fillStyle = "#d8c08a"; // Золотой шатон
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#e63946"; // Натуральный рубиновый камень
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();

    // Зеркальный блик на камне
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.beginPath();
    ctx.arc(-3, -3, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Отрисовка осциллограммы гравитационной компенсации
  drawGraph() {
    if (!this.graphCtx || !this.graphCanvas) return;
    const ctx = this.graphCtx;
    const w = this.graphCanvas.width;
    const h = this.graphCanvas.height;
    const midY = h / 2;

    ctx.clearRect(0, 0, w, h);

    // Сетка
    ctx.strokeStyle = "rgba(214, 224, 234, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(w, 20);
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.moveTo(0, h - 20);
    ctx.lineTo(w, h - 20);
    ctx.stroke();

    // Нулевая линия эталона
    ctx.strokeStyle = "rgba(159, 233, 196, 0.4)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();
    ctx.setLineDash([]);

    if (this.errorHistory.length < 2) return;

    // Линия динамической погрешности
    ctx.strokeStyle = this.preset.periodSec === 0 ? "#f2a39b" : "#32e084";
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    const step = w / (this.maxHistoryPoints - 1);
    this.errorHistory.forEach((val, i) => {
      // Масштаб: ±20 сек/сутки соответствуют высоте холста
      const y = midY - (val / 22) * (midY - 20);
      const x = i * step;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Светящаяся текущая точка на правом крае графика
    const lastVal = this.errorHistory[this.errorHistory.length - 1];
    const lastY = midY - (lastVal / 22) * (midY - 20);
    const lastX = (this.errorHistory.length - 1) * step;

    ctx.fillStyle = this.preset.periodSec === 0 ? "#f2a39b" : "#32e084";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Обновление значений в телеметрии
  updateTelemetry() {
    const m = this.getPhysicsMetrics();
    const instEl = qs("#tb-val-instant", this.container);
    const phaseEl = qs("#tb-val-phase", this.container);
    const netEl = qs("#tb-val-net", this.container);
    const compEl = qs("#tb-val-comp", this.container);

    if (instEl) {
      const sign = m.instantError > 0 ? "+" : "";
      instEl.textContent = `${sign}${m.instantError.toFixed(1)} s/d`;
      instEl.className = `tb-metric-box__val ${Math.abs(m.instantError) < 2 ? "tb-metric-box__val--good" : "tb-metric-box__val--warn"}`;
    }

    if (phaseEl) {
      const deg = Math.round((this.cageAngle * 180) / Math.PI) % 360;
      phaseEl.textContent = `${deg}°`;
    }

    if (netEl) {
      if (this.preset.periodSec === 0) {
        netEl.textContent = `${m.instantError > 0 ? "+" : ""}${m.instantError.toFixed(1)} s/d`;
        netEl.className = "tb-metric-box__val tb-metric-box__val--warn";
      } else {
        netEl.textContent = "0.0 s/d (Нейтраль)";
        netEl.className = "tb-metric-box__val tb-metric-box__val--good";
      }
    }

    if (compEl) {
      compEl.textContent = `${m.compensationEfficiency}%`;
    }
  }

  destroy() {
    this.isRunning = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.isAudioActive) {
      escapementPlayer.stop();
    }
  }
}

// Функции для экспорта и встраивания на странице усложнения
export function renderTourbillonSimulator() {
  return html`<div class="tourbillon-sim-widget" data-reveal></div>`;
}

export function mountTourbillonSimulator(root) {
  const containers = qsa(".tourbillon-sim-widget", root);
  const instances = [];

  containers.forEach((el) => {
    const sim = new TourbillonSimulator({
      container: el,
    });
    instances.push(sim);
  });

  return () => {
    instances.forEach((inst) => inst.destroy());
  };
}
