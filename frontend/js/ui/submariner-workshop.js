import { html } from "../core/dom.js";
import { reduced } from "../core/motion.js";
import { STEPS, describePart } from "./submariner-parts.js";
import { timelineSeconds, TOTAL_SECONDS, motionCaption } from "./submariner-motion.js";
import { workshopProfile, catalogueCaption } from "../workshop/profiles.js";
import { photoImg } from "./photo.js";

export function renderSubmarinerWorkshop(watch = null) {
  const catalogue = watch && watch.slug !== "rolex-submariner";
  const profile = catalogue ? workshopProfile(watch) : null;
  const steps = profile?.steps || STEPS;
  const title = catalogue ? watch.name : "Submariner";
  return html`<section class="sub-workshop container" id="explode" aria-labelledby="sub-title" data-ui>
    <header class="sub-workshop__heading">
      <h2 id="sub-title">${title}. Изнутри.</h2>
      <p>${catalogue ? "Учебная 3D-реконструкция. Выберите деталь или запустите разборку." : "Разберите часы и узнайте, как работает каждая деталь."}</p>
    </header>
    <div class="sub-workshop__body">
      <nav class="sub-steps" aria-label="Этапы разборки">
        ${steps.map(([name], i) => html`<button type="button" data-sub-step="${i}" aria-current="${i === 0 ? "step" : "false"}"><span>${i + 1}</span>${name}</button>`)}
      </nav>
      <div class="sub-stage">
        ${catalogue ? html`<div class="sub-stage__poster">${photoImg(watch.photos?.find(p => !p.context), { sizes: "720px", alt: `${watch.brand_name} ${watch.name}` })}</div>` : html`<img class="sub-stage__poster" src="/assets/photos/rolex-submariner/1-960.webp" alt="Rolex Submariner 124060, вид часов в сборе" width="720" height="960" loading="lazy">`}
        <canvas tabindex="0" aria-label="Объёмные ${title}. Потяните для поворота; кнопки под сценой управляют разборкой." hidden></canvas>
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
      <div class="sub-transport__caption" aria-live="polite" aria-atomic="true"><h3>${steps[0][0]}</h3><p>${steps[0][1]}</p></div>
      <div class="sub-transport__actions">
        <button type="button" data-sub-prev aria-label="Предыдущий этап" disabled>Назад</button>
        <button type="button" data-sub-play disabled>Разобрать часы</button>
        <button type="button" data-sub-next aria-label="Следующий этап" disabled>Далее</button>
      </div>
      <div class="sub-playback"><output aria-label="Время разборки" aria-live="off">00:00 / 00:51</output><label class="sub-playback__camera"><input type="checkbox" data-sub-camera checked>Автокамера</label><label>Темп <select aria-label="Скорость разборки"><option value="0.5">0,5×</option><option value="1" selected>1×</option><option value="1.5">1,5×</option></select></label></div>
      <label class="sub-progress"><span>Собраны</span><input type="range" min="0" max="1000" step="1" value="0" aria-label="Степень разборки ${title}" disabled><span>Разобраны</span></label>
    </div>
    <details class="sub-catalogue"><summary>Найти деталь <span class="sub-catalogue__count"></span></summary>
      <label>Название детали<input type="search" placeholder="${profile && !profile.mechanical ? "Например, батарея или стекло" : "Например, баланс или стекло"}" autocomplete="off"></label>
      <div class="sub-catalogue__list" role="group" aria-label="Детали модели"></div><p class="sub-catalogue__empty" hidden>Совпадений нет. Попробуйте другое название.</p>
    </details>
    <details class="sub-about"><summary>О точности модели</summary>${catalogue ? html`<p>Учебная объёмная реконструкция ${watch.brand_name} ${watch.name}, ${watch.case.diameter_mm} мм, калибр ${watch.movement.caliber}. Форма, отделка и индикация заданы конфигурацией модели в атласе. Внутренние узлы соответствуют типу механизма и указанным функциям; их расположение, крепления и часть конструкции упрощены. Это не заводская CAD-модель и не инструкция по ремонту. Некоторые микродетали объединены в узлы. Настоящие фотографии и источники характеристик доступны выше на странице.</p>` : html`<p>Объёмная учебная модель Submariner 124060: корпус 41 мм, браслет Oyster и основные узлы калибра 3230. Внешняя геометрия восстановлена по официальным фотографиям Rolex. Печать циферблата и деления безеля взяты с этих снимков. Расположение и часть конструкции механизма, включая заводную пружину, упрощены для изучения; это не инструкция по ремонту и не заводская CAD-модель.</p><a href="https://www.rolex.com/watches/submariner/m124060-0001" target="_blank" rel="noopener">Официальная страница модели</a>`}</details>
  </section>`;
}

export function mountSubmarinerWorkshop(root, watch = null) {
  const catalogue = watch && watch.slug !== "rolex-submariner";
  const profile = catalogue ? workshopProfile(watch) : null;
  const steps = profile?.steps || STEPS;
  const debugKey = catalogue ? "workshop" : "submariner";
  const section = root.querySelector(".sub-workshop");
  const $ = s => section.querySelector(s);
  const events = new AbortController();
  const { signal } = events;
  const requestedStage = new URLSearchParams(location.search).get("stage");
  const initialStage = /^[0-7]$/.test(requestedStage ?? "") ? Number(requestedStage) : 0;
  let scene, loading, parts = [], value = initialStage / 7, target = value, activeStep = -1, selected, disposed = false, direction = 1;
  let returnFocus = null;
  let canvas = $("canvas");
  const status = $(".sub-stage__status"), slider = $(".sub-progress input");
  const play = $("[data-sub-play]"), inspector = $(".sub-inspector"), back = $(".sub-stage__return");
  const stepButtons = [...section.querySelectorAll("[data-sub-step]")];
  const title = $(".sub-transport__caption h3"), caption = $(".sub-transport__caption p"), clock = $(".sub-playback output");
  const text = (element, value) => { if (element.textContent !== value) element.textContent = value; };
  const timecode = seconds => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.round(seconds) % 60).padStart(2, "0")}`;
  const update = (t, moving = false) => {
    value = Math.max(0, Math.min(1, t));
    slider.value = Math.round(value * 1000);
    const nextStep = Math.max(0, Math.min(7, Math.ceil(value * 7 - 1e-6)));
    if (nextStep !== activeStep) for (const b of stepButtons) {
      const active = +b.dataset.subStep === nextStep;
      b.setAttribute("aria-current", active ? "step" : "false");
      if (active && window.innerWidth <= 900) {
        const nav = $(".sub-steps"), r = b.getBoundingClientRect(), n = nav.getBoundingClientRect();
        if (r.left < n.left || r.right > n.right) nav.scrollLeft += r.left - n.left - 16;
      }
    }
    activeStep = nextStep;
    slider.setAttribute("aria-valuetext", `${Math.round(value * 100)}%, ${steps[activeStep][0]}`);
    text(title, steps[activeStep][0]);
    const description = moving ? catalogue ? catalogueCaption(profile, value, direction < 0) : motionCaption(value, direction < 0) : steps[activeStep][1];
    text(caption, description);
    text(clock, `${timecode(timelineSeconds(value))} / ${timecode(TOTAL_SECONDS)}`);
    $("[data-sub-camera]").checked = scene?.autoCamera ?? true;
    $("[data-sub-prev]").disabled = !scene || value === 0;
    $("[data-sub-next]").disabled = !scene || activeStep >= 7;
    text(play, moving ? "Пауза" : value >= 0.999 || direction < 0 && value > 0 ? "Собрать часы" : value > 0 ? "Продолжить разборку" : "Разобрать часы");
  };
  const stop = () => {
    scene?.pause();
    target = value;
    update(value, false);
  };
  const setValue = (t, instant = false) => {
    target = Math.max(0, Math.min(1, t));
    const boundary = Math.round(target * 7) / 7;
    if (Math.abs(target - boundary) < 0.0005) target = boundary;
    direction = Math.sign(target - value) || direction;
    const direct = instant || reduced();
    scene?.setT(target, direct);
    if (direct && scene?.autoCamera) scene.focusMotion(reduced());
    if (!scene) update(target);
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
    if (scene?.moving) stop();
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
  function renderPartList() {
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
        scene = new SubmarinerScene(canvas, id => selectPart(id), catalogue ? { catalogue: true, asset: `/assets/workshop/catalogue/${watch.slug}.glb` } : {});
        canvas.hidden = false;
        parts = await scene.load();
        if (disposed) return;
        status.hidden = true;
        $(".sub-stage__poster").hidden = true;
        $(".sub-stage__tools").hidden = false;
        $(".sub-stage__gesture").hidden = false;
        play.disabled = false; slider.disabled = false;
        scene.onProgress = update;
        scene.setSpeed(+$(".sub-playback select").value);
        setValue(value, true); renderPartList();
        if (window.__horologium) window.__horologium[debugKey] = scene;
      } catch (error) {
        if (disposed) return;
        console.error("3D-мастерская:", error);
        scene?.dispose(); scene = null;
        canvas.hidden = true;
        // dispose() deliberately loses the GPU context. Retry needs a fresh drawing surface.
        const replacement = canvas.cloneNode(false);
        canvas.replaceWith(replacement); canvas = replacement;
        status.querySelector("span").textContent = "3D не загрузилось. Попробуйте ещё раз.";
        $("[data-sub-load]").hidden = false;
        $("[data-sub-load]").textContent = "Повторить загрузку";
        parts = catalogue ? [] : ["Корпус", "Безель", "Стекло", "Задняя крышка", "Ротор Perpetual", "Баланс", "Спираль Parachrom", "Барабан", "Центральное колесо"].map((name, i) => ({ ...describePart(name), id: `fallback-${i}` }));
        renderPartList();
      }
    })().finally(() => { if (!scene) loading = null; });
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
    if (step) { stop(); await load(); if (!disposed && scene) { closePart(); setValue(+step.dataset.subStep / 7); } }
    const part = e.target.closest("[data-sub-part]");
    if (part) selectPart(part.dataset.subPart, true);
    const view = e.target.closest("[data-sub-view]");
    if (view) { scene?.setAutoCamera(false); scene?.view(view.dataset.subView); }
    const zoom = e.target.closest("[data-sub-zoom]");
    if (zoom) scene?.zoom(+zoom.dataset.subZoom);
  }, { signal });
  slider.addEventListener("input", () => { const t = +slider.value / 1000; stop(); if (scene?.isolated) closePart(); setValue(t, true); }, { signal });
  $("[data-sub-prev]").addEventListener("click", () => { const goal = Math.max(0, activeStep - 1) / 7; stop(); closePart(); setValue(goal); }, { signal });
  $("[data-sub-next]").addEventListener("click", () => {
    const step = scene?.moving && target > value && target < 1 ? Math.round(target * 7) : Math.max(0, activeStep);
    const goal = Math.min(7, step + 1) / 7;
    stop(); closePart(); setValue(goal);
  }, { signal });
  play.addEventListener("click", () => {
    if (scene?.moving) { stop(); return; }
    closePart();
    if (value >= 0.999) direction = -1;
    if (value <= 0.001) direction = 1;
    setValue(direction > 0 ? 1 : 0);
  }, { signal });
  $(".sub-playback select").addEventListener("change", e => scene?.setSpeed(+e.target.value), { signal });
  $("[data-sub-camera]").addEventListener("change", e => scene?.setAutoCamera(e.target.checked), { signal });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); }, { signal });
  const visibility = new IntersectionObserver(([e]) => { if (!e.isIntersecting) stop(); });
  visibility.observe(section);
  $(".sub-catalogue input").addEventListener("input", renderPartList, { signal });
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
        e.preventDefault(); stop(); setValue(value + (e.key === "ArrowRight" ? 1 : -1) / 7);
      }
    }
  }, { signal });
  setValue(value, true);
  return () => {
    disposed = true; stop(); events.abort(); near.disconnect(); visibility.disconnect(); scene?.dispose();
    if (window.__horologium?.[debugKey] === scene) delete window.__horologium[debugKey];
  };
}
