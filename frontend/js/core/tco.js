// Учебный расчёт остаточной стоимости и совокупной стоимости владения (TCO)
// Учебные коэффициенты сценария. Датированной рыночной выборки для оценки конкретной модели нет.

export const BRAND_RETENTION_PROFILES = {
  "fp-journe": {
    name: "F.P. Journe",
    tier: "blue-chip",
    baseRetention5y: 1.55, // 155%
    appreciationRate: 0.04, // 4% прироста в год после 5 лет
  },
  "patek-philippe": {
    name: "Patek Philippe",
    tier: "blue-chip",
    baseRetention5y: 1.15, // 115%
    appreciationRate: 0.025,
  },
  "audemars-piguet": {
    name: "Audemars Piguet",
    tier: "blue-chip",
    baseRetention5y: 1.10, // 110%
    appreciationRate: 0.02,
  },
  "rolex": {
    name: "Rolex",
    tier: "blue-chip",
    baseRetention5y: 1.12, // 112%
    appreciationRate: 0.02,
  },
  "vacheron-constantin": {
    name: "Vacheron Constantin",
    tier: "high-luxury",
    baseRetention5y: 0.88,
    appreciationRate: 0.015,
  },
  "a-lange-soehne": {
    name: "A. Lange & Söhne",
    tier: "high-luxury",
    baseRetention5y: 0.88,
    appreciationRate: 0.015,
  },
  "cartier": {
    name: "Cartier",
    tier: "strong-luxury",
    baseRetention5y: 0.80,
    appreciationRate: 0.01,
  },
  "omega": {
    name: "Omega",
    tier: "strong-luxury",
    baseRetention5y: 0.78,
    appreciationRate: 0.01,
  },
  "tudor": {
    name: "Tudor",
    tier: "strong-luxury",
    baseRetention5y: 0.76,
    appreciationRate: 0.008,
  },
  "konstantin-chaykin": {
    name: "Konstantin Chaykin",
    tier: "collector-indie",
    baseRetention5y: 0.90,
    appreciationRate: 0.015,
  },
  "h-moser-cie": {
    name: "H. Moser & Cie.",
    tier: "collector-indie",
    baseRetention5y: 0.82,
    appreciationRate: 0.012,
  },
  "jaeger-lecoultre": {
    name: "Jaeger-LeCoultre",
    tier: "mainstream-luxury",
    baseRetention5y: 0.70,
    appreciationRate: 0.005,
  },
  "grand-seiko": {
    name: "Grand Seiko",
    tier: "mainstream-luxury",
    baseRetention5y: 0.70,
    appreciationRate: 0.005,
  },
  "zenith": {
    name: "Zenith",
    tier: "mainstream-luxury",
    baseRetention5y: 0.66,
    appreciationRate: 0.005,
  },
  "iwc": {
    name: "IWC Schaffhausen",
    tier: "mainstream-luxury",
    baseRetention5y: 0.65,
    appreciationRate: 0.005,
  },
  "breitling": {
    name: "Breitling",
    tier: "mainstream-luxury",
    baseRetention5y: 0.62,
    appreciationRate: 0.005,
  },
  "panerai": {
    name: "Panerai",
    tier: "mainstream-luxury",
    baseRetention5y: 0.62,
    appreciationRate: 0.005,
  },
  "blancpain": {
    name: "Blancpain",
    tier: "mainstream-luxury",
    baseRetention5y: 0.65,
    appreciationRate: 0.005,
  },
  "chopard": {
    name: "Chopard",
    tier: "mainstream-luxury",
    baseRetention5y: 0.63,
    appreciationRate: 0.005,
  },
  "girard-perregaux": {
    name: "Girard-Perregaux",
    tier: "mainstream-luxury",
    baseRetention5y: 0.62,
    appreciationRate: 0.005,
  },
  "sinn": {
    name: "Sinn Spezialuhren",
    tier: "tool-cult",
    baseRetention5y: 0.72,
    appreciationRate: 0.005,
  },
  "tag-heuer": {
    name: "TAG Heuer",
    tier: "accessible-luxury",
    baseRetention5y: 0.58,
    appreciationRate: 0.002,
  },
  "hublot": {
    name: "Hublot",
    tier: "accessible-luxury",
    baseRetention5y: 0.55,
    appreciationRate: 0.002,
  },
  "longines": {
    name: "Longines",
    tier: "accessible-luxury",
    baseRetention5y: 0.56,
    appreciationRate: 0.002,
  },
  "nomos": {
    name: "NOMOS Glashütte",
    tier: "accessible-luxury",
    baseRetention5y: 0.60,
    appreciationRate: 0.002,
  },
  "oris": {
    name: "Oris",
    tier: "accessible-luxury",
    baseRetention5y: 0.55,
    appreciationRate: 0.002,
  },
  "seiko": {
    name: "Seiko",
    tier: "mass-market",
    baseRetention5y: 0.55,
    appreciationRate: 0.001,
  },
  "tissot": {
    name: "Tissot",
    tier: "mass-market",
    baseRetention5y: 0.50,
    appreciationRate: 0.001,
  },
  "casio": {
    name: "Casio",
    tier: "mass-market",
    baseRetention5y: 0.55,
    appreciationRate: 0.001,
  },
  "default": {
    name: "Другие мировые бренды",
    tier: "general",
    baseRetention5y: 0.58,
    appreciationRate: 0.002,
  },
};

export const SERVICE_COMPLICATION_TIERS = {
  base: {
    id: "base",
    name: "Базовый (Time Only / Дата)",
    description: "Трехстрелочник, индикация даты, дня недели или малая секунда",
    baseCostUsd: 550,
    intervalYears: 5,
    note: "Условный класс обслуживания простой механики. Состав работ и цена зависят от конкретных часов и мастерской.",
  },
  medium: {
    id: "medium",
    name: "Средняя сложность (Хронограф / GMT / Dual Time)",
    description: "Хронограф с колонным колесом, GMT, запас хода или второй часовой пояс",
    baseCostUsd: 950,
    intervalYears: 5,
    note: "Условный класс для дополнительных модулей и функций. Реальный регламент нужно уточнять для конкретного калибра.",
  },
  high: {
    id: "high",
    name: "Высокая сложность (Вечный / Годовой календарь / Фазы Луны)",
    description: "Вечный календарь, годовой календарь, сплит-секунды, астрономическая фаза Луны",
    baseCostUsd: 1650,
    intervalYears: 5,
    note: "Условный класс сложных календарей и других механизмов. Стоимость производителя может существенно отличаться.",
  },
  grand: {
    id: "grand",
    name: "Гранд-усложнения (Турбийон / Минутный репетир)",
    description: "Турбийон, минутный репетир, карусель, уравнение времени",
    baseCostUsd: 3200,
    intervalYears: 5,
    note: "Условный класс особо сложных механизмов. Нужна индивидуальная оценка сервиса.",
  },
  quartz: {
    id: "quartz",
    name: "Кварцевый / Электронный модуль",
    description: "Кварцевый калибр, солнечная батарея Tough Solar или смарт-модуль",
    baseCostUsd: 120,
    intervalYears: 3,
    note: "Условный электронный класс. Замена батареи, аккумулятора и ремонт модуля имеют разные регламенты и цены.",
  },
};

export const CONDITION_MODIFIERS = {
  mint_fullset: {
    id: "mint_fullset",
    name: "Идеальное (Full Set: коробка, оригинальная гарантийная карта, чек)",
    retentionDelta: +0.08,
    badge: "Идеальное, полный комплект",
  },
  good_fullset: {
    id: "good_fullset",
    name: "Отличное (Full Set: коробка и документы в комплекте)",
    retentionDelta: +0.03,
    badge: "Отличное, полный комплект",
  },
  watch_only: {
    id: "watch_only",
    name: "Хорошее (Watch Only: только часы без документов и коробки)",
    retentionDelta: -0.15,
    badge: "Без коробки и документов",
  },
  heavy_wear: {
    id: "heavy_wear",
    name: "Следы активной носки (царапины, забоины, требуют полировки)",
    retentionDelta: -0.22,
    badge: "Следы активной носки",
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
  if (["quartz", "smart", "solar", "kinetic"].includes(movementType)) {
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
      // Условная ветвь для профилей с коэффициентом от 100%.
      return Math.max(0.95, base5y - 0.05);
    }
    // Условная ветвь для профилей с коэффициентом ниже 100%.
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
    // Темп изменения из условного профиля.
    const extraYears = year - 5;
    return base5y * Math.pow(1 + brandProfile.appreciationRate, extraYears);
  } else {
    // Условное ежегодное уменьшение с нижней границей.
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

  // One horizon calculation supplies both the summary and every table row.
  // Round each cost category once, then add the displayed amounts.
  const horizon = year => {
    const rate = calculateRetentionRate(brand, year, conditionId);
    const residualValueUsd = Math.round(price * rate);
    const netDepreciationUsd = price - residualValueUsd;
    let service = 0, water = 0, insurance = 0;
    for (let y = 1; y <= year; y++) {
      const inflation = (1 + annualInflation) ** y;
      if (y % tier.intervalYears === 0) service += tier.baseCostUsd * inflation;
      if (y % 2 === 0) water += waterTestCostUsd * inflation;
      if (includeInsurance) insurance += price * calculateRetentionRate(brand, y, conditionId) * 0.012;
    }
    const totalServiceCostUsd = Math.round(service);
    const totalWaterTestCostUsd = Math.round(water);
    const totalInsuranceCostUsd = Math.round(insurance);
    const totalMaintenanceCostUsd = totalServiceCostUsd + totalWaterTestCostUsd + totalInsuranceCostUsd;
    const netTcoUsd = netDepreciationUsd + totalMaintenanceCostUsd;
    const totalDaysWorn = Math.max(1, year * wear.daysPerYear);
    return {
      year, retentionRate: Math.round(rate * 100), residualValueUsd, netDepreciationUsd,
      totalServiceCostUsd, totalWaterTestCostUsd, totalInsuranceCostUsd,
      totalMaintenanceCostUsd, maintenanceUsd: totalMaintenanceCostUsd, netTcoUsd,
      totalDaysWorn, costPerDayUsd: +(netTcoUsd / totalDaysWorn).toFixed(2),
      isNetProfit: netTcoUsd < 0,
    };
  };
  const result = horizon(years);
  const timeline = [...new Set([1, 3, 5, 10, 15, years])].sort((a, b) => a - b).map(horizon);
  return {
    retailPriceUsd: price, years, brand, serviceTier: tier, condition: cond,
    wearFrequency: wear, ...result, timeline,
  };
}

// Canonical catalogue slugs, shared by the page and the regression check.
export const TCO_PRESETS = [
  ["rolex-submariner", "Rolex Submariner"],
  ["omega-speedmaster-moonwatch", "Omega Moonwatch"],
  ["patek-philippe-nautilus-5811", "Patek Nautilus"],
  ["fp-journe-chronometre-souverain", "F.P. Journe"],
  ["cartier-santos", "Cartier Santos"],
  ["tudor-black-bay-58", "Tudor BB58"],
  ["grand-seiko-snowflake", "Grand Seiko"],
  ["audemars-piguet-royal-oak-jumbo", "AP Royal Oak"],
];
