// Форматирование цен, чисел, дат и справочные подписи.

const nf = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" });

export const num = (n) => (n == null ? "" : nf.format(n));
export const usd = (n) => (n == null ? "" : `$${nf.format(n)}`);

/** $1,2 млн / $48 тыс. для компактных подписей. */
export function usdShort(n) {
  if (n == null) return "";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} млн`;
  if (n >= 10_000) return `$${Math.round(n / 1000)} тыс.`;
  return usd(n);
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
