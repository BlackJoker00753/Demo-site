// Интерактивный симулятор механического мирового времени и 24 поясов Земли (World Time & Louis Cottier Simulator)
// Историческая система Heure Universelle Луи Котье (1931) и калибр Patek Philippe 240 HU:
// вращающееся 24-часовое кольцо день/ночь, 24 эталонных города планеты и скачковая кнопка на 10 часах.

import { html, qs, qsa } from "../core/dom.js";
import { playPusherClick } from "./audio-engine.js";

// 24 эталонных города системы Луи Котье, упорядоченных по шагам долготы (пояса от UTC 0 до UTC -1)
export const WORLD_CITIES = [
  { id: "london", name: "Лондон", nameEn: "London", offset: 0, region: "Европа / GMT", country: "Великобритания", flag: "🇬🇧" },
  { id: "paris", name: "Париж", nameEn: "Paris", offset: 1, region: "Западная Европа", country: "Франция / Швейцария", flag: "🇫🇷" },
  { id: "cairo", name: "Каир", nameEn: "Cairo", offset: 2, region: "Ближний Восток", country: "Египет", flag: "🇪🇬" },
  { id: "moscow", name: "Москва", nameEn: "Moscow", offset: 3, region: "Восточная Европа", country: "Россия", flag: "🇷🇺" },
  { id: "dubai", name: "Дубай", nameEn: "Dubai", offset: 4, region: "Персидский залив", country: "ОАЭ", flag: "🇦🇪" },
  { id: "karachi", name: "Карачи", nameEn: "Karachi", offset: 5, region: "Южная Азия", country: "Пакистан", flag: "🇵🇰" },
  { id: "dhaka", name: "Дакка", nameEn: "Dhaka", offset: 6, region: "Южная Азия", country: "Бангладеш", flag: "🇧🇩" },
  { id: "bangkok", name: "Бангкок", nameEn: "Bangkok", offset: 7, region: "Юго-Восточная Азия", country: "Таиланд", flag: "🇹🇭" },
  { id: "hongkong", name: "Гонконг", nameEn: "Hong Kong", offset: 8, region: "Восточная Азия", country: "Гонконг / Китай", flag: "🇭🇰" },
  { id: "tokyo", name: "Токио", nameEn: "Tokyo", offset: 9, region: "Восточная Азия", country: "Япония", flag: "🇯🇵" },
  { id: "sydney", name: "Сидней", nameEn: "Sydney", offset: 10, region: "Австралия", country: "Австралия", flag: "🇦🇺" },
  { id: "noumea", name: "Нумеа", nameEn: "Noumea", offset: 11, region: "Тихий океан", country: "Новая Каледония", flag: "🇳🇨" },
  { id: "auckland", name: "Окленд", nameEn: "Auckland", offset: 12, region: "Тихий океан", country: "Новая Зеландия", flag: "🇳🇿" },
  { id: "samoa", name: "Самоа", nameEn: "Samoa", offset: -11, region: "Полинезия", country: "Самоа", flag: "🇼🇸" },
  { id: "honolulu", name: "Гонолулу", nameEn: "Honolulu", offset: -10, region: "Гавайи", country: "США", flag: "🇺🇸" },
  { id: "anchorage", name: "Анкоридж", nameEn: "Anchorage", offset: -9, region: "Аляска", country: "США", flag: "🇺🇸" },
  { id: "losangeles", name: "Лос-Анджелес", nameEn: "Los Angeles", offset: -8, region: "Тихоокеанский пояс", country: "США", flag: "🇺🇸" },
  { id: "denver", name: "Денвер", nameEn: "Denver", offset: -7, region: "Горный пояс", country: "США", flag: "🇺🇸" },
  { id: "chicago", name: "Чикаго", nameEn: "Chicago", offset: -6, region: "Центральный пояс", country: "США", flag: "🇺🇸" },
  { id: "newyork", name: "Нью-Йорк", nameEn: "New York", offset: -5, region: "Восточный пояс", country: "США", flag: "🇺🇸" },
  { id: "santiago", name: "Сантьяго", nameEn: "Santiago", offset: -4, region: "Южная Америка", country: "Чили", flag: "🇨🇱" },
  { id: "riodejaneiro", name: "Рио-де-Жанейро", nameEn: "Rio de Janeiro", offset: -3, region: "Южная Америка", country: "Бразилия", flag: "🇧🇷" },
  { id: "sgeorgia", name: "Южная Георгия", nameEn: "S. Georgia", offset: -2, region: "Атлантический океан", country: "Южная Георгия", flag: "🇬🇸" },
  { id: "azores", name: "Азорские о-ва", nameEn: "Azores", offset: -1, region: "Северная Атлантика", country: "Португалия", flag: "🇵🇹" },
];

export class WorldTimeSimulator {
  constructor({ container }) {
    this.container = container;

    // Индекс текущего эталонного города на 12 часах (по умолчанию 1: Париж / Женева)
    this.localCityIndex = 1;
    this.targetCityRotation = 0;
    this.currentCityRotation = 0;

    // Режим времени: true - реальное атомное время UTC, false - ручное моделирование
    this.isLiveUtc = true;
    this.simSpeed = 1; // 1x, 60x, 300x

    // Виртуальное время при ручном режиме (в секундах от полуночи UTC)
    const now = new Date();
    this.utcSeconds = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds() + now.getUTCMilliseconds() / 1000;

    // Анимация нажатия кнопки 10 часов
    this.pusherCompression = 0; // 0..1
    this.isPusherActive = false;

    // Интерактивное наведение на города циферблата
    this.hoveredCityIndex = null;

    // Флаг отображения механического узла переключения (Calibre 240 HU)
    this.showMechanismView = false;
    this.starWheelRotation = 0;
    this.jumperTension = 0;

    this.animId = null;
    this.lastTimestamp = performance.now();

    this.init();
  }

  init() {
    this.renderLayout();
    this.setupEvents();
    this.startLoop();
  }

  renderLayout() {
    this.container.innerHTML = html`
      <div class="worldtime-sim">
        <!-- Шапка с мета-информацией и статусом -->
        <div class="worldtime-sim__header">
          <div class="worldtime-sim__badge">
            <span class="worldtime-sim__dot"></span>
            <span id="wt-live-badge">Синхронизация UTC: Активна</span>
          </div>
          <h2 class="display display--m worldtime-sim__title">Симулятор мирового времени Луи Котье (1931)</h2>
          <p class="worldtime-sim__subtitle">
            Механическая индикация 24 часовых поясов Земли: концентрическое 24-часовое кольцо день/ночь,
            вращающийся диск мировых городов и мгновенная коррекция кнопкой на 10 часах без остановки баланса.
          </p>
        </div>

        <div class="worldtime-sim__stage">
          <!-- Левая колонка: Интерактивный циферблат и механический разрез -->
          <div class="worldtime-sim__dial-wrap">
            <div class="worldtime-sim__canvas-box">
              <canvas id="worldtime-canvas" class="worldtime-sim__canvas" width="640" height="640"></canvas>
              
              <!-- Кнопка 10 часов для быстрого клика прямо у корпуса -->
              <button type="button" class="worldtime-sim__pusher-btn" id="wt-pusher-trigger" title="Нажать кнопку корректора на 10 часах">
                <i class="ph-light ph-arrow-clockwise" aria-hidden="true"></i>
                <span>Кнопка 10h (+1 пояс)</span>
              </button>
            </div>

            <!-- Индикатор текущего местного времени выбранного города -->
            <div class="worldtime-sim__local-status">
              <div class="worldtime-sim__city-display">
                <span class="worldtime-sim__flag" id="wt-local-flag">🇫🇷</span>
                <div>
                  <h3 class="worldtime-sim__city-name" id="wt-local-city">Париж / Женева</h3>
                  <p class="worldtime-sim__city-meta" id="wt-local-meta">Местное базовое время (UTC +1)</p>
                </div>
              </div>
              <div class="worldtime-sim__clock-digits">
                <span class="worldtime-sim__digital" id="wt-local-digital">12:00:00</span>
                <span class="worldtime-sim__ampm" id="wt-local-phase">День</span>
              </div>
            </div>
          </div>

          <!-- Правая колонка: Пульт управления и быстрые переходы -->
          <div class="worldtime-sim__controls">
            <!-- Быстрые действия: Кнопка 10 часов и шаг назад -->
            <div class="worldtime-sim__panel">
              <h4 class="worldtime-sim__panel-title">
                <i class="ph-light ph-hand-pointing" aria-hidden="true"></i> Управление калибром (Louis Cottier System)
              </h4>
              <div class="worldtime-sim__btn-group">
                <button type="button" class="btn btn--primary worldtime-sim__action-btn" id="wt-btn-step-fwd">
                  <i class="ph-light ph-plus-circle" aria-hidden="true"></i> Шаг вперед (+1 час / восток)
                </button>
                <button type="button" class="btn btn--ghost worldtime-sim__action-btn" id="wt-btn-step-back">
                  <i class="ph-light ph-minus-circle" aria-hidden="true"></i> Шаг назад (-1 час / запад)
                </button>
              </div>
              <p class="worldtime-sim__hint">
                При каждом нажатии 24-зубая звёздочка поворачивает кольцо городов на 15°, а часовая стрелка делает скачок
                на 1 час вперед, сохраняя точность хода минутной и секундной стрелок.
              </p>
            </div>

            <!-- Режим времени и скорость -->
            <div class="worldtime-sim__panel">
              <h4 class="worldtime-sim__panel-title">
                <i class="ph-light ph-clock" aria-hidden="true"></i> Режим хода времени
              </h4>
              <div class="worldtime-sim__mode-toggle">
                <button type="button" class="chip is-active" id="wt-mode-live">Атомное время UTC (Real-time)</button>
                <button type="button" class="chip" id="wt-mode-manual">Ручная настройка</button>
              </div>

              <!-- Блок ручного времени (скрыт в режиме live) -->
              <div class="worldtime-sim__manual-box" id="wt-manual-controls" hidden>
                <div class="worldtime-sim__slider-row">
                  <label for="wt-hour-slider">Час UTC: <b id="wt-hour-val">12</b>:00</label>
                  <input type="range" id="wt-hour-slider" min="0" max="23" value="12" step="1" class="worldtime-sim__slider">
                </div>
                <div class="worldtime-sim__slider-row">
                  <label for="wt-minute-slider">Минуты: <b id="wt-minute-val">00</b> мин</label>
                  <input type="range" id="wt-minute-slider" min="0" max="59" value="0" step="1" class="worldtime-sim__slider">
                </div>
              </div>

              <!-- Скорость симуляции -->
              <div class="worldtime-sim__speed-row">
                <span class="muted">Скорость вращения Земли:</span>
                <div class="worldtime-sim__speed-pills">
                  <button type="button" class="chip is-active" data-speed="1">1x (Реальная)</button>
                  <button type="button" class="chip" data-speed="60">60x (1 мин/сек)</button>
                  <button type="button" class="chip" data-speed="300">300x (Сутки за 5 мин)</button>
                </div>
              </div>
            </div>

            <!-- Быстрые столицы мира -->
            <div class="worldtime-sim__panel">
              <h4 class="worldtime-sim__panel-title">
                <i class="ph-light ph-globe" aria-hidden="true"></i> Быстрый выбор ключевых хабов
              </h4>
              <div class="worldtime-sim__city-chips">
                <button type="button" class="chip" data-city="london">🇬🇧 Лондон (UTC 0)</button>
                <button type="button" class="chip is-active" data-city="paris">🇫🇷 Женева / Париж (+1)</button>
                <button type="button" class="chip" data-city="moscow">🇷🇺 Москва (+3)</button>
                <button type="button" class="chip" data-city="dubai">🇦🇪 Дубай (+4)</button>
                <button type="button" class="chip" data-city="tokyo">🇯🇵 Токио (+9)</button>
                <button type="button" class="chip" data-city="sydney">🇦🇺 Сидней (+10)</button>
                <button type="button" class="chip" data-city="newyork">🇺🇸 Нью-Йорк (-5)</button>
                <button type="button" class="chip" data-city="losangeles">🇺🇸 Лос-Анджелес (-8)</button>
              </div>
            </div>

            <!-- Переключатель кинематики механизма -->
            <div class="worldtime-sim__panel">
              <button type="button" class="btn btn--ghost worldtime-sim__toggle-mech" id="wt-toggle-mech">
                <i class="ph-light ph-gear-six" aria-hidden="true"></i>
                <span id="wt-mech-label">Показать кинематику звёздочки и пружины-фиксатора</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Табло 24 мировых поясов планеты (Planetary Flight Board) -->
        <div class="worldtime-sim__matrix-wrap">
          <div class="worldtime-sim__matrix-head">
            <h3 class="display display--s">Табло 24 мировых поясов планеты</h3>
            <p class="muted">Нажмите на любой город в списке, чтобы циферблат мгновенно повернулся и перевел местное время на него.</p>
          </div>
          <div class="worldtime-sim__matrix-grid" id="wt-matrix-grid">
            <!-- Заполняется динамически -->
          </div>
        </div>

        <!-- Инженерное досье и история усложнения -->
        <div class="worldtime-sim__dossier">
          <div class="worldtime-sim__dossier-card">
            <h4><i class="ph-light ph-compass" aria-hidden="true"></i> Изобретение Луи Котье (1931)</h4>
            <p>
              До Луи Котье часы для путешественников оснащались несколькими отдельными циферблатами или громоздкими механизмами.
              В 1931 году независимый женевский часовщик Луи Котье запатентовал концепцию Heure Universelle: центральный 12-часовой
              циферблат окружен 24-часовым диском, вращающимся против часовой стрелки со скоростью 1 оборот в сутки, а по внешнему
              контуру расположено неподвижное или регулируемое кольцо с 24 городами планеты.
            </p>
          </div>
          <div class="worldtime-sim__dossier-card">
            <h4><i class="ph-light ph-arrows-clockwise" aria-hidden="true"></i> Патент Patek Philippe Calibre 240 HU (1999)</h4>
            <p>
              Исторические часы требовали ручной коррекции безеля или второй заводной головки. В 1999 году мануфактура Patek Philippe
              создала запатентованное усложнение на базе ультратонкого автоматического калибра 240 с микроротором из 22-каратного золота.
              При нажатии кнопки на 10 часах механизм одновременно поворачивает диск городов, сдвигает 24-часовое кольцо и делает
              скачок часовой стрелки без разрыва кинематической связи баланса и минутной передачи.
            </p>
          </div>
          <div class="worldtime-sim__dossier-card">
            <h4><i class="ph-light ph-sun-horizon" aria-hidden="true"></i> Индикация день / ночь</h4>
            <p>
              24-часовой диск разделен на два контрастных сектора по 12 часов. Дневной сектор (06:00 до 18:00) выполнен в светлых
              тонах цвета шампанского с золотым символом солнца. Ночной сектор (18:00 до 06:00) оформлен в темно-синем сапфировом
              цвете с полированным полумесяцем и звёздами, позволяя владельцу безошибочно различать день и ночь в любой точке планеты.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  setupEvents() {
    this.canvas = qs("#worldtime-canvas", this.container);
    this.ctx = this.canvas?.getContext("2d");

    // Обработка кнопки 10 часов на циферблате
    const triggerBtn = qs("#wt-pusher-trigger", this.container);
    const stepFwdBtn = qs("#wt-btn-step-fwd", this.container);
    const stepBackBtn = qs("#wt-btn-step-back", this.container);

    const onPusherPress = (forward = true) => {
      this.triggerPusher(forward);
    };

    triggerBtn?.addEventListener("click", () => onPusherPress(true));
    stepFwdBtn?.addEventListener("click", () => onPusherPress(true));
    stepBackBtn?.addEventListener("click", () => onPusherPress(false));

    // Переключение режимов Live / Manual
    const btnLive = qs("#wt-mode-live", this.container);
    const btnManual = qs("#wt-mode-manual", this.container);
    const manualBox = qs("#wt-manual-controls", this.container);
    const liveBadge = qs("#wt-live-badge", this.container);

    btnLive?.addEventListener("click", () => {
      this.isLiveUtc = true;
      btnLive.classList.add("is-active");
      btnManual.classList.remove("is-active");
      if (manualBox) manualBox.hidden = true;
      if (liveBadge) liveBadge.textContent = "Синхронизация UTC: Активна";
    });

    btnManual?.addEventListener("click", () => {
      this.isLiveUtc = false;
      btnManual.classList.add("is-active");
      btnLive.classList.remove("is-active");
      if (manualBox) manualBox.hidden = false;
      if (liveBadge) liveBadge.textContent = "Ручной режим моделирования";
    });

    // Ползунки ручного времени
    const sliderH = qs("#wt-hour-slider", this.container);
    const sliderM = qs("#wt-minute-slider", this.container);
    const valH = qs("#wt-hour-val", this.container);
    const valM = qs("#wt-minute-val", this.container);

    sliderH?.addEventListener("input", (e) => {
      const h = parseInt(e.target.value, 10);
      if (valH) valH.textContent = String(h).padStart(2, "0");
      const currentM = Math.floor((this.utcSeconds % 3600) / 60);
      const currentS = this.utcSeconds % 60;
      this.utcSeconds = h * 3600 + currentM * 60 + currentS;
    });

    sliderM?.addEventListener("input", (e) => {
      const m = parseInt(e.target.value, 10);
      if (valM) valM.textContent = String(m).padStart(2, "0");
      const currentH = Math.floor(this.utcSeconds / 3600);
      this.utcSeconds = currentH * 3600 + m * 60;
    });

    // Переключатель скорости
    qsa("[data-speed]", this.container).forEach((btn) => {
      btn.addEventListener("click", () => {
        qsa("[data-speed]", this.container).forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        this.simSpeed = parseFloat(btn.dataset.speed) || 1;
      });
    });

    // Быстрый выбор ключевых городов
    qsa("[data-city]", this.container).forEach((btn) => {
      btn.addEventListener("click", () => {
        const cityId = btn.dataset.city;
        const idx = WORLD_CITIES.findIndex((c) => c.id === cityId);
        if (idx !== -1) {
          this.setLocalCity(idx);
          qsa("[data-city]", this.container).forEach((b) => b.classList.toggle("is-active", b.dataset.city === cityId));
        }
      });
    });

    // Переключатель отображения кинематики механизма
    const toggleMechBtn = qs("#wt-toggle-mech", this.container);
    const mechLabel = qs("#wt-mech-label", this.container);
    toggleMechBtn?.addEventListener("click", () => {
      this.showMechanismView = !this.showMechanismView;
      toggleMechBtn.classList.toggle("is-active", this.showMechanismView);
      if (mechLabel) {
        mechLabel.textContent = this.showMechanismView
          ? "Вернуться к циферблату Cloisonné Enamel"
          : "Показать кинематику звёздочки и пружины-фиксатора";
      }
    });

    // Клики по холсту (нажатие на кнопку 10h или на город на кольце)
    this.canvas?.addEventListener("click", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 640;
      const y = ((e.clientY - rect.top) / rect.height) * 640;
      this.handleCanvasClick(x, y);
    });

    this.canvas?.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 640;
      const y = ((e.clientY - rect.top) / rect.height) * 640;
      this.handleCanvasHover(x, y);
    });

    this.canvas?.addEventListener("mouseleave", () => {
      this.hoveredCityIndex = null;
    });

    // Заполнение матрицы городов
    this.renderMatrixGrid();
  }

  triggerPusher(forward = true) {
    playPusherClick(true);
    this.pusherCompression = 1.0;
    this.isPusherActive = true;

    // Вращение кольца на 1 шаг (15 градусов = 360 / 24)
    if (forward) {
      this.localCityIndex = (this.localCityIndex + 1) % 24;
      this.starWheelRotation += (2 * Math.PI) / 24;
    } else {
      this.localCityIndex = (this.localCityIndex - 1 + 24) % 24;
      this.starWheelRotation -= (2 * Math.PI) / 24;
    }
    this.targetCityRotation = this.localCityIndex * ((2 * Math.PI) / 24);
    this.jumperTension = 1.0;

    // Обновляем подсветку быстрых кнопок
    const currentCity = WORLD_CITIES[this.localCityIndex];
    qsa("[data-city]", this.container).forEach((b) => {
      b.classList.toggle("is-active", b.dataset.city === currentCity.id);
    });

    this.updateStatusDisplay();
  }

  setLocalCity(idx) {
    if (idx === this.localCityIndex) return;
    playPusherClick(false);
    this.localCityIndex = idx;
    this.targetCityRotation = this.localCityIndex * ((2 * Math.PI) / 24);
    this.updateStatusDisplay();
  }

  handleCanvasClick(x, y) {
    const cx = 320, cy = 320;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.hypot(dx, dy);

    // Проверка клика по кнопке 10 часов на корпусе (угол около -150 градусов)
    const angle = Math.atan2(dy, dx);
    const angleDeg = (angle * 180) / Math.PI;
    // Кнопка находится на 10 часах: угол около -150 градусов (диапазон от -165 до -135)
    if (dist >= 270 && dist <= 315 && angleDeg >= -165 && angleDeg <= -135) {
      this.triggerPusher(true);
      return;
    }

    // Проверка клика по внешнему кольцу городов (радиус от 215 до 265)
    if (dist >= 215 && dist <= 265) {
      // Вычисляем, какой город находится под курсором с учетом текущего угла поворота диска
      let clickAngle = angle - (-Math.PI / 2) + this.currentCityRotation;
      while (clickAngle < 0) clickAngle += 2 * Math.PI;
      while (clickAngle >= 2 * Math.PI) clickAngle -= 2 * Math.PI;

      const sector = (2 * Math.PI) / 24;
      const clickedIdx = Math.floor((clickAngle + sector / 2) / sector) % 24;
      if (clickedIdx >= 0 && clickedIdx < 24) {
        this.setLocalCity(clickedIdx);
      }
    }
  }

  handleCanvasHover(x, y) {
    const cx = 320, cy = 320;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.hypot(dx, dy);

    if (dist >= 215 && dist <= 265) {
      const angle = Math.atan2(dy, dx);
      let hoverAngle = angle - (-Math.PI / 2) + this.currentCityRotation;
      while (hoverAngle < 0) hoverAngle += 2 * Math.PI;
      while (hoverAngle >= 2 * Math.PI) hoverAngle -= 2 * Math.PI;

      const sector = (2 * Math.PI) / 24;
      this.hoveredCityIndex = Math.floor((hoverAngle + sector / 2) / sector) % 24;
      if (this.canvas) this.canvas.style.cursor = "pointer";
    } else if (dist >= 270 && dist <= 315) {
      const angle = Math.atan2(dy, dx);
      const angleDeg = (angle * 180) / Math.PI;
      if (angleDeg >= -165 && angleDeg <= -135) {
        if (this.canvas) this.canvas.style.cursor = "pointer";
        this.hoveredCityIndex = null;
        return;
      }
      this.hoveredCityIndex = null;
      if (this.canvas) this.canvas.style.cursor = "default";
    } else {
      this.hoveredCityIndex = null;
      if (this.canvas) this.canvas.style.cursor = "default";
    }
  }

  renderMatrixGrid() {
    const grid = qs("#wt-matrix-grid", this.container);
    if (!grid) return;

    grid.innerHTML = WORLD_CITIES.map((c, i) => {
      return html`
        <div class="worldtime-sim__matrix-card ${i === this.localCityIndex ? "is-local" : ""}" data-matrix-idx="${i}">
          <div class="worldtime-sim__matrix-top">
            <span class="worldtime-sim__matrix-flag">${c.flag}</span>
            <span class="worldtime-sim__matrix-name">${c.name}</span>
            <span class="worldtime-sim__matrix-offset">UTC ${c.offset >= 0 ? "+" + c.offset : c.offset}</span>
          </div>
          <div class="worldtime-sim__matrix-time" data-time-for="${c.id}">--:--:--</div>
          <div class="worldtime-sim__matrix-meta">
            <span class="worldtime-sim__matrix-state" data-state-for="${c.id}">--</span>
            <span class="worldtime-sim__matrix-region">${c.region}</span>
          </div>
        </div>
      `;
    }).join("");

    qsa(".worldtime-sim__matrix-card", grid).forEach((card) => {
      card.addEventListener("click", () => {
        const idx = parseInt(card.dataset.matrixIdx, 10);
        if (!isNaN(idx)) {
          this.setLocalCity(idx);
        }
      });
    });
  }

  updateMatrixCards(utcSec) {
    WORLD_CITIES.forEach((c, i) => {
      const localSec = (utcSec + c.offset * 3600 + 86400 * 2) % 86400;
      const h = Math.floor(localSec / 3600);
      const m = Math.floor((localSec % 3600) / 60);
      const s = Math.floor(localSec % 60);
      const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

      const isDay = h >= 6 && h < 18;
      const stateStr = isDay ? "☀️ День" : "🌙 Ночь";

      const timeEl = qs(`[data-time-for="${c.id}"]`, this.container);
      const stateEl = qs(`[data-state-for="${c.id}"]`, this.container);
      const cardEl = qs(`[data-matrix-idx="${i}"]`, this.container);

      if (timeEl) timeEl.textContent = timeStr;
      if (stateEl) {
        stateEl.textContent = stateStr;
        stateEl.className = `worldtime-sim__matrix-state ${isDay ? "is-day" : "is-night"}`;
      }
      if (cardEl) {
        cardEl.classList.toggle("is-local", i === this.localCityIndex);
      }
    });
  }

  updateStatusDisplay() {
    const city = WORLD_CITIES[this.localCityIndex];
    if (!city) return;

    const flagEl = qs("#wt-local-flag", this.container);
    const cityEl = qs("#wt-local-city", this.container);
    const metaEl = qs("#wt-local-meta", this.container);

    if (flagEl) flagEl.textContent = city.flag;
    if (cityEl) cityEl.textContent = `${city.name} (${city.nameEn})`;
    if (metaEl) metaEl.textContent = `Местное базовое время (UTC ${city.offset >= 0 ? "+" + city.offset : city.offset}) · ${city.country}`;
  }

  startLoop() {
    const loop = (timestamp) => {
      const dt = (timestamp - this.lastTimestamp) / 1000;
      this.lastTimestamp = timestamp;

      this.update(dt);
      this.draw();

      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  update(dt) {
    // Обновление времени
    if (this.isLiveUtc) {
      const now = new Date();
      this.utcSeconds = (now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds() + now.getUTCMilliseconds() / 1000) * this.simSpeed;
    } else {
      this.utcSeconds = (this.utcSeconds + dt * this.simSpeed) % 86400;
    }

    // Плавная интерполяция вращения кольца городов к целевому углу
    const rotDiff = this.targetCityRotation - this.currentCityRotation;
    this.currentCityRotation += rotDiff * Math.min(1, dt * 10);

    // Затухание нажатия кнопки 10 часов
    if (this.pusherCompression > 0) {
      this.pusherCompression = Math.max(0, this.pusherCompression - dt * 4);
    }

    // Затухание натяжения пружины-фиксатора
    if (this.jumperTension > 0) {
      this.jumperTension = Math.max(0, this.jumperTension - dt * 5);
    }

    // Обновление цифрового табло местного времени
    const localCity = WORLD_CITIES[this.localCityIndex];
    if (localCity) {
      const localSec = (this.utcSeconds + localCity.offset * 3600 + 86400 * 2) % 86400;
      const h = Math.floor(localSec / 3600);
      const m = Math.floor((localSec % 3600) / 60);
      const s = Math.floor(localSec % 60);

      const digEl = qs("#wt-local-digital", this.container);
      const phaseEl = qs("#wt-local-phase", this.container);

      if (digEl) {
        digEl.textContent = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      }
      if (phaseEl) {
        const isDay = h >= 6 && h < 18;
        phaseEl.textContent = isDay ? "День (06:00 - 18:00)" : "Ночь (18:00 - 06:00)";
        phaseEl.className = `worldtime-sim__ampm ${isDay ? "is-day" : "is-night"}`;
      }
    }

    // Обновление карточек матрицы
    this.updateMatrixCards(this.utcSeconds);
  }

  draw() {
    const ctx = this.ctx;
    if (!ctx) return;

    ctx.clearRect(0, 0, 640, 640);

    if (this.showMechanismView) {
      this.drawMechanism(ctx);
    } else {
      this.drawDial(ctx);
    }
  }

  // Отрисовка парадного циферблата World Time Heure Universelle
  drawDial(ctx) {
    const cx = 320, cy = 320;

    ctx.save();

    // 1. Корпус часов (Case) из розового золота / платины
    this.drawCase(ctx, cx, cy);

    // 2. Внешнее неподвижное / шаговое кольцо городов (24 Cities Ring)
    this.drawCitiesRing(ctx, cx, cy);

    // 3. Концентрическое 24-часовое кольцо день/ночь (24-Hour Day/Night Ring)
    this.draw24HourRing(ctx, cx, cy);

    // 4. Центральный эмалевый диск Cloisonné Enamel (планисфера континентов)
    this.drawCloisonneCenter(ctx, cx, cy);

    // 5. Стрелки местного времени (Котье стиль: обсерваторное кольцо)
    this.drawHands(ctx, cx, cy);

    // 6. Верхний фиксирующий маркер на 12 часах (Zenith Gold Arrow)
    this.drawZenithMarker(ctx, cx, cy);

    ctx.restore();
  }

  drawCase(ctx, cx, cy) {
    // Внешний контур безеля
    const radOuter = 300;

    // Тень корпуса
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
    ctx.shadowBlur = 32;
    ctx.shadowOffsetY = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, radOuter, 0, Math.PI * 2);
    ctx.fillStyle = "#121418";
    ctx.fill();
    ctx.restore();

    // Градиент розового золота безеля
    const gradBezel = ctx.createRadialGradient(cx - 80, cy - 80, 80, cx, cy, radOuter);
    gradBezel.addColorStop(0, "#f3d3a9");
    gradBezel.addColorStop(0.4, "#cf9a63");
    gradBezel.addColorStop(0.75, "#8a582e");
    gradBezel.addColorStop(0.92, "#cf9a63");
    gradBezel.addColorStop(1, "#44240f");

    ctx.beginPath();
    ctx.arc(cx, cy, radOuter, 0, Math.PI * 2);
    ctx.fillStyle = gradBezel;
    ctx.fill();

    // Ступенчатый полированный рант безеля
    ctx.beginPath();
    ctx.arc(cx, cy, 275, 0, Math.PI * 2);
    ctx.strokeStyle = "#46250e";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 272, 0, Math.PI * 2);
    ctx.fillStyle = "#0c0e12";
    ctx.fill();

    // Заводная головка на 3 часах (Crown at 3h)
    ctx.save();
    ctx.translate(cx + radOuter - 4, cy);
    const gradCrown = ctx.createLinearGradient(0, -18, 16, 18);
    gradCrown.addColorStop(0, "#cf9a63");
    gradCrown.addColorStop(0.5, "#fae4c8");
    gradCrown.addColorStop(1, "#663e18");
    ctx.fillStyle = gradCrown;
    ctx.beginPath();
    ctx.roundRect(0, -16, 14, 32, [0, 4, 4, 0]);
    ctx.fill();
    ctx.restore();

    // Кнопка корректора на 10 часах (Pusher at 10h)
    // Угол 10 часов = -150 градусов (-5 * PI / 6)
    ctx.save();
    const pusherAngle = (-5 * Math.PI) / 6;
    const compressionOffset = this.pusherCompression * 4;
    const px = cx + Math.cos(pusherAngle) * (radOuter - 6 - compressionOffset);
    const py = cy + Math.sin(pusherAngle) * (radOuter - 6 - compressionOffset);

    ctx.translate(px, py);
    ctx.rotate(pusherAngle);

    const gradPusher = ctx.createLinearGradient(0, -14, 18, 14);
    gradPusher.addColorStop(0, "#fae4c8");
    gradPusher.addColorStop(0.5, "#c8945f");
    gradPusher.addColorStop(1, "#502b11");

    ctx.fillStyle = gradPusher;
    ctx.beginPath();
    ctx.roundRect(0, -12, 16, 24, [0, 5, 5, 0]);
    ctx.fill();

    ctx.strokeStyle = "#ffe5cb";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  drawCitiesRing(ctx, cx, cy) {
    const rInner = 215;
    const rOuter = 270;

    // Подложка кольца городов: глубокий полированный обсидиан с латунной окантовкой
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
    ctx.arc(cx, cy, rInner, 0, Math.PI * 2, true);
    ctx.fillStyle = "#14171d";
    ctx.fill();

    // Разделительная золотая нить
    ctx.strokeStyle = "rgba(218, 165, 32, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Отрисовка 24 городов
    const sectorAngle = (2 * Math.PI) / 24;
    const baseRotation = -Math.PI / 2 - this.currentCityRotation;

    WORLD_CITIES.forEach((city, i) => {
      const angle = baseRotation + i * sectorAngle;
      const isSelected = i === this.localCityIndex;
      const isHovered = i === this.hoveredCityIndex;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      // Радиальный маркер часового пояса на кольце
      ctx.beginPath();
      ctx.moveTo(0, -rOuter + 3);
      ctx.lineTo(0, -rOuter + (i % 3 === 0 ? 11 : 7));
      ctx.strokeStyle = isSelected ? "#f3d3a9" : "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      // Название города
      ctx.font = isSelected ? "bold 10px 'Cinzel', 'Playfair Display', serif, sans-serif" : "9px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (isSelected) {
        ctx.fillStyle = "#ffdd99";
        ctx.shadowColor = "rgba(255, 221, 153, 0.6)";
        ctx.shadowBlur = 6;
      } else if (isHovered) {
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
        ctx.shadowBlur = 8;
      } else {
        ctx.fillStyle = "rgba(240, 240, 240, 0.75)";
        ctx.shadowBlur = 0;
      }

      // Текст пишется вдоль радиуса
      ctx.fillText(city.name.toUpperCase(), 0, -rInner - 28);

      ctx.restore();
    });

    ctx.restore();
  }

  draw24HourRing(ctx, cx, cy) {
    const rInner = 168;
    const rOuter = 214;

    // Вращение 24-часового кольца:
    // Оно совершает 1 оборот за 86400 секунд против часовой стрелки.
    // В момент UTC t = 0 (полночь в Гринвиче), цифра 24/0 должна смотреть на Лондон.
    const utcHoursFloat = this.utcSeconds / 3600;
    // Угол поворота 24-часового диска:
    const ringAngle = -Math.PI / 2 - (utcHoursFloat * (2 * Math.PI) / 24);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ringAngle);

    // 1. Дневной сектор (06:00 до 18:00): цвет теплого золотистого шампанского
    // Сектор от 6h до 18h соответствует углам от 6 * 15° до 18 * 15°
    const angle6 = (6 / 24) * Math.PI * 2;
    const angle18 = (18 / 24) * Math.PI * 2;

    const gradDay = ctx.createRadialGradient(0, 0, rInner, 0, 0, rOuter);
    gradDay.addColorStop(0, "#fcedd8");
    gradDay.addColorStop(1, "#dfc096");

    ctx.beginPath();
    ctx.arc(0, 0, rOuter, angle6, angle18);
    ctx.arc(0, 0, rInner, angle18, angle6, true);
    ctx.closePath();
    ctx.fillStyle = gradDay;
    ctx.fill();

    // 2. Ночной сектор (18:00 до 06:00): глубокий королевский синий (Midnight Navy)
    const gradNight = ctx.createRadialGradient(0, 0, rInner, 0, 0, rOuter);
    gradNight.addColorStop(0, "#0d1b2a");
    gradNight.addColorStop(1, "#070c14");

    ctx.beginPath();
    ctx.arc(0, 0, rOuter, angle18, angle6 + Math.PI * 2);
    ctx.arc(0, 0, rInner, angle6 + Math.PI * 2, angle18, true);
    ctx.closePath();
    ctx.fillStyle = gradNight;
    ctx.fill();

    // Золотая окантовка между 24-часовым диском и циферблатом
    ctx.beginPath();
    ctx.arc(0, 0, rOuter, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(218, 165, 32, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, rInner, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(218, 165, 32, 0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 3. Нанесение 24 часовых меток и цифр от 1 до 24
    for (let h = 1; h <= 24; h++) {
      const hAngle = (h / 24) * Math.PI * 2;

      ctx.save();
      ctx.rotate(hAngle);

      // Засечка часа
      ctx.beginPath();
      ctx.moveTo(0, rOuter);
      ctx.lineTo(0, rOuter - 6);
      ctx.strokeStyle = (h >= 6 && h <= 18) ? "#4a3219" : "#a2b5cd";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Получасовая точка
      ctx.beginPath();
      ctx.arc(0, (rInner + rOuter) / 2 - 14, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = (h >= 6 && h <= 18) ? "rgba(74, 50, 25, 0.4)" : "rgba(162, 181, 205, 0.4)";
      ctx.fill();

      // Цифра часа
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (h === 12) {
        // Золотое солнце на 12 часах дня
        ctx.fillStyle = "#8a5818";
        ctx.fillText("12 ☀️", 0, rInner + 22);
      } else if (h === 24) {
        // Серебряная луна на 24 часах ночи
        ctx.fillStyle = "#ffffff";
        ctx.fillText("24 🌙", 0, rInner + 22);
      } else {
        const isDayNum = h >= 6 && h <= 18;
        ctx.fillStyle = isDayNum ? "#2f1e0d" : "#e6edfa";
        ctx.fillText(String(h), 0, rInner + 22);
      }

      ctx.restore();
    }

    ctx.restore();
  }

  drawCloisonneCenter(ctx, cx, cy) {
    const rDial = 166;

    ctx.save();
    ctx.translate(cx, cy);

    // Подложка центрального диска: многослойная горячая эмаль Grand Feu
    // Глубокий океанический градиент сине-зеленого сапфира
    const gradOcean = ctx.createRadialGradient(0, 0, 10, 0, 0, rDial);
    gradOcean.addColorStop(0, "#194a63");
    gradOcean.addColorStop(0.5, "#0b2638");
    gradOcean.addColorStop(1, "#041019");

    ctx.beginPath();
    ctx.arc(0, 0, rDial, 0, Math.PI * 2);
    ctx.fillStyle = gradOcean;
    ctx.fill();

    // Гильошированные волны на воде (Radial Guilloché Waves)
    ctx.save();
    ctx.strokeStyle = "rgba(72, 172, 216, 0.15)";
    ctx.lineWidth = 1;
    for (let r = 24; r < rDial; r += 16) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Стилизованная перегородчатая эмаль Cloisonné: карта мира (континенты)
    // Евразия, Африка, Америка
    ctx.save();
    ctx.fillStyle = "#3c754d"; // Изумрудно-оливковая эмаль суши
    ctx.strokeStyle = "#e5b778"; // Тончайшая золотая проволока перегородок
    ctx.lineWidth = 1.2;

    // Африка и Евразия
    ctx.beginPath();
    ctx.moveTo(10, -80);
    ctx.bezierCurveTo(45, -85, 75, -50, 60, -10);
    ctx.bezierCurveTo(70, 20, 40, 60, 15, 70);
    ctx.bezierCurveTo(-10, 75, -25, 45, -15, 10);
    ctx.bezierCurveTo(-35, -20, -10, -70, 10, -80);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Северная и Южная Америка
    ctx.beginPath();
    ctx.moveTo(-75, -60);
    ctx.bezierCurveTo(-50, -65, -45, -35, -55, -20);
    ctx.bezierCurveTo(-40, 0, -45, 40, -60, 60);
    ctx.bezierCurveTo(-75, 70, -85, 40, -75, 10);
    ctx.bezierCurveTo(-95, -15, -90, -50, -75, -60);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Австралия
    ctx.beginPath();
    ctx.arc(75, 45, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // Накладные золотые граненые метки на 3, 6, 9, 12 часах
    ctx.save();
    for (let m = 0; m < 12; m++) {
      const mAngle = (m / 12) * Math.PI * 2;
      ctx.save();
      ctx.rotate(mAngle);

      if (m % 3 === 0) {
        // Крупный граненый багет
        ctx.fillStyle = "#f3d3a9";
        ctx.fillRect(-2.5, -rDial + 6, 5, 14);
        ctx.strokeStyle = "#8a582e";
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-2.5, -rDial + 6, 5, 14);
      } else {
        // Золотая круглая жемчужина
        ctx.beginPath();
        ctx.arc(0, -rDial + 12, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = "#fae4c8";
        ctx.fill();
      }

      ctx.restore();
    }
    ctx.restore();

    ctx.restore();
  }

  drawHands(ctx, cx, cy) {
    const localCity = WORLD_CITIES[this.localCityIndex];
    const localSec = (this.utcSeconds + localCity.offset * 3600 + 86400 * 2) % 86400;

    const hours = localSec / 3600;
    const minutes = (localSec % 3600) / 60;
    const seconds = localSec % 60;

    const hourAngle = (hours % 12) * (Math.PI * 2 / 12) + (minutes / 60) * (Math.PI * 2 / 12);
    const minuteAngle = minutes * (Math.PI * 2 / 60) + (seconds / 60) * (Math.PI * 2 / 60);
    const secondAngle = seconds * (Math.PI * 2 / 60);

    ctx.save();
    ctx.translate(cx, cy);

    // 1. Часовая стрелка (Характерное кольцо Луи Котье / Patek Philippe Aiguille Observatoire)
    ctx.save();
    ctx.rotate(hourAngle);

    // Тень стрелки
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    // Градиент золота стрелки
    const gradHour = ctx.createLinearGradient(-6, 0, 6, -95);
    gradHour.addColorStop(0, "#fadcb2");
    gradHour.addColorStop(0.5, "#d99f60");
    gradHour.addColorStop(1, "#834d1b");

    ctx.fillStyle = gradHour;
    ctx.strokeStyle = "#ffe2be";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(-5, 14);
    ctx.lineTo(5, 14);
    ctx.lineTo(3.5, -45);

    // Ажурное сквозное кольцо Котье на стрелке
    ctx.arc(0, -65, 18, Math.PI / 2, -Math.PI / 2, true);
    ctx.lineTo(1.5, -95);
    ctx.lineTo(0, -102); // Острие
    ctx.lineTo(-1.5, -95);
    ctx.arc(0, -65, 18, -Math.PI / 2, Math.PI / 2, true);
    ctx.lineTo(-3.5, -45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Внутреннее сквозное отверстие кольца Котье
    ctx.beginPath();
    ctx.arc(0, -65, 11, 0, Math.PI * 2);
    ctx.fillStyle = "#0c283a";
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // 2. Минутная стрелка (Изящный граненый ланцет Feuille)
    ctx.save();
    ctx.rotate(minuteAngle);

    ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;

    const gradMin = ctx.createLinearGradient(-4, 0, 4, -145);
    gradMin.addColorStop(0, "#fae4c8");
    gradMin.addColorStop(0.5, "#c58a4c");
    gradMin.addColorStop(1, "#5d3210");

    ctx.fillStyle = gradMin;
    ctx.strokeStyle = "#ffe5cb";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(-4, 18);
    ctx.lineTo(4, 18);
    ctx.lineTo(2.5, -120);
    ctx.lineTo(0, -145);
    ctx.lineTo(-2.5, -120);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Продольное ребро жесткости стрелки
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.lineTo(0, -140);
    ctx.strokeStyle = "#fff2e0";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.restore();

    // 3. Секундная стрелка (Тонкая вороненая сталь с противовесом)
    ctx.save();
    ctx.rotate(secondAngle);

    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;

    ctx.strokeStyle = "#e8b26e";
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(0, 28);
    ctx.lineTo(0, -156);
    ctx.stroke();

    // Круглый противовес
    ctx.beginPath();
    ctx.arc(0, 20, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#e8b26e";
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // 4. Центральный колпачок триба (Pinion Cap)
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#fae4c8";
    ctx.fill();
    ctx.strokeStyle = "#5a310d";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#8a1f1d"; // Рубиновый камень в центре
    ctx.fill();

    ctx.restore();
  }

  drawZenithMarker(ctx, cx, cy) {
    // Золотая треугольная стрела на 12 часах (указывает на активный город)
    ctx.save();
    ctx.translate(cx, cy - 270);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(8, -12);
    ctx.lineTo(-8, -12);
    ctx.closePath();

    ctx.fillStyle = "#ffdd99";
    ctx.shadowColor = "rgba(255, 221, 153, 0.8)";
    ctx.shadowBlur = 10;
    ctx.fill();

    ctx.strokeStyle = "#7c4e1d";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  // Отрисовка кинематической схемы калибра 240 HU (звёздочка Котье и фиксатор)
  drawMechanism(ctx) {
    const cx = 320, cy = 320;

    ctx.save();

    // Платина механизма с жемчужным зернением (Perlage)
    ctx.beginPath();
    ctx.arc(cx, cy, 290, 0, Math.PI * 2);
    ctx.fillStyle = "#1e222b";
    ctx.fill();

    ctx.strokeStyle = "#384152";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Декоративное зернение Перлаж
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    for (let py = 60; py < 580; py += 32) {
      for (let px = 60; px < 580; px += 32) {
        if (Math.hypot(px - cx, py - cy) < 270) {
          ctx.beginPath();
          ctx.arc(px, py, 22, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();

    // 1. Центральное 24-зубое программное колесо (Étoile à 24 dents)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.starWheelRotation);

    const rStar = 140;
    const teeth = 24;

    ctx.beginPath();
    for (let t = 0; t < teeth; t++) {
      const a1 = (t / teeth) * Math.PI * 2;
      const a2 = ((t + 0.5) / teeth) * Math.PI * 2;
      const a3 = ((t + 1) / teeth) * Math.PI * 2;

      const x1 = Math.cos(a1) * rStar;
      const y1 = Math.sin(a1) * rStar;
      const x2 = Math.cos(a2) * (rStar - 26);
      const y2 = Math.sin(a2) * (rStar - 26);
      const x3 = Math.cos(a3) * rStar;
      const y3 = Math.sin(a3) * rStar;

      if (t === 0) ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
    }
    ctx.closePath();

    const gradStar = ctx.createRadialGradient(0, 0, 30, 0, 0, rStar);
    gradStar.addColorStop(0, "#d8b27c");
    gradStar.addColorStop(0.8, "#b0854d");
    gradStar.addColorStop(1, "#543818");

    ctx.fillStyle = gradStar;
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 16;
    ctx.fill();

    ctx.strokeStyle = "#ffd8a6";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Зубчатые спицы и рубиновые камни в звёздочке
    for (let sp = 0; sp < 6; sp++) {
      const sa = (sp / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(sa) * 65, Math.sin(sa) * 65, 12, 0, Math.PI * 2);
      ctx.fillStyle = "#161920";
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();

    // 2. Пружина-фиксатор (Sautoir) с рубиновым клювом
    const tensionDeflection = this.jumperTension * 12;
    ctx.save();
    ctx.translate(cx + 140 + tensionDeflection, cy);

    ctx.beginPath();
    ctx.moveTo(80, -90);
    ctx.bezierCurveTo(40, -60, -20, -20, -26, 0);
    ctx.lineTo(-12, 14);
    ctx.bezierCurveTo(20, 60, 60, 90, 90, 110);
    ctx.strokeStyle = "#8da2ba";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.stroke();

    // Полированный стальный фиксатор
    ctx.beginPath();
    ctx.moveTo(-26, 0);
    ctx.lineTo(-4, -14);
    ctx.lineTo(-4, 14);
    ctx.closePath();
    ctx.fillStyle = "#c81d25"; // Рубиновый клюв
    ctx.fill();
    ctx.strokeStyle = "#ffd1d1";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();

    // 3. Толкающий рычаг кнопки 10 часов (Pusher Lever & Pawl)
    const leverMove = this.pusherCompression * 18;
    ctx.save();
    ctx.translate(cx - 150 + leverMove, cy - 130 + leverMove);
    ctx.rotate(Math.PI / 4);

    ctx.beginPath();
    ctx.roundRect(-80, -10, 120, 20, 6);
    ctx.fillStyle = "#a8b5c4";
    ctx.fill();
    ctx.strokeStyle = "#eef4fa";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Собачка толкателя (Cliquet)
    ctx.beginPath();
    ctx.moveTo(40, 10);
    ctx.lineTo(65, 35);
    ctx.lineTo(48, 42);
    ctx.closePath();
    ctx.fillStyle = "#cf9a63";
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // Поясняющие подписи к узлам механизма
    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = "#e0e6ed";
    ctx.fillText("24-зубая звёздочка Котье (Étoile à 24 dents)", cx - 180, cy + 200);
    ctx.fillStyle = "#9ab0c7";
    ctx.fillText("Пружина-фиксатор пояса (Sautoir)", cx + 60, cy + 160);
    ctx.fillText("Рычаг толкателя 10h (Pusher Lever)", cx - 220, cy - 160);

    ctx.restore();
  }

  destroy() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }
}

// Экспортные фабрики для страниц атласа
export function renderWorldTimeSimulator(slug = "world-time") {
  return html`<div class="worldtime-sim-mount" data-complication="${slug}"></div>`;
}

export function mountWorldTimeSimulator(root) {
  const mountPoints = qsa(".worldtime-sim-mount", root);
  const instances = [];

  mountPoints.forEach((el) => {
    const sim = new WorldTimeSimulator({ container: el });
    instances.push(sim);
  });

  return () => {
    instances.forEach((inst) => inst.destroy());
  };
}
