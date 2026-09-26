// Всплывающие уведомления (тосты) для интерфейса Horologium.

let toastEl = null;
let toastTimer = null;

/**
 * Показывает компактное всплывающее уведомление в нижнем правом углу.
 * @param {string} message - Текст уведомления
 * @param {object} options - Опции { icon, duration }
 */
export function toast(message, { icon = "ph-check", duration = 3000 } = {}) {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.className = "toast-msg";
    toastEl.setAttribute("role", "status");
    toastEl.setAttribute("aria-live", "polite");
    document.body.appendChild(toastEl);
  }

  toastEl.innerHTML = `<i class="ph-light ${icon}" aria-hidden="true"></i><span>${message}</span>`;
  toastEl.classList.add("is-visible");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    if (toastEl) {
      toastEl.classList.remove("is-visible");
    }
  }, duration);
}
