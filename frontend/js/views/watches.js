// Страница глобального каталога всех моделей часов с фасетными фильтрами и поиском.

import { api } from "../core/api.js";
import { html, qs, qsa } from "../core/dom.js";
import { watchCard } from "../ui/cards.js";
import { revealPhotos } from "../ui/photo.js";
import { models, MOVEMENT, priceCompact, usd } from "../core/format.js";
import { toggleCompare, hasCompare, onCompareChange } from "../core/compare.js";
import { observeReveals, clearReveals } from "../core/motion.js";

// Диапазоны бюджета в долларах; подписи в активной валюте.
const BUDGETS = [["under1k", 0, 1000], ["1k-5k", 1000, 5000], ["5k-15k", 5000, 15000], ["over15k", 15000, Infinity]];
function budgetLabel(key) {
  const [, lo, hi] = BUDGETS.find(([k]) => k === key);
  if (!lo) return `До ${priceCompact(hi)}`;
  if (hi === Infinity) return `Дороже ${priceCompact(lo)}`;
  return `${priceCompact(lo)} – ${priceCompact(hi)}`;
}

const MATERIALS = [
  { key: "all", label: "Все" },
  { key: "steel", label: "Сталь" },
  { key: "rose_gold", label: "Розовое золото" },
  { key: "yellow_gold", label: "Желтое золото" },
  { key: "white_gold", label: "Белое золото" },
  { key: "platinum", label: "Платина" },
  { key: "titanium", label: "Титан" },
  { key: "ceramic", label: "Керамика" },
  { key: "carbon", label: "Карбон" },
  { key: "bronze", label: "Бронза" },
];

const DIAMETERS = [
  { key: "all", label: "Все" },
  { key: "under38", label: "До 38 мм" },
  { key: "38-41", label: "38–41 мм" },
  { key: "over41", label: "От 42 мм" },
];

const WATERS = [
  { key: "all", label: "Все" },
  { key: "wr30", label: "30 м (костюмные)" },
  { key: "wr50-100", label: "50–100 м (универсальные)" },
  { key: "wr200-300", label: "200–300 м (дайверские)" },
  { key: "wr600", label: "600+ м (глубоководные)" },
];

function matchesMaterial(w, mat) {
  if (mat === "all") return true;
  const m = (w.material || w.render?.case?.material || "").toLowerCase();
  if (mat === "steel") return m.includes("steel");
  if (mat === "rose_gold") return m === "rose_gold" || m === "two_tone_rose";
  if (mat === "yellow_gold") return m === "yellow_gold" || m === "two_tone_yellow";
  if (mat === "white_gold") return m === "white_gold";
  if (mat === "platinum") return m === "platinum";
  if (mat === "titanium") return m === "titanium";
  if (mat === "ceramic") return m.includes("ceramic");
  if (mat === "carbon") return m === "carbon";
  if (mat === "bronze") return m === "bronze";
  return m === mat;
}

function matchesDiameter(w, diam) {
  if (diam === "all") return true;
  const d = w.diameter_mm ?? 0;
  if (diam === "under38") return d < 38;
  if (diam === "38-41") return d >= 38 && d <= 41;
  if (diam === "over41") return d >= 42;
  return true;
}

function matchesWater(w, wr) {
  if (wr === "all") return true;
  const r = w.water_resistance_m ?? 0;
  if (wr === "wr30") return r <= 30;
  if (wr === "wr50-100") return r >= 50 && r <= 100;
  if (wr === "wr200-300") return r >= 120 && r <= 300;
  if (wr === "wr600") return r >= 600;
  return true;
}

export default {
  layer: "page",
  currencyAware: true, // цены пересчитываются в mount без перерисовки страницы

  async data() {
    const [watches, countries] = await Promise.all([api.watches(), api.countries()]);
    return { watches, countries };
  },

  meta: () => ({
    title: "Каталог часов: все модели мира | Horologium",
    crumbs: [{ label: "Глобус", href: "/" }, { label: "Каталог всех часов" }],
  }),

  render({ watches, countries }) {
    return html`<section class="catalog-page container">
      <header class="catalog-page__head">
        <h1 class="display display--l" data-reveal>Все часы атласа</h1>
        <p class="lead" data-reveal>Полный справочник ${models(watches.length)} от ведущих мануфактур 8 стран мира. Настоящие фотографии, характеристики калибров и цены с источниками.</p>
        
        <div class="catalog-filters">
          <div class="catalog-filters__search">
            <i class="ph-light ph-magnifying-glass" aria-hidden="true"></i>
            <input type="search" id="catalog-search" placeholder="Поиск по названию, бренду, коллекции, калибру..." autocomplete="off" aria-label="Поиск по каталогу">
          </div>
          
          <details class="catalog-filter-details" id="catalog-filter-details">
            <summary>Все фильтры <span id="catalog-filter-count"></span></summary>
          <div class="catalog-filters__row">
            <div class="catalog-filters__group">
              <span class="catalog-filters__title">Страна:</span>
              <div class="catalog-chips" id="filter-country">
                <button type="button" class="catalog-chip is-active" data-country="all">Все</button>
                ${countries.map((c) => html`<button type="button" class="catalog-chip" data-country="${c.slug}">${c.name}</button>`)}
              </div>
            </div>

            <div class="catalog-filters__group">
              <span class="catalog-filters__title">Механизм:</span>
              <div class="catalog-chips" id="filter-movement">
                <button type="button" class="catalog-chip is-active" data-mech="all">Все</button>
                <button type="button" class="catalog-chip" data-mech="automatic">Автомат</button>
                <button type="button" class="catalog-chip" data-mech="manual">Ручной</button>
                <button type="button" class="catalog-chip" data-mech="quartz">Кварц</button>
                <button type="button" class="catalog-chip" data-mech="spring_drive">Spring Drive</button>
                <button type="button" class="catalog-chip" data-mech="smart">Смарт</button>
              </div>
            </div>

            <div class="catalog-filters__group">
              <span class="catalog-filters__title">Материал корпуса:</span>
              <div class="catalog-chips" id="filter-material">
                ${MATERIALS.map((m) => html`<button type="button" class="catalog-chip ${m.key === "all" ? "is-active" : ""}" data-material="${m.key}">${m.label}</button>`)}
              </div>
            </div>

            <div class="catalog-filters__group">
              <span class="catalog-filters__title">Диаметр корпуса:</span>
              <div class="catalog-chips" id="filter-diameter">
                ${DIAMETERS.map((d) => html`<button type="button" class="catalog-chip ${d.key === "all" ? "is-active" : ""}" data-diam="${d.key}">${d.label}</button>`)}
              </div>
            </div>

            <div class="catalog-filters__group">
              <span class="catalog-filters__title">Водозащита:</span>
              <div class="catalog-chips" id="filter-water">
                ${WATERS.map((w) => html`<button type="button" class="catalog-chip ${w.key === "all" ? "is-active" : ""}" data-water="${w.key}">${w.label}</button>`)}
              </div>
            </div>
            
            <div class="catalog-filters__group">
              <span class="catalog-filters__title">Бюджет:</span>
              <div class="catalog-chips" id="filter-price">
                <button type="button" class="catalog-chip is-active" data-price="all">Любой</button>
                ${BUDGETS.map(([key]) => html`<button type="button" class="catalog-chip" data-price="${key}">${budgetLabel(key)}</button>`)}
              </div>
            </div>

            <div class="catalog-filters__group catalog-filters__group--sort">
              <span class="catalog-filters__title">Сортировка:</span>
              <select class="catalog-select" id="catalog-sort" aria-label="Сортировка">
                <option value="default">По популярности</option>
                <option value="price_asc">Сначала доступные</option>
                <option value="price_desc">Сначала дорогие</option>
                <option value="year_desc">Сначала новинки</option>
                <option value="diameter_asc">По диаметру (по возрастанию)</option>
                <option value="diameter_desc">По диаметру (по убыванию)</option>
                <option value="water_desc">По водозащите</option>
              </select>
            </div>
          </div>
          
          </details>
          <div class="catalog-active" id="catalog-active" aria-label="Выбранные фильтры" hidden></div>
          <div class="catalog-status">
            <span id="catalog-count" role="status" aria-live="polite">Показано: ${watches.length} из ${watches.length}</span>
            <button type="button" class="catalog-reset" id="catalog-reset" style="display: none;">Сбросить все фильтры</button>
          </div>
        </div>
      </header>

      <h2 class="visually-hidden">Модели</h2>
      <div class="catalog-grid" id="catalog-grid">
        ${watches.slice(0, 12).map((w, i) => watchCard(w, { showBrand: true, i }))}
      </div>
      <button type="button" id="catalog-more" class="btn btn--ghost catalog-more" hidden>Показать ещё</button>
    </section>`;
  },

  mount(root, { watches }, ctx) {
    revealPhotos(root);

    const grid = qs("#catalog-grid", root);
    const searchInput = qs("#catalog-search", root);
    const countEl = qs("#catalog-count", root);
    const sortSelect = qs("#catalog-sort", root);
    const resetBtn = qs("#catalog-reset", root);

    // Чтение параметров из URL
    const params = new URLSearchParams(window.location.search);
    let visibleLimit = Math.min(watches.length, Math.max(12, parseInt(params.get("shown"), 10) || 12));
    let activeCountry = params.get("country") || "all";
    let activeMech = params.get("mech") || "all";
    let activeMaterial = params.get("material") || "all";
    let activeDiameter = params.get("diameter") || "all";
    let activeWater = params.get("wr") || "all";
    let activePrice = params.get("price") || "all";
    let searchQuery = params.get("q") || "";
    let activeSort = params.get("sort") || "default";

    // Установка начального состояния элементов управления
    if (searchQuery && searchInput) searchInput.value = searchQuery;
    if (activeSort && sortSelect) sortSelect.value = activeSort;

    const setChipActive = (containerSelector, dataAttr, targetValue) => {
      const container = qs(containerSelector, root);
      if (!container) return;
      container.querySelectorAll(".catalog-chip").forEach((btn) => {
        const selected = btn.dataset[dataAttr] === targetValue;
        btn.classList.toggle("is-active", selected);
        btn.setAttribute("aria-pressed", String(selected));
      });
    };

    setChipActive("#filter-country", "country", activeCountry);
    setChipActive("#filter-movement", "mech", activeMech);
    setChipActive("#filter-material", "material", activeMaterial);
    setChipActive("#filter-diameter", "diam", activeDiameter);
    setChipActive("#filter-water", "water", activeWater);
    setChipActive("#filter-price", "price", activePrice);

    const syncURL = () => {
      const p = new URLSearchParams();
      if (searchQuery.trim()) p.set("q", searchQuery.trim());
      if (activeCountry !== "all") p.set("country", activeCountry);
      if (activeMech !== "all") p.set("mech", activeMech);
      if (activeMaterial !== "all") p.set("material", activeMaterial);
      if (activeDiameter !== "all") p.set("diameter", activeDiameter);
      if (activeWater !== "all") p.set("wr", activeWater);
      if (activePrice !== "all") p.set("price", activePrice);
      if (activeSort !== "default") p.set("sort", activeSort);
      if (visibleLimit > 12) p.set("shown", String(visibleLimit));

      const qsStr = p.toString();
      const newUrl = window.location.pathname + (qsStr ? `?${qsStr}` : "");
      if (newUrl !== window.location.pathname + window.location.search) {
        history.replaceState({ ...history.state }, "", newUrl);
      }
    };

    const isFiltered = () => {
      return (
        searchQuery.trim() !== "" ||
        activeCountry !== "all" ||
        activeMech !== "all" ||
        activeMaterial !== "all" ||
        activeDiameter !== "all" ||
        activeWater !== "all" ||
        activePrice !== "all" ||
        activeSort !== "default"
      );
    };

    const filterWatches = (resetLimit = true) => {
      if (resetLimit) visibleLimit = 12;
      let filtered = [...watches];

      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        filtered = filtered.filter((w) =>
          w.name.toLowerCase().includes(q) ||
          w.brand_name.toLowerCase().includes(q) ||
          (w.collection && w.collection.toLowerCase().includes(q)) ||
          (w.reference && w.reference.toLowerCase().includes(q)) ||
          (w.caliber && w.caliber.toLowerCase().includes(q))
        );
      }

      if (activeCountry !== "all") {
        filtered = filtered.filter((w) => (w.country || w.country_slug) === activeCountry);
      }

      if (activeMech !== "all") {
        filtered = filtered.filter((w) => w.movement_type === activeMech);
      }

      if (activeMaterial !== "all") {
        filtered = filtered.filter((w) => matchesMaterial(w, activeMaterial));
      }

      if (activeDiameter !== "all") {
        filtered = filtered.filter((w) => matchesDiameter(w, activeDiameter));
      }

      if (activeWater !== "all") {
        filtered = filtered.filter((w) => matchesWater(w, activeWater));
      }

      if (activePrice !== "all") {
        filtered = filtered.filter((w) => {
          const p = w.price?.usd ?? 0;
          if (activePrice === "under1k") return p < 1000;
          if (activePrice === "1k-5k") return p >= 1000 && p <= 5000;
          if (activePrice === "5k-15k") return p > 5000 && p <= 15000;
          if (activePrice === "over15k") return p > 15000;
          return true;
        });
      }

      if (activeSort === "price_asc") {
        filtered.sort((a, b) => (a.price?.usd ?? 0) - (b.price?.usd ?? 0));
      } else if (activeSort === "price_desc") {
        filtered.sort((a, b) => (b.price?.usd ?? 0) - (a.price?.usd ?? 0));
      } else if (activeSort === "year_desc") {
        filtered.sort((a, b) => (b.year_introduced ?? 0) - (a.year_introduced ?? 0));
      } else if (activeSort === "diameter_asc") {
        filtered.sort((a, b) => (a.diameter_mm ?? 0) - (b.diameter_mm ?? 0));
      } else if (activeSort === "diameter_desc") {
        filtered.sort((a, b) => (b.diameter_mm ?? 0) - (a.diameter_mm ?? 0));
      } else if (activeSort === "water_desc") {
        filtered.sort((a, b) => (b.water_resistance_m ?? 0) - (a.water_resistance_m ?? 0));
      }

      clearReveals(grid);
      grid.innerHTML = filtered.length
        ? filtered.slice(0, visibleLimit).map((w, i) => watchCard(w, { showBrand: true, i })).join("")
        : `<div class="catalog-empty"><h2>Совпадений нет</h2><p>Измените запрос или сбросьте ограничения.</p><button type="button" class="btn btn--ghost" data-clear-filters>Сбросить фильтры</button></div>`;
      const active = [...root.querySelectorAll('.catalog-chip[aria-pressed="true"]')].filter(b => !["all", undefined].includes(Object.values(b.dataset)[0]));
      const activeBox = qs("#catalog-active", root);
      activeBox.replaceChildren(...active.map(button => {
        const clear = document.createElement("button");
        clear.type = "button"; clear.className = "chip";
        clear.textContent = `${button.textContent} ×`;
        clear.setAttribute("aria-label", `Убрать фильтр: ${button.textContent}`);
        clear.addEventListener("click", () => {
          button.parentElement.querySelector('button[data-country="all"],button[data-mech="all"],button[data-material="all"],button[data-diam="all"],button[data-water="all"],button[data-price="all"]').click();
          qs("#catalog-filter-details > summary", root).focus({ preventScroll: true });
        });
        return clear;
      }));
      activeBox.hidden = !active.length;
      qs("#catalog-filter-count", root).textContent = active.length ? `(${active.length})` : "";
      countEl.textContent = `Найдено: ${filtered.length}. Показано: ${Math.min(visibleLimit, filtered.length)}`;
      const more = qs("#catalog-more", root);
      more.hidden = visibleLimit >= filtered.length;
      more.textContent = `Показать ещё ${Math.min(12, filtered.length - visibleLimit)}`;
      if (resetBtn) resetBtn.style.display = isFiltered() ? "inline-block" : "none";
      revealPhotos(grid);
      observeReveals(grid);
      syncURL();
    };

    // The visible batch is also in the URL so Back restores the same catalogue.
    filterWatches(false);

    root.addEventListener("click", (e) => {
      if (e.target.closest("#catalog-more")) {
        const previous = visibleLimit;
        visibleLimit += 12;
        filterWatches(false);
        grid.querySelectorAll('.wcard')[previous]?.focus({ preventScroll: true });
        return;
      }
      const chip = e.target.closest(".catalog-chip");
      if (chip) {
        const parent = chip.parentElement;
        parent.querySelectorAll(".catalog-chip").forEach((b) => {
          b.classList.toggle("is-active", b === chip);
          b.setAttribute("aria-pressed", String(b === chip));
        });

        if (chip.dataset.country !== undefined) activeCountry = chip.dataset.country;
        if (chip.dataset.mech !== undefined) activeMech = chip.dataset.mech;
        if (chip.dataset.material !== undefined) activeMaterial = chip.dataset.material;
        if (chip.dataset.diam !== undefined) activeDiameter = chip.dataset.diam;
        if (chip.dataset.water !== undefined) activeWater = chip.dataset.water;
        if (chip.dataset.price !== undefined) activePrice = chip.dataset.price;
        filterWatches();
        return;
      }

      if (e.target.closest("#catalog-reset, [data-clear-filters]")) {
        activeCountry = "all";
        activeMech = "all";
        activeMaterial = "all";
        activeDiameter = "all";
        activeWater = "all";
        activePrice = "all";
        searchQuery = "";
        activeSort = "default";

        if (searchInput) searchInput.value = "";
        if (sortSelect) sortSelect.value = "default";

        setChipActive("#filter-country", "country", "all");
        setChipActive("#filter-movement", "mech", "all");
        setChipActive("#filter-material", "material", "all");
        setChipActive("#filter-diameter", "diam", "all");
        setChipActive("#filter-water", "water", "all");
        setChipActive("#filter-price", "price", "all");

        filterWatches();
        searchInput?.focus({ preventScroll: true });
        return;
      }

      const compBtn = e.target.closest("[data-compare]");
      if (compBtn) {
        e.preventDefault();
        e.stopPropagation();
        const slug = compBtn.dataset.compare;
        const state = toggleCompare(slug);
        compBtn.setAttribute("aria-pressed", String(state));
      }
    });

    searchInput?.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      filterWatches();
    });

    sortSelect?.addEventListener("change", (e) => {
      activeSort = e.target.value;
      filterWatches();
    });

    const unCompare = onCompareChange(() => {
      qsa("[data-compare]", root).forEach((btn) => {
        btn.setAttribute("aria-pressed", String(hasCompare(btn.dataset.compare)));
      });
    });

    const onCur = () => {
      qsa("#filter-price [data-price]", root).forEach((b) => b.dataset.price !== "all" && (b.textContent = budgetLabel(b.dataset.price)));
      filterWatches(false);
    };
    window.addEventListener("currencychange", onCur);

    return () => {
      unCompare();
      window.removeEventListener("currencychange", onCur);
    };
  },
};
