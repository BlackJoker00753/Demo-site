// Страница глобального каталога всех моделей часов с фильтрами и поиском.

import { api } from "../core/api.js";
import { html, qs, qsa } from "../core/dom.js";
import { watchCard } from "../ui/cards.js";
import { revealPhotos } from "../ui/photo.js";
import { models, MOVEMENT, priceCompact, usd } from "../core/format.js";
import { toggleCompare, hasCompare, onCompareChange } from "../core/compare.js";

// Диапазоны бюджета в долларах; подписи в активной валюте.
const BUDGETS = [["under1k", 0, 1000], ["1k-5k", 1000, 5000], ["5k-15k", 5000, 15000], ["over15k", 15000, Infinity]];
function budgetLabel(key) {
  const [, lo, hi] = BUDGETS.find(([k]) => k === key);
  if (!lo) return `До ${priceCompact(hi)}`;
  if (hi === Infinity) return `Дороже ${priceCompact(lo)}`;
  return `${priceCompact(lo)} – ${priceCompact(hi)}`;
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
        <p class="label" data-reveal>Коллекция</p>
        <h1 class="display display--l" data-reveal>Все часы атласа</h1>
        <p class="lead" data-reveal>Полный справочник ${models(watches.length)} от ведущих мануфактур 8 стран мира. Настоящие фотографии, характеристики калибров и цены с источниками.</p>
        
        <div class="catalog-filters" data-reveal>
          <div class="catalog-filters__search">
            <i class="ph-light ph-magnifying-glass" aria-hidden="true"></i>
            <input type="search" id="catalog-search" placeholder="Поиск по названию, бренду, калибру..." autocomplete="off" aria-label="Поиск по каталогу">
          </div>
          
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
                <option value="diameter_asc">По диаметру</option>
              </select>
            </div>
          </div>
          
          <div class="catalog-status">
            <span id="catalog-count">Показано: ${watches.length} из ${watches.length}</span>
          </div>
        </div>
      </header>

      <h2 class="visually-hidden">Модели</h2>
      <div class="catalog-grid" id="catalog-grid">
        ${watches.map((w, i) => watchCard(w, { showBrand: true, i }))}
      </div>
    </section>`;
  },

  mount(root, { watches }) {
    revealPhotos(root);

    const grid = qs("#catalog-grid", root);
    const searchInput = qs("#catalog-search", root);
    const countEl = qs("#catalog-count", root);
    const sortSelect = qs("#catalog-sort", root);

    let activeCountry = "all";
    let activeMech = "all";
    let activePrice = "all";
    let searchQuery = "";
    let activeSort = "default";

    const filterWatches = () => {
      let filtered = [...watches];

      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        filtered = filtered.filter((w) =>
          w.name.toLowerCase().includes(q) ||
          w.brand_name.toLowerCase().includes(q) ||
          (w.reference && w.reference.toLowerCase().includes(q))
        );
      }

      if (activeCountry !== "all") {
        filtered = filtered.filter((w) => w.country_slug === activeCountry);
      }

      if (activeMech !== "all") {
        filtered = filtered.filter((w) => w.movement_type === activeMech);
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
      }

      grid.innerHTML = filtered.map((w, i) => watchCard(w, { showBrand: true, i })).join("");
      countEl.textContent = `Показано: ${filtered.length} из ${watches.length}`;
      revealPhotos(grid);
    };

    root.addEventListener("click", (e) => {
      const chip = e.target.closest(".catalog-chip");
      if (chip) {
        const parent = chip.parentElement;
        parent.querySelectorAll(".catalog-chip").forEach((b) => b.classList.remove("is-active"));
        chip.classList.add("is-active");

        if (chip.dataset.country !== undefined) activeCountry = chip.dataset.country;
        if (chip.dataset.mech !== undefined) activeMech = chip.dataset.mech;
        if (chip.dataset.price !== undefined) activePrice = chip.dataset.price;
        filterWatches();
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
      filterWatches();
    };
    window.addEventListener("currencychange", onCur);

    return () => {
      unCompare();
      window.removeEventListener("currencychange", onCur);
    };
  },
};
