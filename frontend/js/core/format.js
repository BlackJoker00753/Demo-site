// Форматирование цен, чисел, дат и справочные подписи.

const nf = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" });

export const CURRENCIES = {
  USD: { code: "USD", symbol: "$", pos: "before", rate: 1.0, label: "USD ($)" },
  // запасные курсы; при загрузке их заменяют свежие с /api/v1/rates (applyRates)
  EUR: { code: "EUR", symbol: "€", pos: "before", rate: 0.8773, label: "EUR (€)" },
  RUB: { code: "RUB", symbol: "₽", pos: "after", rate: 84.28, label: "RUB (₽)" },
  KZT: { code: "KZT", symbol: "₸", pos: "after", rate: 443.05, label: "KZT (₸)" },
};
/** Дата курсов (ISO) и источник: подпись к пересчитанным ценам. */
export const RATES = { date: "2026-09-26", source: "open.er-api.com" };

/** Свежие курсы с сервера. Если активная валюта не доллар и курс изменился, страница перерисуется. */
export function applyRates(r) {
  if (!r?.rates) return;
  let changed = false;
  for (const [code, cur] of Object.entries(CURRENCIES)) {
    const v = r.rates[code];
    if (v && Math.abs(v - cur.rate) > 1e-6) {
      cur.rate = v;
      if (code === currentCurrency) changed = true;
    }
  }
  RATES.date = r.date ?? RATES.date;
  RATES.source = r.source ?? RATES.source;
  window.dispatchEvent(new CustomEvent("ratesupdate", { detail: RATES }));
  if (changed && currentCurrency !== "USD") window.dispatchEvent(new CustomEvent("currencychange", { detail: CURRENCIES[currentCurrency] }));
}

let currentCurrency = "USD";
try {
  const saved = localStorage.getItem("horologium_currency");
  if (saved && CURRENCIES[saved]) currentCurrency = saved;
} catch (_) {}

const currencyListeners = new Set();

export function getActiveCurrency() {
  return CURRENCIES[currentCurrency];
}

export function setActiveCurrency(code) {
  if (CURRENCIES[code] && currentCurrency !== code) {
    currentCurrency = code;
    try { localStorage.setItem("horologium_currency", code); } catch (_) {}
    for (const fn of currencyListeners) {
      try { fn(CURRENCIES[code]); } catch (_) {}
    }
    window.dispatchEvent(new CustomEvent("currencychange", { detail: CURRENCIES[code] }));
  }
}

export function onCurrencyChange(fn) {
  currencyListeners.add(fn);
  return () => currencyListeners.delete(fn);
}

export const num = (n) => (n == null ? "" : nf.format(n));
/** Сумма в долларах независимо от выбранной валюты (исходная цена). */
export const inUSD = (n) => (n == null ? "" : `$${nf.format(n)}`);

/** Пересчитанная сумма примерная: округляем до 4 значащих цифр (4 452 649 ₸ → 4 453 000 ₸). */
const approx = (v) => {
  if (v < 10000) return Math.round(v);
  const step = 10 ** (Math.floor(Math.log10(v)) - 3);
  return Math.round(v / step) * step;
};
export const usd = (n) => {
  if (n == null) return "";
  const cur = getActiveCurrency();
  const val = cur.code === "USD" ? Math.round(n) : approx(n * cur.rate);
  return cur.pos === "before" ? `${cur.symbol}${nf.format(val)}` : `${nf.format(val)}\u00a0${cur.symbol}`;
};

/** Компактная подпись цены с учетом активной валюты */
export function usdShort(n) {
  if (n == null) return "";
  const cur = getActiveCurrency();
  const val = n * cur.rate;
  if (val >= 1_000_000) {
    const formatted = (val / 1_000_000).toLocaleString("ru-RU", { maximumFractionDigits: 1 });
    return cur.pos === "before" ? `${cur.symbol}${formatted}\u00a0млн` : `${formatted}\u00a0млн\u00a0${cur.symbol}`;
  }
  if (val >= 10_000) {
    const formatted = Math.round(val / 1000);
    return cur.pos === "before" ? `${cur.symbol}${formatted}\u00a0тыс.` : `${formatted}\u00a0тыс.\u00a0${cur.symbol}`;
  }
  return usd(n);
}

/** Короткая сумма для подписей фильтров в активной валюте: «$5 тыс.», «2,2 млн ₸». */
const compact = new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 1 });
export function priceCompact(n) {
  const cur = getActiveCurrency();
  const v = compact.format(n * cur.rate).replace(/\s/g, "\u00a0");
  return cur.pos === "before" ? `${cur.symbol}${v}` : `${v}\u00a0${cur.symbol}`;
}
export const date = (iso) => (iso ? dateFmt.format(new Date(iso)) : "");

export function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
export const models = (n) => `${n} ${plural(n, "модель", "модели", "моделей")}`;
export const brands = (n) => `${n} ${plural(n, "бренд", "бренда", "брендов")}`;
export const hours = (n) => `${num(n)} ${plural(Math.round(n), "час", "часа", "часов")}`;

export const MOVEMENT = {
  automatic: { label: "Автоподзавод", short: "Автомат", icon: "ph-arrows-clockwise" },
  manual: { label: "Ручной завод", short: "Ручной завод", icon: "ph-hand" },
  quartz: { label: "Кварц", short: "Кварц", icon: "ph-battery-medium" },
  solar: { label: "Солнечная энергия", short: "Solar", icon: "ph-sun" },
  kinetic: { label: "Kinetic", short: "Kinetic", icon: "ph-lightning" },
  spring_drive: { label: "Spring Drive", short: "Spring Drive", icon: "ph-wave-sine" },
  smart: { label: "Смарт-часы", short: "Смарт", icon: "ph-cpu" },
};
export const movementLabel = (t) => MOVEMENT[t]?.label ?? t;

/** Сложность усложнения по шкале 1–5 (content/complications.yaml). */
export const DIFFICULTY = ["", "Простое", "Несложное", "Среднее", "Сложное", "Вершина ремесла"];
export const COMP_CATEGORY = {
  time: "Время",
  calendar: "Календарь",
  chronograph: "Хронограф",
  tool: "Инструмент",
  display: "Индикация",
  acoustic: "Звук",
  astronomy: "Астрономия",
  regulation: "Регулировка хода",
};
export const TIER = {
  accessible: "Доступный",
  mid: "Средний",
  premium: "Премиум",
  luxury: "Люкс",
  haute: "Высокое часовое искусство",
};

export const MANUFACTURE = {
  full: "Полная мануфактура",
  partial: "Частично свои механизмы",
  none: "Покупные механизмы",
};

export const PRICE_KIND = {
  msrp: "Официальная розничная цена",
  market: "Рыночная цена",
  estimate: "Оценка",
};

export const vph = (v) => (v ? `${num(v)} пк/ч · ${(v / 7200).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} Гц` : "");
