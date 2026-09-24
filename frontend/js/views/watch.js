import { html } from "../core/dom.js";
export default {
  layer: "page",
  meta: () => ({ title: "Horologium", crumbs: [{ label: "Глобус", href: "/" }, { label: "watch" }] }),
  render: (_, ctx) => html`<section class="error-state"><h1 class="display display--m">watch: ${ctx.params[0] ?? ""}</h1><p>Страница в разработке.</p><a class="btn" href="/">К глобусу</a></section>`,
};
