// Модель часов: скролл-история в духе презентаций Apple.
//
// Секции: герой (закреплён; настоящее фото, а без него 3D) → коротко → в цифрах → вживую (фото) →
// история → поколения (горизонтальная лента) → механизм → усложнения →
// разборка (закреплена, ползунок и скролл разбирают часы) → цена → другие модели.

import { api } from "../core/api.js";
import { html, qs, qsa } from "../core/dom.js";
import { bindCurrencyPrices, date, DIFFICULTY, getActiveCurrency, hours, inUSD, MOVEMENT, num, PRICE_KIND, RATES, usd, vph } from "../core/format.js";
import { countUp, reduced, splitWords } from "../core/motion.js";
import { scrollToEl } from "../core/scroll.js";
import { attachGallery, watchCard } from "../ui/cards.js";
import { photoCredit, photoImg, revealPhotos } from "../ui/photo.js";
import { hasCompare, toggleCompare, onCompareChange } from "../core/compare.js";
import { renderKinematicFlow, mountKinematicFlow } from "../ui/kinematics.js";
import { renderCaliberEscapementPlayer, mountCaliberEscapementPlayer } from "../ui/escapement-player.js";
import { renderWristFitWidget, mountWristFitWidget } from "../ui/wrist-fit.js";
import { TcoCalculator } from "../ui/tco-calc.js";
import { renderSubmarinerWorkshop, mountSubmarinerWorkshop } from "../ui/submariner-workshop.js";

/** Откуда фото в галерее: официальные снимки бренда, свободные снимки владельцев или и то и другое. */
function photosNote(photos) {
  const free = photos.filter((p) => /creativecommons|publicdomain/.test(p.license_url ?? "")).length;
  if (!free) return "Официальные студийные снимки бренда.";
  if (free === photos.length) return "Настоящие снимки владельцев, музеев и аукционов под свободными лицензиями.";
  return "Официальные снимки бренда и фотографии владельцев под свободными лицензиями.";
}

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
      <p class="price wprice__value num" data-count-price="${p.usd}" data-price-usd="${p.usd}">${usd(p.usd)}</p>
      <p class="wprice__meta">
        Источник: ${p.url ? html`<a href="${p.url}" target="_blank" rel="noopener" data-external>${p.source}</a>` : p.source}.
        Проверено ${date(p.checked)}.${p.note ? html` ${p.note}.` : ""}
      </p>
      <p class="wprice__meta wprice__fx" ${getActiveCurrency().code === "USD" ? "hidden" : ""}>Исходная цена ${inUSD(p.usd)}, пересчёт по курсу на <span data-rate-date>${date(RATES.date)}</span>: примерная сумма, а не официальная цена в этой валюте.</p>
    </div>
    <div class="wprice__compare" data-reveal style="--i:1">
      <p class="wprice__diff">${diff === 0 ? "Ровно на уровне средней цены" : diff > 0 ? `На ${diff}% дороже` : `На ${Math.abs(diff)}% дешевле`}
        ${diff === 0 ? "" : html`<span>средней цены ${w.brand_name} в атласе (<span data-price-usd="${bp.avg}">${usd(bp.avg)}</span>)</span>`}</p>
      <div class="wrange" role="img" aria-label="Положение цены в диапазоне бренда">
        <div class="wrange__line"></div>
        <div class="wrange__dot" style="left:${Math.min(100, Math.max(0, pos))}%"></div>
        <span class="wrange__min num" data-price-usd="${bp.min}">${usd(bp.min)}</span>
        <span class="wrange__max num" data-price-usd="${bp.max}">${usd(bp.max)}</span>
      </div>
      ${w.price_history.length > 1
        ? html`<ul class="wprice__history" role="list">
            ${w.price_history.map((h) => html`<li><span>${date(h.fetched_at)}</span><span class="num" data-price-usd="${h.usd}">${usd(h.usd)}</span><span class="muted">${h.source}</span></li>`)}
          </ul>`
        : ""}
    </div>
  </section>`;
}

export default {
  layer: "page",
  currencyAware: true,

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
    // своё фото модели, иначе родственная модель (с подписью «Похожая модель»)
    const photo = w.photos.find((p) => !p.context) ?? w.photos[0];
    return html`
      <article class="watch">
        <section class="whero ${photo ? "whero--photo" : ""}" id="top">
          <div class="whero__sticky">
            ${photo
              ? html`<figure class="whero__plate">
                  <div class="whero__frame" data-shared="w-${w.slug}">
                    ${photoImg(photo, { eager: true, cls: "whero__photo", sizes: "(max-width: 900px) 100vw, 56vw", alt: `${w.brand_name} ${w.name}` })}
                  </div>
                  <figcaption>${photoCredit(photo)}</figcaption>
                </figure>`
              : html`<div class="whero__type" aria-hidden="true">
                  <span class="whero__type-name">${w.name}</span>
                  <span class="whero__type-note">Свободной фотографии этой модели пока нет. Настоящие детали механизма ниже, в разборке.</span>
                </div>`}
            <div class="whero__text">
              <a class="whero__brand" href="/brand/${w.brand}" data-h>${w.brand_name}</a>
              <h1 class="display whero__name" data-h>${w.name}</h1>
              <p class="whero__ref" data-h>
                ${w.reference ? html`<span class="mono">Ref. ${w.reference}</span>` : ""}
                ${w.year_introduced ? html`<span>С ${w.year_introduced} года</span>` : ""}
                <span>${MOVEMENT[m.type]?.label}</span>
              </p>
              <div class="whero__buy" data-h>
                <span class="price whero__price num" data-price-usd="${w.price.usd}">${usd(w.price.usd)}</span>
                <span class="price-kind">${PRICE_KIND[w.price.kind]}, ${date(w.price.checked)}</span>
              </div>
              <div class="whero__cta" data-h>
                <a class="btn" href="#explode" data-jump="explode"><i class="ph-light ph-cube-transparent" aria-hidden="true"></i>Разобрать часы</a>
                <button type="button" class="btn btn--ghost" id="whero-compare-btn" data-compare="${w.slug}">
                  <i class="ph-light ph-scales" aria-hidden="true"></i><span id="whero-compare-text">${hasCompare(w.slug) ? "В сравнении" : "Сравнить"}</span>
                </button>
                <a class="btn btn--ghost" href="#wrist-fit" data-jump="wrist-fit"><i class="ph-light ph-ruler" aria-hidden="true"></i>Примерка</a>
                <a class="btn btn--ghost" href="#tco-calc" data-jump="tco-calc"><i class="ph-light ph-calculator" aria-hidden="true"></i>Калькулятор TCO</a>
                ${w.complications.includes("minute-repeater")
                  ? html`<a class="btn btn--lume" href="/complication/minute-repeater" data-link><i class="ph-light ph-speaker-high" aria-hidden="true"></i>Послушать бой репетира</a>`
                  : ""}
                <a class="btn btn--ghost" href="#story" data-jump="story">История</a>
              </div>
            </div>

          </div>
        </section>

        <nav class="watch-nav" aria-label="Разделы модели">
          <a href="#top" data-jump="top">Обзор</a>
          <a href="#movement" data-jump="movement">Механизм</a>
          <a href="#explode" data-jump="explode">Разборка</a>
          <a href="#price" data-jump="price">Стоимость</a>
          <a href="#wrist-fit" data-jump="wrist-fit">Примерка</a>
        </nav>

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

        ${w.photos.length > (photo ? 1 : 0)
          ? html`<section class="wphotos" aria-label="Фотографии">
              <div class="container wphotos__head">
                <h2 class="display display--m" data-reveal>Вживую</h2>
                <p class="muted" data-reveal>${photosNote(w.photos)}</p>
              </div>
              <ol class="wphotos__strip" role="list" data-lenis-prevent-horizontal>
                ${w.photos.map((p, i) => html`<li class="wphoto" style="--ar:${(p.width / p.height).toFixed(3)};--i:${i}" data-reveal>
                  <div class="wphoto__frame">${photoImg(p, { sizes: "(max-width: 700px) 86vw, 44vw", alt: `${w.brand_name} ${w.name}, фото ${i + 1}` })}</div>
                  ${photoCredit(p)}
                </li>`)}
              </ol>
            </section>`
          : ""}

        ${w.story.length
          ? html`<details class="wstory container content-disclosure">
              <summary>История модели</summary>
              <div class="wstory__text">
                ${w.story.map(p => html`<p>${p}</p>`)}
              </div>
            </details>`
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
              <details class="content-disclosure"><summary>Особенности и звук калибра</summary>
              ${m.features.length ? html`<ul class="wmove__features" role="list">${m.features.map((f) => html`<li>${f}</li>`)}</ul>` : ""}
              ${renderCaliberEscapementPlayer(m)}
              <div style="margin-top: 10px; margin-bottom: 12px;">
                <a class="chip chip--sm chip--lume" href="/timegrapher" data-link>
                  <i class="ph-light ph-wave-sine" aria-hidden="true"></i> Проверить ход на виртуальном вибрографе
                </a>
              </div>
              <a class="link-arrow" href="/movement/${m.slug}">Все часы с калибром ${m.caliber}<i class="ph-light ph-arrow-right" aria-hidden="true"></i></a>
              </details>
            </div>
          </div>
          <details class="content-disclosure"><summary>Как передаётся энергия</summary>
            <div class="wmove__kflow-wrap">${renderKinematicFlow(m.type, m.frequency_vph)}</div>
          </details>
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

        ${renderSubmarinerWorkshop(w)}

        ${priceBlock(w)}

        <section class="wtco-section container" id="tco-calc" aria-label="Калькулятор стоимости владения и ликвидности">
          <h2 class="display display--s">Расходы на владение</h2>
          <p class="lead">Покупка, обслуживание и предполагаемая продажа в одном сценарии.</p>
          <details class="watch-tco content-disclosure" id="watch-tco"><summary>Настроить расчёт для этих часов</summary><div id="tco-watch-mount"></div></details>
          <a class="link-arrow" href="/tco?watch=${w.slug}" data-link>Открыть отдельный калькулятор<i class="ph-light ph-arrow-right" aria-hidden="true"></i></a>
        </section>

        <section class="wwrist container" id="wrist-fit" aria-label="Примерка на запястье">
          ${renderWristFitWidget(w)}
        </section>

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

  mount(root, w, ctx = {}) {
    const g = window.gsap;
    const ST = window.ScrollTrigger;
    const still = reduced() || !g;
    const cleanups = [];
    cleanups.push(bindCurrencyPrices(root, () => {
      const note = qs('.wprice__fx', root);
      note.hidden = getActiveCurrency().code === "USD";
      qs('[data-rate-date]', note).textContent = date(RATES.date);
    }));
    // ---------------------------------------------------------- hero
    revealPhotos(root);
    mountKinematicFlow(root);
    cleanups.push(mountCaliberEscapementPlayer(root));
    cleanups.push(mountWristFitWidget(root, w));

    // ---------------------------------------------------------- калькулятор ликвидности и TCO
    const tcoMount = qs("#tco-watch-mount", root);
    let tcoCalc;
    const tcoDetails = qs("#watch-tco", root);
    const mountTco = () => {
      if (!tcoMount || tcoCalc || !tcoDetails.open) return;
      tcoCalc = new TcoCalculator({ container: tcoMount, watch: w, initialPriceUsd: w.price.usd,
        brandSlug: w.brand, brandName: w.brand_name, complications: w.complications,
        movementType: w.movement.type, compact: true });
    };
    tcoDetails?.addEventListener("toggle", mountTco);
    if (location.hash === "#tco-calc" && tcoDetails) { tcoDetails.open = true; mountTco(); }
    const refreshDetails = () => ST?.refresh();
    root.addEventListener("toggle", refreshDetails, true);
    cleanups.push(() => { tcoDetails?.removeEventListener("toggle", mountTco); tcoCalc?.destroy(); root.removeEventListener("toggle", refreshDetails, true); });
    // Active section follows scrolling without a persistent frame loop.
    const sections = [...root.querySelectorAll("#top,#movement,#explode,#price,#wrist-fit")];
    const sectionObserver = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (!visible.length) return;
      root.querySelectorAll('.watch-nav a').forEach(link => {
        if (link.hash === `#${visible[0].target.id}`) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }, { rootMargin: "-140px 0px -45% 0px" });
    sections.forEach(section => sectionObserver.observe(section));
    cleanups.push(() => sectionObserver.disconnect());
    if (!still) g.from(qsa("[data-h]", root), { y: 32, autoAlpha: 0, duration: 1.3, stagger: 0.07, ease: "expo.out", delay: 0.12 });
    const plate = qs(".whero__plate", root);
    const compareBtn = qs("#whero-compare-btn", root);
    const compareText = qs("#whero-compare-text", root);
    if (compareBtn) {
      if (hasCompare(w.slug)) compareBtn.classList.add("btn--primary");
      compareBtn.addEventListener("click", () => {
        const inComp = toggleCompare(w.slug);
        if (compareText) compareText.textContent = inComp ? "В сравнении" : "Сравнить";
        compareBtn.classList.toggle("btn--primary", inComp);
      });
      const unComp = onCompareChange(() => {
        const inComp = hasCompare(w.slug);
        if (compareText) compareText.textContent = inComp ? "В сравнении" : "Сравнить";
        compareBtn.classList.toggle("btn--primary", inComp);
      });
      cleanups.push(unComp);
    }
    if (plate && !still) {
      // Если фото прилетело из карточки (ctx.shared), рамка уже на месте: только подпись.
      if (ctx.shared) g.from(qs("figcaption", plate), { autoAlpha: 0, duration: 0.8, delay: 1, ease: "power1.out" });
      else g.from(plate, { autoAlpha: 0, y: 30, scale: 0.97, duration: 1.7, ease: "expo.out", delay: 0.18 });
      // Кадр плавно отъезжает: фото внутри рамки «оседает», рамка чуть уменьшается, текст уходит.
      const tl = g.timeline({
        scrollTrigger: {
          trigger: qs(".whero", root), start: "top top",
          end: () => `+=${Math.max(1, qs(".whero", root).offsetHeight - window.innerHeight)}`,
          scrub: 0.3, invalidateOnRefresh: true,
        },
      });
      tl.fromTo(qs(".whero__photo", plate), { scale: 1.12 }, { scale: 1, ease: "none", duration: 1 }, 0)
        .to(plate, { scale: 0.94, yPercent: -3, ease: "power1.inOut", duration: 1 }, 0)
        .to(qs(".whero__text", root), { autoAlpha: 0, y: -40, ease: "power1.in", duration: 0.45 }, 0.2);
    }

    // ---------------------------------------------------------- jumps
    qsa("[data-jump]", root).forEach((a) =>
      a.addEventListener("click", (e) => {
        e.preventDefault();
        if (a.dataset.jump === "tco-calc" && tcoDetails) { tcoDetails.open = true; mountTco(); }
        const target = qs(`#${a.dataset.jump}`, root);
        history.replaceState(history.state, "", `#${a.dataset.jump}`);
        scrollToEl(target);
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
        scrollTrigger: { trigger: pin, start: "top top", end: () => `+=${distance()}`, pin: true, scrub: 0.3, invalidateOnRefresh: true },
      });
    }

    // ---------------------------------------------------------- exploded view
    cleanups.push(mountSubmarinerWorkshop(root, w));

    // ---------------------------------------------------------- siblings
    const more = qs(".wmore__grid", root);
    if (more) attachGallery(more, w.siblings).then((off) => cleanups.push(off));

    return () => cleanups.forEach((fn) => fn());
  },
};
