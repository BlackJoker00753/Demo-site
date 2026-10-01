// Анимационные утилиты. GSAP и ScrollTrigger подключены глобально (UMD).

export const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const gsap = () => window.gsap;

let io;
/** Плавное появление элементов с [data-reveal] при входе в кадр. */
export function observeReveals(root = document) {
  io ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          const el = e.target;
          el.classList.add("is-in");
          io.unobserve(el);
          // После появления вернуть элементу его собственные быстрые transition (hover и т. п.).
          const done = (ev) => {
            if (ev.target !== el || ev.propertyName !== "transform") return;
            el.classList.add("is-done");
            el.removeEventListener("transitionend", done);
          };
          el.addEventListener("transitionend", done);
        }
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
  );
  root.querySelectorAll("[data-reveal]:not(.is-in)").forEach((el) => io.observe(el));
}

/** Разбить текст на слова для построчных анимаций. */
export function splitWords(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words.map((w) => `<span class="w"><span>${w}</span></span>`).join(" ");
  return Array.from(el.querySelectorAll(".w > span"));
}

/** Счётчик от 0 до значения (для цен и характеристик). */
export function countUp(el, to, { duration = 1.4, format = (v) => Math.round(v).toString() } = {}) {
  const g = gsap();
  if (!g || reduced()) {
    el.textContent = format(to);
    return;
  }
  const state = { v: 0 };
  g.to(state, {
    v: to, duration, ease: "expo.out",
    onUpdate: () => { el.textContent = format(state.v); },
  });
}

/**
 * requestAnimationFrame, который спит, пока элемент за экраном: симуляторы не жгут батарею, когда
 * их не видно. Время в кадрах виртуальное и на паузе стоит, так что после возврата ничего не скачет.
 * Возвращает raf(cb) и stop() для размонтирования.
 */
export function frameGate(el, margin = "160px") {
  let visible = true, parked = null, pausedAt = 0, lost = 0, id = 0, alive = true;
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (!visible) pausedAt ||= performance.now();
    else if (pausedAt) {
      lost += performance.now() - pausedAt;
      pausedAt = 0;
      if (parked) { const cb = parked; parked = null; raf(cb); }
    }
  }, { rootMargin: margin });
  io.observe(el);
  function raf(cb) {
    if (!alive) return 0;
    if (!visible) { parked = cb; return 0; }
    id = requestAnimationFrame((t) => (visible ? cb(t - lost) : (parked = cb)));
    return id;
  }
  raf.stop = () => { alive = false; parked = null; cancelAnimationFrame(id); io.disconnect(); };
  return raf;
}
