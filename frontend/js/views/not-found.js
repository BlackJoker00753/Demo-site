import { html } from "../core/dom.js";

export default {
  layer: "page",
  meta: () => ({ title: "Страница не найдена | Horologium", crumbs: [{ label: "404" }] }),
  render: () => html`<section class="error-state">
    <p class="label">404</p>
    <h1 class="display display--m">Эта стрелка никуда не указывает</h1>
    <p>Такой страницы в атласе нет. Вернитесь к глобусу или воспользуйтесь поиском.</p>
    <a class="btn" href="/">К глобусу</a>
  </section>`,
};
