// Страница лаборатории хронометрии и интерактивного вибрографа (/timegrapher)

import { html, qs } from "../core/dom.js";
import { TimegrapherSimulator } from "../ui/timegrapher-sim.js";

export default {
  layer: "page",

  async data() {
    const params = new URLSearchParams(window.location.search);
    const caliberSlug = params.get("caliber") || "rolex-3235";
    return { caliberSlug };
  },

  meta: () => ({
    title: "Виртуальный виброграф: лаборатория точности и хронометрии | Horologium",
    crumbs: [{ label: "Глобус", href: "/" }, { label: "Калибры", href: "/movements" }, { label: "Виброграф" }],
  }),

  render() {
    return html`
      <article class="timegrapher-page container">
        <header class="tg-page-head" data-reveal>
          <div class="tg-page-badge">
            <i class="ph-light ph-wave-sine" aria-hidden="true"></i>
            <span>Лаборатория хронометрии и метрологии</span>
          </div>
          <h1 class="display tg-page-title">Виртуальный виброграф (Timing Machine)</h1>
          <p class="lead tg-page-lead">
            Прецизионная симуляция приборов Witschi Chronoscope и Weishi 1000/1900. Измерение суточного отклонения хода (s/d), амплитуды колебаний баланса, ошибки выкачки (Beat Error) в 6 пространственных положениях и сверка с сертификатами COSC, METAS, Rolex Superlative и Grand Seiko.
          </p>
        </header>

        <!-- Контейнер симулятора вибрографа -->
        <section class="tg-sim-container" id="tg-sim-root" data-reveal></section>

        <!-- Нижняя навигация -->
        <nav class="bnext" aria-label="Дальше">
          <a class="link-arrow" href="/movements">Каталог 110 калибров <i class="ph-light ph-arrow-right" aria-hidden="true"></i></a>
          <a class="link-arrow" href="/history">История часового дела (500 лет) <i class="ph-light ph-arrow-right" aria-hidden="true"></i></a>
        </nav>
      </article>
    `;
  },

  mount(root, { caliberSlug }) {
    const simRoot = qs("#tg-sim-root", root);
    let simulator = null;

    if (simRoot) {
      simulator = new TimegrapherSimulator({
        container: simRoot,
        presetId: caliberSlug,
      });
    }

    return () => {
      if (simulator) {
        simulator.destroy();
      }
    };
  },
};
