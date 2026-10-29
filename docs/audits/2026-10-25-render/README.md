# Проверка подготовки Render

25 октября 2026. Сервис в Render ещё не создан: проверены конфигурация и контейнер, готовые
для запуска владельцем аккаунта через [Deploy to Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2FBlackJoker00753%2FDemo-site%2Ftree%2Ffeat%2Fsubmariner-workshop).
Инструкции: [DEPLOYMENT.md](../../DEPLOYMENT.md).

- `render.yaml` прошёл официальный JSON Schema Render, включая Docker, free-план,
  ветку, регион, проверку здоровья и `autoDeployTrigger: commit`.
- Docker-образ собран и запущен с `PORT=10000`; сервер доступен за пределами контейнера.
- Страница часов, API, sitemap, Three.js и модель GLB отвечают 200. Файл модели 3 314 224 байт,
  SHA-256 совпадает с `model-info.json`.
- Внутренний HTTP-запрос возвращает canonical с внешним HTTPS-адресом из `RENDER_EXTERNAL_URL`.
  Домен `.invalid` в `smoke.json` задан только для этого теста и не является публичным сайтом.
- Chromium на порту контейнера: Submariner и Submariner Date × 1440/390 px, чисто.
- pytest: 42 passed, 1 skipped (прежний необязательный фильм), в том числе при установленном
  адресе окружения Render. Проверены четыре варианта выбора публичного адреса.

Тестовый контейнер использует `HOROLOGIUM_RATES_LIVE=0`, чтобы проверка не зависела от внешнего
сервиса валют. В Blueprint сохраняется обычное поведение приложения. База создаётся из YAML;
секреты, локальные базы и исходники Blender не включаются в Docker-контекст.

Публичный URL и автоматическое обновление можно проверить после создания сервиса в аккаунте Render.
