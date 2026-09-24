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
          e.target.classList.add("is-in");
          io.unobserve(e.target);
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
