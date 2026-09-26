// Усложнения: все функции часов лестницей от простых к вершинам ремесла.
// У каждой: категория, сложность, короткое объяснение и сколько моделей атласа её умеют.

import { api } from "../core/api.js";
import { html } from "../core/dom.js";
import { COMP_CATEGORY, DIFFICULTY, models } from "../core/format.js";

/** Пять делений сложности, закрашено n. */
export const diffMeter = (n, cls = "") =>
  html`<span class="dmeter ${cls}" role="img" aria-label="Сложность ${n} из 5">${[1, 2, 3, 4, 5].map((k) => html`<i class="${k <= n ? "is-on" : ""}"></i>`)}</span>`;

const LEVEL_NOTE = {
  1: "Их понимает каждый владелец часов: дата, малая секундная стрелка, шкалы на безеле.",
  2: "Второй часовой пояс, день недели, запас хода, фаза Луны: несколько лишних колёс и дисков.",
  3: "Хронограф, годовой календарь, будильник: отдельные механизмы внутри механизма.",
  4: "Вечный календарь, мировое время, флайбэк: сотни деталей и точная ручная сборка.",
  5: "Турбийон, сплит-секунды, минутный репетир: их собирают единицы мастеров в мире.",
};

export default {
  layer: "page",

  async data() {
    const [comps, watches] = await Promise.all([api.complications(), api.watches()]);
    const count = new Map();
    for (const w of watches) for (const c of w.complications) count.set(c.slug, (count.get(c.slug) ?? 0) + 1);
    return { comps, count };
  },

  meta: () => ({
    title: "Усложнения часов: от даты до минутного репетира | Horologium",
    crumbs: [{ label: "Глобус", href: "/" }, { label: "Усложнения" }],
  }),

  render({ comps, count }) {
    const levels = [1, 2, 3, 4, 5].map((d) => [d, comps.filter((c) => c.difficulty === d)]).filter(([, list]) => list.length);
    return html`<article class="gloss">
      <header class="gloss__head container">
        <p class="label" data-reveal>Словарь атласа</p>
        <h1 class="display display--l" data-reveal>Усложнения</h1>
        <p class="lead" data-reveal>Всё, что часы умеют кроме часов и минут. ${comps.length} функций по возрастанию сложности:
          от даты, которую знает каждый, до минутного репетира, который отбивает время. Нажмите на функцию, чтобы узнать,
          как она устроена, кто её придумал и какие часы атласа её умеют.</p>
        <ol class="gloss__scale" role="list" data-reveal>
          ${levels.map(([d]) => html`<li><a href="#level-${d}">${diffMeter(d)}<span>${DIFFICULTY[d]}</span></a></li>`)}
        </ol>
      </header>

      ${levels.map(([d, list]) => html`<section class="gloss__level container" id="level-${d}" aria-labelledby="level-${d}-title">
        <div class="gloss__level-head" data-reveal>
          ${diffMeter(d, "dmeter--l")}
          <h2 class="display display--m" id="level-${d}-title">${DIFFICULTY[d]}</h2>
          <p class="muted">${LEVEL_NOTE[d]}</p>
        </div>
        <div class="gloss__grid">
          ${list.map((c, i) => {
            const n = count.get(c.slug) ?? 0;
            return html`<a class="gcard" href="/complication/${c.slug}" data-reveal style="--i:${i % 4}">
              <span class="gcard__top"><span class="chip">${COMP_CATEGORY[c.category] ?? c.category}</span><span class="gcard__en">${c.name_en}</span></span>
              <h3 class="gcard__name">${c.name}</h3>
              <p class="gcard__short">${c.short}</p>
              <span class="gcard__foot">
                <span class="${n ? "" : "muted"}">${n ? `${models(n)} в атласе` : "В атласе пока нет моделей"}</span>
                <i class="ph-light ph-arrow-right" aria-hidden="true"></i>
              </span>
            </a>`;
          })}
        </div>
      </section>`)}
    </article>`;
  },
};
