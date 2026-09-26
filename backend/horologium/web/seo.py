"""Серверная часть SEO: мета-теги, превью ссылок, структурированные данные, sitemap.

Фронтенд одностраничный, поэтому для поисковиков и мессенджеров сервер сам подставляет в
``index.html`` заголовок, описание, canonical, Open Graph, JSON-LD (Product, BreadcrumbList)
и короткий текст страницы в ``<noscript>`` со ссылками дальше по сайту.
"""

from __future__ import annotations

import html
import json
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from ..config import settings
from ..services import catalog

SITE = settings.site_name
OG_DEFAULT = "/assets/brand/og.jpg"

# Страницы без индексации: служебные или разные у каждого посетителя.
NOINDEX = {"/lab", "/compare"}

STATIC = {
    "/": (f"{SITE}: {settings.site_tagline}",
          "Интерактивный атлас часов: страны, мануфактуры, модели, механизмы и цены. Разберите часы до последнего винта."),
    "/watches": (f"Каталог часов: все модели | {SITE}",
                 "Каталог культовых моделей часов мира с фильтрами по странам, брендам, механизмам, усложнениям и ценам."),
    "/compare": (f"Сравнение моделей часов | {SITE}",
                 "Сравните характеристики, калибры, размеры и цены выбранных часов."),
    "/glossary": (f"Усложнения часов: от даты до минутного репетира | {SITE}",
                  "Все функции часов по возрастанию сложности: как устроены, кто придумал и в каких моделях встречаются."),
    "/credits": (f"Авторы фотографий | {SITE}", "Авторы и лицензии всех фотографий атласа."),
    "/lab": (f"3D-лаборатория | {SITE}", "Служебная страница проверки 3D-моделей."),
}


@dataclass
class Page:
    title: str
    description: str
    image: str = OG_DEFAULT
    kind: str = "website"
    status: int = 200
    noindex: bool = False
    crumbs: list[tuple[str, str]] = field(default_factory=list)  # (название, путь)
    jsonld: list[dict] = field(default_factory=list)
    body: list[str] = field(default_factory=list)  # готовый HTML для <noscript>


def _photo_url(photo) -> str | None:
    return f"/assets/photos/{photo.file}-1600.jpg" if photo else None


def _links(title: str, items: list[tuple[str, str]]) -> str:
    li = "".join(f'<li><a href="{html.escape(h)}">{html.escape(t)}</a></li>' for t, h in items)
    return f"<h2>{html.escape(title)}</h2><ul>{li}</ul>"


def page_for(path: str, s: Session) -> Page:
    """Мета-данные страницы по адресу. Неизвестный адрес: 404 и noindex."""
    path = path.split("?")[0].rstrip("/") or "/"
    if path in STATIC:
        title, desc = STATIC[path]
        p = Page(title, desc, noindex=path in NOINDEX)
        if path == "/":
            p.jsonld.append({
                "@context": "https://schema.org", "@type": "WebSite", "name": SITE,
                "alternateName": settings.site_tagline, "inLanguage": "ru",
            })
            p.body.append(_links("Страны", [(c.name, f"/country/{c.slug}") for c in catalog.list_countries(s)]))
            p.body.append(_links("Разделы", [("Каталог часов", "/watches"), ("Усложнения", "/glossary"), ("Авторы фотографий", "/credits")]))
        elif path == "/watches":
            p.body.append(_links("Модели", [(f"{w.brand_name} {w.name}", f"/watch/{w.slug}") for w in catalog.list_watches(s, sort="name")]))
        elif path == "/glossary":
            p.body.append(_links("Усложнения", [(c.name, f"/complication/{c.slug}") for c in catalog.list_complications(s)]))
        return p

    parts = [x for x in path.split("/") if x]
    kind, slug = (parts + [""])[:2] if len(parts) == 2 else ("", "")
    home = ("Глобус", "/")

    if kind == "country" and (c := catalog.get_country(s, slug)):
        p = Page(f"{c.name}: часовые бренды | {SITE}", c.tagline, image=f"/assets/countries/{c.slug}.jpg",
                 crumbs=[home, (c.name, path)])
        p.body += [f"<p>{html.escape(x)}</p>" for x in c.intro[:2]]
        p.body.append(_links("Бренды", [(b.name, f"/brand/{b.slug}") for b in c.brands]))
        return p

    if kind == "brand" and (b := catalog.get_brand(s, slug)):
        p = Page(f"{b.name}: модели, история и цены | {SITE}", b.tagline, image=_photo_url(b.hero_photo) or OG_DEFAULT,
                 crumbs=[home, (b.country_name, f"/country/{b.country}"), (b.name, path)])
        brand_ld = {"@context": "https://schema.org", "@type": "Brand", "name": b.name, "description": b.tagline}
        if b.website:
            brand_ld["url"] = b.website
        p.jsonld.append(brand_ld)
        p.body += [f"<p>{html.escape(x)}</p>" for x in b.story[:2]]
        p.body.append(_links("Модели", [(w.name, f"/watch/{w.slug}") for w in b.watches]))
        return p

    if kind == "watch" and (w := catalog.get_watch(s, slug)):
        ref = f" ({w.reference})" if w.reference else ""
        photos = [u for u in (_photo_url(ph) for ph in w.photos if not ph.context) if u]
        p = Page(f"{w.brand_name} {w.name}{ref} | {SITE}", w.summary, image=photos[0] if photos else OG_DEFAULT,
                 kind="product",
                 crumbs=[home, (w.country_name, f"/country/{w.country}"), (w.brand_name, f"/brand/{w.brand}"), (w.name, path)])
        product = {
            "@context": "https://schema.org", "@type": "Product",
            "name": f"{w.brand_name} {w.name}", "description": w.summary,
            "brand": {"@type": "Brand", "name": w.brand_name},
            "image": photos or None,
            "sku": w.reference or None, "mpn": w.reference or None,
            "category": "Наручные часы",
        }
        if w.price.kind == "msrp" and w.price.usd:
            product["offers"] = {"@type": "Offer", "price": w.price.usd, "priceCurrency": "USD",
                                 "priceValidUntil": None, "url": path}
            product["offers"] = {k: v for k, v in product["offers"].items() if v is not None}
        p.jsonld.append({k: v for k, v in product.items() if v is not None})
        p.body.append(f"<p>{html.escape(w.summary)}</p>")
        p.body += [f"<p>{html.escape(x)}</p>" for x in w.story[:3]]
        p.body.append(_links("Дальше", [(f"Все модели {w.brand_name}", f"/brand/{w.brand}"),
                                        (f"Калибр {w.movement.caliber}", f"/movement/{w.movement.slug}")]
                             + [(c.name, f"/complication/{c.slug}") for c in w.complications_full]))
        return p

    if kind == "complication" and (found := catalog.get_complication(s, slug)):
        c, watches = found
        p = Page(f"{c.name} ({c.name_en}): как устроено и в каких часах | {SITE}", c.short,
                 image=next((_photo_url(x.photo) for x in watches if x.photo and x.icon), None) or OG_DEFAULT,
                 crumbs=[home, ("Усложнения", "/glossary"), (c.name, path)])
        p.body += [f"<p>{html.escape(c.description)}</p>", f"<p>{html.escape(c.how_it_works)}</p>"]
        if watches:
            p.body.append(_links("Часы с этой функцией", [(f"{x.brand_name} {x.name}", f"/watch/{x.slug}") for x in watches]))
        return p

    if kind == "movement" and (found := catalog.get_movement(s, slug)):
        m, watches = found
        desc = m.description or f"Калибр {m.caliber} ({m.maker}): характеристики и часы, в которых он стоит."
        p = Page(f"Калибр {m.caliber}: характеристики и часы | {SITE}", desc,
                 image=next((_photo_url(x.photo) for x in watches if x.photo), None) or OG_DEFAULT,
                 crumbs=[home, *([(watches[0].brand_name, f"/brand/{watches[0].brand}")] if watches else []), (m.caliber, path)])
        p.body.append(f"<p>{html.escape(desc)}</p>")
        if watches:
            p.body.append(_links("Часы с этим калибром", [(f"{x.brand_name} {x.name}", f"/watch/{x.slug}") for x in watches]))
        return p

    return Page(f"Страница не найдена | {SITE}", "Такой страницы в атласе нет.", status=404, noindex=True)


def _abs(base: str, url: str | None) -> str | None:
    if not url:
        return None
    return url if url.startswith("http") else base + url


def head_tags(page: Page, path: str, base: str) -> str:
    """Теги для <head>: canonical, Open Graph, Twitter, robots, JSON-LD (с абсолютными адресами)."""
    url = base + (path.split("?")[0].rstrip("/") or "/")
    img = _abs(base, page.image)
    tags = [
        f'<link rel="canonical" href="{html.escape(url)}">',
        f'<meta property="og:type" content="{page.kind}">',
        f'<meta property="og:url" content="{html.escape(url)}">',
        f'<meta property="og:site_name" content="{SITE}">',
        '<meta property="og:locale" content="ru_RU">',
        f'<meta property="og:image" content="{html.escape(img)}">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:image" content="{html.escape(img)}">',
    ]
    if page.noindex:
        tags.append('<meta name="robots" content="noindex">')
    clean = path.split("?")[0]
    if clean in ("", "/") or clean.startswith("/country/"):
        # глобус нужен сразу только на главной и странице страны
        tags.append('<link rel="preload" href="/assets/earth/day-2k.jpg" as="image" crossorigin="anonymous">')
    ld = list(page.jsonld)
    if len(page.crumbs) > 1:
        ld.append({
            "@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": i + 1, "name": name, "item": base + href}
                for i, (name, href) in enumerate(page.crumbs)
            ],
        })
    for item in ld:
        item = json.loads(json.dumps(item))
        if item.get("@type") == "Product":
            item["image"] = [_abs(base, u) for u in item.get("image", [])]
            if "offers" in item:
                item["offers"]["url"] = _abs(base, item["offers"]["url"])
        # «</» внутри JSON закрыло бы тег <script>
        text = json.dumps(item, ensure_ascii=False).replace("</", "<\\/")
        tags.append(f'<script type="application/ld+json">{text}</script>')
    return "\n  ".join(tags)


def noscript_body(page: Page) -> str:
    """Текст страницы для тех, кто не выполняет JavaScript (часть ботов, режим чтения)."""
    h1 = html.escape(page.title.split(" | ")[0])
    note = ('<p class="noscript">Глобус, 3D и разборка часов работают на JavaScript и WebGL: включите JavaScript. '
            "Ниже краткая текстовая версия страницы.</p>")
    return f'<div class="ssr-text">{note}<h1>{h1}</h1><p>{html.escape(page.description)}</p>{"".join(page.body)}</div>'


def sitemap(s: Session, base: str) -> str:
    """Все индексируемые страницы атласа."""
    stats = catalog.site_stats(s)
    lastmod = stats.built_at[:10] if stats.built_at else None
    urls = ["/", "/watches", "/glossary", "/credits"]
    urls += [f"/country/{c.slug}" for c in catalog.list_countries(s)]
    urls += [f"/brand/{b.slug}" for b in catalog.list_brands(s)]
    watches = catalog.list_watches(s, sort="name")
    urls += [f"/watch/{w.slug}" for w in watches]
    urls += [f"/complication/{c.slug}" for c in catalog.list_complications(s)]
    urls += [f"/movement/{m}" for m in catalog.movement_slugs(s)]
    lm = f"<lastmod>{lastmod}</lastmod>" if lastmod else ""
    body = "".join(f"<url><loc>{html.escape(base + u)}</loc>{lm}</url>" for u in urls)
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{body}</urlset>\n'


def robots(base: str) -> str:
    return (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /api/\n"
        "Disallow: /lab\n"
        "Disallow: /compare\n"
        f"Sitemap: {base}/sitemap.xml\n"
    )
