// Верхняя навигация: хлебные крошки, переключатель валют и плавающая панель сравнения.

import { html, setHTML } from "../core/dom.js";
import { date, getActiveCurrency, onCurrencyChange, RATES, setActiveCurrency } from "../core/format.js";
import { getComparedSlugs, clearCompare, onCompareChange } from "../core/compare.js";

export function initNav() {
  const nav = document.getElementById("nav");
  const crumbs = document.getElementById("crumbs");

  // Сторожевой элемент вверху документа: как только он уходит из кадра, навигация становится плотной.
  const sentinel = document.createElement("div");
  sentinel.style.cssText = "position:absolute;top:0;left:0;width:1px;height:48px;pointer-events:none;";
  document.body.prepend(sentinel);
  new IntersectionObserver(([e]) => nav.classList.toggle("is-solid", !e.isIntersecting && nav.dataset.layer !== "globe")).observe(sentinel);

  // Валюта
  const curBtn = document.getElementById("cur-btn");
  const curLabel = document.getElementById("cur-label");
  const curDropdown = document.getElementById("cur-dropdown");

  const updateCurUI = (cur) => {
    if (curLabel) curLabel.textContent = `${cur.code} ${cur.symbol}`;
    if (curDropdown) {
      curDropdown.querySelectorAll("[data-cur]").forEach((b) => {
        b.classList.toggle("is-selected", b.dataset.cur === cur.code);
      });
    }
  };

  updateCurUI(getActiveCurrency());

  curBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    const isHidden = curDropdown?.hasAttribute("hidden");
    if (isHidden) {
      curDropdown?.removeAttribute("hidden");
      curBtn.setAttribute("aria-expanded", "true");
    } else {
      curDropdown?.setAttribute("hidden", "");
      curBtn.setAttribute("aria-expanded", "false");
    }
  });

  curDropdown?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cur]");
    if (btn) {
      setActiveCurrency(btn.dataset.cur);
      curDropdown.setAttribute("hidden", "");
      curBtn?.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#nav-currency")) {
      curDropdown?.setAttribute("hidden", "");
      curBtn?.setAttribute("aria-expanded", "false");
    }
  });

  onCurrencyChange(updateCurUI);
  const curNote = document.getElementById("cur-note");
  const updateRatesNote = () => {
    if (curNote) curNote.textContent = `Цены хранятся в долларах США. Пересчёт по курсу на ${date(RATES.date)} (${RATES.source}).`;
  };
  updateRatesNote();
  window.addEventListener("ratesupdate", updateRatesNote);

  // Меню разделов на телефоне
  const menuBtn = document.getElementById("menu-open");
  const mnav = document.getElementById("mnav");
  const setMenu = (open) => {
    if (!mnav || !menuBtn) return;
    mnav.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    menuBtn.querySelector("i").className = `ph-light ${open ? "ph-x" : "ph-list"}`;
    if (open) mnav.querySelector("a:not([hidden])")?.focus({ preventScroll: true });
  };
  menuBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    setMenu(mnav.hidden);
  });
  mnav?.addEventListener("click", (e) => e.target.closest("a") && setMenu(false));
  document.addEventListener("click", (e) => {
    if (mnav && !mnav.hidden && !e.target.closest("#mnav, #menu-open")) setMenu(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mnav && !mnav.hidden) {
      setMenu(false);
      menuBtn.focus();
    }
  });

  // Плавающая панель сравнения (Floating Compare Bar)
  let floatBar = document.getElementById("compare-float-bar");
  if (!floatBar) {
    floatBar = document.createElement("div");
    floatBar.id = "compare-float-bar";
    floatBar.className = "compare-float";
    floatBar.hidden = true;
    document.body.appendChild(floatBar);
  }

  const updateCompareUI = (slugs) => {
    const count = slugs.length;
    const navLink = document.getElementById("nav-compare-link");
    const countBadge = document.getElementById("compare-count");
    if (navLink) {
      navLink.hidden = count === 0;
      if (countBadge) countBadge.textContent = count;
    }
    const mLink = document.getElementById("mnav-compare");
    if (mLink) {
      mLink.hidden = count === 0;
      document.getElementById("mnav-compare-count").textContent = count;
    }

    if (count > 0 && !location.pathname.startsWith("/compare")) {
      floatBar.hidden = false;
      setHTML(
        floatBar,
        html`<div class="compare-float__inner">
          <div class="compare-float__info">
            <i class="ph-light ph-scales" aria-hidden="true"></i>
            <span>В сравнении: <b>${count}</b> ${count === 1 ? "модель" : count < 5 ? "модели" : "моделей"}</span>
          </div>
          <div class="compare-float__actions">
            <a class="btn btn--small btn--primary" href="/compare" data-link>Сравнить</a>
            <button type="button" class="btn btn--small btn--ghost" id="float-clear-btn" title="Очистить список">Очистить</button>
          </div>
        </div>`
      );
    } else {
      floatBar.hidden = true;
    }
  };

  updateCompareUI(getComparedSlugs());
  onCompareChange(updateCompareUI);

  floatBar.addEventListener("click", (e) => {
    if (e.target.closest("#float-clear-btn")) {
      clearCompare();
    }
  });

  return {
    update(meta, routeName) {
      // текущий раздел в меню телефона
      document.querySelectorAll("#mnav a").forEach((a) => {
        const here = a.getAttribute("href") === location.pathname;
        if (here) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });
      nav.dataset.layer = routeName === "home" || routeName === "country" ? "globe" : "page";
      if (nav.dataset.layer === "globe") nav.classList.remove("is-solid");
      const items = meta.crumbs ?? [];
      setHTML(
        crumbs,
        html`${items.map((c, i) =>
          i === items.length - 1
            ? html`<span aria-current="page">${c.label}</span>`
            : html`<a href="${c.href}">${c.label}</a><span class="sep" aria-hidden="true">/</span>`,
        )}`,
      );
      updateCompareUI(getComparedSlugs());
    },
  };
}
