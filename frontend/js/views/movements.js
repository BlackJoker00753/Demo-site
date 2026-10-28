// Каталог часовых калибров: характеристики, сертификаты хронометрии и часы атласа.

import { api } from "../core/api.js";
import { html, qs, qsa } from "../core/dom.js";
import { hours, models, MOVEMENT, num, vph } from "../core/format.js";
import { revealPhotos } from "../ui/photo.js";
import { renderEscapementComparator, mountEscapementComparator } from "../ui/escapement-player.js";
import { observeReveals, clearReveals } from "../core/motion.js";

const STANDARDS = [
  {
    id: "cosc",
    name: "COSC",
    full: "Contrôle Officiel Suisse des Chronomètres",
    accuracy: "-4 / +6 сек/сутки",
    magnetism: "Базовая (DIN 8309, 60 Гаусс)",
    testing: "15 дней, 5 положений, 3 температуры (8°C, 23°C, 38°C)",
    notes: "Швейцарский официальный институт тестирования. Тестируется механизм без корпуса до установки в часы.",
    badge: "Швейцарский эталон",
  },
  {
    id: "metas",
    name: "METAS Master Chronometer",
    full: "Swiss Federal Institute of Metrology",
    accuracy: "0 / +5 сек/сутки",
    magnetism: "Сверхвысокая: 15 000 Гаусс (1.5 Тесла)",
    testing: "8 комплексных тестов собранных часов в магнитном поле, воде и при разном заряде",
    notes: "Совместный стандарт Omega и Швейцарского института метрологии. Запрещено любое отставание часов.",
    badge: "Магнитный барьер 15k G",
  },
  {
    id: "rolex",
    name: "Superlative Chronometer",
    full: "Rolex Manufacture Certification",
    accuracy: "-2 / +2 сек/сутки",
    magnetism: "Высокая (парамагнитная спираль Parachrom)",
    testing: "Внутренний аудит Rolex в готовом корпусе после получения сертификата COSC",
    notes: "Критерии вдвое жестче стандартного COSC. Символизируется зелёной печатью с 5-летней гарантией.",
    badge: "Вдвое строже COSC",
  },
  {
    id: "geneva",
    name: "Geneva Seal",
    full: "Poinçon de Genève (Женевское клеймо)",
    accuracy: "Допуск ±1 сек/сутки на 7-дневном симуляторе",
    magnetism: "Индивидуально для мануфактуры",
    testing: "12 законов декоративной отделки, геометрии узлов и тест на точность хода в корпусе",
    notes: "Учреждено в 1886 году. Присуждается только калибрам, созданным и собранным в кантоне Женева.",
    badge: "Вершина отделки",
  },
  {
    id: "patek",
    name: "Patek Philippe Seal",
    full: "Клеймо качества Patek Philippe",
    accuracy: "-3 / +2 сек/сутки (диаметр ≥ 20 мм)",
    magnetism: "Кремниевая спираль Spiromax из Silinvar",
    testing: "Контроль готовых часов на динамических симуляторах носки",
    notes: "Собственный стандарт высшего порядка. Включает пожизненное сервисное обязательство для всех часов с 1839 года.",
    badge: "Строжайший мануфактурный аудит",
  },
  {
    id: "grand_seiko",
    name: "Grand Seiko Standard",
    full: "GS Special & Standard Inspection",
    accuracy: "-3 / +5 сек/сутки (Special: -2 / +4)",
    magnetism: "Сплав Spron 610 (магнитостойкий)",
    testing: "17 дней испытаний в 6 пространственных положениях и 3 температурных режимах",
    notes: "Дополнительное шестое положение (заводной головкой вверх) имитирует реальный взгляд владельца на запястье.",
    badge: "Японский хронометрический стандарт",
  },
];

export default {
  layer: "page",

  async data() {
    const [movements, watches] = await Promise.all([api.movements(), api.watches()]);
    const watchesByMov = new Map();
    for (const w of watches) {
      const list = watchesByMov.get(w.caliber) || [];
      list.push(w);
      watchesByMov.set(w.caliber, list);
    }
    return { movements, watchesByMov };
  },

  meta: () => ({
    title: "Калибры часов: мануфактурные механизмы и точность | Horologium",
    crumbs: [{ label: "Глобус", href: "/" }, { label: "Калибры" }],
  }),

  render({ movements, watchesByMov }) {
    return html`<section class="movements-page container">
      <header class="movements-head">
        <h1 class="display display--l" data-reveal>Калибры часов</h1>
        <p class="lead" data-reveal>
          Найдите механизм по названию или мануфактуре. В атласе ${movements.length} калибров с характеристиками и часами, в которых они установлены.
        </p>
      </header>

      <!-- Фильтры калибров -->
      <section class="mfilters">
        <div class="mfilters__search">
          <i class="ph-light ph-magnifying-glass" aria-hidden="true"></i>
          <input aria-label="Найти калибр" type="search" id="msearch" placeholder="Поиск калибра по названию или мануфактуре (например, 3285, GP01800, ETA)..." autocomplete="off" />
        </div>

        <details class="content-disclosure movement-filter-details"><summary>Фильтры калибров</summary><div class="mfilters__row">
          <div class="mfilters__group">
            <span class="mfilters__label">Тип:</span>
            <div class="mfilters__chips" id="mfilter-type">
              <button type="button" class="chip is-active" data-val="all">Все</button>
              <button type="button" class="chip" data-val="automatic">Автомат</button>
              <button type="button" class="chip" data-val="manual">Ручной завод</button>
              <button type="button" class="chip" data-val="spring_drive">Spring Drive</button>
              <button type="button" class="chip" data-val="quartz">Кварц</button>
            </div>
          </div>

          <div class="mfilters__group">
            <span class="mfilters__label">Мануфактура:</span>
            <div class="mfilters__chips" id="mfilter-inhouse">
              <button type="button" class="chip is-active" data-val="all">Все</button>
              <button type="button" class="chip chip--lume" data-val="inhouse">Свои калибры</button>
              <button type="button" class="chip" data-val="base">Серийные базы</button>
            </div>
          </div>

          <div class="mfilters__group">
            <span class="mfilters__label">Запас хода:</span>
            <div class="mfilters__chips" id="mfilter-power">
              <button type="button" class="chip is-active" data-val="all">Все</button>
              <button type="button" class="chip" data-val="pr40">До 50 ч</button>
              <button type="button" class="chip" data-val="pr70">70-80 ч</button>
              <button type="button" class="chip" data-val="pr100">100+ ч</button>
            </div>
          </div>
        </div>

        </details>
        <div class="mfilters__status">
          <span role="status" aria-live="polite" id="mcount" class="muted">Найдено: ${movements.length}. Показано: ${Math.min(12, movements.length)}</span>
          <button type="button" class="btn btn--small btn--ghost" id="mreset" hidden>Сбросить фильтры</button>
        </div>
      </section>

      <!-- Интерактивная матрица стандартов точности -->
      <details class="standards-block" aria-label="Стандарты хронометрии"><summary>Стандарты точности и испытаний</summary>
        <div class="standards-head">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap;">
            <div>
              <h2 class="display display--s">Стандарты хронометрической точности</h2>
              <p class="muted">Ключевые сертификационные институты и мануфактурные стандарты часового мира:</p>
            </div>
            <a href="/timegrapher" data-link class="btn btn--subtle btn--sm">
              <i class="ph-light ph-wave-sine" aria-hidden="true"></i> Виртуальный виброграф
            </a>
          </div>
        </div>

        <div class="standards-grid">
          ${STANDARDS.map(
            (std) => html`<div class="std-card" data-std="${std.id}">
              <div class="std-card__top">
                <span class="chip chip--lume">${std.badge}</span>
                <span class="std-card__name">${std.name}</span>
              </div>
              <h3 class="std-card__title">${std.full}</h3>
              <div class="std-card__metric">
                <span class="std-card__metric-label">Допуск точности</span>
                <b class="std-card__metric-val num">${std.accuracy}</b>
              </div>
              <div class="std-card__info">
                <p><b>Испытания:</b> ${std.testing}</p>
                <p><b>Магнитная защита:</b> ${std.magnetism}</p>
                <p class="std-card__note">${std.notes}</p>
              </div>
            </div>`,
          )}
        </div>
      </details>

      <!-- Акустический компаратор частот -->
      <details class="content-disclosure"><summary>Сравнить частоты и послушать ход</summary>
        ${renderEscapementComparator()}
      </details>


      <!-- Сетка калибров -->
      <div class="mgrid" id="mgrid">
        ${movements.slice(0, 12).map((m, i) => renderMovementCard(m, watchesByMov.get(m.caliber) || [], i))}
      </div>
      <button type="button" class="btn btn--ghost catalog-more" id="movement-more" ${movements.length <= 12 ? "hidden" : ""}>Показать ещё ${Math.min(12, Math.max(0, movements.length - 12))}</button>
    </section>`;
  },

  mount(root, { movements, watchesByMov }) {
    revealPhotos(root);

    const searchInput = qs("#msearch", root);
    const countEl = qs("#mcount", root);
    const gridEl = qs("#mgrid", root);
    const resetBtn = qs("#mreset", root);
    const more = qs("#movement-more", root);
    const params = new URLSearchParams(location.search);
    let limit = Math.min(movements.length, Math.max(12, parseInt(params.get("shown"), 10) || 12));

    let state = {
      q: params.get("q") || "",
      type: "all",
      inhouse: "all",
      power: "all",
    };
    searchInput.value = state.q;
    for (const [key, id] of [["type", "#mfilter-type"], ["inhouse", "#mfilter-inhouse"], ["power", "#mfilter-power"]]) {
      const buttons = [...root.querySelectorAll(`${id} button`)];
      const value = params.get(key);
      if (buttons.some(button => button.dataset.val === value)) state[key] = value;
      buttons.forEach(button => button.classList.toggle("is-active", button.dataset.val === state[key]));
    }

    const syncURL = () => {
      const p = new URLSearchParams();
      if (state.q.trim()) p.set("q", state.q.trim());
      for (const key of ["type", "inhouse", "power"]) if (state[key] !== "all") p.set(key, state[key]);
      if (limit > 12) p.set("shown", String(limit));
      const query = p.toString();
      history.replaceState(history.state, "", location.pathname + (query ? `?${query}` : ""));
    };

    const updateFilter = (resetLimit = true) => {
      if (resetLimit) limit = 12;
      const q = state.q.toLowerCase().trim();
      const filtered = movements.filter((m) => {
        if (q) {
          const matchCal = m.caliber.toLowerCase().includes(q);
          const matchMaker = m.maker.toLowerCase().includes(q);
          const matchDesc = (m.description || "").toLowerCase().includes(q);
          if (!matchCal && !matchMaker && !matchDesc) return false;
        }

        if (state.type !== "all") {
          if (state.type === "quartz") {
            if (!["quartz", "solar", "kinetic", "smart"].includes(m.type)) return false;
          } else if (m.type !== state.type) {
            return false;
          }
        }

        if (state.inhouse === "inhouse" && !m.in_house) return false;
        if (state.inhouse === "base" && m.in_house) return false;

        if (state.power !== "all") {
          const pr = m.power_reserve_h || 0;
          if (state.power === "pr40" && pr > 55) return false;
          if (state.power === "pr70" && (pr < 56 || pr > 85)) return false;
          if (state.power === "pr100" && pr < 86) return false;
        }

        return true;
      });

      if (gridEl) {
        clearReveals(gridEl);
        gridEl.innerHTML = filtered.length ? filtered.slice(0, limit).map((m, i) => renderMovementCard(m, watchesByMov.get(m.caliber) || [], i)).join("") : `<p class="catalog-empty">Калибров с такими условиями нет. Измените запрос или сбросьте фильтры выше.</p>`;
        observeReveals(gridEl);
      }

      if (countEl) {
        countEl.textContent = `Найдено: ${filtered.length} из ${movements.length}. Показано: ${Math.min(limit, filtered.length)}`;
      }

      const hasActive = state.q || state.type !== "all" || state.inhouse !== "all" || state.power !== "all";
      if (resetBtn) resetBtn.hidden = !hasActive;
      more.hidden = limit >= filtered.length;
      more.textContent = `Показать ещё ${Math.min(12, Math.max(0, filtered.length - limit))}`;
      syncURL();
    };

    more.addEventListener("click", () => {
      const previous = limit;
      limit += 12;
      updateFilter(false);
      gridEl.querySelectorAll('.mcard__title-link')[previous]?.focus({ preventScroll: true });
    });

    searchInput?.addEventListener("input", (e) => {
      state.q = e.target.value;
      updateFilter();
    });

    if (params.size) updateFilter(false);
    const bindChipGroup = (containerId, stateKey) => {
      const box = qs(containerId, root);
      box?.addEventListener("click", (e) => {
        const chip = e.target.closest("button[data-val]");
        if (!chip) return;
        qsa("button", box).forEach(b => {
          b.classList.toggle("is-active", b === chip);
          b.setAttribute("aria-pressed", String(b === chip));
        });
        state[stateKey] = chip.dataset.val;
        updateFilter();
      });
    };

    bindChipGroup("#mfilter-type", "type");
    bindChipGroup("#mfilter-inhouse", "inhouse");
    bindChipGroup("#mfilter-power", "power");

    resetBtn?.addEventListener("click", () => {
      state = { q: "", type: "all", inhouse: "all", power: "all" };
      if (searchInput) searchInput.value = "";
      qsa(".mfilters__chips button", root).forEach((b) => {
        b.classList.toggle("is-active", b.dataset.val === "all");
        b.setAttribute("aria-pressed", String(b.dataset.val === "all"));
      });
      updateFilter();
      searchInput.focus({ preventScroll: true });
    });

    root.querySelectorAll('.mfilters__chips button').forEach(b => b.setAttribute("aria-pressed", String(b.classList.contains("is-active"))));
    const offComp = mountEscapementComparator(root);
    return () => offComp?.();
  },
};

function renderMovementCard(m, watchList, i = 0) {
  const mech = ["automatic", "manual", "spring_drive"].includes(m.type);
  const prGauge = m.power_reserve_h ? Math.min(100, Math.round((m.power_reserve_h / 120) * 100)) : null;

  return html`<article class="mcard" data-slug="${m.slug}" data-reveal style="--i:${i % 6}">
    <div class="mcard__head">
      <div class="mcard__meta">
        <span class="chip">${MOVEMENT[m.type]?.short ?? m.type}</span>
        ${m.in_house ? html`<span class="chip chip--lume">Свой калибр</span>` : ""}
        ${m.certification ? html`<span class="chip chip--spec" title="Сертификат">${m.certification}</span>` : ""}
      </div>
      <a class="mcard__title-link" href="/movement/${m.slug}">
        <h3 class="mcard__title">${m.caliber}</h3>
      </a>
      <p class="mcard__maker"><i class="ph-light ph-factory" aria-hidden="true"></i>${m.maker}${m.base ? ` (база ${m.base})` : ""}</p>
    </div>

    <div class="mcard__specs">
      ${m.power_reserve_h
        ? html`<div class="mcard__spec-item">
            <span class="mcard__spec-label">Запас хода</span>
            <b class="mcard__spec-val num">${hours(m.power_reserve_h)}</b>
            <div class="mcard__pr-bar"><span style="width: ${prGauge}%"></span></div>
          </div>`
        : ""}
      ${m.frequency_vph
        ? html`<div class="mcard__spec-item">
            <span class="mcard__spec-label">Частота</span>
            <b class="mcard__spec-val">${vph(m.frequency_vph)}</b>
          </div>`
        : ""}
      ${m.jewels
        ? html`<div class="mcard__spec-item">
            <span class="mcard__spec-label">Камни</span>
            <b class="mcard__spec-val num">${m.jewels}</b>
          </div>`
        : ""}
    </div>

    ${m.description ? html`<p class="mcard__desc">${m.description}</p>` : ""}

    <div class="mcard__foot">
      <div class="mcard__watches">
        <span class="mcard__watches-label">В атласе:</span>
        ${watchList.length
          ? html`<div class="mcard__watch-tags">
              ${watchList.map((w) => html`<a href="/watch/${w.slug}" data-link class="mcard__wtag" title="${w.brand_name} ${w.name}">${w.brand_name} ${w.name}</a>`)}
            </div>`
          : html`<span class="muted">Модели не добавлены</span>`}
      </div>
      <a class="btn btn--small btn--ghost mcard__btn" href="/movement/${m.slug}">Подробнее <i class="ph-light ph-arrow-right" aria-hidden="true"></i></a>
    </div>
  </article>`;
}
