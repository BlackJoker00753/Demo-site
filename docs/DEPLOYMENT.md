# Публикация на Render

Проект запускается как Docker Web Service. Render собирает образ из GitHub и выдаёт постоянный
HTTPS-адрес. Поднимать Python-сервер на своём компьютере для просмотра сайта не требуется.

Опубликованный сайт: https://horologium-szy5.onrender.com/ .
Мастерская: https://horologium-szy5.onrender.com/watch/rolex-submariner#explode .

## Первый запуск

1. Открыть [Deploy to Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2FBlackJoker00753%2FDemo-site%2Ftree%2Ffeat%2Fsubmariner-workshop).
2. Войти в свой Render и подключить GitHub, предоставив доступ к `BlackJoker00753/Demo-site`.
3. Создать сервис из Blueprint. В `render.yaml` уже заданы Docker, бесплатный план, регион Frankfurt,
   проверка `/api/v1/stats` и обновление после коммита в `feat/submariner-workshop`.
4. После успешного запуска открыть адрес, который покажет Render. Мастерская находится по пути
   `/watch/rolex-submariner#explode`.

Выбрана ветка с текущей мастерской. После слияния PR в `main` следует поменять `branch` в
`render.yaml` на `main` и синхронизировать Blueprint, чтобы Render следил за основной веткой.

Настоящий публичный адрес назначает Render. Приложение автоматически берёт `RENDER_EXTERNAL_URL`
для canonical, Open Graph и sitemap. Для своего домена можно задать `HOROLOGIUM_SITE_URL`;
эта переменная имеет приоритет. Ключи API для самого сайта не нужны.

Бесплатный сервис может засыпать после простоя: первое открытие потребует холодного запуска.
SQLite собирается из YAML внутри образа. Локальная база, кеши и исходники Blender не отправляются
в Docker-контекст. Для постоянной истории обновления цен потребуется отдельное постоянное хранилище;
основной каталог воспроизводится из GitHub.

## Ожидание первого открытия

В аудите 28.10.2026 первые запросы HTML и sitemap заняли 33,6–34,6 с, повторные HTML
0,2–0,9 с. Это полное время HTTP-ответа через сеть, не LCP и не скорость 3D.
В Blueprint выбран `plan: free`: Render может останавливать бесплатный Web Service после
простоя. Код сайта не может запретить остановку, заданную тарифом хостинга.

Проверка после естественного простоя:

```sh
uv run python scripts/check_public_startup.py
```

Сопоставить время первого запроса с событием запуска сервиса в Render → Events/Logs.
Если оно совпадает, для постоянной готовности владелец открывает нужный Web Service →
Settings → Instance Type, проверяет текущую цену и выбирает постоянно работающий экземпляр.
После выбора синхронизировать `plan` в `render.yaml` с выбранным тарифом (например, `starter`),
чтобы Blueprint отражал реальную конфигурацию. Не менять только YAML без проверки биллинга.
После запуска повторить замер сразу и после простоя. Бесплатный план в репозитории пока сохранён;
платный сервис в этой работе не оформляется. Проверка health `/api/v1/stats` уже задана.

## Проверка контейнера

```sh
docker build -t horologium .
docker run --rm -p 8765:10000 -e PORT=10000 horologium
```

Открыть `http://127.0.0.1:8765/watch/rolex-submariner#explode`. Это ссылка на тот компьютер,
где выполнен `docker run`. Адрес `127.0.0.1` внутри облачной рабочей среды относится к облачной
машине и не открывает сервер на личном ноутбуке.

Контейнер слушает `0.0.0.0`, порт берётся из `PORT`. README включён в сборку пакета, а editable-установка
сохраняет ожидаемые пути `/app/backend`, `/app/content` и `/app/frontend`. В образ входят только
файлы приложения и его зависимости.

При сборке за корпоративным HTTPS-прокси можно передать объединённый набор доверенных CA как
BuildKit secret `proxy_ca`. Он используется только установщиком зависимостей, без включения в образ.
На Render этот необязательный secret не требуется.

```sh
docker build --secret id=proxy_ca,src=/path/to/combined-ca-bundle.pem -t horologium .
```

Документация Render: [Blueprint](https://render.com/docs/blueprint-spec),
[Deploy button](https://render.com/docs/deploy-to-render), [Web Services](https://render.com/docs/web-services).
