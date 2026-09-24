// Клиент API с кешем в памяти и дедупликацией параллельных запросов.

const cache = new Map();

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function get(path) {
  if (cache.has(path)) return cache.get(path);
  const promise = fetch(`/api/v1${path}`, { headers: { Accept: "application/json" } }).then(async (r) => {
    if (!r.ok) {
      cache.delete(path);
      throw new ApiError(r.status, r.status === 404 ? "Не найдено" : `Ошибка сервера (${r.status})`);
    }
    return r.json();
  }, (err) => {
    cache.delete(path);
    throw new ApiError(0, "Нет соединения с сервером");
  });
  cache.set(path, promise);
  return promise;
}

/** Тихая предзагрузка (например, при наведении на ссылку). */
export function prefetch(path) {
  get(path).catch(() => {});
}

export const api = {
  stats: () => get("/stats"),
  countries: () => get("/countries"),
  country: (slug) => get(`/countries/${slug}`),
  brand: (slug) => get(`/brands/${slug}`),
  watch: (slug) => get(`/watches/${slug}`),
  complications: () => get("/complications"),
  complication: (slug) => get(`/complications/${slug}`),
  movement: (slug) => get(`/movements/${slug}`),
  search: (q) => get(`/search?q=${encodeURIComponent(q)}`),
};

const json = new Map();
export function asset(url) {
  if (!json.has(url)) json.set(url, fetch(url).then((r) => r.json()));
  return json.get(url);
}
