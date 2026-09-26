// Модель часов: скролл-история в духе презентаций Apple.
//
// Секции: герой (закреплён; настоящее фото, а без него 3D) → коротко → в цифрах → вживую (фото) →
// история → поколения (горизонтальная лента) → механизм → усложнения →
// разборка (закреплена, ползунок и скролл разбирают часы) → цена → другие модели.

import { api } from "../core/api.js";
import { html, qs, qsa } from "../core/dom.js";
import { date, DIFFICULTY, getActiveCurrency, hours, inUSD, MOVEMENT, num, PRICE_KIND, RATES, usd, vph } from "../core/format.js";
import { countUp, reduced, splitWords } from "../core/motion.js";
import { scrollToEl } from "../core/scroll.js";
import { attachGallery, buildInfo, watchCard } from "../ui/cards.js";
import { photoCredit, photoImg, revealPhotos } from "../ui/photo.js";
import { PhotoExplode } from "../ui/photo-explode.js";
import { Teardown } from "../ui/teardown.js";
import { hasCompare, toggleCompare, onCompareChange } from "../core/compare.js";

// Снимки разобранных калибров, нарезанные на детали (scripts/cutouts.py): разборка из настоящих фото.
const CUTOUTS = { exploded_quartz: "eta-955", exploded_mechanical: "prim" };
import { partInfo } from "../watch3d/parts-info.js";

// Детали, для которых годится общее фото родственной детали.
const PHOTO_ALIAS = {
  crystal_hesalite: "crystal", bezel_insert: "bezel", bezel_screws: "bezel", crown_guard: "crown", pushers: "crown",
  flange: "dial", hand_minute: "hand_hour", hand_second: "hand_hour", hand_gmt: "hand_hour", subdial_hands: "hand_hour",
  ratchet: "barrel", balance_cock: "bridges", smart_battery: "battery",
};
const photoKey = (key) => PHOTO_ALIAS[key] ?? key;


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
      ${getActiveCurrency().code !== "USD"
        ? html`<p class="wprice__meta wprice__fx">Исходная цена ${inUSD(p.usd)}, пересчёт по курсу на ${date(RATES.date)}: примерная сумма, а не официальная цена в этой валюте.</p>`
        : ""}
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
                <span class="price whero__price num">${usd(w.price.usd)}</span>
                <span class="price-kind">${PRICE_KIND[w.price.kind]}, ${date(w.price.checked)}</span>
              </div>
              <div class="whero__cta" data-h>
                <a class="btn" href="#explode" data-jump="explode"><i class="ph-light ph-cube-transparent" aria-hidden="true"></i>Разобрать часы</a>
                <button type="button" class="btn btn--ghost" id="whero-compare-btn" data-compare="${w.slug}">
                  <i class="ph-light ph-scales" aria-hidden="true"></i><span id="whero-compare-text">${hasCompare(w.slug) ? "В сравнении" : "Сравнить"}</span>
                </button>
                <a class="btn btn--ghost" href="#story" data-jump="story">История</a>
              </div>
            </div>

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

        ${w.photos.length > (photo ? 1 : 0)
          ? html`<section class="wphotos" aria-label="Фотографии">
              <div class="container wphotos__head">
                <h2 class="display display--m" data-reveal>Вживую</h2>
                <p class="muted" data-reveal>Настоящие снимки владельцев, музеев и аукционов под свободными лицензиями.</p>
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
            <canvas class="wexplode__td" aria-label="Разборка ${w.name} до детали" hidden></canvas>
            <div class="wtd-tip" hidden></div>
            <figure class="wreal" hidden>
              <div class="wreal__frame"></div>
              <figcaption class="wreal__cap"></figcaption>
            </figure>
            <div class="seg wexplode__modes" role="tablist" aria-label="Режим разборки">
              <span class="seg__pill" aria-hidden="true"></span>
              <button class="seg__btn" type="button" role="tab" data-mode="3d" aria-selected="true"><i class="ph-light ph-cube-transparent" aria-hidden="true"></i>Разборка ${w.name}</button>
              <button class="seg__btn" type="button" role="tab" data-mode="photo" aria-selected="false"><i class="ph-light ph-camera" aria-hidden="true"></i>Анатомия механизма</button>
            </div>
            <div class="wexplode__side">
              <div class="wexplode__head">
                <h2 class="display display--m">Из чего собраны ${w.name}</h2>
                <p class="muted wexplode__hint" data-mode-hint="3d">Интерактивная разборка модели 1 в 1: корпус, безель, сапфировое стекло, стрелки, циферблат, детали калибра и браслет именно этих часов. Потяните ползунок или прокрутите страницу. Нажмите на деталь, чтобы узнать её назначение и увидеть макроснимок.</p>
                <p class="muted wexplode__hint" data-mode-hint="td" hidden><span class="wtd-how">Все детали этих часов по отдельности: прокрутите, и они разойдутся вдоль оси, как на схеме часовщика. Наведите на деталь, чтобы увидеть название, нажмите, чтобы узнать, зачем она нужна.</span><span class="wtd-short">Прокрутите: часы разойдутся по оси и лягут на лоток. Коснитесь детали, чтобы узнать, зачем она.</span> <span class="wtd-note">Изображения деталей созданы ИИ (Gemini) по официальным фото модели.</span></p>
                <p class="muted wexplode__hint" data-mode-hint="photo" hidden>${mech
                ? "Анатомический фото-разбор классического механического калибра: анкерный спуск, баланс, мосты и заводной барабан. Нажимайте на светящиеся точки."
                : "Анатомический фото-разбор кварцевого калибра: кристалл кварца, интегральная схема и шаговый двигатель. Нажимайте на светящиеся точки."}</p>
              </div>
              <div class="wexplode__panel" data-lenis-prevent>
                <ol class="wparts" role="list"></ol>
              </div>
            </div>
            <div class="wpart-card" hidden>
              <button class="wpart-card__close icon-btn" type="button" aria-label="Закрыть"><i class="ph-light ph-x" aria-hidden="true"></i></button>
              <figure class="wpart-card__media" hidden><div class="wpart-card__frame"></div><figcaption></figcaption></figure>
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

  mount(root, w, ctx = {}) {
    const g = window.gsap;
    const ST = window.ScrollTrigger;
    const still = reduced() || !g;
    const cleanups = [];
    const info = buildInfo(w);
    const calibre = w.movement.caliber.replace(new RegExp(`^${w.brand_name}\\s*`, "i"), "");
    const opts = { ...info, calibre };

    // ---------------------------------------------------------- hero
    revealPhotos(root);
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
        scrollTrigger: { trigger: pin, start: "top top", end: () => `+=${distance()}`, pin: true, scrub: 0.3, invalidateOnRefresh: true },
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
      photoExplode?.setT(t);
      teardown?.setT(t);
      if (!model || !explodeStage) {
        slider.value = Math.round(t * 1000);
        return;
      }
      model.setExplode(t);
      explodeStage.pose.ry = 0.35 + t * 0.95;
      explodeStage.pose.rx = -0.18 - t * 0.12;
      explodeStage.pose.dist = 1 + t * 1.25;
      slider.value = Math.round(t * 1000);
      if (!explodeStage.running) explodeStage.frame();
    };
    const showPart = (key, name = null) => {
      if (mode === "3d") {
        explodeStage?.highlight(key);
        if (explodeStage && !explodeStage.running) explodeStage.frame();
      }
      if (mode === "td") teardown?.highlight(key);
      qsa("[data-part]", root).forEach((b) => b.setAttribute("aria-pressed", b.dataset.part === key && (!name || !b.dataset.name || b.dataset.name === name)));
      if (!key) {
        card.hidden = true;
        return;
      }
      const inf = partInfo(key);
      qs("h3", card).textContent = name ?? inf.name;
      qs("p", card).textContent = inf.text;
      const media = qs(".wpart-card__media", card);
      const ph = partPhotos?.[photoKey(key)]?.[0];
      media.hidden = !ph;
      if (ph) {
        qs(".wpart-card__frame", media).innerHTML = String(photoImg(ph, { sizes: "360px", eager: true, alt: inf.name }));
        qs("figcaption", media).innerHTML = String(photoCredit(ph));
        revealPhotos(media);
      }
      card.hidden = false;
      if (!still) g.fromTo(card, { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: "expo.out" });
    };
    qs(".wpart-card__close", card).addEventListener("click", () => showPart(null));

    let partPhotos = null;
    let modelKeys = new Set();
    const partPhotosReady = api.partPhotos().then((d) => (partPhotos = d), () => {});

    const initExplode = async () => {
      if (explodeStage) return;
      const [{ WatchStage }, { buildWatch }] = await Promise.all([import("../watch3d/stage.js"), import("../watch3d/factory.js"), partPhotosReady]);
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
      const photoKeys = photoExplode?.parts.length ? photoExplode.hotspots().map((h) => h.key) : (partPhotos?.[realKey]?.[0]?.hotspots ?? []).map((h) => h.key);
      const keys = [...model.parts.map((p) => p.key), ...photoKeys].filter((k) => !seen.has(k) && seen.add(k));
      modelKeys = new Set(model.parts.map((p) => p.key));
      partsList.innerHTML = keys
        .map((k) => `<li ${modelKeys.has(k) ? "" : "hidden"}><button type="button" data-part="${k}" aria-pressed="false">${partInfo(k).name}</button></li>`)
        .join("");
      filterParts();
      partsList.addEventListener("click", (e) => {
        const b = e.target.closest("[data-part]");
        if (b) showPart(b.getAttribute("aria-pressed") === "true" ? null : b.dataset.part);
      });
      setT(state.t);
    };
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          if (!explodeStage) initExplode();
          else explodeStage.start();
        } else {
          explodeStage?.stop();
        }
      }
    }, { rootMargin: "200px 0px" });
    io.observe(qs(".wexplode", root));
    cleanups.push(() => io.disconnect());

    // ---------------------------------------------------------- разборка до детали (teardown)
    // Детали модели из листов Gemini (scripts/teardown.py). Если они есть, это режим по умолчанию.
    let teardown = null;
    const tdCanvas = qs(".wexplode__td", root);
    const tdTip = qs(".wtd-tip", root);
    const initTeardown = async () => {
      if (teardown) return teardown;
      teardown = new Teardown(tdCanvas, w.slug);
      await teardown.load();
      if (!root.isConnected) return null;
      // кадр справа от колонки с текстом (на узком экране колонка над сценой, отступ не нужен)
      const side = qs(".wexplode__side", root);
      const head = qs(".wexplode__head", root);
      const modes = qs(".wexplode__modes", root);
      const slider = qs(".wexplode__slider", root);
      const pin = qs(".wexplode__pin", root);
      const inset = () => {
        // холст занимает весь .wexplode__pin; меряем от контейнера, т. к. скрытый холст даёт нулевой rect
        const c = pin.getBoundingClientRect();
        const m = modes.getBoundingClientRect();
        // вкладки режимов на широком экране сверху справа, на узком внизу над ползунком
        const modesLow = m.top > c.top + c.height / 2;
        const bottom = c.bottom - Math.min(slider.getBoundingClientRect().top, modesLow ? m.top : Infinity) + 12;
        // широкий экран: колонка с текстом слева; узкий: текст сверху, сцена под ним
        return window.innerWidth > 900
          ? [side.getBoundingClientRect().right - c.left + 16, modesLow ? 0 : m.bottom - c.top + 12, bottom]
          : [0, head.getBoundingClientRect().bottom - c.top + 12, bottom];
      };
      const applyInset = () => {
        const [left, top, bottom] = inset();
        teardown.setInset(left, top, bottom);
        // на узком экране браслет уходит под заголовок и под вкладки: там сцена плавно гаснет
        tdCanvas.style.setProperty("--td-top", `${left ? 0 : top}px`);
        tdCanvas.style.setProperty("--td-bottom", `${left ? 0 : bottom}px`);
      };
      applyInset();
      // высота заголовка меняется со сменой подсказки режима, шрифтами и шириной окна
      const ro = new ResizeObserver(() => applyInset());
      [pin, head, modes].forEach((el) => ro.observe(el));
      cleanups.push(() => ro.disconnect());
      teardown.bind();
      teardown.on((ev) => {
        if (ev.type === "hover") {
          tdTip.hidden = !ev.part;
          if (ev.part) {
            const r = tdCanvas.getBoundingClientRect();
            tdTip.textContent = ev.part.name;
            tdTip.style.transform = `translate(${ev.x - r.left + 16}px, ${ev.y - r.top + 12}px)`;
          }
        } else if (ev.type === "pick") {
          showPart(ev.part?.key ?? null, ev.part?.name ?? null);
        }
      });
      // список деталей по названиям (одинаковые детали одной строкой со счётчиком)
      partsList.insertAdjacentHTML("afterbegin", teardown.catalogue()
        .map((c) => `<li data-td hidden><button type="button" data-part="${c.key}" data-name="${c.name.replace(/"/g, "&quot;")}" aria-pressed="false">${c.name}${c.count > 1 ? ` <small>×${c.count}</small>` : ""}</button></li>`).join(""));
      qs(".wtd-count", root) && (qs(".wtd-count", root).textContent = String(teardown.parts.length));
      teardown.setT(state.t, true);
      filterParts();
      return teardown;
    };
    partsList.addEventListener("click", (e) => {
      const b = e.target.closest("[data-name]");
      if (!b || mode !== "td") return;
      e.stopImmediatePropagation();
      showPart(b.getAttribute("aria-pressed") === "true" ? null : b.dataset.part, b.dataset.name);
    }, true);
    cleanups.push(() => teardown?.dispose());

    // Режим «Настоящий механизм»: фото разобранного калибра того же типа с точками-деталями.
    const real = qs(".wreal", root);
    const seg = qs(".seg", root);
    const segPill = qs(".seg__pill", seg);
    const canvasEl = qs(".wexplode__canvas", root);
    const sliderWrap = qs(".wexplode__slider", root);
    let mode = "3d";
    let realBuilt = false;
    const realKey = ["quartz", "solar", "smart"].includes(w.movement.type) ? "exploded_quartz" : "exploded_mechanical";
    const moveSegPill = (btn) => {
      segPill.style.width = `${btn.offsetWidth}px`;
      segPill.style.transform = `translateX(${btn.offsetLeft - 4}px)`;
    };
    let photoExplode = null;
    const buildReal = () => {
      const ph = partPhotos?.[realKey]?.[0];
      if (!ph) return false;
      const frame = qs(".wreal__frame", real);
      const dotsHtml = (list) => list.map((h, i) => `<button class="wreal__dot" type="button" style="left:${h.x * 100}%;top:${h.y * 100}%;--i:${i}" data-part="${h.key}" aria-label="${partInfo(h.key).name}"><span></span></button>`).join("");
      const dots = dotsHtml(ph.hotspots);
      if (CUTOUTS[realKey]) {
        // детали по отдельности: скролл и ползунок разбирают настоящий механизм
        frame.classList.add("is-cutout");
        photoExplode = new PhotoExplode(frame, CUTOUTS[realKey]);
        photoExplode.load().then(() => {
          realKeys = photoExplode.hotspots().map((h) => h.key);
          frame.style.aspectRatio = `${photoExplode.manifest.width} / ${photoExplode.manifest.height}`;
          frame.insertAdjacentHTML("beforeend", dotsHtml(photoExplode.hotspots()));
          photoExplode.setT(state.t, true);
          addListKeys(realKeys);
          filterParts();
        }, () => {});
      } else {
        frame.innerHTML = String(photoImg(ph, { eager: true, sizes: "(max-width: 900px) 100vw, 70vw", cls: "wreal__img", alt: ph.caption ?? "" })) + dots;
      }
      qs(".wreal__cap", real).innerHTML = String(photoCredit(ph));
      revealPhotos(real);
      real.addEventListener("click", (e) => {
        const b = e.target.closest(".wreal__dot");
        if (b) showPart(b.getAttribute("aria-pressed") === "true" ? null : b.dataset.part);
      });
      return true;
    };
    // Список деталей слева: в фото-режиме только отмеченные на снимке, в 3D только детали модели.
    let realKeys = null;
    // в список слева добавить детали, которые есть только на настоящем снимке
    const addListKeys = (keys) => {
      const have = new Set(qsa("[data-part]", partsList).map((b) => b.dataset.part));
      partsList.insertAdjacentHTML("beforeend", keys.filter((k) => !have.has(k))
        .map((k) => `<li hidden><button type="button" data-part="${k}" aria-pressed="false">${partInfo(k).name}</button></li>`).join(""));
    };
    const filterParts = () => {
      if (mode === "td") {
        qsa("[data-part]", partsList).forEach((b) => (b.parentElement.hidden = !b.parentElement.hasAttribute("data-td")));
        return;
      }
      const keys = mode === "photo" ? new Set(realKeys ?? partPhotos?.[realKey]?.[0]?.hotspots.map((h) => h.key)) : modelKeys;
      qsa("[data-part]", partsList).forEach((b) => (b.parentElement.hidden = b.parentElement.hasAttribute("data-td") || !keys.has(b.dataset.part)));
    };
    const setMode = async (next) => {
      if (next === mode) return;
      if (next === "photo" && !realBuilt) realBuilt = buildReal();
      if (next === "photo" && !realBuilt) return;
      if (next === "td" && !(await initTeardown())) return;
      mode = next;
      qsa(".seg__btn", seg).forEach((b) => b.setAttribute("aria-selected", b.dataset.mode === mode));
      moveSegPill(qs(`[data-mode="${mode}"]`, seg));
      qsa("[data-mode-hint]", root).forEach((el) => (el.hidden = el.dataset.modeHint !== mode));
      showPart(null);
      filterParts();
      // видимые слои режима; ползунок нужен везде, кроме статичного фото-режима
      const layers = { "3d": [canvasEl], photo: [real], td: [tdCanvas] };
      const slide = !(mode === "photo" && !photoExplode);
      if (mode === "3d") explodeStage?.start();
      else explodeStage?.stop();
      tdCanvas.hidden = false;
      if (mode === "photo") real.hidden = false;
      for (const [m, els] of Object.entries(layers)) {
        const on = m === mode;
        if (still) els.forEach((el) => (el.style.visibility = on ? "visible" : "hidden"));
        else g.to(els, { autoAlpha: on ? 1 : 0, duration: on ? 0.8 : 0.45, ease: on ? "power2.out" : "power2.in", delay: on ? 0.15 : 0 });
      }
      if (still) sliderWrap.style.visibility = slide ? "visible" : "hidden";
      else g.to(sliderWrap, { autoAlpha: slide ? 1 : 0, duration: 0.5 });
      if (mode === "photo" && !photoExplode && !still) {
        g.fromTo(qsa(".wreal__dot", real), { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.6, stagger: 0.05, ease: "back.out(2)", delay: 0.25 });
      }
    };
    qsa(".seg__btn", seg).forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
    requestAnimationFrame(() => moveSegPill(qs('[aria-selected="true"]', seg)));
    const onSegResize = () => moveSegPill(qs('[aria-selected="true"]', seg));
    window.addEventListener("resize", onSegResize);
    cleanups.push(() => window.removeEventListener("resize", onSegResize));
    // По умолчанию разборка до детали, если для модели она собрана (флаг из API); иначе 3D-схема.
    if (w.teardown) {
      const btn = document.createElement("button");
      btn.className = "seg__btn";
      btn.type = "button";
      btn.setAttribute("role", "tab");
      btn.dataset.mode = "td";
      btn.setAttribute("aria-selected", "false");
      btn.innerHTML = '<i class="ph-light ph-stack" aria-hidden="true"></i>До детали';
      qs(".seg__pill", seg).after(btn);
      btn.addEventListener("click", () => setMode("td"));
      setMode("td");
    }

    if (!still) {
      ST.create({
        trigger: qs(".wexplode", root),
        start: "top top",
        end: "+=220%",
        pin: qs(".wexplode__pin", root),
        scrub: 0.3,
        onUpdate: (self) => {
          state.t = Math.min(1, self.progress * 1.15);
          setT(state.t);
        },
      });
    }
    slider.addEventListener("input", () => {
      state.t = +slider.value / 1000;
      setT(state.t);
    });
    cleanups.push(() => explodeStage?.dispose());

    // ---------------------------------------------------------- siblings
    const more = qs(".wmore__grid", root);
    if (more) attachGallery(more, w.siblings).then((off) => cleanups.push(off));

    return () => cleanups.forEach((fn) => fn());
  },
};
