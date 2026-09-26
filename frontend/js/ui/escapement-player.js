// Виджет прослушивания хода калибра и сравнения частот спуска.

import { html, qs, qsa } from "../core/dom.js";
import { escapementPlayer } from "./audio-engine.js";
import { num, vph } from "../core/format.js";

// Частотные пресеты для сравнительного прослушивания
export const ESCAPEMENT_FREQUENCIES = [
  {
    vph: 18000,
    hz: 2.5,
    type: "manual",
    name: "18 000 пк/ч (2.5 Гц)",
    label: "Винтажные карманные часы",
    desc: "Размеренный, глубокий ход крупных балансов XIX и начала XX века. 5 шагов секундной стрелки в секунду.",
  },
  {
    vph: 21600,
    hz: 3.0,
    type: "automatic",
    name: "21 600 пк/ч (3 Гц)",
    label: "Классический калибр",
    desc: "Традиционная частота надежных калибров Patek Philippe 240, ультратонких механизмов и японской классики Seiko.",
  },
  {
    vph: 25200,
    hz: 3.5,
    type: "automatic",
    name: "25 200 пк/ч (3.5 Гц)",
    label: "Коаксиальный спуск Co-Axial",
    desc: "Оптимальная частота коаксиального спуска Джорджа Дэниелса в калибрах Omega Master Chronometer.",
  },
  {
    vph: 28800,
    hz: 4.0,
    type: "automatic",
    name: "28 800 пк/ч (4 Гц)",
    label: "Современный золотой стандарт",
    desc: "Эталонная частота индустрии (Rolex 3230, ETA 2824-2, Sellita SW200). 8 микрошагов стрелки в секунду.",
  },
  {
    vph: 36000,
    hz: 5.0,
    type: "automatic",
    name: "36 000 пк/ч (5 Гц)",
    label: "Высокочастотный Hi-Beat",
    desc: "Стремительный плотный стрекот легендарного хронографа Zenith El Primero и Grand Seiko 9S85. 10 шагов в секунду.",
  },
  {
    vph: 0,
    hz: 8.0,
    type: "spring_drive",
    name: "Spring Drive",
    label: "Абсолютная тишина",
    desc: "Непрерывное плавное скольжение стрелки без анкерного спуска: глайд-колесо вращается в электромагнитном поле.",
  },
  {
    vph: 3600,
    hz: 1.0,
    type: "quartz",
    name: "Кварцевый импульс (1 Гц)",
    label: "Шаговый двигатель Лаве",
    desc: "Один четкий дискретный щелчок в секунду от импульса микросхемы и кварцевого резонатора 32 768 Гц.",
  },
];

// Карточка прослушивания конкретного калибра
export function renderCaliberEscapementPlayer(movement) {
  const isSpringDrive = movement.type === "spring_drive";
  const isQuartz = movement.type === "quartz" || movement.type === "smart";
  const freq = movement.frequency_vph || 28800;
  const stepsPerSec = isQuartz ? 1 : Math.round(freq / 3600);

  return html`<div class="esc-player" id="esc-player" data-type="${movement.type}" data-vph="${freq}">
    <div class="esc-player__main">
      <div class="esc-player__head">
        <div class="esc-player__badge">
          <i class="ph-light ph-wave-sine" aria-hidden="true"></i>
          <span>Акустика спуска калибра</span>
        </div>
        <div class="esc-player__rate">
          ${isSpringDrive
            ? html`<span class="esc-player__rate-val">Непрерывный ход</span><span class="esc-player__rate-label">Бесшумное скольжение</span>`
            : isQuartz
            ? html`<span class="esc-player__rate-val">1 Гц</span><span class="esc-player__rate-label">1 шаг в секунду</span>`
            : html`<span class="esc-player__rate-val">${vph(freq)}</span><span class="esc-player__rate-label">${stepsPerSec} шагов/сек (${(freq / 7200).toFixed(1)} Гц)</span>`}
        </div>
      </div>

      <div class="esc-player__controls">
        <button class="btn btn--lume esc-player__btn" type="button" id="esc-toggle-btn">
          <i class="ph-light ph-speaker-high" aria-hidden="true"></i>
          <span id="esc-btn-text">${isSpringDrive ? "Проверить тишину Spring Drive" : "Слушать биение спуска"}</span>
        </button>

        <div class="esc-player__meter" id="esc-meter">
          <div class="esc-player__dot" id="esc-dot"></div>
          <div class="esc-player__bars" aria-hidden="true">
            <span></span><span></span><span></span><span></span><span></span>
          </div>
          <span class="esc-player__status" id="esc-status">${isSpringDrive ? "Готов: полное отсутствие ударов спуска" : "Нажмите для воспроизведения"}</span>
        </div>
      </div>

      <div class="esc-player__desc">
        ${isSpringDrive
          ? "В революционной технологии Seiko Spring Drive отсутствует традиционный анкерный спуск и колеблющийся баланс. Вся кинетическая энергия передается через глайд-колесо, совершающее 8 плавных оборотов в секунду под контролем бесконтактного электромагнитного тормоза."
          : isQuartz
          ? "Кварцевый осциллятор вибрирует с неслышимой частотой 32 768 Гц, а микросхема выдает одиночный импульс на биполярный шаговый двигатель ровно один раз в секунду."
          : `Анкерный спуск этого механизма издает ${num(freq)} звуковых соударений в час. При каждом колебании рубиновый импульсный камень взаимодействует с анкерной вилкой, а затем стальной зуб анкерного колеса падает на паллету, генерируя характерный часовой тик-так.`}
      </div>
    </div>
  </div>`;
}

export function mountCaliberEscapementPlayer(root) {
  const playerEl = qs("#esc-player", root);
  if (!playerEl) return;

  const btn = qs("#esc-toggle-btn", playerEl);
  const btnText = qs("#esc-btn-text", playerEl);
  const dot = qs("#esc-dot", playerEl);
  const meter = qs("#esc-meter", playerEl);
  const statusEl = qs("#esc-status", playerEl);

  const type = playerEl.dataset.type || "automatic";
  const vphVal = parseInt(playerEl.dataset.vph || "28800", 10);
  const isSpringDrive = type === "spring_drive";

  function updateActiveState(active) {
    meter?.classList.toggle("is-active", active);
    btn?.classList.toggle("is-playing", active);
    if (btnText) {
      if (active) {
        btnText.textContent = isSpringDrive ? "Остановить" : "Остановить ход";
      } else {
        btnText.textContent = isSpringDrive ? "Проверить тишину Spring Drive" : "Слушать биение спуска";
      }
    }
    if (statusEl) {
      if (active) {
        statusEl.textContent = isSpringDrive ? "Spring Drive: идеальное бесшумное вращение" : "Воспроизведение соударений спуска...";
      } else {
        statusEl.textContent = "Воспроизведение завершено";
      }
    }
  }

  btn?.addEventListener("click", () => {
    escapementPlayer.toggle({
      type,
      vph: vphVal,
      onStateChange: (active) => updateActiveState(active),
      onTick: (isEven) => {
        if (!dot) return;
        dot.classList.remove("is-tick-l", "is-tick-r");
        void dot.offsetWidth;
        dot.classList.add(isEven ? "is-tick-l" : "is-tick-r");
      },
    });
  });

  return () => {
    escapementPlayer.stop();
  };
}

// Полноразмерный компаратор частот спуска (для каталога калибров /movements)
export function renderEscapementComparator() {
  return html`<div class="esc-comp" id="esc-comp">
    <div class="esc-comp__head">
      <div class="esc-comp__badge">
        <i class="ph-light ph-waveform" aria-hidden="true"></i>
        <span>Акустический компаратор частот</span>
      </div>
      <h3 class="display display--s esc-comp__title">Сравнение звука спуска часовых механизмов</h3>
      <p class="esc-comp__lead">
        Частота баланса определяет точность, стабильность хода и визуальную плавность секундной стрелки. Послушайте, как звучат разные эпохи и инженерные школы часового дела: от неспешного тиканья карманных часов до 36 000 пк/ч хронографов.
      </p>
    </div>

    <div class="esc-comp__selector">
      ${ESCAPEMENT_FREQUENCIES.map(
        (f, i) => html`<button
          class="esc-comp__item ${i === 3 ? "is-active" : ""}"
          type="button"
          data-freq-idx="${i}"
          data-vph="${f.vph}"
          data-type="${f.type}"
        >
          <div class="esc-comp__item-top">
            <span class="esc-comp__item-name">${f.name}</span>
            <span class="esc-comp__item-hz">${f.hz} Гц</span>
          </div>
          <div class="esc-comp__item-label">${f.label}</div>
        </button>`
      )}
    </div>

    <div class="esc-comp__active-panel">
      <div class="esc-comp__info">
        <h4 class="esc-comp__info-title" id="comp-title">${ESCAPEMENT_FREQUENCIES[3].name} : ${ESCAPEMENT_FREQUENCIES[3].label}</h4>
        <p class="esc-comp__info-desc" id="comp-desc">${ESCAPEMENT_FREQUENCIES[3].desc}</p>
      </div>

      <div class="esc-comp__actions">
        <button class="btn btn--lume esc-comp__btn" type="button" id="comp-play-btn">
          <i class="ph-light ph-speaker-high" aria-hidden="true"></i>
          <span id="comp-btn-text">Слушать частоту</span>
        </button>

        <div class="esc-comp__pulse" id="comp-pulse">
          <div class="esc-comp__balance-wheel" id="comp-wheel"></div>
          <span class="esc-comp__pulse-status" id="comp-status">Готов к воспроизведению</span>
        </div>
      </div>
    </div>
  </div>`;
}

export function mountEscapementComparator(root) {
  const comp = qs("#esc-comp", root);
  if (!comp) return;

  const items = qsa(".esc-comp__item", comp);
  const titleEl = qs("#comp-title", comp);
  const descEl = qs("#comp-desc", comp);
  const playBtn = qs("#comp-play-btn", comp);
  const btnText = qs("#comp-btn-text", comp);
  const wheel = qs("#comp-wheel", comp);
  const statusEl = qs("#comp-status", comp);
  const pulseEl = qs("#comp-pulse", comp);

  let currentIdx = 3; // 28 800 vph по умолчанию

  function selectFreq(idx) {
    currentIdx = idx;
    items.forEach((item, i) => item.classList.toggle("is-active", i === idx));
    const f = ESCAPEMENT_FREQUENCIES[idx];
    if (titleEl) titleEl.textContent = `${f.name} : ${f.label}`;
    if (descEl) descEl.textContent = f.desc;

    // Если сейчас играло, переключаем на новую частоту
    if (escapementPlayer.isPlaying) {
      startPlayback();
    }
  }

  items.forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.freqIdx, 10);
      selectFreq(idx);
    });
  });

  function startPlayback() {
    const f = ESCAPEMENT_FREQUENCIES[currentIdx];
    escapementPlayer.start({
      type: f.type,
      vph: f.vph,
      onStateChange: (active) => {
        playBtn?.classList.toggle("is-playing", active);
        pulseEl?.classList.toggle("is-active", active);
        if (btnText) btnText.textContent = active ? "Остановить" : "Слушать частоту";
        if (statusEl) {
          statusEl.textContent = active
            ? f.type === "spring_drive"
              ? "Spring Drive: идеальное бесшумное вращение"
              : `Воспроизведение: ${f.name}...`
            : "Воспроизведение остановлено";
        }
      },
      onTick: (isEven) => {
        if (!wheel) return;
        wheel.classList.remove("is-tick-l", "is-tick-r");
        void wheel.offsetWidth;
        wheel.classList.add(isEven ? "is-tick-l" : "is-tick-r");
      },
    });
  }

  playBtn?.addEventListener("click", () => {
    if (escapementPlayer.isPlaying) {
      escapementPlayer.stop();
    } else {
      startPlayback();
    }
  });

  return () => {
    escapementPlayer.stop();
  };
}
