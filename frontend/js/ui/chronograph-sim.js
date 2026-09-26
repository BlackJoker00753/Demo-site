// Интерактивный симулятор механического хронографа со сплит-секундой и шкалами измерений (Тахиметр, Телеметр, Пульсометр).

import { html, qs, qsa } from "../core/dom.js";
import { playPusherClick } from "./audio-engine.js";

export function renderChronographSimulator(complicationSlug = "chronograph") {
  const isSplit = complicationSlug === "split-seconds";
  const isFlyback = complicationSlug === "flyback-chronograph";

  return html`<div class="chrono-sim" id="chrono-sim" data-complication="${complicationSlug}">
    <div class="chrono-sim__header">
      <div class="chrono-sim__badge">
        <i class="ph-light ph-timer" aria-hidden="true"></i>
        <span>Инженерная лаборатория хронометрии</span>
      </div>
      <h2 class="display display--s chrono-sim__title">
        ${isSplit
          ? "Интерактивный сплит-хронограф (Rattrapante)"
          : isFlyback
          ? "Интерактивный флайбэк-хронограф (Flyback)"
          : "Интерактивный механический хронограф"}
      </h2>
      <p class="chrono-sim__subtitle">
        ${isSplit
          ? "Оснащен двумя наложенными секундными стрелками: нажатие кнопки сплит-секунды останавливает первую стрелку для фиксации промежуточного времени круга, пока вторая стрелка продолжает непрерывный замер."
          : isFlyback
          ? "Функция мгновенного обнуления и перезапуска: в отличие от стандартного хронографа, требующего трёх нажатий (Стоп - Сброс - Старт), флайбэк сбрасывает и мгновенно перезапускает стрелку одним нажатием нижней кнопки на ходу."
          : "Прецизионный прибор для измерения отрезков времени с колонным колесом и вертикальной муфтой. Переключайте специализированные шкалы (тахиметр, телеметр, пульсометр) для профессиональных измерений."}
      </p>
    </div>

    <!-- Переключатель измерительных шкал -->
    <div class="chrono-sim__scales-bar">
      <span class="chrono-sim__scales-label">Шкала ранта и циферблата:</span>
      <div class="chrono-sim__scale-buttons" id="chrono-scale-btns">
        <button type="button" class="chip is-active" data-scale="tachymeter">
          <i class="ph-light ph-gauge" aria-hidden="true"></i>Тахиметр (Скорость км/ч)
        </button>
        <button type="button" class="chip" data-scale="telemeter">
          <i class="ph-light ph-cloud-lightning" aria-hidden="true"></i>Телеметр (Дистанция км)
        </button>
        <button type="button" class="chip" data-scale="pulsometer">
          <i class="ph-light ph-heartbeat" aria-hidden="true"></i>Пульсометр (30 ударов)
        </button>
      </div>
    </div>

    <div class="chrono-sim__body">
      <!-- Циферблат хронографа -->
      <div class="chrono-sim__dial-wrap">
        <div class="chrono-dial" id="chrono-dial">
          <!-- Внешняя измерительная шкала -->
          <div class="chrono-dial__scale-ring" id="chrono-scale-ring">
            <!-- Насечки и числа шкалы генерируются динамически -->
          </div>

          <!-- Основные часовые метки циферблата -->
          <div class="chrono-dial__indices">
            <span style="--deg: 0deg">12</span>
            <span style="--deg: 30deg">1</span>
            <span style="--deg: 60deg">2</span>
            <span style="--deg: 90deg">3</span>
            <span style="--deg: 120deg">4</span>
            <span style="--deg: 150deg">5</span>
            <span style="--deg: 180deg">6</span>
            <span style="--deg: 210deg">7</span>
            <span style="--deg: 240deg">8</span>
            <span style="--deg: 270deg">9</span>
            <span style="--deg: 300deg">10</span>
            <span style="--deg: 330deg">11</span>
          </div>

          <!-- Накопитель: 30 минут (справа, 3 часа) -->
          <div class="chrono-subdial chrono-subdial--min">
            <div class="chrono-subdial__ticks"></div>
            <div class="chrono-subdial__hand" id="chrono-hand-min"></div>
            <span class="chrono-subdial__label">30 MIN</span>
          </div>

          <!-- Малая постоянная секунда (слева, 9 часов) -->
          <div class="chrono-subdial chrono-subdial--sec">
            <div class="chrono-subdial__ticks"></div>
            <div class="chrono-subdial__hand" id="chrono-hand-sm-sec"></div>
            <span class="chrono-subdial__label">SEC</span>
          </div>

          <!-- Накопитель: 12 часов (снизу, 6 часов) -->
          <div class="chrono-subdial chrono-subdial--hour">
            <div class="chrono-subdial__ticks"></div>
            <div class="chrono-subdial__hand" id="chrono-hand-hour"></div>
            <span class="chrono-subdial__label">12 HOUR</span>
          </div>

          <!-- Сплит-секундная стрелка (синяя/золотая, накладывается под основную) -->
          ${isSplit ? html`<div class="chrono-hand chrono-hand--split" id="chrono-hand-split"></div>` : ""}

          <!-- Центральная секундная стрелка хронографа (красная/люм) -->
          <div class="chrono-hand chrono-hand--main" id="chrono-hand-main"></div>

          <!-- Центральная ось и мост калибра -->
          <div class="chrono-dial__center-cap"></div>
        </div>
      </div>

      <!-- Консоль управления и показаний -->
      <div class="chrono-sim__console">
        <!-- Цифровое табло точного времени -->
        <div class="chrono-display">
          <div class="chrono-display__time" id="chrono-digital">00:00.00</div>
          <div class="chrono-display__sub" id="chrono-split-display">
            ${isSplit ? "Сплит: готов к замеру круга" : "Механический отсчет: 8 шагов/сек"}
          </div>
        </div>

        <!-- Кнопки управления хронографом (пушеры) -->
        <div class="chrono-pushers">
          <button class="btn btn--lume chrono-pusher" type="button" id="chrono-btn-start">
            <i class="ph-light ph-play" id="chrono-icon-start" aria-hidden="true"></i>
            <span id="chrono-label-start">Старт (Кнопка 2ч)</span>
          </button>

          <button class="btn btn--ghost chrono-pusher" type="button" id="chrono-btn-reset">
            <i class="ph-light ph-arrow-counter-clockwise" aria-hidden="true"></i>
            <span>${isFlyback ? "Флайбэк / Сброс (4ч)" : "Сброс (Кнопка 4ч)"}</span>
          </button>

          ${isSplit
            ? html`<button class="btn btn--ghost chrono-pusher chrono-pusher--split" type="button" id="chrono-btn-split">
                <i class="ph-light ph-git-fork" aria-hidden="true"></i>
                <span id="chrono-label-split">Сплит (Кнопка 10ч)</span>
              </button>`
            : ""}
        </div>

        <!-- Аналитический блок активной шкалы -->
        <div class="chrono-telemetry" id="chrono-telemetry">
          <div class="chrono-telemetry__head">
            <span class="chrono-telemetry__tag" id="chrono-tel-tag">Тахиметрический замер</span>
            <span class="chrono-telemetry__rate" id="chrono-tel-live">Ожидание замера</span>
          </div>
          <p class="chrono-telemetry__info" id="chrono-tel-info">
            Тахиметр вычисляет скорость движения объекта в км/ч на мерном отрезке 1 км. Запустите хронограф на старте километра и остановите на финише.
          </p>
        </div>

        <!-- Быстрые сценарии для проверки -->
        <div class="chrono-scenarios">
          <span class="chrono-scenarios__label">Демонстрационные сценарии:</span>
          <div class="chrono-scenarios__btns">
            <button class="chip chip--sm" type="button" data-scenario="speed-120">Скорость 120 км/ч (30 сек)</button>
            <button class="chip chip--sm" type="button" data-scenario="storm-3km">Гроза 3.4 км (10 сек)</button>
            <button class="chip chip--sm" type="button" data-scenario="pulse-72">Пульс 72 уд/мин (25 сек)</button>
            ${isSplit ? html`<button class="chip chip--sm" type="button" data-scenario="lap-split">Сплит двух кругов</button>` : ""}
          </div>
        </div>
      </div>
    </div>

    <!-- Инженерная сноска -->
    <div class="chrono-sim__foot">
      <div class="chrono-sim__note">
        <i class="ph-light ph-gear-six" aria-hidden="true"></i>
        <span>
          Механическая кинематика: нажатие пуска поворачивает колонное колесо на один зуб. Рычаг муфты входит во впадину между колоннами, прижимая вращающееся колесо к центральной секундной трибке без проскальзывания стрелки. Сброс мгновенно бьет рычагом молоточка по кулачкам в форме сердца (сердечникам), возвращая стрелки точно на 12 часов.
        </span>
      </div>
    </div>
  </div>`;
}

export function mountChronographSimulator(root) {
  const sim = qs("#chrono-sim", root);
  if (!sim) return;

  const complicationSlug = sim.dataset.complication || "chronograph";
  const isSplit = complicationSlug === "split-seconds";
  const isFlyback = complicationSlug === "flyback-chronograph";

  const btnStart = qs("#chrono-btn-start", sim);
  const btnReset = qs("#chrono-btn-reset", sim);
  const btnSplit = qs("#chrono-btn-split", sim);
  const iconStart = qs("#chrono-icon-start", sim);
  const labelStart = qs("#chrono-label-start", sim);
  const labelSplit = qs("#chrono-label-split", sim);
  const digitalEl = qs("#chrono-digital", sim);
  const splitDisplayEl = qs("#chrono-split-display", sim);
  const handMain = qs("#chrono-hand-main", sim);
  const handSplit = qs("#chrono-hand-split", sim);
  const handMin = qs("#chrono-hand-min", sim);
  const handHour = qs("#chrono-hand-hour", sim);
  const handSmSec = qs("#chrono-hand-sm-sec", sim);
  const telTag = qs("#chrono-tel-tag", sim);
  const telLive = qs("#chrono-tel-live", sim);
  const telInfo = qs("#chrono-tel-info", sim);
  const scaleBtns = qsa("#chrono-scale-btns button", sim);
  const scaleRing = qs("#chrono-scale-ring", sim);
  const scenarioBtns = qsa("[data-scenario]", sim);

  let activeScale = "tachymeter"; // "tachymeter" | "telemeter" | "pulsometer"
  let running = false;
  let startTime = 0;
  let elapsedMs = 0;
  let splitMs = 0;
  let splitActive = false;
  let animId = null;
  let smallSecAngle = 0;
  let smallSecInterval = null;

  // Анимация непрерывной малой секундной стрелки (текущее время калибра)
  smallSecInterval = setInterval(() => {
    smallSecAngle = (smallSecAngle + 6) % 360;
    if (handSmSec) handSmSec.style.transform = `rotate(${smallSecAngle}deg)`;
  }, 1000);

  // Отрисовка разметки внешней измерительной шкалы
  function renderScaleRing(scale) {
    if (!scaleRing) return;
    scaleRing.innerHTML = "";

    if (scale === "tachymeter") {
      // Тахиметрическая шкала: от 500 до 60 км/ч
      const marks = [
        { v: 500, sec: 7.2 },
        { v: 400, sec: 9 },
        { v: 300, sec: 12 },
        { v: 240, sec: 15 },
        { v: 200, sec: 18 },
        { v: 160, sec: 22.5 },
        { v: 140, sec: 25.7 },
        { v: 120, sec: 30 },
        { v: 100, sec: 36 },
        { v: 90, sec: 40 },
        { v: 80, sec: 45 },
        { v: 70, sec: 51.4 },
        { v: 60, sec: 60 },
      ];
      marks.forEach((m) => {
        const deg = (m.sec / 60) * 360;
        const el = document.createElement("div");
        el.className = "chrono-scale-mark";
        el.style.setProperty("--deg", `${deg}deg`);
        el.innerHTML = `<span>${m.v}</span>`;
        scaleRing.appendChild(el);
      });
    } else if (scale === "telemeter") {
      // Телеметрическая шкала: километры до звука (343 м/с * t)
      const marks = [
        { v: "1 km", sec: 2.91 },
        { v: "2 km", sec: 5.83 },
        { v: "3 km", sec: 8.74 },
        { v: "5 km", sec: 14.58 },
        { v: "8 km", sec: 23.32 },
        { v: "10 km", sec: 29.15 },
        { v: "15 km", sec: 43.73 },
        { v: "20 km", sec: 58.3 },
      ];
      marks.forEach((m) => {
        const deg = (m.sec / 60) * 360;
        const el = document.createElement("div");
        el.className = "chrono-scale-mark chrono-scale-mark--tel";
        el.style.setProperty("--deg", `${deg}deg`);
        el.innerHTML = `<span>${m.v}</span>`;
        scaleRing.appendChild(el);
      });
    } else if (scale === "pulsometer") {
      // Пульсометрическая шкала (30 пульсаций): пульс = 1800 / t
      const marks = [
        { v: "200", sec: 9 },
        { v: "160", sec: 11.25 },
        { v: "130", sec: 13.85 },
        { v: "100", sec: 18 },
        { v: "80", sec: 22.5 },
        { v: "70", sec: 25.7 },
        { v: "60", sec: 30 },
        { v: "50", sec: 36 },
        { v: "40", sec: 45 },
      ];
      marks.forEach((m) => {
        const deg = (m.sec / 60) * 360;
        const el = document.createElement("div");
        el.className = "chrono-scale-mark chrono-scale-mark--pulse";
        el.style.setProperty("--deg", `${deg}deg`);
        el.innerHTML = `<span>${m.v}</span>`;
        scaleRing.appendChild(el);
      });
    }
  }

  renderScaleRing(activeScale);

  // Форматирование цифрового табло
  function formatDigital(ms) {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const cs = Math.floor((ms % 1000) / 10);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
  }

  // Расчет показаний активной шкалы по текущему времени
  function updateTelemetry(ms) {
    const sec = ms / 1000;
    if (sec < 0.2) {
      if (telLive) telLive.textContent = "Готов к замеру";
      return;
    }

    if (activeScale === "tachymeter") {
      if (telTag) telTag.textContent = "Тахиметрический расчет";
      if (sec <= 60) {
        const speed = (3600 / sec).toFixed(1);
        if (telLive) telLive.textContent = `${speed} км/ч`;
        if (telInfo) telInfo.textContent = `При прохождении 1 км за ${sec.toFixed(1)} сек расчетная скорость составляет ${speed} км/ч.`;
      } else {
        if (telLive) telLive.textContent = "< 60 км/ч";
        if (telInfo) telInfo.textContent = "Время заезда превысило 60 секунд (предел прямого считывания по тахиметру).";
      }
    } else if (activeScale === "telemeter") {
      if (telTag) telTag.textContent = "Телеметрический замер расстояния";
      const distKm = (sec * 0.343).toFixed(2);
      if (telLive) telLive.textContent = `${distKm} км`;
      if (telInfo) telInfo.textContent = `Задержка между световой вспышкой и звуком составила ${sec.toFixed(1)} сек. Источник звука на удалении ${distKm} км.`;
    } else if (activeScale === "pulsometer") {
      if (telTag) telTag.textContent = "Медицинский пульсометр (30 ударов)";
      if (sec >= 5 && sec <= 55) {
        const bpm = Math.round(1800 / sec);
        if (telLive) telLive.textContent = `${bpm} уд/мин`;
        if (telInfo) telInfo.textContent = `Отсчет 30 ударов пульса за ${sec.toFixed(1)} сек соответствует частоте сердечных сокращений ${bpm} уд/мин.`;
      } else if (sec < 5) {
        if (telLive) telLive.textContent = "Счет пульса...";
      } else {
        if (telLive) telLive.textContent = "< 35 уд/мин (брадикардия)";
      }
    }
  }

  // Обновление положения стрелок
  function updateHands(ms, splitMsVal = null) {
    const sec = ms / 1000;
    // Центральная секундная стрелка: 360 градусов за 60 секунд
    const secDeg = (sec % 60) * 6;
    if (handMain) handMain.style.transform = `rotate(${secDeg}deg)`;

    // Сплит-стрелка
    if (handSplit) {
      const splitTimeSec = splitActive && splitMsVal !== null ? splitMsVal / 1000 : sec;
      const splitDeg = (splitTimeSec % 60) * 6;
      handSplit.style.transform = `rotate(${splitDeg}deg)`;
    }

    // Минутный накопитель: 30 минут за 360 градусов (12 град/мин)
    const minVal = (ms / 1000 / 60) % 30;
    const minDeg = minVal * 12;
    if (handMin) handMin.style.transform = `rotate(${minDeg}deg)`;

    // Часовой накопитель: 12 часов за 360 градусов (30 град/час)
    const hourVal = (ms / 1000 / 3600) % 12;
    const hourDeg = hourVal * 30;
    if (handHour) handHour.style.transform = `rotate(${hourDeg}deg)`;
  }

  function loop() {
    if (!running) return;
    const now = performance.now();
    const currentMs = elapsedMs + (now - startTime);

    if (digitalEl) digitalEl.textContent = formatDigital(currentMs);
    updateHands(currentMs, splitMs);
    updateTelemetry(currentMs);

    animId = requestAnimationFrame(loop);
  }

  function start() {
    playPusherClick(true);
    running = true;
    startTime = performance.now();
    if (btnStart) btnStart.classList.add("is-active");
    if (labelStart) labelStart.textContent = "Стоп (Кнопка 2ч)";
    if (iconStart) {
      iconStart.classList.remove("ph-play");
      iconStart.classList.add("ph-pause");
    }
    animId = requestAnimationFrame(loop);
  }

  function stop() {
    playPusherClick(false);
    running = false;
    if (animId) cancelAnimationFrame(animId);
    elapsedMs += performance.now() - startTime;
    if (btnStart) btnStart.classList.remove("is-active");
    if (labelStart) labelStart.textContent = "Продолжить (2ч)";
    if (iconStart) {
      iconStart.classList.remove("ph-pause");
      iconStart.classList.add("ph-play");
    }
    updateTelemetry(elapsedMs);
  }

  function reset() {
    playPusherClick(true);
    running = false;
    if (animId) cancelAnimationFrame(animId);
    elapsedMs = 0;
    splitMs = 0;
    splitActive = false;

    if (digitalEl) digitalEl.textContent = "00:00.00";
    if (splitDisplayEl) {
      splitDisplayEl.textContent = isSplit ? "Сплит: готов к замеру круга" : "Механический отсчет: 8 шагов/сек";
    }
    if (btnStart) btnStart.classList.remove("is-active");
    if (labelStart) labelStart.textContent = "Старт (Кнопка 2ч)";
    if (iconStart) {
      iconStart.classList.remove("ph-pause");
      iconStart.classList.add("ph-play");
    }
    if (btnSplit) btnSplit.classList.remove("is-active");
    if (labelSplit) labelSplit.textContent = "Сплит (Кнопка 10ч)";

    updateHands(0, 0);
    updateTelemetry(0);
  }

  function flyback() {
    playPusherClick(true);
    // Мгновенный сброс и перезапуск без остановки
    elapsedMs = 0;
    splitMs = 0;
    splitActive = false;
    startTime = performance.now();
    if (!running) {
      start();
    } else {
      updateHands(0, 0);
    }
  }

  function toggleSplit() {
    if (!isSplit || !running) return;
    playPusherClick(false);

    if (!splitActive) {
      // Фиксация сплит-стрелки
      splitActive = true;
      const currentMs = elapsedMs + (performance.now() - startTime);
      splitMs = currentMs;
      if (btnSplit) btnSplit.classList.add("is-active");
      if (labelSplit) labelSplit.textContent = "Догон (Catch-Up)";
      if (splitDisplayEl) {
        splitDisplayEl.textContent = `Круг 1 (Сплит): ${formatDigital(splitMs)}`;
      }
    } else {
      // Догон основной секундной стрелки
      splitActive = false;
      if (btnSplit) btnSplit.classList.remove("is-active");
      if (labelSplit) labelSplit.textContent = "Сплит (Кнопка 10ч)";
      if (splitDisplayEl) {
        splitDisplayEl.textContent = "Стрелки совмещены";
      }
    }
  }

  btnStart?.addEventListener("click", () => {
    if (running) stop();
    else start();
  });

  btnReset?.addEventListener("click", () => {
    if (isFlyback && running) {
      flyback();
    } else {
      reset();
    }
  });

  btnSplit?.addEventListener("click", toggleSplit);

  // Переключение измерительных шкал
  scaleBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      scaleBtns.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      activeScale = btn.dataset.scale;
      renderScaleRing(activeScale);
      const current = running ? elapsedMs + (performance.now() - startTime) : elapsedMs;
      updateTelemetry(current);
    });
  });

  // Быстрые сценарии
  scenarioBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      reset();
      const sc = btn.dataset.scenario;
      if (sc === "speed-120") {
        // Установка на 30.00 секунд (120 км/ч)
        scaleBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.scale === "tachymeter"));
        activeScale = "tachymeter";
        renderScaleRing("tachymeter");
        elapsedMs = 30000;
        if (digitalEl) digitalEl.textContent = formatDigital(30000);
        updateHands(30000);
        updateTelemetry(30000);
      } else if (sc === "storm-3km") {
        // Установка на 10.00 секунд (~3.43 км)
        scaleBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.scale === "telemeter"));
        activeScale = "telemeter";
        renderScaleRing("telemeter");
        elapsedMs = 10000;
        if (digitalEl) digitalEl.textContent = formatDigital(10000);
        updateHands(10000);
        updateTelemetry(10000);
      } else if (sc === "pulse-72") {
        // Установка на 25.00 секунд (72 уд/мин)
        scaleBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.scale === "pulsometer"));
        activeScale = "pulsometer";
        renderScaleRing("pulsometer");
        elapsedMs = 25000;
        if (digitalEl) digitalEl.textContent = formatDigital(25000);
        updateHands(25000);
        updateTelemetry(25000);
      } else if (sc === "lap-split" && isSplit) {
        // Имитация сплита: круг 1 на 14.20 сек, основная на 28.50 сек
        elapsedMs = 28500;
        splitMs = 14200;
        splitActive = true;
        if (digitalEl) digitalEl.textContent = formatDigital(28500);
        if (splitDisplayEl) splitDisplayEl.textContent = `Круг 1 (Сплит): ${formatDigital(14200)}`;
        if (btnSplit) btnSplit.classList.add("is-active");
        if (labelSplit) labelSplit.textContent = "Догон (Catch-Up)";
        updateHands(28500, 14200);
        updateTelemetry(28500);
      }
    });
  });

  return () => {
    running = false;
    if (animId) cancelAnimationFrame(animId);
    if (smallSecInterval) clearInterval(smallSecInterval);
  };
}
