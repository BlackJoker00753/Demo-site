// Модуль управления сравнением моделей (localStorage, до 4 моделей).

const STORAGE_KEY = "horologium_compare";
const listeners = new Set();

export function getComparedSlugs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

export function hasCompare(slug) {
  return getComparedSlugs().includes(slug);
}

export function toggleCompare(slug) {
  const list = getComparedSlugs();
  const idx = list.indexOf(slug);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    if (list.length >= 4) list.shift(); // максимум 4 модели
    list.push(slug);
  }
  saveCompare(list);
  return list.includes(slug);
}

export function clearCompare() {
  saveCompare([]);
}

function saveCompare(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (_) {}
  for (const fn of listeners) {
    try { fn(list); } catch (_) {}
  }
  window.dispatchEvent(new CustomEvent("comparechange", { detail: list }));
}

export function onCompareChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
