// Авторы и лицензии всех фотографий на сайте (требование CC BY и CC BY-SA).

import { api } from "../core/api.js";
import { html } from "../core/dom.js";
import { photoImg, revealPhotos } from "../ui/photo.js";

export default {
  layer: "page",

  data: () => api.credits(),

  meta: () => ({ title: "Авторы фотографий | Horologium", crumbs: [{ label: "Глобус", href: "/" }, { label: "Авторы фотографий" }] }),

  render(list) {
    return html`<section class="credits container">
      <header class="credits__head">
        <p class="label" data-reveal>Фотографии</p>
        <h1 class="display display--l" data-reveal>Авторы снимков</h1>
        <p class="lead" data-reveal>Все фотографии часов в атласе настоящие. Это официальные студийные снимки с сайтов и
          из пресс-материалов брендов, а также снимки владельцев, музеев и аукционов под свободными лицензиями
          (CC0, CC BY, CC BY-SA) с Wikimedia Commons и Flickr. Ниже автор и лицензия каждого снимка.</p>
        <p class="muted" data-reveal>Изображения деталей в режиме «До детали» не фотографии: их создал ИИ (Gemini) по официальным
          фото модели, и на странице каждой такой модели это подписано.</p>
      </header>
      <ul class="credits__grid" role="list">
        ${list.map((c, i) => html`<li class="credit-item" data-reveal style="--i:${i % 6}">
          <a class="credit-item__img" href="${c.href ?? c.photo.source_url}" ${c.href ? "" : html`target="_blank" rel="noopener" data-external`}>
            ${photoImg(c.photo, { sizes: "120px", alt: c.subject })}
          </a>
          <div class="credit-item__text">
            <b>${c.subject}</b>
            ${c.photo.caption ? html`<span>${c.photo.caption}</span>` : ""}
            <span>${c.photo.source_url ? html`<a href="${c.photo.source_url}" target="_blank" rel="noopener" data-external>${c.photo.author}</a>` : c.photo.author},
              ${c.photo.license_url ? html`<a href="${c.photo.license_url}" target="_blank" rel="noopener" data-external>${c.photo.license}</a>` : c.photo.license}</span>
          </div>
        </li>`)}
      </ul>
    </section>`;
  },

  mount(root) {
    revealPhotos(root);
  },
};
