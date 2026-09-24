// Плавный скролл (Lenis), синхронизированный с GSAP ScrollTrigger.

import { reduced } from "./motion.js";

let lenis = null;

export function initScroll() {
  const { gsap, ScrollTrigger, Lenis } = window;
  gsap.registerPlugin(ScrollTrigger);
  if (reduced() || !Lenis) return null;
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 1, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
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
