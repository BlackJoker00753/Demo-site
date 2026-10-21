// Фильм-разборка: кадры рендера Blender (scripts/blender/sub124060_*.py → scripts/teardown_film.py) листаются
// прокруткой, как на страницах продуктов. Кадры с прозрачным фоном ложатся на фон страницы.
//
// Загрузка от грубого к точному: сначала каждый 16-й кадр, затем 8-й, 4-й, 2-й и все. Прокрутка работает
// почти сразу, рисуется ближайший загруженный кадр, по мере загрузки движение становится плавным.

const STRIDES = [16, 8, 4, 2, 1];
const PARALLEL = 6;

export class TeardownFilm {
  constructor(canvas, slug) {
    this.canvas = canvas;
    this.base = `/assets/teardown/${slug}/film`;
    this.ctx = canvas.getContext("2d");
    this.frames = [];
    this.t = 0;
    this.want = 0;
    this.inset = [0, 0, 0];
    this.listeners = new Set();
    this.chapter = -1;
    this.alive = true;
  }

  async load() {
    const r = await fetch(`${this.base}/film.json`);
    if (!r.ok) throw new Error("нет фильма");
    this.manifest = await r.json();
    const m = this.manifest;
    this.n = m.frames;
    this.chapters = m.chapters ?? [];
    // телефон и экономия трафика: кадры 640×360, иначе 1280×720
    const small = navigator.connection?.saveData || this.canvas.clientWidth * Math.min(2, devicePixelRatio || 1) < 1100;
    this.size = small ? m.sizes.m : m.sizes.d;
    this.frames = new Array(this.n).fill(null);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.canvas);
    this.resize();
    const order = [];
    const seen = new Set();
    for (const s of STRIDES) for (let i = 0; i < this.n; i += s) if (!seen.has(i)) seen.add(i), order.push(i);
    if (!seen.has(this.n - 1)) order.push(this.n - 1);
    this.queue = order;
    // первый кадр до всех остальных: секция не пустая
    await this.fetchFrame(0);
    this.draw();
    for (let k = 0; k < PARALLEL; k++) this.pump();
    return this;
  }

  url(i) {
    return `${this.base}/${this.size.path.replace("{i}", String(i).padStart(4, "0"))}?v=${this.manifest.version}`;
  }

  fetchFrame(i) {
    if (this.frames[i]) return Promise.resolve(this.frames[i]);
    return new Promise((ok) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        this.frames[i] = img;
        // кадр ближе к нужному, чем нарисованный: перерисовать
        if (Math.abs(i - this.want) < Math.abs((this.drawn ?? Infinity) - this.want)) this.draw();
        ok(img);
      };
      img.onerror = () => ok(null);
      img.src = this.url(i);
    });
  }

  async pump() {
    while (this.alive && this.queue.length) {
      const i = this.queue.shift();
      if (!this.frames[i]) await this.fetchFrame(i);
    }
  }

  setInset(left, top, bottom) {
    this.inset = [left, top, bottom];
    this.draw();
  }

  resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = Math.round(this.canvas.clientWidth * dpr), h = Math.round(this.canvas.clientHeight * dpr);
    if (!w || !h) return;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.dpr = dpr;
    this.draw();
  }

  setT(t) {
    this.t = Math.max(0, Math.min(1, t));
    this.want = Math.round(this.t * (this.n - 1));
    this.draw();
    const ch = this.chapterAt(this.want);
    if (ch !== this.chapter) {
      this.chapter = ch;
      this.listeners.forEach((fn) => fn({ type: "chapter", index: ch, chapter: this.chapters[ch] }));
    }
  }

  chapterAt(frame) {
    let k = 0;
    this.chapters.forEach((c, i) => (frame >= c.from ? (k = i) : 0));
    return k;
  }

  /** Доля прокрутки (0..1) для начала главы i. */
  chapterT(i) {
    return (this.chapters[i]?.from ?? 0) / Math.max(1, this.n - 1);
  }

  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  nearest() {
    for (let d = 0; d < this.n; d++) {
      if (this.frames[this.want - d]) return this.want - d;
      if (this.frames[this.want + d]) return this.want + d;
    }
    return -1;
  }

  draw() {
    if (!this.frames.length) return;
    const i = this.nearest();
    if (i < 0) return;
    const img = this.frames[i];
    const { width: W, height: H } = this.canvas;
    const dpr = this.dpr ?? 1;
    const [left, top, bottom] = this.inset.map((v) => v * dpr);
    const aw = W - left, ah = H - top - bottom;
    // кадр 16:9 вписан в свободную область (не под колонкой с текстом)
    let s = Math.min(aw / this.size.w, ah / this.size.h) * 1.12;
    // вертикальный экран: объект в центре кадра, бока можно срезать до 40% ради крупного плана
    if (aw / ah < 1.2) s = Math.min(ah / this.size.h, (aw / this.size.w) * 1.7);
    const dw = this.size.w * s, dh = this.size.h * s;
    const x = left + (aw - dw) / 2, y = top + (ah - dh) / 2;
    const c = this.ctx;
    c.clearRect(0, 0, W, H);
    c.imageSmoothingQuality = "high";
    c.globalCompositeOperation = "source-over";
    c.drawImage(img, x, y, dw, dh);
    // края кадра растворяются: браслет и детали, обрезанные рамкой рендера, не дают жёсткой линии
    c.globalCompositeOperation = "destination-in";
    for (const [x0, y0, x1, y1] of [[x, y, x, y + dh], [x, y, x + dw, y]]) {
      const gr = c.createLinearGradient(x0, y0, x1, y1);
      gr.addColorStop(0, "rgba(0,0,0,0)");
      gr.addColorStop(0.12, "rgba(0,0,0,1)");
      gr.addColorStop(0.88, "rgba(0,0,0,1)");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = gr;
      c.fillRect(x, y, dw, dh);
    }
    c.globalCompositeOperation = "source-over";
    this.drawn = i;
  }

  dispose() {
    this.alive = false;
    this.queue = [];
    this.ro?.disconnect();
    this.listeners.clear();
    this.frames = [];
  }
}
