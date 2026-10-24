import { html } from "../core/dom.js";
import { reduced } from "../core/motion.js";
import { STEPS, describePart } from "./submariner-parts.js";

export function renderSubmarinerWorkshop() {
  return html`<section class="sub-workshop container" id="explode" aria-labelledby="sub-title" data-ui>
    <header class="sub-workshop__heading">
      <h2 id="sub-title">Submariner. Изнутри.</h2>
      <p>Разберите часы и узнайте, как работает каждая деталь.</p>
    </header>
    <div class="sub-workshop__body">
      <nav class="sub-steps" aria-label="Этапы разборки">
        ${STEPS.map(([name], i) => html`<button type="button" data-sub-step="${i}" aria-current="${i === 0 ? "step" : "false"}"><span>${i + 1}</span>${name}</button>`)}
      </nav>
      <div class="sub-stage">
        <img class="sub-stage__poster" src="/assets/photos/rolex-submariner/1-960.webp" alt="Rolex Submariner 124060, вид часов в сборе" width="720" height="960" loading="lazy">
        <canvas tabindex="0" aria-label="Объёмный Rolex Submariner. Потяните для поворота; кнопки под сценой управляют разборкой." hidden></canvas>
        <div class="sub-stage__status" role="status"><span>3D-мастерская</span><button type="button" data-sub-load>Открыть 3D</button></div>
        <div class="sub-stage__tools" aria-label="Управление камерой" hidden>
          <button type="button" data-sub-view="front">Спереди</button>
          <button type="button" data-sub-view="back">Сзади</button>
          <button type="button" data-sub-zoom="0.8" aria-label="Приблизить">+</button>
          <button type="button" data-sub-zoom="1.25" aria-label="Отдалить">−</button>
        </div>
        <button type="button" class="sub-stage__return" hidden>Вернуть все детали</button>
        <span class="sub-stage__gesture" hidden>Потяните, чтобы повернуть. Нажмите на деталь.</span>
      </div>
      <aside class="sub-inspector" aria-label="Выбранная деталь" hidden>
        <button type="button" class="sub-inspector__close" aria-label="Закрыть описание детали">Закрыть</button>
        <h3></h3><p class="sub-inspector__text"></p>
        <details><summary>Материал и назначение</summary><p class="sub-inspector__material"></p><p>Положение можно изучить в сборке, а форму и обработку рассмотреть отдельно.</p></details>
        <button type="button" class="sub-inspector__isolate">Рассмотреть отдельно</button>
      </aside>
    </div>
    <div class="sub-transport">
      <div class="sub-transport__caption" aria-live="polite" aria-atomic="true"><h3>${STEPS[0][0]}</h3><p>${STEPS[0][1]}</p></div>
      <div class="sub-transport__actions">
        <button type="button" data-sub-prev aria-label="Предыдущий этап" disabled>Назад</button>
        <button type="button" data-sub-play disabled>Разобрать часы</button>
        <button type="button" data-sub-next aria-label="Следующий этап" disabled>Далее</button>
      </div>
      <label class="sub-progress"><span>Собраны</span><input type="range" min="0" max="1000" step="1" value="0" aria-label="Степень разборки Submariner" disabled><span>Разобраны</span></label>
    </div>
    <details class="sub-catalogue"><summary>Найти деталь <span class="sub-catalogue__count"></span></summary>
      <label>Название детали<input type="search" placeholder="Например, баланс или стекло" autocomplete="off"></label>
      <div class="sub-catalogue__list" role="group" aria-label="Детали модели"></div><p class="sub-catalogue__empty" hidden>Совпадений нет. Попробуйте другое название.</p>
    </details>
    <details class="sub-about"><summary>О точности модели</summary><p>Объёмная учебная модель Submariner 124060: корпус 41 мм, браслет Oyster и основные узлы калибра 3230. Внешняя геометрия восстановлена по официальным фотографиям Rolex. Печать циферблата и деления безеля взяты с этих снимков. Расположение и часть конструкции механизма, включая заводную пружину, упрощены для изучения; это не инструкция по ремонту и не заводская CAD-модель.</p><a href="https://www.rolex.com/watches/submariner/m124060-0001" target="_blank" rel="noopener">Официальная страница модели</a></details>
  </section>`;
}

export function mountSubmarinerWorkshop(root) {
  const section = root.querySelector(".sub-workshop");
  const $ = s => section.querySelector(s);
  const events = new AbortController();
  const { signal } = events;
  let scene, loading, parts = [], value = 0, activeStep = 0, selected, disposed = false, playing = false, timer;
  let returnFocus = null;
  const canvas = $("canvas"), status = $(".sub-stage__status"), slider = $(".sub-progress input");
  const play = $("[data-sub-play]"), inspector = $(".sub-inspector"), back = $(".sub-stage__return");
  const stop = () => { playing = false; clearTimeout(timer); play.textContent = value > 0.99 ? "Собрать часы" : "Разобрать часы"; };
  const setValue = (t, refit = false) => {
    value = Math.max(0, Math.min(1, t));
    slider.value = Math.round(value * 1000);
    slider.setAttribute("aria-valuetext", `${Math.round(value * 100)}%, ${STEPS[Math.min(7, Math.round(value * 7))][0]}`);
    activeStep = Math.min(7, Math.round(value * 7));
    for (const b of section.querySelectorAll("[data-sub-step]")) {
      const active = +b.dataset.subStep === activeStep;
      b.setAttribute("aria-current", active ? "step" : "false");
      if (active && window.innerWidth <= 900) {
        const nav = $(".sub-steps"), r = b.getBoundingClientRect(), n = nav.getBoundingClientRect();
        if (r.left < n.left || r.right > n.right) nav.scrollLeft += r.left - n.left - 16;
      }
    }
    $(".sub-transport__caption h3").textContent = STEPS[activeStep][0];
    $(".sub-transport__caption p").textContent = STEPS[activeStep][1];
    $("[data-sub-prev]").disabled = !scene || value === 0;
    $("[data-sub-next]").disabled = !scene || value === 1;
    scene?.setT(value);
    if (refit) scene?.view(value > 0.94 ? "tray" : value > 0.2 && value < 0.79 ? "back" : "front");
    if (!playing) play.textContent = value > 0.99 ? "Собрать часы" : "Разобрать часы";
  };
  const closePart = () => {
    const restoreFocus = !inspector.hidden && inspector.contains(document.activeElement);
    inspector.hidden = true;
    scene?.select(null);
    if (scene?.isolated) scene.isolate(null);
    back.hidden = true;
    if (restoreFocus && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  };
  function selectPart(id, focus = false) {
    const part = parts.find(p => p.id === id);
    if (!part) return;
    selected = part;
    returnFocus = document.activeElement;
    $(".sub-inspector h3").textContent = part.name;
    $(".sub-inspector__text").textContent = part.text;
    $(".sub-inspector__material").textContent = part.material;
    inspector.hidden = false;
    scene?.select(id);
    $(".sub-inspector__isolate").disabled = !scene;
    if (window.innerWidth <= 900) inspector.scrollIntoView({ block: "nearest", behavior: reduced() ? "instant" : "smooth" });
    if (focus) $(".sub-inspector__close").focus({ preventScroll: true });
  }
  function catalogue() {
    const list = $(".sub-catalogue__list");
    list.replaceChildren();
    const query = $(".sub-catalogue input").value.toLocaleLowerCase("ru").trim();
    const matches = parts.filter(p => `${p.name} ${p.title}`.toLocaleLowerCase("ru").includes(query));
    for (const part of matches) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = part.name;
      button.dataset.subPart = part.id;
      list.append(button);
    }
    $(".sub-catalogue__empty").hidden = !!matches.length;
    $(".sub-catalogue__count").textContent = parts.length ? `(${parts.length})` : "";
  }
  async function load() {
    if (loading || disposed) return loading;
    status.querySelector("span").textContent = "Загружаем объёмную модель…";
    $("[data-sub-load]").hidden = true;
    loading = (async () => {
      try {
        const { SubmarinerScene } = await import("./submariner-scene.js");
        if (disposed) return;
        scene = new SubmarinerScene(canvas, id => selectPart(id));
        canvas.hidden = false;
        parts = await scene.load();
        if (disposed) return;
        status.hidden = true;
        $(".sub-stage__poster").hidden = true;
        $(".sub-stage__tools").hidden = false;
        $(".sub-stage__gesture").hidden = false;
        play.disabled = false; slider.disabled = false;
        setValue(value, true); catalogue();
        if (window.__horologium) window.__horologium.submariner = scene;
      } catch (error) {
        if (disposed) return;
        console.error("Submariner 3D:", error);
        scene?.dispose(); scene = null;
        canvas.hidden = true;
        status.querySelector("span").textContent = "3D не загрузилось. Фото часов доступно; попробуйте ещё раз.";
        $("[data-sub-load]").hidden = false;
        $("[data-sub-load]").textContent = "Повторить загрузку";
        parts = ["Корпус", "Безель", "Стекло", "Задняя крышка", "Ротор Perpetual", "Баланс", "Спираль Parachrom", "Барабан", "Центральное колесо"].map((name, i) => ({ ...describePart(name), id: `fallback-${i}` }));
        catalogue(); loading = null;
      }
    })();
    return loading;
  }
  const near = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    near.disconnect();
    // Save-Data users explicitly opt into the asset download.
    if (!navigator.connection?.saveData) load();
  }, { rootMargin: "300px 0px" });
  near.observe(section);
  $("[data-sub-load]").addEventListener("click", load, { signal });
  section.addEventListener("click", async e => {
    const step = e.target.closest("[data-sub-step]");
    if (step) { stop(); await load(); if (!disposed && scene) { closePart(); setValue(+step.dataset.subStep / 7, true); } }
    const part = e.target.closest("[data-sub-part]");
    if (part) selectPart(part.dataset.subPart, true);
    const view = e.target.closest("[data-sub-view]");
    if (view) scene?.view(view.dataset.subView);
    const zoom = e.target.closest("[data-sub-zoom]");
    if (zoom) scene?.zoom(+zoom.dataset.subZoom);
  }, { signal });
  slider.addEventListener("input", () => { stop(); if (scene?.isolated) closePart(); setValue(+slider.value / 1000, true); }, { signal });
  $("[data-sub-prev]").addEventListener("click", () => { stop(); closePart(); setValue(Math.max(0, activeStep - 1) / 7, true); }, { signal });
  $("[data-sub-next]").addEventListener("click", () => { stop(); closePart(); setValue(Math.min(7, activeStep + 1) / 7, true); }, { signal });
  play.addEventListener("click", () => {
    if (playing) { stop(); return; }
    closePart();
    const direction = value > 0.99 ? -1 : 1;
    if (reduced()) { setValue(direction === 1 ? 1 : 0, true); return; }
    playing = true; play.textContent = "Пауза";
    const advance = () => {
      if (disposed || !playing) return;
      if (document.hidden || !visible) { stop(); return; }
      setValue(value + direction / 7, true);
      if (value === 0 || value === 1) stop();
      else timer = setTimeout(advance, 2100);
    };
    advance();
  }, { signal });
  let visible = false;
  const visibility = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (!visible) stop(); });
  visibility.observe(section);
  $(".sub-catalogue input").addEventListener("input", catalogue, { signal });
  $(".sub-inspector__close").addEventListener("click", closePart, { signal });
  $(".sub-inspector__isolate").addEventListener("click", () => {
    if (!scene || !selected) return;
    stop(); scene.isolate(selected.id); back.hidden = false;
    if (window.innerWidth <= 900) canvas.scrollIntoView({ block: "center", behavior: reduced() ? "instant" : "smooth" });
  }, { signal });
  back.addEventListener("click", () => { scene?.isolate(null); back.hidden = true; }, { signal });
  section.addEventListener("keydown", e => {
    if (e.key === "Escape") closePart();
    if (e.target === canvas) {
      if (e.key === "+" || e.key === "=") scene?.zoom(0.8);
      if (e.key === "-") scene?.zoom(1.25);
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault(); stop(); setValue(value + (e.key === "ArrowRight" ? 1 : -1) / 7, true);
      }
    }
  }, { signal });
  return () => {
    disposed = true; stop(); events.abort(); near.disconnect(); visibility.disconnect(); scene?.dispose();
    if (window.__horologium?.submariner === scene) delete window.__horologium.submariner;
  };
}
