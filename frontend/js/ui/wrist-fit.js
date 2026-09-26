// Интерактивный симулятор посадки часов на запястье (Wrist Fit & Proportions Visualizer).

import { html, qs, qsa } from "../core/dom.js";

// Расчет ширины верхней площадки запястья (в мм) по обхвату (в см) и анатомической форме
export function calculateWristWidth(circumferenceCm, shape = "flat") {
  const factor = shape === "flat" ? 3.2 : 2.85;
  return Math.round(circumferenceCm * factor * 10) / 10;
}

// Оценка посадки
export function evaluateWristFit(lugToLugMm, wristWidthMm) {
  const ratio = lugToLugMm / wristWidthMm;
  const marginPerSideMm = Math.round(((wristWidthMm - lugToLugMm) / 2) * 10) / 10;

  if (ratio <= 0.78) {
    return {
      status: "classic",
      badge: "Классический баланс",
      label: "Винтажная и костюмная посадка",
      color: "var(--lume)",
      ratioPct: Math.round(ratio * 100),
      marginMm: marginPerSideMm,
      desc: "Часы смотрятся изящно и гармонично. Корпус свободно помещается на верхней плоскости руки, легко уходит под манжет рубашки. Кончики ушек имеют комфортный запас до краев кисти.",
    };
  } else if (ratio <= 0.90) {
    return {
      status: "optimal",
      badge: "Идеальная посадка",
      label: "Эталонная эргономика",
      color: "var(--lume)",
      ratioPct: Math.round(ratio * 100),
      marginMm: marginPerSideMm,
      desc: "Золотой стандарт современной часовой эстетики. Ушки полностью опираются на запястье, а браслет плавно охватывает руку без изломов. Идеальный баланс комфорта и визуального присутствия.",
    };
  } else if (ratio <= 0.98) {
    return {
      status: "bold",
      badge: "Спортивный оверсайз",
      label: "Максимальный носимый размер",
      color: "#ffb74d",
      ratioPct: Math.round(ratio * 100),
      marginMm: marginPerSideMm,
      desc: "Крупный акцентный силуэт в стиле профессиональных дайверов и авиаторов. Корпус занимает почти всю ширину кисти. Если у часов длинные негнущиеся первые звенья браслета, рекомендуется очная примерка.",
    };
  } else {
    return {
      status: "overhang",
      badge: "Свисание ушек (Overhang)",
      label: "Превышение размера кисти",
      color: "#ff5252",
      ratioPct: Math.round(ratio * 100),
      marginMm: marginPerSideMm,
      desc: "Внимание: длина корпуса от ушка до ушка превышает ширину кисти. Ушки свисают в воздух, браслет падает вертикально вниз. Часы будут заваливаться при ходьбе и давить на лучезапястный сустав.",
    };
  }
}

// Рекомендованный диаметр по обхвату запястья
export function getRecommendedDiameter(circumferenceCm) {
  if (circumferenceCm < 16) return "34 - 38 мм";
  if (circumferenceCm <= 17.5) return "36 - 41 мм";
  if (circumferenceCm <= 19) return "39 - 43 мм";
  return "42 - 46 мм";
}

export function renderWristFitWidget(watch = null) {
  const defaultCircumference = 17.5;
  const defaultShape = "flat";

  // Диаметр часов
  const diameter = watch?.case?.diameter_mm || 40;
  // Расчет примерного Lug-to-Lug (длина по ушкам)
  const isRect = watch?.render?.case?.shape === "rect";
  const defaultLugToLug = Math.round(diameter * (isRect ? 1.34 : 1.19));

  const wristWidth = calculateWristWidth(defaultCircumference, defaultShape);
  const evaluation = evaluateWristFit(defaultLugToLug, wristWidth);

  return html`<div class="wrist-fit" id="wrist-fit">
    <div class="wrist-fit__header">
      <div class="wrist-fit__badge">
        <i class="ph-light ph-ruler" aria-hidden="true"></i>
        <span>Анатомическая примерка</span>
      </div>
      <h2 class="display display--s wrist-fit__title">
        ${watch ? `Примерка ${watch.brand_name} ${watch.name} на запястье` : "Интерактивный симулятор посадки часов"}
      </h2>
      <p class="wrist-fit__subtitle">
        Главный секрет идеальной посадки часов: не только диаметр циферблата, но и дистанция от ушка до ушка (Lug-to-Lug) относительно ширины вашей руки. Проверьте пропорции до покупки.
      </p>
    </div>

    <!-- Быстрые пресеты обхвата руки -->
    <div class="wrist-fit__presets">
      <span class="wrist-fit__presets-label">Типичные размеры кисти:</span>
      <div class="wrist-fit__preset-btns" id="wf-preset-btns">
        <button type="button" class="chip chip--sm" data-wf-wrist="15.5">Тонкое (15.5 см)</button>
        <button type="button" class="chip chip--sm is-active" data-wf-wrist="17.5">Среднее (17.5 см)</button>
        <button type="button" class="chip chip--sm" data-wf-wrist="19.5">Крупное (19.5 см)</button>
        <button type="button" class="chip chip--sm" data-wf-wrist="21.0">Мощное (21.0 см)</button>
      </div>
    </div>

    <div class="wrist-fit__body">
      <!-- Интерактивный чертеж посадки (SVG проекция сверху) -->
      <div class="wrist-fit__stage">
        <div class="wrist-fit__canvas-wrap">
          <svg class="wrist-fit__canvas" id="wf-svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
            <defs>
              <!-- Градиент запястья -->
              <linearGradient id="wf-wrist-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#14181f" stop-opacity="0.6"/>
                <stop offset="15%" stop-color="#1e242d" stop-opacity="0.9"/>
                <stop offset="50%" stop-color="#28303c" stop-opacity="1"/>
                <stop offset="85%" stop-color="#1e242d" stop-opacity="0.9"/>
                <stop offset="100%" stop-color="#14181f" stop-opacity="0.6"/>
              </linearGradient>

              <!-- Градиент браслета -->
              <linearGradient id="wf-strap-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#2a323d"/>
                <stop offset="50%" stop-color="#455263"/>
                <stop offset="100%" stop-color="#2a323d"/>
              </linearGradient>

              <!-- Градиент корпуса часов -->
              <radialGradient id="wf-case-grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#1c2026"/>
                <stop offset="75%" stop-color="#12151a"/>
                <stop offset="100%" stop-color="#2b323c"/>
              </radialGradient>
            </defs>

            <!-- Линейка миллиметров на фоне -->
            <g class="wf-grid" stroke="rgba(255,255,255,0.06)" stroke-width="1">
              <line x1="50" y1="150" x2="350" y2="150"/>
              <line x1="200" y1="20" x2="200" y2="280" stroke-dasharray="3,3"/>
            </g>

            <!-- Контур запястья (ширина динамически регулируется) -->
            <path id="wf-wrist-path" class="wf-wrist-path" fill="url(#wf-wrist-grad)" stroke="#3a4553" stroke-width="2"/>

            <!-- Браслет / ремешок часов -->
            <path id="wf-strap-path" class="wf-strap-path" fill="url(#wf-strap-grad)" stroke="#1a2027" stroke-width="1.5"/>

            <!-- Ушки часов (Lug-to-Lug) -->
            <rect id="wf-lugs-rect" class="wf-lugs-rect" fill="#374351" rx="4" ry="4"/>

            <!-- Корпус часов -->
            <circle id="wf-case-circle" class="wf-case-circle" fill="url(#wf-case-grad)" stroke="#526275" stroke-width="3"/>

            <!-- Безель и стекло -->
            <circle id="wf-bezel-circle" class="wf-bezel-circle" fill="none" stroke="rgba(159,233,196,0.3)" stroke-width="1.5"/>

            <!-- Метки и стрелки часов -->
            <g id="wf-hands" stroke="#e0e6ed" stroke-width="1.5" stroke-linecap="round">
              <line x1="200" y1="150" x2="200" y2="128"/>
              <line x1="200" y1="150" x2="216" y2="150"/>
              <circle cx="200" cy="150" r="3" fill="#9fe9c4" stroke="none"/>
            </g>

            <!-- Разметочные указатели и линии габаритов -->
            <g id="wf-guides">
              <!-- Линия ширины запястья -->
              <line id="wf-guide-wrist-l" stroke="#607285" stroke-width="1" stroke-dasharray="2,2"/>
              <line id="wf-guide-wrist-r" stroke="#607285" stroke-width="1" stroke-dasharray="2,2"/>

              <!-- Линии свисания ушек (подсвечиваются при Overhang) -->
              <line id="wf-guide-lug-top" stroke="#ff5252" stroke-width="1.5" stroke-dasharray="3,3" opacity="0"/>
              <line id="wf-guide-lug-bot" stroke="#ff5252" stroke-width="1.5" stroke-dasharray="3,3" opacity="0"/>
            </g>
          </svg>

          <div class="wrist-fit__scale-labels">
            <span id="wf-label-wrist-w">Ширина руки: ${wristWidth} мм</span>
            <span id="wf-label-l2l">Lug-to-Lug: ${defaultLugToLug} мм</span>
          </div>
        </div>
      </div>

      <!-- Консоль настроек пользователя -->
      <div class="wrist-fit__console">
        <!-- Ползунок: обхват запястья -->
        <div class="wrist-fit__control-group">
          <div class="wrist-fit__control-head">
            <label for="wf-slider-wrist">Обхват запястья</label>
            <span class="wrist-fit__val" id="wf-val-wrist">${defaultCircumference} см</span>
          </div>
          <input type="range" id="wf-slider-wrist" min="14" max="22" step="0.5" value="${defaultCircumference}">
        </div>

        <!-- Форма запястья: плоское или круглое -->
        <div class="wrist-fit__control-group">
          <div class="wrist-fit__control-head">
            <label>Форма запястья</label>
          </div>
          <div class="wrist-fit__shape-btns" id="wf-shape-btns">
            <button type="button" class="chip is-active" data-shape="flat">Анатомическое (Плоское)</button>
            <button type="button" class="chip" data-shape="round">Округлое</button>
          </div>
        </div>

        <!-- Ползунок: диаметр часов -->
        <div class="wrist-fit__control-group">
          <div class="wrist-fit__control-head">
            <label for="wf-slider-diam">Диаметр корпуса</label>
            <span class="wrist-fit__val" id="wf-val-diam">${diameter} мм</span>
          </div>
          <input type="range" id="wf-slider-diam" min="34" max="48" step="1" value="${diameter}">
        </div>

        <!-- Ползунок: Lug-to-Lug (длина от ушка до ушка) -->
        <div class="wrist-fit__control-group">
          <div class="wrist-fit__control-head">
            <label for="wf-slider-l2l">Длина от ушка до ушка (Lug-to-Lug)</label>
            <span class="wrist-fit__val" id="wf-val-l2l">${defaultLugToLug} мм</span>
          </div>
          <input type="range" id="wf-slider-l2l" min="38" max="56" step="1" value="${defaultLugToLug}">
        </div>

        <!-- Карточка аналитической оценки посадки -->
        <div class="wrist-fit__assessment" id="wf-assessment">
          <div class="wrist-fit__assessment-top">
            <span class="wrist-fit__status-badge" id="wf-badge" style="color: ${evaluation.color}">${evaluation.badge}</span>
            <span class="wrist-fit__ratio" id="wf-ratio">${evaluation.ratioPct}% ширины руки</span>
          </div>
          <div class="wrist-fit__gauge-bar">
            <div class="wrist-fit__gauge-fill" id="wf-gauge-fill" style="width: ${Math.min(100, evaluation.ratioPct)}%; background: ${evaluation.color}"></div>
          </div>
          <p class="wrist-fit__assessment-desc" id="wf-desc">${evaluation.desc}</p>
          <div class="wrist-fit__recommendation">
            <i class="ph-light ph-check-circle" aria-hidden="true"></i>
            <span id="wf-rec">Для запястья ${defaultCircumference} см рекомендован диаметр ${getRecommendedDiameter(defaultCircumference)}.</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Инженерная сноска -->
    <div class="wrist-fit__foot">
      <div class="wrist-fit__note">
        <i class="ph-light ph-info" aria-hidden="true"></i>
        <span>
          Часовое правило пропорций: часы диаметром 40 мм с короткими изогнутыми ушками (Lug-to-Lug 46 мм) сидят на тонком запястье значительно удобнее и компактнее, чем часы 38 мм с длинными прямыми ушками (Lug-to-Lug 49 мм). Всегда учитывайте геометрию ушек при подборе модели.
        </span>
      </div>
    </div>
  </div>`;
}

export function mountWristFitWidget(root, watch = null) {
  const widget = qs("#wrist-fit", root);
  if (!widget) return;

  const sliderWrist = qs("#wf-slider-wrist", widget);
  const sliderDiam = qs("#wf-slider-diam", widget);
  const sliderL2L = qs("#wf-slider-l2l", widget);
  const valWrist = qs("#wf-val-wrist", widget);
  const valDiam = qs("#wf-val-diam", widget);
  const valL2L = qs("#wf-val-l2l", widget);
  const labelWristW = qs("#wf-label-wrist-w", widget);
  const labelL2L = qs("#wf-label-l2l", widget);
  const badgeEl = qs("#wf-badge", widget);
  const ratioEl = qs("#wf-ratio", widget);
  const gaugeFill = qs("#wf-gauge-fill", widget);
  const descEl = qs("#wf-desc", widget);
  const recEl = qs("#wf-rec", widget);
  const shapeBtns = qsa("#wf-shape-btns button", widget);
  const presetBtns = qsa("#wf-preset-btns button", widget);

  // SVG элементы
  const wristPath = qs("#wf-wrist-path", widget);
  const strapPath = qs("#wf-strap-path", widget);
  const lugsRect = qs("#wf-lugs-rect", widget);
  const caseCircle = qs("#wf-case-circle", widget);
  const bezelCircle = qs("#wf-bezel-circle", widget);
  const guideLugTop = qs("#wf-guide-lug-top", widget);
  const guideLugBot = qs("#wf-guide-lug-bot", widget);

  let currentCircumference = parseFloat(sliderWrist?.value || "17.5");
  let currentShape = "flat";
  let currentDiam = parseInt(sliderDiam?.value || "40", 10);
  let currentL2L = parseInt(sliderL2L?.value || "48", 10);

  // Масштабирование: 1 мм реального размера = scaleFactor пикселей SVG (в окне 400x300)
  const scale = 3.6;
  const centerX = 200;
  const centerY = 150;

  function updateVisuals() {
    const wristWidthMm = calculateWristWidth(currentCircumference, currentShape);
    const evalResult = evaluateWristFit(currentL2L, wristWidthMm);

    // Обновление числовых подписей
    if (valWrist) valWrist.textContent = `${currentCircumference} см`;
    if (valDiam) valDiam.textContent = `${currentDiam} мм`;
    if (valL2L) valL2L.textContent = `${currentL2L} мм`;
    if (labelWristW) labelWristW.textContent = `Ширина руки: ${wristWidthMm} мм`;
    if (labelL2L) labelL2L.textContent = `Lug-to-Lug: ${currentL2L} мм`;

    // Обновление оценки
    if (badgeEl) {
      badgeEl.textContent = evalResult.badge;
      badgeEl.style.color = evalResult.color;
    }
    if (ratioEl) ratioEl.textContent = `${evalResult.ratioPct}% ширины руки`;
    if (gaugeFill) {
      gaugeFill.style.width = `${Math.min(100, evalResult.ratioPct)}%`;
      gaugeFill.style.background = evalResult.color;
    }
    if (descEl) descEl.textContent = evalResult.desc;
    if (recEl) {
      recEl.textContent = `Для запястья ${currentCircumference} см рекомендован диаметр ${getRecommendedDiameter(currentCircumference)}.`;
    }

    // Геометрия запястья в SVG
    const halfWristPx = (wristWidthMm * scale) / 2;
    const wristTopY = 30;
    const wristBotY = 270;
    const roundness = currentShape === "flat" ? 28 : 55;

    // Путь контура руки (рука сверху вниз)
    const dWrist = `
      M ${centerX - halfWristPx + roundness} ${wristTopY}
      H ${centerX + halfWristPx - roundness}
      Q ${centerX + halfWristPx} ${wristTopY} ${centerX + halfWristPx} ${wristTopY + roundness}
      V ${wristBotY - roundness}
      Q ${centerX + halfWristPx} ${wristBotY} ${centerX + halfWristPx - roundness} ${wristBotY}
      H ${centerX - halfWristPx + roundness}
      Q ${centerX - halfWristPx} ${wristBotY} ${centerX - halfWristPx} ${wristBotY - roundness}
      V ${wristTopY + roundness}
      Q ${centerX - halfWristPx} ${wristTopY} ${centerX - halfWristPx + roundness} ${wristTopY}
      Z
    `;
    if (wristPath) wristPath.setAttribute("d", dWrist);

    // Геометрия ремешка/браслета (ширина у корпуса ~20-22 мм, ссужается к краям)
    const strapWidthPx = 20 * scale;
    const dStrap = `
      M ${centerX - strapWidthPx / 2} ${wristTopY}
      H ${centerX + strapWidthPx / 2}
      V ${wristBotY}
      H ${centerX - strapWidthPx / 2}
      Z
    `;
    if (strapPath) strapPath.setAttribute("d", dStrap);

    // Геометрия корпуса часов
    const caseRadiusPx = (currentDiam * scale) / 2;
    if (caseCircle) {
      caseCircle.setAttribute("cx", centerX);
      caseCircle.setAttribute("cy", centerY);
      caseCircle.setAttribute("r", caseRadiusPx);
    }
    if (bezelCircle) {
      bezelCircle.setAttribute("cx", centerX);
      bezelCircle.setAttribute("cy", centerY);
      bezelCircle.setAttribute("r", Math.max(10, caseRadiusPx - 4));
    }

    // Геометрия ушек (Lug-to-Lug прямоугольник с фасками)
    const lugWidthPx = 24 * scale;
    const lugHeightPx = currentL2L * scale;
    if (lugsRect) {
      lugsRect.setAttribute("x", centerX - lugWidthPx / 2);
      lugsRect.setAttribute("y", centerY - lugHeightPx / 2);
      lugsRect.setAttribute("width", lugWidthPx);
      lugsRect.setAttribute("height", lugHeightPx);
    }

    // Индикация свисания (Overhang)
    const isOverhanging = currentL2L > wristWidthMm;
    if (guideLugTop && guideLugBot) {
      if (isOverhanging) {
        guideLugTop.setAttribute("opacity", "1");
        guideLugTop.setAttribute("x1", centerX - halfWristPx - 20);
        guideLugTop.setAttribute("x2", centerX + halfWristPx + 20);
        guideLugTop.setAttribute("y1", centerY - lugHeightPx / 2);
        guideLugTop.setAttribute("y2", centerY - lugHeightPx / 2);

        guideLugBot.setAttribute("opacity", "1");
        guideLugBot.setAttribute("x1", centerX - halfWristPx - 20);
        guideLugBot.setAttribute("x2", centerX + halfWristPx + 20);
        guideLugBot.setAttribute("y1", centerY + lugHeightPx / 2);
        guideLugBot.setAttribute("y2", centerY + lugHeightPx / 2);
      } else {
        guideLugTop.setAttribute("opacity", "0");
        guideLugBot.setAttribute("opacity", "0");
      }
    }
  }

  sliderWrist?.addEventListener("input", (e) => {
    currentCircumference = parseFloat(e.target.value);
    presetBtns.forEach((b) => b.classList.remove("is-active"));
    updateVisuals();
  });

  sliderDiam?.addEventListener("input", (e) => {
    currentDiam = parseInt(e.target.value, 10);
    // Автоматическая корректировка L2L при изменении диаметра
    const isRect = watch?.render?.case?.shape === "rect";
    currentL2L = Math.round(currentDiam * (isRect ? 1.34 : 1.19));
    if (sliderL2L) sliderL2L.value = currentL2L;
    updateVisuals();
  });

  sliderL2L?.addEventListener("input", (e) => {
    currentL2L = parseInt(e.target.value, 10);
    updateVisuals();
  });

  shapeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      shapeBtns.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      currentShape = btn.dataset.shape;
      updateVisuals();
    });
  });

  presetBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      presetBtns.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      currentCircumference = parseFloat(btn.dataset.wfWrist);
      if (sliderWrist) sliderWrist.value = currentCircumference;
      updateVisuals();
    });
  });

  updateVisuals();

  return () => {};
}
