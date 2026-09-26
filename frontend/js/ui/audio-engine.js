// Horological Audio Engine: синтез звуков хода спуска калибров и боя соборного минутного репетира на Web Audio API.

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// -------------------------------------------------------------
// 1. СИНТЕЗАТОР БИЕНИЯ СПУСКА (ESCAPEMENT BEAT SIMULATOR)
// -------------------------------------------------------------

class EscapementPlayer {
  constructor() {
    this.intervalId = null;
    this.timeoutId = null;
    this.isPlaying = false;
    this.tickCount = 0;
    this.currentType = "automatic";
    this.currentVph = 28800;
    this.onTick = null;
    this.onStateChange = null;
  }

  // Синтез одного удара спуска (анкерный импульс + паллета)
  playTick(isEven, isQuartz = false) {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    if (isQuartz) {
      // Кварцевый шаговый импульс: низкий щелчок ротора шагового двигателя Лаве
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.025);

      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.04);
      return;
    }

    // Механический анкерный спуск: микросоударение рубиновой паллеты со стальным зубом
    // Чередование четного и нечетного удара (входная и выходная паллеты анкерной вилки)
    const baseFreq = isEven ? 4100 : 3750;

    // Резонансный металлический импульс
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.65, t + 0.022);

    oscGain.gain.setValueAtTime(0.18, t);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.024);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.03);

    // Шумовой микрощелчок соударения
    const bufferSize = Math.floor(ctx.sampleRate * 0.015);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = isEven ? 4800 : 4300;
    filter.Q.value = 4.0;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.22, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.start(t);
  }

  start({ type = "automatic", vph = 28800, onTick = null, onStateChange = null, maxDurationSec = 20 } = {}) {
    this.stop();
    this.currentType = type;
    this.currentVph = vph || 28800;
    this.onTick = onTick;
    this.onStateChange = onStateChange;

    const ctx = getAudioContext();
    if (!ctx) return false;

    // Spring Drive: бесшумное непрерывное скольжение
    if (this.currentType === "spring_drive") {
      this.isPlaying = true;
      this.onStateChange?.(true);
      // Таймер автоматической остановки
      this.timeoutId = setTimeout(() => this.stop(), maxDurationSec * 1000);
      return true;
    }

    const isQuartz = this.currentType === "quartz" || this.currentType === "smart";
    const beatsPerSec = isQuartz ? 1 : Math.max(1, this.currentVph / 3600);
    const intervalMs = 1000 / beatsPerSec;

    this.isPlaying = true;
    this.tickCount = 0;
    this.onStateChange?.(true);

    const beat = () => {
      if (!this.isPlaying) return;
      const isEven = this.tickCount % 2 === 0;
      this.playTick(isEven, isQuartz);
      this.onTick?.(isEven, this.tickCount);
      this.tickCount++;
    };

    beat();
    this.intervalId = setInterval(beat, intervalMs);

    // Автоматическая остановка через maxDurationSec секунд
    this.timeoutId = setTimeout(() => {
      this.stop();
    }, maxDurationSec * 1000);

    return true;
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.isPlaying) {
      this.isPlaying = false;
      this.onStateChange?.(false);
    }
  }

  toggle(options) {
    if (this.isPlaying) {
      this.stop();
      return false;
    }
    return this.start(options);
  }
}

export const escapementPlayer = new EscapementPlayer();

// -------------------------------------------------------------
// 2. СИНТЕЗАТОР СОБОРНОГО МИНУТНОГО РЕПЕТИРА (MINUTE REPEATER)
// -------------------------------------------------------------

class MinuteRepeaterPlayer {
  constructor() {
    this.isPlaying = false;
    this.activeTimeouts = [];
    this.onStrike = null;
    this.onStateChange = null;
  }

  // Синтез удара соборного гонга из закаленной стали
  // pitchType: "low" (бас: часы) | "high" (сопрано: минуты)
  playGong(pitchType = "low", duration = 1.4) {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const baseFreq = pitchType === "low" ? 440 : 660; // Ля 1-й октавы и Ми 2-й октавы

    // Соборный гонг обладает богатым негармоническим спектром круглой стальной проволоки
    const partials = [
      { ratio: 1.0, gain: 0.7, decay: duration },
      { ratio: 1.414, gain: 0.35, decay: duration * 0.7 },
      { ratio: 2.76, gain: 0.22, decay: duration * 0.5 },
      { ratio: 5.4, gain: 0.12, decay: duration * 0.3 },
    ];

    partials.forEach(({ ratio, gain: partGain, decay }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(baseFreq * ratio, t);

      // Атака и экспоненциальное затухание
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(partGain * 0.45, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + decay + 0.05);
    });

    // Металлический щелчок удара молоточка
    const strikeOsc = ctx.createOscillator();
    const strikeGain = ctx.createGain();
    strikeOsc.type = "triangle";
    strikeOsc.frequency.setValueAtTime(pitchType === "low" ? 1800 : 2600, t);
    strikeGain.gain.setValueAtTime(0.12, t);
    strikeGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.015);

    strikeOsc.connect(strikeGain);
    strikeGain.connect(ctx.destination);
    strikeOsc.start(t);
    strikeOsc.stop(t + 0.02);
  }

  // Расчет схемы ударов для заданного времени (часы, минуты)
  static getChimeBreakdown(hours, minutes) {
    const h12 = hours % 12 === 0 ? 12 : hours % 12;
    const quarters = Math.floor(minutes / 15);
    const remainingMinutes = minutes % 15;
    const totalStrikes = h12 + quarters * 2 + remainingMinutes;
    return {
      hours: h12,
      quarters,
      minutes: remainingMinutes,
      totalStrikes,
      formattedTime: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    };
  }

  play({ hours = 10, minutes = 14, onStrike = null, onStateChange = null } = {}) {
    this.stop();

    const ctx = getAudioContext();
    if (!ctx) return false;

    this.isPlaying = true;
    this.onStrike = onStrike;
    this.onStateChange = onStateChange;
    this.onStateChange?.(true);

    const breakdown = MinuteRepeaterPlayer.getChimeBreakdown(hours, minutes);
    let delay = 350; // небольшая начальная задержка взвода гребенок

    // 1. УДАРЫ ЧАСОВ (низкий тон)
    for (let i = 1; i <= breakdown.hours; i++) {
      const strikeIndex = i;
      const tid = setTimeout(() => {
        if (!this.isPlaying) return;
        this.playGong("low", 1.5);
        this.onStrike?.({
          phase: "hours",
          current: strikeIndex,
          total: breakdown.hours,
          breakdown,
          label: `Часы: ${strikeIndex} из ${breakdown.hours}`,
        });
      }, delay);
      this.activeTimeouts.push(tid);
      delay += 540;
    }

    // Пауза перед четвертями
    if (breakdown.quarters > 0) {
      delay += 250;
      // 2. УДАРЫ ЧЕТВЕРТЕЙ (двойной перезвон: высокий + низкий)
      for (let q = 1; q <= breakdown.quarters; q++) {
        const quarterIndex = q;

        // Первый удар четверти (высокий тон)
        const tid1 = setTimeout(() => {
          if (!this.isPlaying) return;
          this.playGong("high", 1.1);
          this.onStrike?.({
            phase: "quarters",
            quarter: quarterIndex,
            strikePart: 1,
            total: breakdown.quarters,
            breakdown,
            label: `Четверть ${quarterIndex}: динь`,
          });
        }, delay);
        this.activeTimeouts.push(tid1);
        delay += 180;

        // Второй удар четверти (низкий тон)
        const tid2 = setTimeout(() => {
          if (!this.isPlaying) return;
          this.playGong("low", 1.2);
          this.onStrike?.({
            phase: "quarters",
            quarter: quarterIndex,
            strikePart: 2,
            total: breakdown.quarters,
            breakdown,
            label: `Четверть ${quarterIndex}: дон`,
          });
        }, delay);
        this.activeTimeouts.push(tid2);
        delay += 560;
      }
    }

    // Пауза перед минутами
    if (breakdown.minutes > 0) {
      delay += 250;
      // 3. УДАРЫ ОСТАВШИХСЯ МИНУТ (высокий тон)
      for (let m = 1; m <= breakdown.minutes; m++) {
        const minIndex = m;
        const tid = setTimeout(() => {
          if (!this.isPlaying) return;
          this.playGong("high", 1.2);
          this.onStrike?.({
            phase: "minutes",
            current: minIndex,
            total: breakdown.minutes,
            breakdown,
            label: `Минуты: ${minIndex} из ${breakdown.minutes}`,
          });
        }, delay);
        this.activeTimeouts.push(tid);
        delay += 440;
      }
    }

    // Завершение боя
    const endTid = setTimeout(() => {
      this.isPlaying = false;
      this.onStrike?.({ phase: "done", breakdown, label: "Бой завершен" });
      this.onStateChange?.(false);
    }, delay + 600);
    this.activeTimeouts.push(endTid);

    return true;
  }

  stop() {
    this.activeTimeouts.forEach((tid) => clearTimeout(tid));
    this.activeTimeouts = [];
    if (this.isPlaying) {
      this.isPlaying = false;
      this.onStateChange?.(false);
    }
  }
}

export const minuteRepeaterPlayer = new MinuteRepeaterPlayer();

// Звук механического клика кнопки хронографа (колонное колесо / рычаг сброса)
export function playPusherClick(heavy = true) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(heavy ? 1200 : 1600, t);
  osc.frequency.exponentialRampToValueAtTime(140, t + 0.025);

  gain.gain.setValueAtTime(0.24, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.035);
}
