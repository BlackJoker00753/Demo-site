// Страница интерактивного симулятора мирового времени (World Time & Louis Cottier Heure Universelle)

import { api } from "../core/api.js";
import { html, qs } from "../core/dom.js";
import { attachGallery, watchCard } from "../ui/cards.js";
import { revealPhotos } from "../ui/photo.js";
import { renderWorldTimeSimulator, mountWorldTimeSimulator } from "../ui/worldtime-sim.js";

export default {
  layer: "page",

  async data() {
    const watches = await api.watches().catch(() => []);
    // Выбираем модели с функцией мирового времени или GMT
    const worldWatches = watches.filter(
      (w) =>
        w.complications?.some((c) => ["world-time", "gmt"].includes(c)) ||
        w.slug.includes("gmt") ||
        w.slug.includes("world") ||
        w.name.toLowerCase().includes("gmt")
    );

    return {
      watches: worldWatches.length ? worldWatches : watches.slice(0, 4),
    };
  },

  meta: () => ({
    title: "Симулятор мирового времени: 24 пояса Земли и система Луи Котье | Horologium",
    crumbs: [{ label: "Глобус", href: "/" }, { label: "Усложнения", href: "/glossary" }, { label: "Мировое время (World Time)" }],
  }),

  render({ watches }) {
    return html`
      <div class="worldtime-view container">
        <header class="worldtime-view__hero">
          <p class="label" data-reveal><i class="ph-light ph-globe-hemisphere-west" aria-hidden="true"></i> Механические усложнения</p>
          <h1 class="display display--l" data-reveal>Симулятор мирового времени (World Time)</h1>
          <p class="lead" data-reveal>
            Интерактивная модель культового механизма Heure Universelle Луи Котье (1931) и калибра Patek Philippe 240 HU:
            одновременное считывание времени в 24 поясах планеты, вращающееся двухцветное кольцо день/ночь и скачковый корректор на 10 часах.
          </p>
        </header>

        <section class="worldtime-view__simulator" aria-label="Симулятор механического мирового времени">
          ${renderWorldTimeSimulator("world-time")}
        </section>

        ${watches.length
          ? html`
              <section class="catalog worldtime-view__models" id="models">
                <div class="catalog__head">
                  <h2 class="display display--m">Часы с функцией второго часового пояса и мирового времени</h2>
                  <p class="muted catalog__count">Модели из коллекции атласа Horologium</p>
                </div>
                <div class="grid" data-grid>${watches.map((w, i) => watchCard(w, { showBrand: true, i }))}</div>
              </section>
            `
          : ""}
      </div>
    `;
  },

  mount(root, { watches }) {
    revealPhotos(root);
    const offSim = mountWorldTimeSimulator(root);

    let offGallery = null;
    const grid = qs("[data-grid]", root);
    if (grid) {
      attachGallery(grid, watches).then((fn) => (offGallery = fn));
    }

    return () => {
      offSim?.();
      offGallery?.();
    };
  },
};
