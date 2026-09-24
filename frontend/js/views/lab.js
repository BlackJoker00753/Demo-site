// 3D-лаборатория: служебная страница для проверки фабрики часов (не в навигации).

import { api } from "../core/api.js";
import { html, qs } from "../core/dom.js";

export default {
  layer: "page",
  async data() {
    return api.watches();
  },
  meta: () => ({ title: "3D-лаборатория | Horologium", crumbs: [{ label: "Глобус", href: "/" }, { label: "3D-лаборатория" }] }),
  render(watches) {
    return html`<section class="lab">
      <aside class="lab__list" data-lenis-prevent>
        ${watches.map((w) => html`<button type="button" data-slug="${w.slug}">${w.brand_name} ${w.name}</button>`)}
      </aside>
      <div class="lab__stage"><canvas id="lab-canvas"></canvas></div>
      <div class="lab__controls">
        <label>Разборка <input type="range" min="0" max="1" step="0.001" value="0" id="lab-explode"></label>
        <span id="lab-part" class="mono"></span>
      </div>
    </section>`;
  },
  mount(root, watches) {
    let stage, model;
    const bySlug = new Map(watches.map((w) => [w.slug, w]));
    (async () => {
      const [{ WatchStage }, { buildWatch }] = await Promise.all([import("../watch3d/stage.js"), import("../watch3d/factory.js")]);
      stage = new WatchStage(qs("#lab-canvas", root));
      stage.start();
      stage.onPick((key) => { qs("#lab-part", root).textContent = key ?? ""; stage.highlight(key); });
      const show = async (slug) => {
        const w = await api.watch(slug);
        model = buildWatch(w.render, { detail: "hero", diameter: w.case.diameter_mm, thickness: w.case.thickness_mm ?? 12, movementType: w.movement.type, frequency: w.movement.frequency_vph, logo: w.render.logo, caption: w.collection, calibre: w.movement.caliber });
        stage.setModel(model);
        model.setExplode(+qs("#lab-explode", root).value);
      };
      root.addEventListener("click", (e) => { const b = e.target.closest("[data-slug]"); if (b) show(b.dataset.slug); });
      qs("#lab-explode", root).addEventListener("input", (e) => model?.setExplode(+e.target.value));
      show(new URLSearchParams(location.search).get("w") || watches.find((w) => w.icon)?.slug || watches[0].slug);
      window.__lab = { stage, get model() { return model; } };
    })();
    return () => stage?.dispose();
  },
};
