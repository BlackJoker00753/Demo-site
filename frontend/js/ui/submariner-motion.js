// One reversible timeline. Scrubbing, buttons and playback evaluate the same poses.
export const STAGE_SECONDS = [9, 5.4, 7.2, 8.2, 8.4, 8.6, 4];
export const TOTAL_SECONDS = STAGE_SECONDS.reduce((a, b) => a + b, 0);
const clamp = x => Math.max(0, Math.min(1, x));
export const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const window = (t, a, b) => ease((t - a) / (b - a));

export function timelineSeconds(progress) {
  const scaled = clamp(progress) * 7, stage = Math.min(6, Math.floor(scaled));
  return STAGE_SECONDS.slice(0, stage).reduce((a, b) => a + b, 0) + (scaled - stage) * STAGE_SECONDS[stage];
}

export function timelineProgress(seconds) {
  let remaining = Math.max(0, Math.min(TOTAL_SECONDS, seconds));
  for (let i = 0; i < STAGE_SECONDS.length; i++) {
    if (remaining <= STAGE_SECONDS[i]) return (i + remaining / STAGE_SECONDS[i]) / 7;
    remaining -= STAGE_SECONDS[i];
  }
  return 1;
}

/** Local phase windows express dependencies: a retaining screw exits before its part lifts. */
export function planParts(parts) {
  const plans = new Map();
  const catalogue = parts.some(p => p.role);
  for (let stage = 0; stage <= 6; stage++) {
    const group = parts.filter(p => p.stage === stage).sort((a, b) => a.name.localeCompare(b.name, "ru", { numeric: true }));
    const screws = group.filter(p => p.thread).sort((a, b) => Number(/ротора/.test(b.name)) - Number(/ротора/.test(a.name)) || a.name.localeCompare(b.name, "ru", { numeric: true }));
    for (const [index, p] of group.entries()) {
      const rank = index / Math.max(1, group.length - 1);
      const screwRank = screws.indexOf(p) / Math.max(1, screws.length - 1);
      let start = 0.62 + rank * 0.18, end = Math.min(1, start + 0.18);
      if (stage === 1) { start = 0.79 + rank * 0.07; end = start + 0.14; }
      if (stage === 2) { start = 0.7; end = 1; }
      if (stage === 3) {
        [start, end] = /Ротор/.test(p.name) ? [0.52, 0.73] : /Мост/.test(p.name) ? [0.74, 0.94] : [0.84, 1];
      }
      if (stage === 4) {
        [start, end] = /Баланс|Спираль/.test(p.name) ? [0.80, 1] : [0.64 + rank * 0.09, 0.83 + rank * 0.09];
        if (/Мост баланса/.test(p.name)) [start, end] = [0.64, 0.78];
      }
      if (stage === 5) {
        start = 0.22 + rank * 0.44; end = start + 0.22;
        if (/Мост/.test(p.name)) [start, end] = [0.02, 0.19];
        if (p.name === "Барабан") [start, end] = [0.35, 0.56];
        if (/крышка/.test(p.name)) [start, end] = [0.60, 0.76];
        if (/Заводная пружина/.test(p.name)) [start, end] = [0.76, 0.94];
        if (/Кольцо механизма/.test(p.name)) [start, end] = [0.84, 1];
        if (/Вал барабана/.test(p.name)) [start, end] = [0.94, 1];
        if (/Платина/.test(p.name)) [start, end] = [0.97, 1];
      }
      if (stage === 6) {
        [start, end] = /Безель/.test(p.name) ? [0.01, 0.24]
          : /Вставка|Капсула/.test(p.name) ? [0.10, 0.33]
          : /Стекло/.test(p.name) ? [0.29, 0.49]
          : /Секундная стрелка/.test(p.name) ? [0.48, 0.65]
          : /Минутная стрелка/.test(p.name) ? [0.61, 0.78]
          : /Часовая стрелка/.test(p.name) ? [0.73, 0.90]
          : /Флажок|Опора/.test(p.name) ? [0.81, 0.97] : [0.88, 1];
      }
      const plan = { stage, start, end, threaded: !!p.thread };
      if (p.thread) {
        if (stage === 1) { plan.start = 0.03 + Math.max(0, screwRank) * 0.24; plan.turnEnd = plan.start + 0.24; }
        else if (stage === 2) { plan.start = p.name === "Задняя крышка" ? 0.18 : 0.60; plan.turnEnd = plan.start + (p.name === "Задняя крышка" ? 0.36 : 0.20); }
        else { plan.start = 0.03 + Math.max(0, screwRank) * 0.18; plan.turnEnd = plan.start + 0.25; }
        plan.exitEnd = plan.turnEnd + (stage === 2 ? 0.12 : 0.14);
        plan.end = Math.min(1, plan.exitEnd + 0.12);
      }
      if (catalogue && stage === 2) {
        if (p.thread) {
          plan.start = .02 + screwRank * .15;
          plan.turnEnd = plan.start + .25;
          plan.exitEnd = plan.turnEnd + .15;
          plan.end = plan.exitEnd + .12;
        } else { plan.start = .76; plan.end = 1; }
      }
      if (catalogue && stage === 6) {
        if (p.thread) {
          plan.start = screwRank * .08; plan.turnEnd = plan.start + .18;
          plan.exitEnd = plan.turnEnd + .12; plan.end = plan.exitEnd + .1;
        } else {
          [plan.start, plan.end] = /bezel/.test(p.role) ? [.5, .6]
            : /crystal/.test(p.role) ? [.6, .7]
              : /hand/.test(p.role) ? [.7 + rank * .08, .82 + rank * .08] : [.9, 1];
        }
      }
      plans.set(p.id, plan);
    }
  }
  return plans;
}

export function samplePart(plan, progress) {
  const local = progress * 7 - (plan.stage - 1);
  const layout = window(progress * 7 - 6, 0, 1);
  if (plan.stage === 0) return { spin: 0, exit: 0, travel: 0, layout };
  if (plan.threaded) return {
    spin: window(local, plan.start, plan.turnEnd),
    exit: window(local, plan.turnEnd + 0.015, plan.exitEnd),
    travel: window(local, plan.exitEnd, plan.end), layout,
  };
  return { spin: 0, exit: 0, travel: window(local, plan.start, plan.end), layout };
}

// Camera and captions share the same actions, so a close-up names what it shows.
export function motionShot(progress) {
  if (progress <= 0) return { key: "assembled", stage: 0, kind: "assembled" };
  const stage = Math.max(1, Math.min(7, Math.ceil(progress * 7 - 1e-6)));
  const local = progress * 7 - (stage - 1);
  const kind = stage === 1 ? (local < 0.46 ? "thread" : "bracelet")
    : stage === 2 ? (local < 0.58 ? "back" : "crown")
    : stage === 3 ? (local < 0.48 ? "thread" : local < 0.74 ? "rotor" : "winding")
    : stage === 4 ? (local < 0.62 ? "thread" : "balance")
    : stage === 5 ? (local < 0.34 ? "wheels" : local < 0.60 ? "barrel" : local < 0.76 ? "cover" : local < 0.94 ? "spring" : "arbor")
    : stage === 6 ? "front" : "tray";
  return { key: `${stage}-${kind}`, stage, kind };
}

export function motionCaption(progress, reverse = false) {
  const shot = motionShot(progress);
  if (reverse) return shot.kind === "thread" || shot.kind === "back" || shot.kind === "crown"
    ? "Затягивание резьбовых соединений" : "Возвращение деталей на посадочные места";
  return {
    thread: shot.stage === 1 ? "Винты браслета: выкручивание и извлечение" : "Выкручивание крепёжных винтов",
    bracelet: "Освобождённые звенья отходят от корпуса",
    back: "Задняя крышка: выход по резьбе",
    crown: "Заводная головка: выход по резьбе",
    rotor: "Снятие ротора автоподзавода",
    winding: "Снятие моста и колёс автоподзавода",
    balance: "Освобождение баланса со спиралью",
    wheels: "Поочерёдное снятие колёс передачи",
    barrel: "Извлечение барабана вместе с его содержимым",
    cover: "Открытие крышки снятого барабана",
    spring: "Извлечение заводной пружины",
    arbor: "Снятие вала барабана",
    front: "Безель, стекло, стрелки и циферблат",
    tray: "Укладка деталей на столе",
  }[shot.kind] ?? "Часы в сборе";
}
