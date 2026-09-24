// Фотографическая разборка: настоящие детали, вырезанные со снимка разобранного
// калибра (scripts/cutouts.py), по скроллу расходятся из собранного механизма
// на свои места на столе часовщика. Анимируется только положение, пиксели настоящие.
//
// Порядок как у часовщика: сначала снимаются верхние детали (винты, плата),
// последней уходит платина, из-под неё появляются колёса и рычаги.

const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2); // easeInOutCubic
const clamp01 = (x) => Math.min(1, Math.max(0, x));

export class PhotoExplode {
  constructor(frame, name) {
    this.frame = frame;
    this.base = `/assets/exploded/${name}`;
    this.parts = [];
    this.t = 0;
    this.size = { w: 1, h: 1 };
  }

  async load() {
    const m = await fetch(`${this.base}/manifest.json`).then((r) => r.json());
    this.manifest = m;
    const stage = document.createElement("div");
    stage.className = "pxp";
    stage.style.aspectRatio = `${m.width} / ${m.height}`;
    // Снимаются слоями сверху вниз: у каждого слоя своё окно времени.
    const layers = [...new Set(m.parts.map((p) => p.z))].sort((a, b) => b - a);
    const span = 0.58; // доля шкалы, за которую стартуют все слои
    this.parts = m.parts.map((p, i) => {
      const img = document.createElement("img");
      img.className = "pxp__part";
      img.src = `${this.base}/${p.file}`;
      img.alt = "";
      img.decoding = "async";
      img.draggable = false;
      img.style.width = `${p.w * 100}%`;
      img.style.zIndex = String(p.z);
      if (p.key) img.dataset.key = p.key;
      stage.append(img);
      const rank = layers.indexOf(p.z) / Math.max(1, layers.length - 1);
      const jitter = ((i * 37) % 11) / 11 * 0.05;
      return { ...p, el: img, delay: rank * span + jitter, dur: 0.34 };
    });
    this.stage = stage;
    this.zoom = m.zoom ?? 1;
    this.frame.prepend(stage);
    this.ro = new ResizeObserver(() => {
      this.size = { w: stage.clientWidth, h: stage.clientHeight };
      this.setT(this.t, true);
    });
    this.ro.observe(stage);
    await Promise.all(this.parts.map((p) => p.el.decode?.().catch(() => {})));
    this.size = { w: stage.clientWidth, h: stage.clientHeight };
    this.setT(this.t, true);
    return this;
  }

  /** t: 0 собран, 1 разобран. */
  setT(t, force = false) {
    if (!force && Math.abs(t - this.t) < 1e-4) return;
    this.t = t;
    const { w, h } = this.size;
    for (const p of this.parts) {
      const k = ease(clamp01((t - p.delay) / p.dur));
      const x = p.from[0] + (p.to[0] - p.from[0]) * k;
      const y = p.from[1] + (p.to[1] - p.from[1]) * k;
      // в полёте деталь чуть «приподнята»: крупнее и с более мягкой тенью
      const lift = Math.sin(Math.PI * k);
      const s = 1 + lift * 0.06;
      p.el.style.transform = `translate3d(${(x - p.w / 2) * w}px, ${(y - p.h / 2) * h}px, 0) scale(${s})`;
      p.el.style.zIndex = String(lift > 0.02 ? 100 + p.z : p.z);
      // корпус не улетает, а «растворяется», оставляя призрачный контур в центре раскладки
      if (p.fade) p.el.style.opacity = String(1 - k * 0.9);
    }
    // камера: крупно на собранных часах, затем отъезд, пока детали расходятся
    const zk = ease(clamp01(t / 0.55));
    this.stage.style.transform = `scale(${this.zoom + (1 - this.zoom) * zk})`;
    this.frame.style.setProperty("--pxp-done", String(clamp01((t - 0.9) / 0.08)));
    this.frame.classList.toggle("is-done", t >= 0.97);
  }

  /** Точки для подписей: по одной на деталь-ключ (самая крупная), в разобранной позе. */
  hotspots() {
    const best = new Map();
    for (const p of this.parts) {
      if (!p.key || p.fade) continue;
      const cur = best.get(p.key);
      if (!cur || p.w * p.h > cur.w * cur.h) best.set(p.key, p);
    }
    return [...best.values()].map((p) => ({ key: p.key, x: p.to[0], y: p.to[1] }));
  }

  dispose() {
    this.ro?.disconnect();
    this.stage?.remove();
  }
}
