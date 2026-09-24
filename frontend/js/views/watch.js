// Модель часов: скролл-история в духе презентаций Apple.
//
// Секции: герой (закреплён, часы вращаются на скролле) → коротко → в цифрах →
// история → поколения (горизонтальная лента) → механизм → усложнения →
// разборка (закреплена, ползунок и скролл разбирают часы) → цена → другие модели.

import { api } from "../core/api.js";
import { html, qs, qsa } from "../core/dom.js";
import { date, hours, MOVEMENT, num, PRICE_KIND, usd, vph } from "../core/format.js";
import { countUp, reduced, splitWords } from "../core/motion.js";
import { scrollToEl } from "../core/scroll.js";
import { attachGallery, buildInfo, watchCard } from "../ui/cards.js";
import { partInfo } from "../watch3d/parts-info.js";

const DIFFICULTY = ["", "Простое", "Несложное", "Среднее", "Сложное", "Вершина ремесла"];

function specTiles(w) {
  const m = w.movement;
  const tiles = [
    ["Диаметр", num(w.case.diameter_mm), "мм"],
    w.case.thickness_mm && ["Толщина", String(w.case.thickness_mm).replace(".", ","), "мм"],
    w.case.water_resistance_m && ["Водозащита", num(w.case.water_resistance_m), "м"],
    m.power_reserve_h && ["Запас хода", num(m.power_reserve_h), "ч"],
    m.frequency_vph && ["Частота", (m.frequency_vph / 7200).toLocaleString("ru-RU", { maximumFractionDigits: 1 }), "Гц"],
    m.jewels && ["Камни", String(m.jewels), ""],
  ].filter(Boolean);
  return tiles;
}

function priceBlock(w) {
  const p = w.price;
  const bp = w.brand_prices;
  const diff = bp.avg ? Math.round(((p.usd - bp.avg) / bp.avg) * 100) : 0;
  const pos = bp.max > bp.min ? ((p.usd - bp.min) / (bp.max - bp.min)) * 100 : 50;
  return html`<section class="wprice container" id="price">
    <div class="wprice__main" data-reveal>
      <p class="label">${PRICE_KIND[p.kind] ?? "Цена"}</p>
      <p class="price wprice__value num" data-count-price="${p.usd}">${usd(p.usd)}</p>
      <p class="wprice__meta">
        Источник: ${p.url ? html`<a href="${p.url}" target="_blank" rel="noopener" data-external>${p.source}</a>` : p.source}.
        Проверено ${date(p.checked)}.${p.note ? html` ${p.note}.` : ""}
      </p>
    </div>
    <div class="wprice__compare" data-reveal style="--i:1">
      <p class="wprice__diff">${diff === 0 ? "Ровно на уровне средней цены" : diff > 0 ? `На ${diff}% дороже` : `На ${Math.abs(diff)}% дешевле`}
        ${diff === 0 ? "" : html`<span>средней цены ${w.brand_name} в атласе (${usd(bp.avg)})</span>`}</p>
      <div class="wrange" role="img" aria-label="Положение цены в диапазоне бренда">
        <div class="wrange__line"></div>
        <div class="wrange__dot" style="left:${Math.min(100, Math.max(0, pos))}%"></div>
        <span class="wrange__min num">${usd(bp.min)}</span>
        <span class="wrange__max num">${usd(bp.max)}</span>
      </div>
      ${w.price_history.length > 1
        ? html`<ul class="wprice__history" role="list">
            ${w.price_history.map((h) => html`<li><span>${date(h.fetched_at)}</span><span class="num">${usd(h.usd)}</span><span class="muted">${h.source}</span></li>`)}
          </ul>`
        : ""}
    </div>
  </section>`;
}

export default {
  layer: "page",

  data: ({ params }) => api.watch(params[0]),

  meta: (w) => ({
    title: `${w.brand_name} ${w.name} | Horologium`,
    crumbs: [
      { label: "Глобус", href: "/" },
      { label: w.country_name, href: `/country/${w.country}` },
      { label: w.brand_name, href: `/brand/${w.brand}` },
      { label: w.name },
    ],
  }),

  render(w) {
    const m = w.movement;
    const tiles = specTiles(w);
    const mech = m.type === "automatic" || m.type === "manual" || m.type === "spring_drive";
    return html`
      <article class="watch">
        <section class="whero" id="top">
          <div class="whero__sticky">
            <canvas class="whero__canvas" aria-label="3D-модель ${w.brand_name} ${w.name}. Перетащите, чтобы повернуть."></canvas>
            <div class="whero__text">
              <a class="whero__brand" href="/brand/${w.brand}" data-h>${w.brand_name}</a>
              <h1 class="display whero__name" data-h>${w.name}</h1>
              <p class="whero__ref" data-h>
                ${w.reference ? html`<span class="mono">Ref. ${w.reference}</span>` : ""}
                ${w.year_introduced ? html`<span>С ${w.year_introduced} года</span>` : ""}
                <span>${MOVEMENT[m.type]?.label}</span>
              </p>
              <div class="whero__buy" data-h>
                <span class="price whero__price num">${usd(w.price.usd)}</span>
                <span class="price-kind">${PRICE_KIND[w.price.kind]}, ${date(w.price.checked)}</span>
              </div>
              <div class="whero__cta" data-h>
                <a class="btn" href="#explode" data-jump="explode"><i class="ph-light ph-cube-transparent" aria-hidden="true"></i>Разобрать часы</a>
                <a class="btn btn--ghost" href="#story" data-jump="story">История</a>
              </div>
            </div>
            <p class="whero__hint" data-h><i class="ph-light ph-hand-grabbing" aria-hidden="true"></i>Потяните, чтобы повернуть</p>
          </div>
        </section>

        <section class="wintro container" id="story">
          <p class="wintro__summary" data-words>${w.summary}</p>
          ${w.highlights.length
            ? html`<ul class="whl" role="list" style="--n:${Math.min(4, w.highlights.length)};--n-md:${w.highlights.length === 3 ? 3 : 2}">
                ${w.highlights.map((h, i) => html`<li data-reveal style="--i:${i}"><i class="ph-light ${["ph-sparkle", "ph-drop", "ph-gear-six", "ph-shield-check", "ph-lightning"][i % 5]}" aria-hidden="true"></i><span>${h}</span></li>`)}
              </ul>`
            : ""}
        </section>

        <section class="wspecs container" aria-label="Характеристики">
          <div class="wspecs__grid">
            ${tiles.map(
              ([label, value, unit], i) => html`<div class="wspec" data-reveal style="--i:${i}">
                <span class="wspec__label">${label}</span>
                <span class="wspec__value num">${value}<small>${unit}</small></span>
              </div>`,
            )}
          </div>
          <dl class="wspecs__list" data-reveal>
            <div><dt>Корпус</dt><dd>${w.case.material}</dd></div>
            <div><dt>Стекло</dt><dd>${w.case.crystal}</dd></div>
            ${w.dial ? html`<div><dt>Циферблат</dt><dd>${w.dial}</dd></div>` : ""}
            ${w.bracelet ? html`<div><dt>Браслет или ремешок</dt><dd>${w.bracelet}</dd></div>` : ""}
            ${w.designer ? html`<div><dt>Автор</dt><dd>${w.designer}</dd></div>` : ""}
            ${w.case.lug_width_mm ? html`<div><dt>Ширина ремешка</dt><dd>${w.case.lug_width_mm} мм</dd></div>` : ""}
          </dl>
        </section>

        ${w.story.length
          ? html`<section class="wstory container">
              <h2 class="display display--l" data-reveal>История модели</h2>
              <div class="wstory__text">
                ${w.story.map((p, i) => html`<p data-reveal style="--i:${i % 3}">${p}</p>`)}
              </div>
            </section>`
          : ""}

        ${w.history.length
          ? html`<section class="wtimeline" aria-label="Поколения">
              <div class="wtimeline__pin">
                <div class="wtimeline__head container">
                  <h2 class="display display--m">Поколения</h2>
                  <p class="muted">${w.history[0].year} - ${w.history[w.history.length - 1].year}</p>
                </div>
                <ol class="wtimeline__track" role="list">
                  ${w.history.map(
                    (h, i) => html`<li class="wgen ${i === w.history.length - 1 ? "is-current" : ""}">
                      <span class="wgen__year num">${h.year}</span>
                      ${h.ref ? html`<span class="wgen__ref mono">Ref. ${h.ref}</span>` : ""}
                      <h3 class="wgen__title">${h.title}</h3>
                      <p>${h.text}</p>
                    </li>`,
                  )}
                </ol>
              </div>
            </section>`
          : ""}

        <section class="wmove container" id="movement">
          <div class="wmove__head">
            <p class="label">Механизм</p>
            <h2 class="display display--l">${m.caliber}</h2>
            <div class="wmove__badges">
              ${m.in_house
                ? html`<span class="chip chip--lume"><i class="ph-light ph-seal-check" aria-hidden="true"></i>Мануфактурный калибр ${m.maker}</span>`
                : html`<span class="chip"><i class="ph-light ph-factory" aria-hidden="true"></i>Покупной механизм: ${m.maker}</span>`}
              ${m.base ? html`<span class="chip">Основа: ${m.base}</span>` : ""}
              ${m.certification ? html`<span class="chip">${m.certification}</span>` : ""}
            </div>
          </div>
          <div class="wmove__grid">
            ${m.power_reserve_h
              ? html`<div class="wmove__gauge" data-reveal>
                  <svg viewBox="0 0 200 200" aria-hidden="true">
                    <circle cx="100" cy="100" r="86" class="gauge__track"></circle>
                    <circle cx="100" cy="100" r="86" class="gauge__arc" data-gauge="${Math.min(1, m.power_reserve_h / 168)}"></circle>
                  </svg>
                  <div class="wmove__gauge-text"><span class="num" data-count-num="${m.power_reserve_h}">${num(m.power_reserve_h)}</span><small>${hours(m.power_reserve_h).split(" ").slice(1).join(" ")} запаса хода</small></div>
                </div>`
              : html`<div class="wmove__gauge wmove__gauge--quartz" data-reveal><i class="ph-thin ${MOVEMENT[m.type]?.icon}" aria-hidden="true"></i><small>${MOVEMENT[m.type]?.label}</small></div>`}
            <div class="wmove__info">
              ${m.description ? html`<p class="wmove__desc" data-reveal>${m.description}</p>` : ""}
              <dl class="wmove__facts" data-reveal>
                <div><dt>Тип</dt><dd>${MOVEMENT[m.type]?.label}</dd></div>
                ${m.frequency_vph ? html`<div><dt>Частота</dt><dd>${vph(m.frequency_vph)}</dd></div>` : ""}
                ${m.jewels ? html`<div><dt>Камни</dt><dd>${m.jewels}</dd></div>` : ""}
                ${m.accuracy ? html`<div><dt>Точность</dt><dd>${m.accuracy}</dd></div>` : ""}
                ${m.year ? html`<div><dt>Год калибра</dt><dd>${m.year}</dd></div>` : ""}
                ${m.diameter_mm ? html`<div><dt>Размер</dt><dd>${m.diameter_mm} × ${m.thickness_mm ?? "?"} мм</dd></div>` : ""}
              </dl>
              ${mech && m.frequency_vph
                ? html`<div class="beat" data-reveal style="--beat:${(7200 / m.frequency_vph).toFixed(4)}s">
                    <span class="beat__wheel" aria-hidden="true"></span>
                    <span>Баланс делает ${num(m.frequency_vph)} полуколебаний в час. Это ${Math.round(m.frequency_vph / 3600)} шагов секундной стрелки в секунду.</span>
                  </div>`
                : ""}
              ${m.features.length ? html`<ul class="wmove__features" role="list" data-reveal>${m.features.map((f) => html`<li>${f}</li>`)}</ul>` : ""}
              <a class="link-arrow" href="/movement/${m.slug}">Все часы с калибром ${m.caliber}<i class="ph-light ph-arrow-right" aria-hidden="true"></i></a>
            </div>
          </div>
        </section>

        ${w.complications_full.length
          ? html`<section class="wcomps container" aria-label="Усложнения">
              <h2 class="display display--m" data-reveal>Что умеют эти часы</h2>
              <div class="wcomps__grid">
                ${w.complications_full.map(
                  (c, i) => html`<a class="wcomp" href="/complication/${c.slug}" data-reveal style="--i:${i}">
                    <span class="wcomp__diff" title="Сложность ${c.difficulty} из 5">${DIFFICULTY[c.difficulty]}</span>
                    <h3>${c.name}</h3>
                    <p>${c.short}</p>
                    <p class="wcomp__how">${c.how_it_works}</p>
                    ${c.invented ? html`<p class="wcomp__inv">${c.invented}</p>` : ""}
                  </a>`,
                )}
              </div>
            </section>`
          : ""}

        <section class="wexplode" id="explode" aria-label="Разборка часов">
          <div class="wexplode__pin">
            <canvas class="wexplode__canvas" aria-label="Интерактивная разборка часов"></canvas>
            <div class="wexplode__head">
              <h2 class="display display--m">Из чего они сделаны</h2>
              <p class="muted">Прокрутите или потяните ползунок: часы разберутся на детали. Нажмите на деталь, чтобы узнать, зачем она нужна.</p>
            </div>
            <div class="wexplode__panel" data-lenis-prevent>
              <ol class="wparts" role="list"></ol>
            </div>
            <div class="wpart-card" hidden>
              <button class="wpart-card__close icon-btn" type="button" aria-label="Закрыть"><i class="ph-light ph-x" aria-hidden="true"></i></button>
              <h3></h3>
              <p></p>
            </div>
            <div class="wexplode__slider">
              <span>Собраны</span>
              <input type="range" min="0" max="1000" value="0" aria-label="Степень разборки">
              <span>Разобраны</span>
            </div>
          </div>
        </section>

        ${priceBlock(w)}

        ${w.siblings.length
          ? html`<section class="wmore container">
              <div class="wmore__head">
                <h2 class="display display--m">Ещё ${w.brand_name}</h2>
                <a class="link-arrow" href="/brand/${w.brand}">Все модели<i class="ph-light ph-arrow-right" aria-hidden="true"></i></a>
              </div>
              <div class="grid wmore__grid">${w.siblings.slice(0, 4).map((s, i) => watchCard(s, { i }))}</div>
            </section>`
          : ""}
      </article>`;
  },

  mount(root, w) {
    const g = window.gsap;
    const ST = window.ScrollTrigger;
    const still = reduced() || !g;
    const cleanups = [];
    const info = buildInfo(w);
    const calibre = w.movement.caliber.replace(new RegExp(`^${w.brand_name}\\s*`, "i"), "");
    const opts = { ...info, calibre };

    // ---------------------------------------------------------- hero
    if (!still) g.from(qsa("[data-h]", root), { y: 40, autoAlpha: 0, duration: 1.4, stagger: 0.08, ease: "expo.out", delay: 0.15 });
    let heroStage = null;
    Promise.all([import("../watch3d/stage.js"), import("../watch3d/factory.js")]).then(([{ WatchStage }, { buildWatch }]) => {
      if (!root.isConnected) return;
      heroStage = new WatchStage(qs(".whero__canvas", root));
      heroStage.frameScale = 1.32;
      heroStage.setModel(buildWatch(w.render, { ...opts, detail: "hero" }));
      heroStage.pose.ry = 0.42;
      heroStage.pose.rx = -0.12;
      heroStage.start();
      if (!still) {
        g.from(heroStage.pose, { ry: 1.6, dist: 1.5, duration: 2.4, ease: "expo.out" });
        const tl = g.timeline({
          scrollTrigger: {
            trigger: qs(".whero", root), start: "top top",
            end: () => `+=${Math.max(1, qs(".whero", root).offsetHeight - window.innerHeight)}`,
            scrub: 1.2, invalidateOnRefresh: true,
          },
        });
        // поворот в профиль, затем к задней крышке (если она прозрачная)
        tl.to(heroStage.pose, { ry: -0.9, rx: 0.1, dist: 0.9, ease: "power1.inOut", duration: 1 })
          .to(qs(".whero__text", root), { autoAlpha: 0, y: -40, duration: 0.4 }, 0.1)
          .to(heroStage.pose, { ry: w.render?.case?.display_back ? -Math.PI + 0.35 : -1.4, rx: 0.18, dist: 0.95, ease: "power1.inOut", duration: 1 });
        ST.refresh();
      }
    });
    cleanups.push(() => heroStage?.dispose());

    // ---------------------------------------------------------- jumps
    qsa("[data-jump]", root).forEach((a) =>
      a.addEventListener("click", (e) => {
        e.preventDefault();
        scrollToEl(qs(`#${a.dataset.jump}`, root), a.dataset.jump === "explode" ? 0 : -60);
      }),
    );

    // ---------------------------------------------------------- word reveal
    const summary = qs("[data-words]", root);
    if (summary && !still) {
      const words = splitWords(summary);
      g.fromTo(words, { opacity: 0.14 }, {
        opacity: 1, stagger: 0.05, ease: "none",
        scrollTrigger: { trigger: summary, start: "top 80%", end: "bottom 45%", scrub: true },
      });
    }

    // ---------------------------------------------------------- numbers
    qsa("[data-count-num]", root).forEach((el) => {
      if (still) return;
      ST.create({ trigger: el, start: "top 85%", once: true, onEnter: () => countUp(el, +el.dataset.countNum, { duration: 1.6 }) });
    });
    qsa("[data-gauge]", root).forEach((c) => {
      const len = 2 * Math.PI * 86;
      c.style.strokeDasharray = `${len}`;
      c.style.strokeDashoffset = `${len}`;
      const target = len * (1 - +c.dataset.gauge);
      if (still) c.style.strokeDashoffset = `${target}`;
      else ST.create({ trigger: c, start: "top 85%", once: true, onEnter: () => g.to(c, { strokeDashoffset: target, duration: 2, ease: "expo.out" }) });
    });
    const priceEl = qs("[data-count-price]", root);
    if (priceEl && !still) {
      ST.create({ trigger: priceEl, start: "top 85%", once: true, onEnter: () => countUp(priceEl, +priceEl.dataset.countPrice, { duration: 1.6, format: (v) => usd(Math.round(v)) }) });
    }

    // ---------------------------------------------------------- timeline: горизонтальная лента
    const track = qs(".wtimeline__track", root);
    if (track && !still && window.innerWidth > 760) {
      const pin = qs(".wtimeline__pin", root);
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + 80);
      g.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: { trigger: pin, start: "top top", end: () => `+=${distance()}`, pin: true, scrub: 1, invalidateOnRefresh: true },
      });
    }

    // ---------------------------------------------------------- exploded view
    let explodeStage = null;
    let model = null;
    const state = { t: 0 };
    const partsList = qs(".wparts", root);
    const card = qs(".wpart-card", root);
    const slider = qs(".wexplode__slider input", root);
    const setT = (t) => {
      if (!model || !explodeStage) return;
      model.setExplode(t);
      explodeStage.pose.ry = 0.35 + t * 0.95;
      explodeStage.pose.rx = -0.18 - t * 0.12;
      explodeStage.pose.dist = 1 + t * 1.25;
      slider.value = Math.round(t * 1000);
    };
    const showPart = (key) => {
      explodeStage?.highlight(key);
      qsa("[data-part]", partsList).forEach((b) => b.setAttribute("aria-pressed", b.dataset.part === key));
      if (!key) {
        card.hidden = true;
        return;
      }
      const inf = partInfo(key);
      qs("h3", card).textContent = inf.name;
      qs("p", card).textContent = inf.text;
      card.hidden = false;
      if (!still) g.fromTo(card, { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: "expo.out" });
    };
    qs(".wpart-card__close", card).addEventListener("click", () => showPart(null));

    const initExplode = async () => {
      if (explodeStage) return;
      const [{ WatchStage }, { buildWatch }] = await Promise.all([import("../watch3d/stage.js"), import("../watch3d/factory.js")]);
      if (!root.isConnected) return;
      explodeStage = new WatchStage(qs(".wexplode__canvas", root), { fov: 24 });
      explodeStage.frameScale = 1.7;
      explodeStage.idle = false;
      model = buildWatch(w.render, { ...opts, detail: "hero" });
      explodeStage.setModel(model);
      explodeStage.start();
      explodeStage.onPick((key) => showPart(key));
      window.__horologium && (window.__horologium.explode = explodeStage);
      const seen = new Set();
      const keys = model.parts.map((p) => p.key).filter((k) => !seen.has(k) && seen.add(k));
      partsList.innerHTML = keys
        .map((k) => `<li><button type="button" data-part="${k}" aria-pressed="false">${partInfo(k).name}</button></li>`)
        .join("");
      partsList.addEventListener("click", (e) => {
        const b = e.target.closest("[data-part]");
        if (b) showPart(b.getAttribute("aria-pressed") === "true" ? null : b.dataset.part);
      });
      setT(state.t);
    };
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) initExplode();
    }, { rootMargin: "600px 0px" });
    io.observe(qs(".wexplode", root));
    cleanups.push(() => io.disconnect());

    if (!still) {
      ST.create({
        trigger: qs(".wexplode", root),
        start: "top top",
        end: "+=220%",
        pin: qs(".wexplode__pin", root),
        scrub: 1,
        onUpdate: (self) => {
          state.t = Math.min(1, self.progress * 1.15);
          setT(state.t);
        },
      });
    }
    slider.addEventListener("input", () => setT(+slider.value / 1000));
    cleanups.push(() => explodeStage?.dispose());

    // ---------------------------------------------------------- siblings
    const more = qs(".wmore__grid", root);
    if (more) attachGallery(more, w.siblings).then((off) => cleanups.push(off));

    return () => cleanups.forEach((fn) => fn());
  },
};
