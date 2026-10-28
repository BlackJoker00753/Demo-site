// Applied before styles load so a saved preference never flashes the other theme.
(() => {
  const key = "horologium-theme";
  const valid = value => value === "light" || value === "dark";
  const root = document.documentElement;
  const apply = theme => {
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#07080a" : "#f5f6f7");
    document.querySelectorAll("[data-theme-toggle]").forEach(button => {
      const label = theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему";
      button.setAttribute("aria-label", label);
      button.setAttribute("title", label);
      button.setAttribute("aria-pressed", String(theme === "dark"));
    });
  };
  let saved;
  try { saved = localStorage.getItem(key); } catch { /* Private storage may be unavailable. */ }
  apply(valid(saved) ? saved : "light");
  document.addEventListener("DOMContentLoaded", () => apply(root.dataset.theme), { once: true });
  document.addEventListener("click", event => {
    if (!event.target.closest("[data-theme-toggle]")) return;
    const theme = root.dataset.theme === "dark" ? "light" : "dark";
    apply(theme);
    try { localStorage.setItem(key, theme); } catch { /* The choice still works for this visit. */ }
  });
  window.addEventListener("storage", event => {
    if (event.key === key || event.key === null) apply(valid(event.newValue) ? event.newValue : "light");
  });
})();
