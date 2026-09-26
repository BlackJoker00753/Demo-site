// Интерактивный акустический симулятор соборного минутного репетира.

import { html, qs, qsa } from "../core/dom.js";
import { minuteRepeaterPlayer } from "./audio-engine.js";

export function renderRepeaterSimulator() {
  const defaultHours = 10;
  const defaultMinutes = 14;
  const breakdown = minuteRepeaterPlayer.constructor.getChimeBreakdown(defaultHours, defaultMinutes);

  return html`<div class="repeater-sim" id="repeater-sim">
    <div class="repeater-sim__header">
      <div class="repeater-sim__badge">
        <i class="ph-light ph-speaker-high" aria-hidden="true"></i>
        <span>Акустическая лаборатория Haute Horlogerie</span>
      </div>
      <h2 class="display display--s repeater-sim__title">Симулятор боя соборного минутного репетира</h2>
      <p class="repeater-sim__subtitle">
        Минутный репетир озвучивает точное время по запросу владельца с помощью двух молоточков и соборных гонгов из закаленной стали, огибающих калибр почти в два полных оборота. Задайте время и спустите заводной рычаг боя.
      </p>
    </div>

    <div class="repeater-sim__body">
      <!-- Интерактивная консоль времени -->
      <div class="repeater-sim__console">
        <div class="repeater-sim__time-display">
          <div class="repeater-sim__digits" id="rep-digits">${breakdown.formattedTime}</div>
          <div class="repeater-sim__time-label">Выбранное время боя</div>
        </div>

        <div class="repeater-sim__presets">
          <span class="repeater-sim__presets-label">Эталонные комбинации:</span>
          <div class="repeater-sim__preset-btns">
            <button class="chip chip--sm is-active" type="button" data-preset-h="10" data-preset-m="14">10:14 (Классика)</button>
            <button class="chip chip--sm" type="button" data-preset-h="12" data-preset-m="45">12:45 (3 четверти)</button>
            <button class="chip chip--sm" type="button" data-preset-h="12" data-preset-m="59">12:59 (Максимум: 32 удара)</button>
            <button class="chip chip--sm" type="button" data-preset-h="3" data-preset-m="0">03:00 (Точный час)</button>
            <button class="chip chip--sm" type="button" id="rep-btn-now">Текущее время</button>
          </div>
        </div>

        <div class="repeater-sim__sliders">
          <div class="repeater-sim__slider-row">
            <label for="rep-slider-h">Часы: <b id="rep-val-h">${defaultHours}</b></label>
            <input type="range" id="rep-slider-h" min="1" max="12" value="${defaultHours}" step="1">
          </div>
          <div class="repeater-sim__slider-row">
            <label for="rep-slider-m">Минуты: <b id="rep-val-m">${defaultMinutes}</b></label>
            <input type="range" id="rep-slider-m" min="0" max="59" value="${defaultMinutes}" step="1">
          </div>
        </div>
      </div>

      <!-- Визуализатор боя и гонгов -->
      <div class="repeater-sim__stage">
        <div class="repeater-sim__gongs">
          <div class="rep-gong rep-gong--low" id="rep-gong-low">
            <div class="rep-gong__ring"></div>
            <div class="rep-gong__hammer"></div>
            <div class="rep-gong__info">
              <span class="rep-gong__name">Басовый гонг</span>
              <span class="rep-gong__tone">Тон L (Ля 440 Гц)</span>
              <span class="rep-gong__role">Отбивает часы</span>
            </div>
          </div>
          <div class="rep-gong rep-gong--high" id="rep-gong-high">
            <div class="rep-gong__ring"></div>
            <div class="rep-gong__hammer"></div>
            <div class="rep-gong__info">
              <span class="rep-gong__name">Высокий гонг</span>
              <span class="rep-gong__tone">Тон H (Ми 660 Гц)</span>
              <span class="rep-gong__role">Отбивает минуты</span>
            </div>
          </div>
        </div>

        <div class="repeater-sim__status-box">
          <div class="repeater-sim__status-pulse" id="rep-pulse"></div>
          <div class="repeater-sim__status-text" id="rep-status">Готов к взводу механизма</div>
        </div>

        <!-- Партитура боя -->
        <div class="repeater-sim__score" id="rep-score">
          <div class="rep-score-item" id="score-hours">
            <span class="rep-score-item__val">${breakdown.hours}</span>
            <span class="rep-score-item__label">Часы (L)</span>
          </div>
          <div class="rep-score-item" id="score-quarters">
            <span class="rep-score-item__val">${breakdown.quarters}</span>
            <span class="rep-score-item__label">Четверти (H-L)</span>
          </div>
          <div class="rep-score-item" id="score-minutes">
            <span class="rep-score-item__val">${breakdown.minutes}</span>
            <span class="rep-score-item__label">Минуты (H)</span>
          </div>
          <div class="rep-score-item rep-score-item--total">
            <span class="rep-score-item__val" id="score-total">${breakdown.totalStrikes}</span>
            <span class="rep-score-item__label">Всего ударов</span>
          </div>
        </div>

        <div class="repeater-sim__controls">
          <button class="btn btn--lume repeater-sim__play-btn" type="button" id="rep-play-btn">
            <i class="ph-light ph-play" aria-hidden="true"></i>
            <span>Спустить рычаг боя</span>
          </button>
          <button class="btn btn--ghost repeater-sim__stop-btn" type="button" id="rep-stop-btn" style="display:none;">
            <i class="ph-light ph-stop" aria-hidden="true"></i>
            <span>Остановить бой</span>
          </button>
        </div>
      </div>
    </div>

    <div class="repeater-sim__foot">
      <div class="repeater-sim__note">
        <i class="ph-light ph-info" aria-hidden="true"></i>
        <span>
          Механическая кинематика: перемещение бокового ползунка взводит отдельную заводную пружину боя. Три гребенки с щупами считывают положение часовой, четвертной и минутной улиток, а центробежный фрикционный регулятор (гувернер) вращается со скоростью 2000 об/мин, удерживая размеренный темп ударов молоточков.
        </span>
      </div>
    </div>
  </div>`;
}

export function mountRepeaterSimulator(root) {
  const sim = qs("#repeater-sim", root);
  if (!sim) return;

  const sliderH = qs("#rep-slider-h", sim);
  const sliderM = qs("#rep-slider-m", sim);
  const valH = qs("#rep-val-h", sim);
  const valM = qs("#rep-val-m", sim);
  const digits = qs("#rep-digits", sim);
  const scoreH = qs("#score-hours .rep-score-item__val", sim);
  const scoreQ = qs("#score-quarters .rep-score-item__val", sim);
  const scoreM = qs("#score-minutes .rep-score-item__val", sim);
  const scoreTotal = qs("#score-total", sim);
  const statusEl = qs("#rep-status", sim);
  const pulseEl = qs("#rep-pulse", sim);
  const gongLow = qs("#rep-gong-low", sim);
  const gongHigh = qs("#rep-gong-high", sim);
  const playBtn = qs("#rep-play-btn", sim);
  const stopBtn = qs("#rep-stop-btn", sim);
  const presetBtns = qsa("[data-preset-h]", sim);
  const btnNow = qs("#rep-btn-now", sim);

  let currentHours = parseInt(sliderH?.value || "10", 10);
  let currentMinutes = parseInt(sliderM?.value || "14", 10);

  function updateDisplay() {
    const breakdown = minuteRepeaterPlayer.constructor.getChimeBreakdown(currentHours, currentMinutes);
    if (valH) valH.textContent = currentHours;
    if (valM) valM.textContent = currentMinutes;
    if (digits) digits.textContent = breakdown.formattedTime;
    if (scoreH) scoreH.textContent = breakdown.hours;
    if (scoreQ) scoreQ.textContent = breakdown.quarters;
    if (scoreM) scoreM.textContent = breakdown.minutes;
    if (scoreTotal) scoreTotal.textContent = breakdown.totalStrikes;
  }

  function setTime(h, m) {
    currentHours = Math.max(1, Math.min(12, h));
    currentMinutes = Math.max(0, Math.min(59, m));
    if (sliderH) sliderH.value = currentHours;
    if (sliderM) sliderM.value = currentMinutes;
    updateDisplay();
  }

  sliderH?.addEventListener("input", (e) => {
    currentHours = parseInt(e.target.value, 10);
    presetBtns.forEach((b) => b.classList.remove("is-active"));
    updateDisplay();
  });

  sliderM?.addEventListener("input", (e) => {
    currentMinutes = parseInt(e.target.value, 10);
    presetBtns.forEach((b) => b.classList.remove("is-active"));
    updateDisplay();
  });

  presetBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      presetBtns.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const h = parseInt(btn.dataset.presetH, 10);
      const m = parseInt(btn.dataset.presetM, 10);
      setTime(h, m);
    });
  });

  btnNow?.addEventListener("click", () => {
    presetBtns.forEach((b) => b.classList.remove("is-active"));
    btnNow.classList.add("is-active");
    const now = new Date();
    let h = now.getHours() % 12;
    if (h === 0) h = 12;
    setTime(h, now.getMinutes());
  });

  function flashGong(gongEl) {
    if (!gongEl) return;
    gongEl.classList.remove("is-striking");
    void gongEl.offsetWidth; // trigger reflow
    gongEl.classList.add("is-striking");
    setTimeout(() => gongEl.classList.remove("is-striking"), 400);
  }

  function setPlayingState(isPlaying) {
    if (playBtn) playBtn.style.display = isPlaying ? "none" : "inline-flex";
    if (stopBtn) stopBtn.style.display = isPlaying ? "inline-flex" : "none";
    if (pulseEl) pulseEl.classList.toggle("is-active", isPlaying);
  }

  playBtn?.addEventListener("click", () => {
    minuteRepeaterPlayer.play({
      hours: currentHours,
      minutes: currentMinutes,
      onStateChange: (active) => {
        setPlayingState(active);
        if (!active && statusEl) {
          statusEl.textContent = "Бой завершен. Механизм в исходном положении.";
        }
      },
      onStrike: (strike) => {
        if (statusEl) statusEl.textContent = strike.label;

        if (strike.phase === "hours") {
          flashGong(gongLow);
        } else if (strike.phase === "quarters") {
          if (strike.strikePart === 1) flashGong(gongHigh);
          else flashGong(gongLow);
        } else if (strike.phase === "minutes") {
          flashGong(gongHigh);
        }
      },
    });
  });

  stopBtn?.addEventListener("click", () => {
    minuteRepeaterPlayer.stop();
    setPlayingState(false);
    if (statusEl) statusEl.textContent = "Бой остановлен вручную.";
  });

  // Очистка при размонтировании
  return () => {
    minuteRepeaterPlayer.stop();
  };
}
