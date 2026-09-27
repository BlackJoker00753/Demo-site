// Финансово-аналитическое ядро расчета остаточной стоимости, ликвидности и совокупной стоимости владения (TCO)
// Модель основана на фактических данных вторичного часового рынка (Chrono24, WatchCharts, аукционные дома)

export const BRAND_RETENTION_PROFILES = {
  "fp-journe": {
    name: "F.P. Journe",
    tier: "blue-chip",
    tierName: "Инвестиционный / Blue-Chip",
    baseRetention5y: 1.55, // 155%
    rangeLabel: "140% - 170%+",
    appreciationRate: 0.04, // 4% прироста в год после 5 лет
    badgeColor: "emerald",
    summary: "Ограниченный мануфактурный выпуск (~900 экземпляров в год), механизмы из цельного розового золота 18K и ажиотажный спрос на мировых аукционах.",
  },
  "patek-philippe": {
    name: "Patek Philippe",
    tier: "blue-chip",
    tierName: "Инвестиционный / Blue-Chip",
    baseRetention5y: 1.15, // 115%
    rangeLabel: "100% - 130%",
    appreciationRate: 0.025,
    badgeColor: "emerald",
    summary: "Золотой стандарт часового инвестирования. Стальные спортивные модели Nautilus и Aquanaut удерживают премию к заводскому ритейлу.",
  },
  "audemars-piguet": {
    name: "Audemars Piguet",
    tier: "blue-chip",
    tierName: "Инвестиционный / Blue-Chip",
    baseRetention5y: 1.10, // 110%
    rangeLabel: "95% - 125%",
    appreciationRate: 0.02,
    badgeColor: "emerald",
    summary: "Культовая геометрия Royal Oak формирует высокий вторичный спрос при жестких листах ожидания в официальных бутиках.",
  },
  "rolex": {
    name: "Rolex",
    tier: "blue-chip",
    tierName: "Инвестиционный / Blue-Chip",
    baseRetention5y: 1.12, // 112%
    rangeLabel: "98% - 128%",
    appreciationRate: 0.02,
    badgeColor: "emerald",
    summary: "Абсолютный мировой лидер по ликвидности и мгновенной конвертируемости. Профессиональные серии Submariner, GMT-Master II и Daytona торгуются выше MSRP.",
  },
  "vacheron-constantin": {
    name: "Vacheron Constantin",
    tier: "high-luxury",
    tierName: "Премиальная ликвидность",
    baseRetention5y: 0.88,
    rangeLabel: "80% - 95%",
    appreciationRate: 0.015,
    badgeColor: "gold",
    summary: "Старейшая мануфактура «Святой троицы». Коллекция Overseas приближается к 100% удержания, классические костюмники стабильны на 80-85%.",
  },
  "a-lange-soehne": {
    name: "A. Lange & Söhne",
    tier: "high-luxury",
    tierName: "Премиальная ликвидность",
    baseRetention5y: 0.88,
    rangeLabel: "82% - 95%",
    appreciationRate: 0.015,
    badgeColor: "gold",
    summary: "Саксонское мануфактурное совершенство. Спортивная модель Odysseus торгуется с премией, линейки Lange 1 и Datograph демонстрируют высокую стойкость цены.",
  },
  "cartier": {
    name: "Cartier",
    tier: "strong-luxury",
    tierName: "Высокая ликвидность",
    baseRetention5y: 0.80,
    rangeLabel: "75% - 85%",
    appreciationRate: 0.01,
    badgeColor: "gold",
    summary: "Иконы часового дизайна Tank и Santos десятилетиями сохраняют стабильный спрос и продаются в течение нескольких дней.",
  },
  "omega": {
    name: "Omega",
    tier: "strong-luxury",
    tierName: "Высокая ликвидность",
    baseRetention5y: 0.78,
    rangeLabel: "72% - 85%",
    appreciationRate: 0.01,
    badgeColor: "gold",
    summary: "Легендарные хронографы Speedmaster Professional Moonwatch и дайверы Seamaster 300M обладают постоянным спросом и высокой оборачиваемостью.",
  },
  "tudor": {
    name: "Tudor",
    tier: "strong-luxury",
    tierName: "Высокая ликвидность",
    baseRetention5y: 0.76,
    rangeLabel: "70% - 82%",
    appreciationRate: 0.008,
    badgeColor: "gold",
    summary: "Мануфактурные калибры Kenissi, качество сборки группы Rolex и популярность дайверов Black Bay гарантируют удержание 70-82% цены.",
  },
  "konstantin-chaykin": {
    name: "Konstantin Chaykin",
    tier: "collector-indie",
    tierName: "Коллекционный независимый",
    baseRetention5y: 0.90,
    rangeLabel: "85% - 110%",
    appreciationRate: 0.015,
    badgeColor: "gold",
    summary: "Серия Ристмонов (Joker, Minions) имеет международный культовый статус и часто продается на аукционах с существенной премией.",
  },
  "h-moser-cie": {
    name: "H. Moser & Cie.",
    tier: "collector-indie",
    tierName: "Коллекционный независимый",
    baseRetention5y: 0.82,
    rangeLabel: "75% - 90%",
    appreciationRate: 0.012,
    badgeColor: "gold",
    summary: "Коллекция Streamliner и минималистичные циферблаты Fumée сделали марку желанной у искушенных ценителей независимой механики.",
  },
  "jaeger-lecoultre": {
    name: "Jaeger-LeCoultre",
    tier: "mainstream-luxury",
    tierName: "Умеренная ликвидность",
    baseRetention5y: 0.70,
    rangeLabel: "65% - 75%",
    appreciationRate: 0.005,
    badgeColor: "blue",
    summary: "Мануфактура великих механизмов. Культовый поворотный корпус Reverso и линейка Master Control удерживают около 65-75%.",
  },
  "grand-seiko": {
    name: "Grand Seiko",
    tier: "mainstream-luxury",
    tierName: "Умеренная ликвидность",
    baseRetention5y: 0.70,
    rangeLabel: "65% - 75%",
    appreciationRate: 0.005,
    badgeColor: "blue",
    summary: "Зеркальная полировка Zaratsu, фактурные циферблаты и гибридная точность Spring Drive высоко ценятся энтузиастами.",
  },
  "zenith": {
    name: "Zenith",
    tier: "mainstream-luxury",
    tierName: "Умеренная ликвидность",
    baseRetention5y: 0.66,
    rangeLabel: "60% - 72%",
    appreciationRate: 0.005,
    badgeColor: "blue",
    summary: "Высокочастотные хронографы Chronomaster El Primero с точностью 1/10 секунды удерживают интерес на вторичном рынке.",
  },
  "iwc": {
    name: "IWC Schaffhausen",
    tier: "mainstream-luxury",
    tierName: "Умеренная ликвидность",
    baseRetention5y: 0.65,
    rangeLabel: "55% - 70%",
    appreciationRate: 0.005,
    badgeColor: "blue",
    summary: "Линейки Portugieser, Pilot's Watch и Ingenieur теряют 30-40% при выходе из бутика, после чего цена стабилизируется.",
  },
  "breitling": {
    name: "Breitling",
    tier: "mainstream-luxury",
    tierName: "Умеренная ликвидность",
    baseRetention5y: 0.62,
    rangeLabel: "55% - 68%",
    appreciationRate: 0.005,
    badgeColor: "blue",
    summary: "Авиационные хронографы Navitimer и Chronomat находят стабильный круг покупателей с вторичным дисконтом порядка 35-45%.",
  },
  "panerai": {
    name: "Panerai",
    tier: "mainstream-luxury",
    tierName: "Умеренная ликвидность",
    baseRetention5y: 0.62,
    rangeLabel: "55% - 68%",
    appreciationRate: 0.005,
    badgeColor: "blue",
    summary: "Исторические дайверские корпуса Luminor с защитной скобой и подушкообразные Radiomir удерживают 55-68% первоначального ритейла.",
  },
  "blancpain": {
    name: "Blancpain",
    tier: "mainstream-luxury",
    tierName: "Умеренная ликвидность",
    baseRetention5y: 0.65,
    rangeLabel: "60% - 72%",
    appreciationRate: 0.005,
    badgeColor: "blue",
    summary: "Родоначальник современных дайверов Fifty Fathoms держит цену существенно лучше классических костюмников Villeret.",
  },
  "chopard": {
    name: "Chopard",
    tier: "mainstream-luxury",
    tierName: "Умеренная ликвидность",
    baseRetention5y: 0.63,
    rangeLabel: "58% - 70%",
    appreciationRate: 0.005,
    badgeColor: "blue",
    summary: "Спортивная модель Alpine Eagle из сплава Lucent Steel удерживает позиции значительно прочнее ювелирных серий.",
  },
  "girard-perregaux": {
    name: "Girard-Perregaux",
    tier: "mainstream-luxury",
    tierName: "Умеренная ликвидность",
    baseRetention5y: 0.62,
    rangeLabel: "56% - 70%",
    appreciationRate: 0.005,
    badgeColor: "blue",
    summary: "Спортивная икона Laureato с восьмигранным безелем держит около 65-72%, остальные сложные модели теряют больше.",
  },
  "sinn": {
    name: "Sinn Spezialuhren",
    tier: "tool-cult",
    tierName: "Инструментальный культ",
    baseRetention5y: 0.72,
    rangeLabel: "68% - 78%",
    appreciationRate: 0.005,
    badgeColor: "gold",
    summary: "Немецкие инструментальные часы с закалкой стали Tegiment и капсулами осушения Ar демонстрируют образцовую стойкость цены в среднем сегменте.",
  },
  "tag-heuer": {
    name: "TAG Heuer",
    tier: "accessible-luxury",
    tierName: "Доступная роскошь",
    baseRetention5y: 0.58,
    rangeLabel: "50% - 65%",
    appreciationRate: 0.002,
    badgeColor: "slate",
    summary: "Автогоночные иконы Monaco и Carrera сохраняют узнаваемость, средний вторичный дисконт составляет 40-50%.",
  },
  "hublot": {
    name: "Hublot",
    tier: "accessible-luxury",
    tierName: "Доступная роскошь",
    baseRetention5y: 0.55,
    rangeLabel: "48% - 62%",
    appreciationRate: 0.002,
    badgeColor: "slate",
    summary: "Высокая заводская цена серий Big Bang и Classic Fusion приводит к заметной коррекции на вторичном рынке (около 45-50%).",
  },
  "longines": {
    name: "Longines",
    tier: "accessible-luxury",
    tierName: "Доступная роскошь",
    baseRetention5y: 0.56,
    rangeLabel: "50% - 62%",
    appreciationRate: 0.002,
    badgeColor: "slate",
    summary: "Массовый тираж и широкая дилерская сеть дают стабильное удержание 50-62% (коллекции Spirit и Master Collection).",
  },
  "nomos": {
    name: "NOMOS Glashütte",
    tier: "accessible-luxury",
    tierName: "Доступная роскошь",
    baseRetention5y: 0.60,
    rangeLabel: "55% - 65%",
    appreciationRate: 0.002,
    badgeColor: "slate",
    summary: "Лаконичный саксонский дизайн Баухаус и собственные мануфактурные калибры Glashütte обеспечивают удержание 55-65%.",
  },
  "oris": {
    name: "Oris",
    tier: "accessible-luxury",
    tierName: "Доступная роскошь",
    baseRetention5y: 0.55,
    rangeLabel: "50% - 60%",
    appreciationRate: 0.002,
    badgeColor: "slate",
    summary: "Независимая швейцарская марка. Дайверские Aquis и винтажные Divers Sixty-Five стабильны на уровне 50-60%.",
  },
  "seiko": {
    name: "Seiko",
    tier: "mass-market",
    tierName: "Массовый сегмент",
    baseRetention5y: 0.55,
    rangeLabel: "48% - 62%",
    appreciationRate: 0.001,
    badgeColor: "slate",
    summary: "Линейки Presage и Prospex сохраняют около 50-60%, лимитированные японские выпуски могут дорожать со временем.",
  },
  "tissot": {
    name: "Tissot",
    tier: "mass-market",
    tierName: "Массовый сегмент",
    baseRetention5y: 0.50,
    rangeLabel: "45% - 58%",
    appreciationRate: 0.001,
    badgeColor: "slate",
    summary: "Бестселлер PRX с интегрированным браслетом удерживает до 60%, классические костюмные серии теряют около половины ритейла.",
  },
  "casio": {
    name: "Casio",
    tier: "mass-market",
    tierName: "Массовый сегмент",
    baseRetention5y: 0.55,
    rangeLabel: "50% - 60%",
    appreciationRate: 0.001,
    badgeColor: "slate",
    summary: "Металлические серии G-Shock и культовые восьмигранники CasiOak 2100 сохраняют хорошую вторичную ликвидность.",
  },
  "default": {
    name: "Другие мировые бренды",
    tier: "general",
    tierName: "Стандартный часовой рынок",
    baseRetention5y: 0.58,
    rangeLabel: "50% - 65%",
    appreciationRate: 0.002,
    badgeColor: "slate",
    summary: "Базовый ориентир удержания рыночной стоимости для качественных механических и кварцевых часов.",
  },
};

export const SERVICE_COMPLICATION_TIERS = {
  base: {
    id: "base",
    name: "Базовый (Time Only / Дата)",
    description: "Трехстрелочник, индикация даты, дня недели или малая секунда",
    baseCostUsd: 550,
    intervalYears: 5,
    note: "Полный репассаж: полная разборка, ультразвуковая чистка в ваннах, замена изношенных камней и цапф, смазка 4 типами масел Moebius, замена уплотнителей и тест изохронизма.",
  },
  medium: {
    id: "medium",
    name: "Средняя сложность (Хронограф / GMT / Dual Time)",
    description: "Хронограф с колонным колесом, GMT, запас хода или второй часовой пояс",
    baseCostUsd: 950,
    intervalYears: 5,
    note: "Юстировка кулачкового механизма или колонного колеса хронографа, настройка зацепления минутного счетчика, смазка модуля прыгающей стрелки GMT.",
  },
  high: {
    id: "high",
    name: "Высокая сложность (Вечный / Годовой календарь / Фазы Луны)",
    description: "Вечный календарь, годовой календарь, сплит-секунды, астрономическая фаза Луны",
    baseCostUsd: 1650,
    intervalYears: 5,
    note: "Прецизионная сборка программного 48-месячного кулачка, синхронизация лунного диска с погрешностью 1 день за 122 года и юстировка рычагов прыжка даты.",
  },
  grand: {
    id: "grand",
    name: "Гранд-усложнения (Турбийон / Минутный репетир)",
    description: "Турбийон, минутный репетир, карусель, уравнение времени",
    baseCostUsd: 3200,
    intervalYears: 5,
    note: "Работа сертифицированного мастера высшей категории: балансировка титановой каретки турбийона весом 0.3 грамма, акустическая калибровка гонгов репетира.",
  },
  quartz: {
    id: "quartz",
    name: "Кварцевый / Электронный модуль",
    description: "Кварцевый калибр, солнечная батарея Tough Solar или смарт-модуль",
    baseCostUsd: 120,
    intervalYears: 3,
    note: "Замена батареи из оксида серебра или аккумулятора, проверка сопротивления катушки шагового двигателя, дезинфекция и замена гидроизоляционных колец.",
  },
};

export const CONDITION_MODIFIERS = {
  mint_fullset: {
    id: "mint_fullset",
    name: "Идеальное (Full Set: коробка, оригинальная гарантийная карта, чек)",
    retentionDelta: +0.08,
    badge: "Коллекционный Full Set (+8%)",
  },
  good_fullset: {
    id: "good_fullset",
    name: "Отличное (Full Set: коробка и документы в комплекте)",
    retentionDelta: +0.03,
    badge: "Полный комплект (+3%)",
  },
  watch_only: {
    id: "watch_only",
    name: "Хорошее (Watch Only: только часы без документов и коробки)",
    retentionDelta: -0.15,
    badge: "Без документов (-15%)",
  },
  heavy_wear: {
    id: "heavy_wear",
    name: "Следы активной носки (царапины, забоины, требуют полировки)",
    retentionDelta: -0.22,
    badge: "Следы носки (-22%)",
  },
};

export const WEAR_FREQUENCIES = {
  daily: {
    id: "daily",
    name: "Каждый день (Daily Beater)",
    daysPerYear: 365,
    desc: "Основные повседневные часы на руке 365 дней в году.",
  },
  rotation: {
    id: "rotation",
    name: "Регулярная ротация (2-3 дня в неделю)",
    daysPerYear: 130,
    desc: "Часы делят запястье с другими моделями в личной коллекции.",
  },
  weekend: {
    id: "weekend",
    name: "Выходные и встречи (1 день в неделю)",
    daysPerYear: 52,
    desc: "Костюмный вариант для деловых ужинов и уикендов.",
  },
  occasional: {
    id: "occasional",
    name: "Особые поводы / Сейф (1 раз в месяц)",
    daysPerYear: 12,
    desc: "Коллекционный раритет или инвестиционный экземпляр.",
  },
};

/**
 * Автоматическое определение уровня усложнений для расчета стоимости ТО
 */
export function detectServiceTier(complications = [], movementType = "automatic") {
  if (movementType === "quartz" || movementType === "smart") {
    return "quartz";
  }

  const slugs = (complications || []).map((c) => (typeof c === "string" ? c : c.slug || ""));

  if (slugs.some((s) => ["tourbillon", "minute-repeater", "equation-of-time"].includes(s))) {
    return "grand";
  }
  if (slugs.some((s) => ["perpetual-calendar", "annual-calendar", "split-seconds", "moonphase"].includes(s))) {
    return "high";
  }
  if (slugs.some((s) => ["chronograph", "gmt", "worldtime", "flyback", "power-reserve"].includes(s))) {
    return "medium";
  }

  return "base";
}

/**
 * Получение профиля удержания стоимости для бренда
 */
export function getBrandProfile(brandSlug = "") {
  const slug = (brandSlug || "").toLowerCase().trim();
  return BRAND_RETENTION_PROFILES[slug] || BRAND_RETENTION_PROFILES["default"];
}

/**
 * Расчет коэффициента остаточной стоимости на заданный год владения
 */
export function calculateRetentionRate(brandProfile, year = 5, conditionId = "good_fullset") {
  const cond = CONDITION_MODIFIERS[conditionId] || CONDITION_MODIFIERS["good_fullset"];
  const base5y = brandProfile.baseRetention5y + cond.retentionDelta;

  if (year <= 1) {
    if (base5y >= 1.0) {
      // Для брендов инвестиционного класса вторичная цена высока сразу из-за очередей
      return Math.max(0.95, base5y - 0.05);
    }
    // Для массового люкса в 1 год происходит основной спад ритейла
    return Math.max(0.40, base5y * 0.90);
  }

  if (year === 5) {
    return Math.max(0.30, base5y);
  }

  if (year < 5) {
    // Интерполяция между 1 и 5 годами
    const r1 = calculateRetentionRate(brandProfile, 1, conditionId);
    const progress = (year - 1) / 4;
    return r1 + (base5y - r1) * progress;
  }

  // year > 5
  if (base5y >= 1.0) {
    // Растущий инвестиционный актив (Rolex, Patek, Journe)
    const extraYears = year - 5;
    return base5y * Math.pow(1 + brandProfile.appreciationRate, extraYears);
  } else {
    // Стабилизация стоимости и выход на винтажное плато
    const extraYears = year - 5;
    const decay = Math.pow(0.985, extraYears);
    return Math.max(0.35, base5y * decay);
  }
}

/**
 * Полный расчет совокупной стоимости владения (TCO) и стоимости одного дня носки
 */
export function calculateWatchTCO({
  retailPriceUsd,
  brandSlug = "default",
  years = 5,
  serviceTierId = "base",
  conditionId = "good_fullset",
  wearFrequencyId = "daily",
  includeInsurance = false,
  annualInflation = 0.025, // 2.5% годовых
  waterTestCostUsd = 80, // проверка герметичности и замена сальников
}) {
  const price = Math.max(0, Number(retailPriceUsd) || 0);
  const brand = getBrandProfile(brandSlug);
  const tier = SERVICE_COMPLICATION_TIERS[serviceTierId] || SERVICE_COMPLICATION_TIERS.base;
  const wear = WEAR_FREQUENCIES[wearFrequencyId] || WEAR_FREQUENCIES.daily;
  const cond = CONDITION_MODIFIERS[conditionId] || CONDITION_MODIFIERS.good_fullset;

  // 1. Остаточная стоимость часов на вторичном рынке
  const retentionRate = calculateRetentionRate(brand, years, conditionId);
  const residualValueUsd = Math.round(price * retentionRate);
  const netDepreciationUsd = price - residualValueUsd; // если отрицательно: прибыль!

  // 2. Затраты на репассаж механизма
  const numOverhauls = Math.floor(years / tier.intervalYears);
  let totalServiceCostUsd = 0;
  for (let i = 1; i <= numOverhauls; i++) {
    const serviceYear = i * tier.intervalYears;
    const inflationFactor = Math.pow(1 + annualInflation, serviceYear);
    totalServiceCostUsd += tier.baseCostUsd * inflationFactor;
  }
  totalServiceCostUsd = Math.round(totalServiceCostUsd);

  // 3. Затраты на регулярный тест водозащиты (раз в 2 года)
  const numWaterTests = Math.floor(years / 2);
  let totalWaterTestCostUsd = 0;
  for (let i = 1; i <= numWaterTests; i++) {
    const testYear = i * 2;
    const inflationFactor = Math.pow(1 + annualInflation, testYear);
    totalWaterTestCostUsd += waterTestCostUsd * inflationFactor;
  }
  totalWaterTestCostUsd = Math.round(totalWaterTestCostUsd);

  // 4. Специализированное страхование (1.2% в год от среднегодовой оценочной стоимости)
  let totalInsuranceCostUsd = 0;
  if (includeInsurance) {
    for (let y = 1; y <= years; y++) {
      const yearRate = calculateRetentionRate(brand, y, conditionId);
      const estValue = price * yearRate;
      totalInsuranceCostUsd += estValue * 0.012;
    }
    totalInsuranceCostUsd = Math.round(totalInsuranceCostUsd);
  }

  // 5. Суммарные эксплуатационные затраты (Maintenance Total)
  const totalMaintenanceCostUsd = totalServiceCostUsd + totalWaterTestCostUsd + totalInsuranceCostUsd;

  // 6. Чистая совокупная стоимость владения (Net TCO)
  const netTcoUsd = netDepreciationUsd + totalMaintenanceCostUsd;

  // 7. Метрика стоимости одного дня носки на запястье (Cost Per Day)
  const totalDaysWorn = Math.max(1, years * wear.daysPerYear);
  const costPerDayUsd = netTcoUsd / totalDaysWorn;

  // 8. Годовая хроника для визуализации
  const timeline = [1, 3, 5, 10, 15].filter((y) => y <= Math.max(years, 15)).map((y) => {
    const rRate = calculateRetentionRate(brand, y, conditionId);
    const resVal = Math.round(price * rRate);
    const dep = price - resVal;
    const overhaulsCount = Math.floor(y / tier.intervalYears);
    let sCost = 0;
    for (let i = 1; i <= overhaulsCount; i++) {
      sCost += tier.baseCostUsd * Math.pow(1 + annualInflation, i * tier.intervalYears);
    }
    const wCost = Math.floor(y / 2) * waterTestCostUsd;
    const maint = Math.round(sCost + wCost);
    const tco = dep + maint;
    const days = y * wear.daysPerYear;
    return {
      year: y,
      retentionRate: Math.round(rRate * 100),
      residualValueUsd: resVal,
      maintenanceUsd: maint,
      netTcoUsd: tco,
      costPerDayUsd: +(tco / days).toFixed(2),
    };
  });

  return {
    retailPriceUsd: price,
    years,
    brand,
    serviceTier: tier,
    condition: cond,
    wearFrequency: wear,
    retentionRate: Math.round(retentionRate * 100),
    residualValueUsd,
    netDepreciationUsd,
    totalServiceCostUsd,
    totalWaterTestCostUsd,
    totalInsuranceCostUsd,
    totalMaintenanceCostUsd,
    netTcoUsd,
    totalDaysWorn,
    costPerDayUsd: +costPerDayUsd.toFixed(2),
    isNetProfit: netTcoUsd < 0,
    timeline,
  };
}
