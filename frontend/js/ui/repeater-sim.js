// Интерактивный симулятор минутного репетира и боя Grande Sonnerie (Acoustic Chime & Chiming Mechanics Lab)
// Физическая модель акустики соборных гонгов и кинематика механизма боя: улитки, гребенки, молоточки и центробежный регулятор.

import { html, qs, qsa } from "../core/dom.js";

// Звуковые профили соборных гонгов
export const GONG_SOUND_PROFILES = {
  cathedral: {
    id: "cathedral",
    name: "Кафедральные гонги Patek Philippe (Розовое золото)",
    desc: "Удлиненные гонги огибают калибр почти на два полных оборота. Глубокий, бархатистый тон с богатыми обертонами и долгим затуханием.",
    lowFreq: 432, // Ля 1-й октавы (вердиевский строй)
    highFreq: 648, // Чистая квинта Ми 2-й октавы
    decaySec: 1.8,
    reverbGain: 0.28,
  },
  titanium: {
    id: "titanium",
    name: "Акустический титан (Bvlgari Octo Finissimo)",
    desc: "Сверхлегкий титановый корпус выступает акустическим резонатором: яркий, звонкий, кристально чистый звук высокой громкости.",
    lowFreq: 520,
    highFreq: 780,
    decaySec: 1.4,
    reverbGain: 0.18,
  },
  vintage: {
    id: "vintage",
    name: "Винтажный карманный репетир Breguet (1810)",
    desc: "Классический исторический строй карманных часов эпохи Абрахама-Луи Бреге. Теплый камертонный тембр.",
    lowFreq: 380,
    highFreq: 570,
    decaySec: 2.2,
    reverbGain: 0.35,
  },
};

// Режимы боя
export const REPEATER_MODES = {
  classic: {
    id: "classic",
    name: "Классический минутный репетир",
    desc: "Часы (низкий тон L) + Четверти (двойной удар H-L) + Минуты (высокий тон H).",
  },
  decimal: {
    id: "decimal",
    name: "Десятичный репетир (Decimal)",
    desc: "Часы (L) + Десятиминутные интервалы (двойной H-L) + Единичные минуты (H).",
  },
  grande: {
    id: "grande",
    name: "Grande Sonnerie (Большой бой)",
    desc: "Автоматический бой полных часов и четвертей при каждом переходе стрелок.",
  },
};

class RepeaterAudioSynthesizer {
  constructor() {
    this.ctx = null;
  }

  getContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Синтез удара соборного гонга из закаленной углеродистой стали
  playGong({ pitch = "low", profile = GONG_SOUND_PROFILES.cathedral, volume = 0.8 } = {}) {
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const baseFreq = pitch === "low" ? profile.lowFreq : profile.highFreq;
    const duration = profile.decaySec;

    // Негармонический спектр круглой проволоки свободного кручения:
    // f, 2.76f, 5.40f, 8.9f с собственными коэффициентами затухания
    const partials = [
      { ratio: 1.0, gain: 0.75, decayRatio: 1.0 },
      { ratio: 1.414, gain: 0.35, decayRatio: 0.75 },
      { ratio: 2.76, gain: 0.24, decayRatio: 0.5 },
      { ratio: 5.4, gain: 0.12, decayRatio: 0.32 },
      { ratio: 8.9, gain: 0.05, decayRatio: 0.18 },
    ];

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume * 0.7, t);
    masterGain.connect(ctx.destination);

    partials.forEach(({ ratio, gain: partGain, decayRatio }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(baseFreq * ratio, t);

      // Микро-девиация частоты для естественного металлического биения
      osc.frequency.linearRampToValueAtTime(baseFreq * ratio * 0.9995, t + duration);

      // Атака удара и экспоненциальный спад
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(partGain, t + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration * decayRatio);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(t);
      osc.stop(t + duration * decayRatio + 0.05);
    });

    // Металлический транзиент удара стального молоточка
    const strikeOsc = ctx.createOscillator();
    const strikeGain = ctx.createGain();
    strikeOsc.type = "triangle";
    strikeOsc.frequency.setValueAtTime(pitch === "low" ? 2200 : 3400, t);
    strikeGain.gain.setValueAtTime(0.25 * volume, t);
    strikeGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.015);

    strikeOsc.connect(strikeGain);
    strikeGain.connect(masterGain);
    strikeOsc.start(t);
    strikeOsc.stop(t + 0.02);
  }
}

export const repeaterAudio = new RepeaterAudioSynthesizer();

export class MinuteRepeaterSimulator {
  constructor({ container }) {
    this.container = container;
    this.hours = 10;
    this.minutes = 14;
    this.mode = "classic";
    this.soundProfile = GONG_SOUND_PROFILES.cathedral;
    this.volume = 0.85;

    this.isPlaying = false;
    this.isCocking = false;
    this.slideProgress = 0; // 0..1 (взвод слайдера)
    this.governorAngle = 0; // угол вращения центробежного регулятора
    this.leftHammerAngle = 0; // молоточек баса
    this.rightHammerAngle = 0; // молоточек сопрано
    this.shockwaves = []; // расходящиеся волны звука на гонгах

    this.strikeQueue = [];
    this.activeTimer = null;
    this.animId = null;

    this.render();
    this.initCanvas();
    this.bind();
  }

  destroy() {
    this.stopChime();
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.container) {
      this.container.innerHTML = "";
    }
  }

  // Расчет схемы ударов
  getChimeBreakdown() {
    const h12 = this.hours % 12 === 0 ? 12 : this.hours % 12;

    if (this.mode === "decimal") {
      const tens = Math.floor(this.minutes / 10);
      const units = this.minutes % 10;
      const totalStrikes = h12 + tens * 2 + units;
      return {
        hours: h12,
        quarters: tens,
        minutes: units,
        totalStrikes,
        formattedTime: `${String(this.hours).padStart(2, "0")}:${String(this.minutes).padStart(2, "0")}`,
        modeLabel: "Десятичный (часы, 10-мин, минуты)",
      };
    }

    // Классический режим
    const quarters = Math.floor(this.minutes / 15);
    const remainingMinutes = this.minutes % 15;
    const totalStrikes = h12 + quarters * 2 + remainingMinutes;

    return {
      hours: h12,
      quarters,
      minutes: remainingMinutes,
      totalStrikes,
      formattedTime: `${String(this.hours).padStart(2, "0")}:${String(this.minutes).padStart(2, "0")}`,
      modeLabel: "Классический (часы, четверти, минуты)",
    };
  }

  render() {
    const b = this.getChimeBreakdown();

    this.container.innerHTML = `
      <div class="rep-sim-box">
        <header class="rep-sim-head">
          <div class="rep-sim-badge">
            <i class="ph-light ph-speaker-high" aria-hidden="true"></i>
            <span>Акустическая лаборатория Haute Horlogerie</span>
          </div>
          <h2 class="display display--s rep-sim-title">Интерактивный симулятор соборного минутного репетира</h2>
          <p class="rep-sim-desc">
            Минутный репетир переводит показания стрелок в чистейшую колокольную мелодию молоточков по спиральным гонгам. Взведите боковой слайдер или установите любое время, чтобы услышать перезвон часов, четвертей и минут.
          </p>
        </header>

        <!-- Основная панель симулятора -->
        <div class="rep-sim-layout">
          <!-- Левая колонка: 60 FPS холст кинематики калибра боя -->
          <div class="rep-stage-wrap">
            <div class="rep-stage-header">
              <span class="label"><i class="ph-light ph-gear-six" aria-hidden="true"></i> Кинематика механизма боя</span>
              <span class="rep-governor-badge" id="rep-gov-badge">Регулятор: <b>В покое</b></span>
            </div>
            <div class="rep-canvas-container">
              <canvas id="rep-canvas" width="600" height="480" aria-label="Схема механизма репетира"></canvas>
              <div class="rep-slide-control" id="rep-slide-zone" title="Потяните ползунок вниз для взвода пружины боя">
                <span class="rep-slide-label">Взвод слайдера</span>
                <div class="rep-slide-track">
                  <div class="rep-slide-thumb" id="rep-slide-thumb"></div>
                </div>
              </div>
            </div>
            <div class="rep-stage-foot">
              <div class="rep-legend-row">
                <span class="rep-legend-item"><i class="rep-dot rep-dot--low"></i> Басовый гонг (L - Часы)</span>
                <span class="rep-legend-item"><i class="rep-dot rep-dot--high"></i> Высокий гонг (H - Минуты)</span>
                <span class="rep-legend-item"><i class="rep-dot rep-dot--governor"></i> Ветрянка (Fly Governor)</span>
              </div>
            </div>
          </div>

          <!-- Правая колонка: Интерактивный пульт и партитура -->
          <div class="rep-console-wrap">
            <div class="rep-time-card">
              <div class="rep-time-display">
                <span class="rep-time-digits num" id="rep-digits">${b.formattedTime}</span>
                <span class="rep-time-hint">Установленное время боя</span>
              </div>
              <div class="rep-score-row" id="rep-score-row">
                <div class="rep-score-box">
                  <span class="rep-score-num" id="rep-score-h">${b.hours}</span>
                  <span class="rep-score-sub">Часы (L)</span>
                </div>
                <div class="rep-score-box">
                  <span class="rep-score-num" id="rep-score-q">${b.quarters}</span>
                  <span class="rep-score-sub">${this.mode === "decimal" ? "10-мин (H-L)" : "Четверти (H-L)"}</span>
                </div>
                <div class="rep-score-box">
                  <span class="rep-score-num" id="rep-score-m">${b.minutes}</span>
                  <span class="rep-score-sub">Минуты (H)</span>
                </div>
                <div class="rep-score-box rep-score-box--total">
                  <span class="rep-score-num" id="rep-score-total">${b.totalStrikes}</span>
                  <span class="rep-score-sub">Всего ударов</span>
                </div>
              </div>
            </div>

            <!-- Ползунки установки времени -->
            <div class="rep-controls-card">
              <div class="rep-slider-row">
                <label for="rep-in-hours">Час: <b class="num" id="rep-val-h">${this.hours}</b></label>
                <input type="range" id="rep-in-hours" min="1" max="12" step="1" value="${this.hours}">
              </div>
              <div class="rep-slider-row">
                <label for="rep-in-minutes">Минуты: <b class="num" id="rep-val-m">${this.minutes}</b></label>
                <input type="range" id="rep-in-minutes" min="0" max="59" step="1" value="${this.minutes}">
              </div>

              <!-- Быстрые эталонные пресеты -->
              <div class="rep-presets-wrap">
                <span class="rep-presets-label">Эталонные комбинации боя:</span>
                <div class="rep-presets-btns">
                  <button type="button" class="chip chip--sm is-active" data-rep-h="10" data-rep-m="14">10:14 (Классика)</button>
                  <button type="button" class="chip chip--sm" data-rep-h="12" data-rep-m="45">12:45 (3 четверти)</button>
                  <button type="button" class="chip chip--sm" data-rep-h="12" data-rep-m="59">12:59 (Максимум: 32 удара)</button>
                  <button type="button" class="chip chip--sm" data-rep-h="3" data-rep-m="0">03:00 (Точный час)</button>
                  <button type="button" class="chip chip--sm" id="rep-btn-current">Текущее время</button>
                </div>
              </div>

              <!-- Настройки звукового профиля и режима -->
              <div class="rep-sound-row">
                <div class="rep-select-group">
                  <label for="rep-sound-profile">Акустический профиль гонгов:</label>
                  <select id="rep-sound-profile" class="rep-select">
                    ${Object.values(GONG_SOUND_PROFILES)
                      .map((p) => `<option value="${p.id}" ${p.id === this.soundProfile.id ? "selected" : ""}>${p.name}</option>`)
                      .join("")}
                  </select>
                </div>
                <div class="rep-select-group">
                  <label for="rep-mode-select">Тип боя:</label>
                  <select id="rep-mode-select" class="rep-select">
                    ${Object.values(REPEATER_MODES)
                      .map((m) => `<option value="${m.id}" ${m.id === this.mode ? "selected" : ""}>${m.name}</option>`)
                      .join("")}
                  </select>
                </div>
              </div>

              <!-- Кнопки запуска -->
              <div class="rep-actions">
                <button type="button" class="btn btn--lume rep-trigger-btn" id="rep-trigger-btn">
                  <i class="ph-light ph-play" aria-hidden="true"></i>
                  <span>Взвести и отбить время</span>
                </button>
                <button type="button" class="btn btn--ghost rep-stop-btn" id="rep-stop-btn" style="display:none;">
                  <i class="ph-light ph-stop" aria-hidden="true"></i>
                  <span>Остановить бой</span>
                </button>
              </div>

              <div class="rep-status-bar" id="rep-status-bar">
                <span class="rep-status-dot" id="rep-status-dot"></span>
                <span class="rep-status-text" id="rep-status-text">Механизм готов к взводу слайдера.</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Обучающий инженерный блок -->
        <div class="rep-info-grid">
          <div class="rep-info-card">
            <span class="rep-info-card__num">01</span>
            <h4>Предохранитель «Tout-ou-Rien» (Все или ничего)</h4>
            <p>
              Историческое изобретение Абрахама-Луи Бреге: репетир активируется только в том случае, если боковой слайдер на корпусе взведен до самого конца. Это исключает неполный ход гребенок и бой неверного времени при случайном легком касании.
            </p>
          </div>
          <div class="rep-info-card">
            <span class="rep-info-card__num">02</span>
            <h4>Бесшумный центробежный регулятор (Fly Governor)</h4>
            <p>
              В отличие от старинных спусков со стрекочущим анкером, современные минутные репетиры Haute Horlogerie используют аэродинамический регулятор. Золотые лопасти вращаются со скоростью свыше 1500 об/мин, создавая трение воздуха и удерживая идеальный темп ударов без постороннего шума.
            </p>
          </div>
          <div class="rep-info-card">
            <span class="rep-info-card__num">03</span>
            <h4>Соборные гонги (Cathedral Gongs)</h4>
            <p>
              Обычный гонг огибает калибр один раз. Соборный гонг длиннее почти в два раза (около 1.8 оборота), что увеличивает массу колеблющейся стальной проволоки, понижает основной тон на чистую квинту и дает богатый полифонический резонанс с затуханием до 2 секунд.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  initCanvas() {
    this.canvas = qs("#rep-canvas", this.container);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");

    const renderLoop = () => {
      this.drawMovement();
      this.animId = requestAnimationFrame(renderLoop);
    };
    renderLoop();
  }

  drawMovement() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2 + 10;
    const radius = 180;

    ctx.clearRect(0, 0, w, h);

    // 1. Платина калибра с зернением и женевскими волнами (Côtes de Genève)
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 20, 0, Math.PI * 2);
    ctx.fillStyle = "#12151c";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(212, 163, 89, 0.3)";
    ctx.stroke();

    // Женевские волны (вертикальные градиентные полосы)
    ctx.clip();
    for (let x = cx - radius - 20; x < cx + radius + 20; x += 18) {
      const stripeGrad = ctx.createLinearGradient(x, 0, x + 18, 0);
      stripeGrad.addColorStop(0, "rgba(255, 255, 255, 0.02)");
      stripeGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.05)");
      stripeGrad.addColorStop(1, "rgba(0, 0, 0, 0.04)");
      ctx.fillStyle = stripeGrad;
      ctx.fillRect(x, cy - radius - 20, 18, (radius + 20) * 2);
    }
    ctx.restore();

    // 2. Расходящиеся звуковые волны (Shockwaves) при ударах
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.r += 2.5;
      sw.alpha -= 0.025;

      if (sw.alpha <= 0) {
        this.shockwaves.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
      ctx.strokeStyle = sw.color === "high" ? `rgba(96, 165, 250, ${sw.alpha})` : `rgba(212, 163, 89, ${sw.alpha})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }

    // 3. Соборные стальные гонги (Cathedral Wire Gongs)
    // Внешний виток (басовый гонг L)
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 6, -Math.PI * 0.1, Math.PI * 1.85);
    ctx.strokeStyle = this.leftHammerAngle > 0.05 ? "#e5c07b" : "#4a5568";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.stroke();

    // Внутренний виток (высокий гонг H)
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 6, -Math.PI * 0.15, Math.PI * 1.8);
    ctx.strokeStyle = this.rightHammerAngle > 0.05 ? "#93c5fd" : "#3b4252";
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.stroke();

    // Колодка крепления гонгов (Gong Heel Block) в положении 10 часов
    const heelX = cx - radius * 0.72;
    const heelY = cy - radius * 0.72;
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(heelX - 10, heelY - 8, 22, 16);
    ctx.strokeStyle = "#475569";
    ctx.strokeRect(heelX - 10, heelY - 8, 22, 16);
    // Винты крепления колодки
    ctx.beginPath();
    ctx.arc(heelX - 4, heelY, 3, 0, Math.PI * 2);
    ctx.arc(heelX + 4, heelY, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#1e3a8a"; // вороненая сталь
    ctx.fill();
    ctx.restore();

    // 4. Улитки боя (Snails) в центре калибра
    ctx.save();
    ctx.translate(cx, cy);

    // Часовая улитка на 12 ступеней (Hour Snail)
    const hourStepAngle = (Math.PI * 2) / 12;
    const currentHStep = (this.hours % 12);
    ctx.beginPath();
    for (let s = 0; s < 12; s++) {
      const a = s * hourStepAngle;
      const stepR = 30 + s * 4.5;
      const x = Math.cos(a) * stepR;
      const y = Math.sin(a) * stepR;
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(212, 163, 89, 0.15)";
    ctx.strokeStyle = "#d4a359";
    ctx.lineWidth = 1.8;
    ctx.fill();
    ctx.stroke();

    // 4-лепестковая четвертная улитка и минутная звездочка
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fillStyle = "#2d3748";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.stroke();

    // Центральный рубиновый камень баланса
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#dc2626";
    ctx.fill();
    ctx.restore();

    // 5. Центробежный регулятор (Fly Governor) в положении 2 часа
    const govX = cx + radius * 0.62;
    const govY = cy - radius * 0.62;

    if (this.isPlaying) {
      this.governorAngle += 0.35; // быстрое бесшумное вращение
    }

    ctx.save();
    ctx.translate(govX, govY);
    ctx.rotate(this.governorAngle);

    // Золотые грузики-лопасти регулятора
    ctx.beginPath();
    ctx.rect(-16, -3, 32, 6);
    ctx.fillStyle = "#d4a359";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-16, 0, 5, 0, Math.PI * 2);
    ctx.arc(16, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#b45309";
    ctx.fill();

    // Центральная ось
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#94a3b8";
    ctx.fill();
    ctx.restore();

    // 6. Два стальных молоточка боя (Chiming Hammers) внизу слева и справа
    // Басовый молоточек (слева)
    const hamLeftPivotX = cx - 55;
    const hamLeftPivotY = cy + radius * 0.55;
    ctx.save();
    ctx.translate(hamLeftPivotX, hamLeftPivotY);
    ctx.rotate(-0.25 + this.leftHammerAngle);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-24, -36);
    ctx.lineTo(-44, -32);
    ctx.lineTo(-40, -18);
    ctx.lineTo(-14, 4);
    ctx.closePath();
    ctx.fillStyle = this.leftHammerAngle > 0.05 ? "#fef08a" : "#cbd5e1";
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    // Рубиновый камень в оси молоточка
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = "#dc2626";
    ctx.fill();
    ctx.restore();

    // Высокий молоточек (справа)
    const hamRightPivotX = cx + 55;
    const hamRightPivotY = cy + radius * 0.55;
    ctx.save();
    ctx.translate(hamRightPivotX, hamRightPivotY);
    ctx.rotate(0.25 - this.rightHammerAngle);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(24, -36);
    ctx.lineTo(44, -32);
    ctx.lineTo(40, -18);
    ctx.lineTo(14, 4);
    ctx.closePath();
    ctx.fillStyle = this.rightHammerAngle > 0.05 ? "#bfdbfe" : "#cbd5e1";
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    // Рубиновый камень в оси молоточка
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = "#dc2626";
    ctx.fill();
    ctx.restore();

    // 7. Слайдер взвода боя (слева на корпусе)
    const slideVisualY = cy - 40 + this.slideProgress * 80;
    const thumbEl = qs("#rep-slide-thumb", this.container);
    if (thumbEl) {
      thumbEl.style.transform = `translateY(${this.slideProgress * 70}px)`;
    }

    // Релаксация угла молоточков
    if (this.leftHammerAngle > 0) {
      this.leftHammerAngle = Math.max(0, this.leftHammerAngle - 0.08);
    }
    if (this.rightHammerAngle > 0) {
      this.rightHammerAngle = Math.max(0, this.rightHammerAngle - 0.08);
    }
  }

  triggerHammer(pitch) {
    if (pitch === "low") {
      this.leftHammerAngle = 0.35; // резкий удар по гонгу
      this.shockwaves.push({
        x: this.canvas.width / 2 - 100,
        y: this.canvas.height / 2 + 100,
        r: 6,
        alpha: 0.9,
        color: "low",
      });
    } else {
      this.rightHammerAngle = 0.35;
      this.shockwaves.push({
        x: this.canvas.width / 2 + 100,
        y: this.canvas.height / 2 + 100,
        r: 6,
        alpha: 0.9,
        color: "high",
      });
    }
  }

  bind() {
    const hoursIn = qs("#rep-in-hours", this.container);
    const minsIn = qs("#rep-in-minutes", this.container);
    const triggerBtn = qs("#rep-trigger-btn", this.container);
    const stopBtn = qs("#rep-stop-btn", this.container);
    const profileSelect = qs("#rep-sound-profile", this.container);
    const modeSelect = qs("#rep-mode-select", this.container);
    const btnCurrent = qs("#rep-btn-current", this.container);
    const presetBtns = qsa("[data-rep-h]", this.container);

    hoursIn?.addEventListener("input", (e) => {
      this.hours = parseInt(e.target.value, 10);
      presetBtns.forEach((b) => b.classList.remove("is-active"));
      this.updateDisplay();
    });

    minsIn?.addEventListener("input", (e) => {
      this.minutes = parseInt(e.target.value, 10);
      presetBtns.forEach((b) => b.classList.remove("is-active"));
      this.updateDisplay();
    });

    presetBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        presetBtns.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        this.setTime(parseInt(btn.dataset.repH, 10), parseInt(btn.dataset.repM, 10));
      });
    });

    btnCurrent?.addEventListener("click", () => {
      presetBtns.forEach((b) => b.classList.remove("is-active"));
      btnCurrent.classList.add("is-active");
      const d = new Date();
      let h = d.getHours() % 12;
      if (h === 0) h = 12;
      this.setTime(h, d.getMinutes());
    });

    profileSelect?.addEventListener("change", (e) => {
      this.soundProfile = GONG_SOUND_PROFILES[e.target.value] || GONG_SOUND_PROFILES.cathedral;
    });

    modeSelect?.addEventListener("change", (e) => {
      this.mode = e.target.value || "classic";
      this.updateDisplay();
    });

    triggerBtn?.addEventListener("click", () => {
      this.startChimeSequence();
    });

    stopBtn?.addEventListener("click", () => {
      this.stopChime();
    });

    // Интерактивный взвод слайдера кликом
    const slideZone = qs("#rep-slide-zone", this.container);
    slideZone?.addEventListener("click", () => {
      if (!this.isPlaying) {
        this.startChimeSequence();
      }
    });
  }

  setTime(h, m) {
    this.hours = Math.max(1, Math.min(12, h));
    this.minutes = Math.max(0, Math.min(59, m));

    const hIn = qs("#rep-in-hours", this.container);
    const mIn = qs("#rep-in-minutes", this.container);
    if (hIn) hIn.value = this.hours;
    if (mIn) mIn.value = this.minutes;

    this.updateDisplay();
  }

  updateDisplay() {
    const b = this.getChimeBreakdown();
    const valH = qs("#rep-val-h", this.container);
    const valM = qs("#rep-val-m", this.container);
    const digits = qs("#rep-digits", this.container);
    const scoreH = qs("#rep-score-h", this.container);
    const scoreQ = qs("#rep-score-q", this.container);
    const scoreM = qs("#rep-score-m", this.container);
    const scoreTotal = qs("#rep-score-total", this.container);

    if (valH) valH.textContent = this.hours;
    if (valM) valM.textContent = this.minutes;
    if (digits) digits.textContent = b.formattedTime;
    if (scoreH) scoreH.textContent = b.hours;
    if (scoreQ) scoreQ.textContent = b.quarters;
    if (scoreM) scoreM.textContent = b.minutes;
    if (scoreTotal) scoreTotal.textContent = b.totalStrikes;
  }

  setStatus(text, isActive = false) {
    const statusText = qs("#rep-status-text", this.container);
    const statusDot = qs("#rep-status-dot", this.container);
    const govBadge = qs("#rep-gov-badge", this.container);

    if (statusText) statusText.textContent = text;
    if (statusDot) statusDot.classList.toggle("is-active", isActive);
    if (govBadge) {
      govBadge.innerHTML = isActive
        ? `Регулятор: <b style="color:var(--lume)">Вращение 1500 об/мин</b>`
        : `Регулятор: <b>В покое</b>`;
    }
  }

  // Запуск полной анимации взвода и акустического боя
  startChimeSequence() {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const triggerBtn = qs("#rep-trigger-btn", this.container);
    const stopBtn = qs("#rep-stop-btn", this.container);
    if (triggerBtn) triggerBtn.style.display = "none";
    if (stopBtn) stopBtn.style.display = "inline-flex";

    // 1. Анимация взвода слайдера (Tout-ou-Rien)
    this.setStatus("Взвод бокового слайдера: пружина боя заряжается...", true);
    let slideT = 0;
    const cockInterval = setInterval(() => {
      slideT += 0.1;
      this.slideProgress = Math.min(1.0, slideT);

      if (slideT >= 1.0) {
        clearInterval(cockInterval);
        this.setStatus("Предохранитель Tout-ou-Rien замкнут. Запуск боя!", true);
        setTimeout(() => this.executeChimeQueue(), 250);
      }
    }, 25);
  }

  executeChimeQueue() {
    const b = this.getChimeBreakdown();
    const queue = [];

    // 1. Часы (низкий тон L)
    for (let i = 1; i <= b.hours; i++) {
      queue.push({
        type: "single",
        pitch: "low",
        label: `Часовой бой: удар ${i} из ${b.hours} (Тон L)`,
        delayAfter: 520,
      });
    }

    // Пауза между фазами
    if (queue.length > 0 && (b.quarters > 0 || b.minutes > 0)) {
      queue[queue.length - 1].delayAfter = 750;
    }

    // 2. Четверти / Десятиминутки (двойной удар H-L)
    for (let q = 1; q <= b.quarters; q++) {
      queue.push({
        type: "double",
        pitch1: "high",
        pitch2: "low",
        label: `${this.mode === "decimal" ? "Десятиминутка" : "Четверть"} ${q} из ${b.quarters} (Динь-Дон)`,
        delayAfter: 650,
      });
    }

    if (b.quarters > 0 && b.minutes > 0) {
      queue[queue.length - 1].delayAfter = 750;
    }

    // 3. Минуты (высокий тон H)
    for (let m = 1; m <= b.minutes; m++) {
      queue.push({
        type: "single",
        pitch: "high",
        label: `Минутный бой: удар ${m} из ${b.minutes} (Тон H)`,
        delayAfter: 480,
      });
    }

    let currentIndex = 0;

    const playNext = () => {
      if (!this.isPlaying || currentIndex >= queue.length) {
        this.finishChime();
        return;
      }

      const item = queue[currentIndex];
      currentIndex++;

      // Плавное возвращение слайдера по мере отбоя
      this.slideProgress = Math.max(0, 1.0 - currentIndex / queue.length);

      if (item.type === "single") {
        repeaterAudio.playGong({
          pitch: item.pitch,
          profile: this.soundProfile,
          volume: this.volume,
        });
        this.triggerHammer(item.pitch);
        this.setStatus(item.label, true);

        this.activeTimer = setTimeout(playNext, item.delayAfter);
      } else if (item.type === "double") {
        // Первый удар четверти (H)
        repeaterAudio.playGong({
          pitch: item.pitch1,
          profile: this.soundProfile,
          volume: this.volume,
        });
        this.triggerHammer(item.pitch1);
        this.setStatus(item.label, true);

        // Второй удар четверти (L) через 140 мс
        setTimeout(() => {
          if (!this.isPlaying) return;
          repeaterAudio.playGong({
            pitch: item.pitch2,
            profile: this.soundProfile,
            volume: this.volume,
          });
          this.triggerHammer(item.pitch2);
        }, 140);

        this.activeTimer = setTimeout(playNext, item.delayAfter);
      }
    };

    playNext();
  }

  finishChime() {
    this.isPlaying = false;
    this.slideProgress = 0;
    const triggerBtn = qs("#rep-trigger-btn", this.container);
    const stopBtn = qs("#rep-stop-btn", this.container);
    if (triggerBtn) triggerBtn.style.display = "inline-flex";
    if (stopBtn) stopBtn.style.display = "none";
    this.setStatus("Бой завершен. Механизм вернулся в исходное положение.", false);
  }

  stopChime() {
    this.isPlaying = false;
    if (this.activeTimer) {
      clearTimeout(this.activeTimer);
      this.activeTimer = null;
    }
    this.slideProgress = 0;
    const triggerBtn = qs("#rep-trigger-btn", this.container);
    const stopBtn = qs("#rep-stop-btn", this.container);
    if (triggerBtn) triggerBtn.style.display = "inline-flex";
    if (stopBtn) stopBtn.style.display = "none";
    this.setStatus("Бой остановлен вручную.", false);
  }
}

export function renderRepeaterSimulator() {
  return html`<div id="repeater-simulator-mount"></div>`;
}

export function mountRepeaterSimulator(root) {
  const mountEl = qs("#repeater-simulator-mount", root);
  if (!mountEl) return null;

  const sim = new MinuteRepeaterSimulator({ container: mountEl });
  return () => {
    sim.destroy();
  };
}
