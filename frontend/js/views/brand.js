// Бренд: история, средняя цена и диапазон, каталог моделей с вкладками и 3D-превью.

import { api } from "../core/api.js";
import { html, qs, qsa } from "../core/dom.js";
import { MANUFACTURE, models, TIER, usd } from "../core/format.js";
import { countUp, reduced } from "../core/motion.js";
import { attachGallery, buildInfo, watchCard } from "../ui/cards.js";
import { photoCredit, photoImg, revealPhotos } from "../ui/photo.js";

const SORTS = [
  ["default", "Рекомендуем"],
  ["price_asc", "Дешевле"],
  ["price_desc", "Дороже"],
  ["year", "Старше"],
];

function matches(card, key) {
  if (key === "all") return true;
  if (key === "mechanical") return card.dataset.type === "automatic" || card.dataset.type === "manual";
  if (["automatic", "manual", "quartz", "solar", "kinetic", "spring_drive", "smart"].includes(key)) return card.dataset.type === key;
  return card.dataset.comps.split(" ").includes(key);
}

export default {
  layer: "page",

  data: ({ params }) => api.brand(params[0]),

  meta: (b) => ({
    title: `${b.name}: модели, история и цены | Horologium`,
    crumbs: [
      { label: "Глобус", href: "/" },
      { label: b.country_name, href: `/country/${b.country}` },
      { label: b.name },
    ],
  }),

  render(b) {
    const p = b.prices;
    const hero = b.watches.find((w) => w.slug === b.hero_slug) ?? b.watches.find((w) => w.icon) ?? b.watches[0];
    const firstMovementFacet = b.facets.findIndex((f) => f.kind === "complication");
    return html`
      <article class="brand">
        <header class="bhero">
          <div class="bhero__text">
            <p class="label" data-hero>${b.country_name}, с ${b.founded} года</p>
            <h1 class="display bhero__name" data-hero>${b.name}</h1>
            <p class="lead" data-hero>${b.tagline}</p>
            <div class="bhero__price" data-hero>
              <div>
                <span class="bhero__price-label">Средняя цена модели в атласе</span>
                <span class="price bhero__avg num" data-count="${p.avg ?? 0}">${usd(p.avg)}</span>
              </div>
              <div class="bhero__range">
                <span>от <b class="num">${usd(p.min)}</b></span>
                <span>до <b class="num">${usd(p.max)}</b></span>
                <span class="muted">${models(p.count)}</span>
              </div>
            </div>
            <div class="bhero__cta" data-hero>
              <a class="btn" href="#catalog" data-scroll-to="catalog">Смотреть модели <i class="ph-light ph-arrow-down" aria-hidden="true"></i></a>
              ${hero ? html`<a class="btn btn--ghost" href="/watch/${hero.slug}">${hero.name}</a>` : ""}
            </div>
          </div>
          ${b.hero_photo
            ? html`<figure class="bhero__plate">
                <a class="bhero__frame" href="/watch/${hero.slug}" aria-label="${hero.name}" data-shared="w-${hero.slug}">
                  ${photoImg(b.hero_photo, { eager: true, cls: "bhero__photo", sizes: "(max-width: 900px) 92vw, 46vw", alt: `${b.name} ${hero.name}` })}
                </a>
                <figcaption class="bhero__figcap">
                  <a class="bhero__caption" href="/watch/${hero.slug}"><span>${hero.name}</span><span class="num">${usd(hero.price.usd)}</span></a>
                  ${photoCredit(b.hero_photo)}
                </figcaption>
              </figure>`
            : html`<div class="bhero__stage" aria-hidden="true">
                <canvas class="bhero__canvas"></canvas>
                ${hero ? html`<a class="bhero__caption" href="/watch/${hero.slug}"><span>${hero.name}</span><span class="num">${usd(hero.price.usd)}</span></a>` : ""}
              </div>`}
        </header>

        <section class="bfacts container" aria-label="Факты о бренде">
          <dl>
            <div data-reveal style="--i:0"><dt>Основан</dt><dd class="bfacts__big num">${b.founded}</dd><dd>${b.founder}</dd></div>
            <div data-reveal style="--i:1"><dt>Штаб-квартира</dt><dd class="bfacts__big">${b.city}</dd><dd>${b.country_name}</dd></div>
            <div data-reveal style="--i:2"><dt>Владелец</dt><dd class="bfacts__big bfacts__mid">${b.group ?? (b.independent ? "Независимый" : "")}</dd><dd>${b.independent ? "Независимая компания" : "В составе группы"}</dd></div>
            <div data-reveal style="--i:3"><dt>Механизмы</dt><dd class="bfacts__big bfacts__mid">${MANUFACTURE[b.manufacture]}</dd><dd>${TIER[b.tier]}</dd></div>
          </dl>
          ${b.manufacture_note ? html`<p class="bfacts__note" data-reveal>${b.manufacture_note}</p>` : ""}
        </section>

        <section class="bstory container">
          <h2 class="display display--m" data-reveal>История</h2>
          <div class="bstory__body">
            <div class="prose bstory__text">
              ${b.story.map((s, i) => html`<p data-reveal style="--i:${i}" class="${i === 0 ? "bstory__first" : ""}">${s}</p>`)}
            </div>
            ${b.facts.length
              ? html`<dl class="bstory__facts">
                  ${b.facts.map((f, i) => html`<div data-reveal style="--i:${i}"><dt>${f.label}</dt><dd>${f.value}</dd></div>`)}
                </dl>`
              : ""}
          </div>
          ${b.milestones.length
            ? html`<ol class="bmiles" role="list" data-lenis-prevent-horizontal>
                ${b.milestones.map((m, i) => html`<li data-reveal style="--i:${i}"><span class="bmiles__year num">${m.year}</span><span>${m.text}</span></li>`)}
              </ol>`
            : ""}
        </section>

        <section class="catalog" id="catalog">
          <div class="catalog__bar">
            <div class="container catalog__bar-inner">
              <div class="tabs" role="tablist" aria-label="Фильтр моделей">
                <span class="tabs__pill" aria-hidden="true"></span>
                ${b.facets.map(
                  (f, i) => html`<button class="tab ${i === firstMovementFacet ? "tab--group-start" : ""}" role="tab" type="button"
                    data-facet="${f.key}" aria-selected="${f.key === "all"}">${f.label}<span class="tab__count">${f.count}</span></button>`,
                )}
              </div>
              <label class="sort">
                <span class="visually-hidden">Сортировка</span>
                <select data-sort>
                  ${SORTS.map(([k, label]) => html`<option value="${k}">${label}</option>`)}
                </select>
                <i class="ph-light ph-caret-down" aria-hidden="true"></i>
              </label>
            </div>
          </div>
          <div class="container">
            <div class="catalog__head">
              <h2 class="display display--m">Модели</h2>
              <p class="muted catalog__count" aria-live="polite">${models(b.watches.length)}</p>
            </div>
            <div class="grid" data-grid>
              ${b.watches.map((w, i) => watchCard(w, { i }))}
            </div>
            <p class="catalog__note muted">Цены: официальная розница в США на дату проверки, если не указано иное. Нажмите на модель, чтобы открыть её историю, механизм и разборку.</p>
          </div>
        </section>

        <nav class="bnext container" aria-label="Дальше">
          <a class="link-arrow" href="/country/${b.country}"><i class="ph-light ph-arrow-left" aria-hidden="true"></i>Все бренды: ${b.country_name}</a>
          ${b.website ? html`<a class="link-arrow" href="${b.website}" target="_blank" rel="noopener" data-external>Официальный сайт <i class="ph-light ph-arrow-up-right" aria-hidden="true"></i></a>` : ""}
        </nav>
      </article>`;
  },

  mount(root, b, ctx = {}) {
    const cleanups = [];
    const g = window.gsap;
    const grid = qs("[data-grid]", root);
    const cards = qsa(".wcard", grid);

    // Шапка
    revealPhotos(root);
    const plate = qs(".bhero__plate", root);
    if (g && !reduced()) {
      g.from(qsa("[data-hero]", root), { y: 28, autoAlpha: 0, duration: 1.2, stagger: 0.07, ease: "expo.out", delay: 0.1 });
      const media = plate ?? qs(".bhero__stage", root);
      if (!ctx.shared) g.from(media, { autoAlpha: 0, y: 24, scale: 0.97, duration: 1.6, ease: "expo.out", delay: 0.2 });
      if (plate) {
        // Фото медленно «наезжает» внутри рамки, пока шапка уходит вверх.
        g.fromTo(qs(".bhero__photo", plate), { scale: 1.02, yPercent: 0 }, {
          scale: 1.14, yPercent: 4, ease: "none",
          scrollTrigger: { trigger: qs(".bhero", root), start: "top top", end: "bottom top", scrub: true },
        });
      }
    }
    const avg = qs("[data-count]", root);
    if (avg && b.prices.avg) countUp(avg, b.prices.avg, { duration: 1.8, format: (v) => usd(Math.round(v / 10) * 10) });

    // 3D-витрина, только если у бренда ещё нет ни одной свободной фотографии
    const hero = b.watches.find((w) => w.slug === b.hero_slug) ?? b.watches.find((w) => w.icon) ?? b.watches[0];
    let stage = null;
    if (hero && !plate) {
      Promise.all([import("../watch3d/stage.js"), import("../watch3d/factory.js")]).then(([{ WatchStage }, { buildWatch }]) => {
        if (!root.isConnected) return;
        stage = new WatchStage(qs(".bhero__canvas", root));
        stage.frameScale = 1.25;
        stage.setModel(buildWatch(hero.render, { ...buildInfo(hero), detail: "showcase" }));
        stage.pose.ry = 0.45;
        stage.start();
        if (g && !reduced()) {
          g.to(stage.pose, {
            ry: -0.25, rx: 0.05, dist: 1.15, ease: "none",
            scrollTrigger: { trigger: root.querySelector(".bhero"), start: "top top", end: "bottom top", scrub: 1 },
          });
        }
      });
    }
    cleanups.push(() => stage?.dispose());

    // Каталог: 3D-превью в общей галерее
    attachGallery(grid, b.watches).then((off) => {
      cleanups.push(off);
      if (!grid.querySelector("[data-watch]")) return;
      import("../watch3d/gallery.js").then(({ getGallery }) => {
        const bar = qs(".catalog__bar", root);
        getGallery().clipTop = () => Math.max(68, bar.getBoundingClientRect().bottom - 4);
      });
    });

    // Вкладки с «пилюлей», фильтр и сортировка с FLIP
    const tabs = qsa(".tab", root);
    const pill = qs(".tabs__pill", root);
    const movePill = (tab) => {
      pill.style.width = `${tab.offsetWidth}px`;
      pill.style.transform = `translateX(${tab.offsetLeft - 4}px)`;
    };
    requestAnimationFrame(() => movePill(tabs[0]));
    let facet = "all";
    let sort = "default";
    const original = [...cards];

    const apply = () => {
      const first = new Map(cards.map((c) => [c, c.getBoundingClientRect()]));
      let list = original.filter((c) => matches(c, facet));
      if (sort !== "default") {
        const key = sort.startsWith("price") ? "price" : "year";
        list = [...list].sort((a, bb) => (+a.dataset[key] - +bb.dataset[key]) * (sort === "price_desc" ? -1 : 1));
      }
      original.forEach((c) => (c.hidden = !list.includes(c)));
      list.forEach((c) => grid.append(c));
      qs(".catalog__count", root).textContent = models(list.length);
      if (!g || reduced()) return;
      list.forEach((c) => {
        const a = first.get(c), bnow = c.getBoundingClientRect();
        if (a.width && (a.left !== bnow.left || a.top !== bnow.top)) {
          g.fromTo(c, { x: a.left - bnow.left, y: a.top - bnow.top }, { x: 0, y: 0, duration: 0.8, ease: "expo.out" });
        } else if (!a.width) {
          g.fromTo(c, { autoAlpha: 0, scale: 0.94 }, { autoAlpha: 1, scale: 1, duration: 0.7, ease: "expo.out" });
        }
      });
      window.ScrollTrigger?.refresh();
    };

    tabs.forEach((tab) =>
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.setAttribute("aria-selected", t === tab));
        movePill(tab);
        tab.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
        facet = tab.dataset.facet;
        apply();
      }),
    );
    qs("[data-sort]", root).addEventListener("change", (e) => {
      sort = e.target.value;
      apply();
    });
    qs("[data-scroll-to]", root)?.addEventListener("click", (e) => {
      e.preventDefault();
      import("../core/scroll.js").then(({ scrollToEl }) => scrollToEl(qs("#catalog", root), -20));
    });
    const onResize = () => movePill(tabs.find((t) => t.getAttribute("aria-selected") === "true") ?? tabs[0]);
    window.addEventListener("resize", onResize);
    cleanups.push(() => window.removeEventListener("resize", onResize));

    return () => cleanups.forEach((fn) => fn());
  },
};
