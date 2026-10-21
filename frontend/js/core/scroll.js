// Плавный скролл (Lenis), синхронизированный с GSAP ScrollTrigger.

import { lowPower, reduced } from "./motion.js";

let lenis = null;

// Страница в покое не должна будить процессор каждый кадр. Раньше на любой странице крутились два
// бесконечных цикла requestAnimationFrame: тикер GSAP (к нему был привязан Lenis, и тикер из-за этого
// никогда не засыпал) и пустой цикл ScrollTrigger (_rafBugFix). Теперь Lenis работает только пока идёт
// плавная прокрутка, тикер GSAP засыпает сам, когда анимаций нет.
function quietIdleFrames() {
  // _rafBugFix в ScrollTrigger ничего не делает, только держит очередь кадров ради ровной перерисовки
  // в Firefox; в Chrome и Safari он не нужен. Имя функции сохраняется в сборке GSAP.
  if (/Firefox\//.test(navigator.userAgent)) return;
  const raf = window.requestAnimationFrame;
  window.requestAnimationFrame = function (cb) {
    return cb?.name === "_rafBugFix" ? 0 : raf.call(window, cb);
  };
}

export function initScroll() {
  const { gsap, ScrollTrigger, Lenis } = window;
  gsap.registerPlugin(ScrollTrigger);
  quietIdleFrames();
  // на слабом ноутбуке прокрутку ведёт сам браузер (в потоке композиции): она не дёргается,
  // даже когда главный поток занят. Сглаживание Lenis красиво только при запасе мощности
  if (reduced() || !Lenis || lowPower()) return null;
  lenis = new Lenis({ lerp: 0.12, duration: 1.1, wheelMultiplier: 1, smoothWheel: true, syncTouch: false });
  lenis.on("scroll", () => ScrollTrigger.update());
  gsap.ticker.lagSmoothing(500, 33);
  // свой цикл кадров только на время плавной прокрутки
  let id = 0;
  const loop = (t) => {
    lenis.raf(t);
    id = lenis.animate.isRunning || lenis.isScrolling === "smooth" ? requestAnimationFrame(loop) : 0;
  };
  // после паузы первый кадр с нулевым шагом: иначе Lenis посчитает всю паузу одним шагом и прыгнет
  const wake = () => (id ||= requestAnimationFrame((t) => ((lenis.time = t), loop(t))));
  window.addEventListener("wheel", wake, { passive: true, capture: true });
  const scrollTo = lenis.scrollTo.bind(lenis);
  lenis.scrollTo = (...args) => (scrollTo(...args), wake());
  return lenis;
}

export const getLenis = () => lenis;

export function scrollTop(immediate = true) {
  if (lenis) lenis.scrollTo(0, { immediate, force: true });
  else window.scrollTo(0, 0);
}

export function scrollToEl(el, offset = -80) {
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.4 });
  else el.scrollIntoView({ behavior: "smooth" });
}

export function lockScroll(lock) {
  if (lenis) (lock ? lenis.stop() : lenis.start());
  document.documentElement.style.overflow = lock ? "hidden" : "";
}

/** Подписка на скролл без window.addEventListener('scroll'). */
export function onScroll(cb) {
  if (lenis) {
    lenis.on("scroll", cb);
    return () => lenis.off("scroll", cb);
  }
  const { ScrollTrigger } = window;
  const st = ScrollTrigger.create({ start: 0, end: "max", onUpdate: (self) => cb({ scroll: self.scroll() }) });
  return () => st.kill();
}
