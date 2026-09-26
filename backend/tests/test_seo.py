"""SEO: коды ответа, canonical, Open Graph, JSON-LD, sitemap и robots."""

import json
import re


def _ld(html: str) -> list[dict]:
    return [json.loads(m) for m in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html)]


def test_unknown_pages_are_real_404(client):
    for path in ("/watch/no-such-watch", "/brand/nope", "/movement/nope", "/about", "/zzz"):
        r = client.get(path)
        assert r.status_code == 404, path
        assert 'name="robots" content="noindex"' in r.text


def test_watch_page_has_product_and_breadcrumbs(client):
    r = client.get("/watch/rolex-submariner")
    assert r.status_code == 200
    assert '<link rel="canonical" href="http://testserver/watch/rolex-submariner">' in r.text
    assert 'property="og:image" content="http://testserver/assets/photos/' in r.text
    kinds = {x["@type"]: x for x in _ld(r.text)}
    assert kinds["Product"]["brand"]["name"] == "Rolex"
    assert kinds["Product"]["offers"]["priceCurrency"] == "USD"
    crumbs = kinds["BreadcrumbList"]["itemListElement"]
    assert [c["name"] for c in crumbs][-2:] == ["Rolex", "Submariner"]
    # текст для тех, кто без JavaScript: заголовок и ссылки дальше
    assert "<noscript>" in r.text and 'href="/brand/rolex"' in r.text


def test_every_section_has_its_own_title(client):
    titles = {p: re.search(r"<title>(.*?)</title>", client.get(p).text).group(1)
              for p in ("/", "/watches", "/glossary", "/complication/chronograph", "/movement/rolex-3235", "/country/switzerland")}
    assert len(set(titles.values())) == len(titles)
    assert "Хронограф" in titles["/complication/chronograph"]
    assert "Rolex 3235" in titles["/movement/rolex-3235"]


def test_private_pages_are_noindex(client):
    assert 'content="noindex"' in client.get("/compare").text
    assert 'content="noindex"' not in client.get("/watches").text


def test_sitemap_and_robots(client):
    sm = client.get("/sitemap.xml")
    assert sm.status_code == 200 and sm.headers["content-type"].startswith("application/xml")
    locs = re.findall(r"<loc>(.*?)</loc>", sm.text)
    assert "http://testserver/watch/rolex-submariner" in locs
    assert any("/movement/" in u for u in locs) and any("/complication/" in u for u in locs)
    assert not any(u.endswith(("/compare", "/lab")) for u in locs)
    for u in locs[:40]:
        assert client.get(u.replace("http://testserver", "")).status_code == 200, u
    robots = client.get("/robots.txt").text
    assert "Sitemap: http://testserver/sitemap.xml" in robots and "Disallow: /api/" in robots


def test_pwa_assets(client):
    import json as _json

    m = _json.loads(client.get("/manifest.webmanifest").text)
    sizes = {i["sizes"] for i in m["icons"]}
    assert {"192x192", "512x512"} <= sizes and any(i.get("purpose") == "maskable" for i in m["icons"])
    for icon in m["icons"]:
        assert client.get(icon["src"]).status_code == 200, icon["src"]
    sw = client.get("/sw.js")
    assert sw.status_code == 200 and "javascript" in sw.headers["content-type"]


def test_rates_endpoint_works_offline(client):
    r = client.get("/api/v1/rates").json()
    assert r["base"] == "USD" and r["rates"]["USD"] == 1
    assert 0.5 < r["rates"]["EUR"] < 1.5 and r["rates"]["KZT"] > 100
