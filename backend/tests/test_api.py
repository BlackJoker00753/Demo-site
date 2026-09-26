from horologium.services.catalog import price_stats


def test_price_stats():
    s = price_stats([100, 300, 200])
    assert (s.count, s.avg, s.median, s.min, s.max) == (3, 200, 200, 100, 300)
    assert price_stats([]).avg is None


def test_countries(client):
    data = client.get("/api/v1/countries").json()
    slugs = {c["slug"] for c in data}
    assert "switzerland" in slugs
    for c in data:
        assert len(c["iso_a3"]) == 3


def test_country_detail_lists_brands_with_price_ranges(client):
    c = client.get("/api/v1/countries/switzerland").json()
    assert c["brands"]
    for b in c["brands"]:
        p = b["prices"]
        assert p["min"] <= p["avg"] <= p["max"]
        assert p["count"] == b["watch_count"]


def test_brand_detail_facets_are_consistent(client):
    b = client.get("/api/v1/brands/rolex").json()
    assert b["facets"][0]["key"] == "all"
    assert b["facets"][0]["count"] == len(b["watches"])


def test_watch_detail(client):
    w = client.get("/api/v1/watches/rolex-submariner-date").json()
    assert w["movement"]["in_house"] is True
    assert w["price"]["usd"] > 0
    assert w["history"] and w["price_history"]
    assert all(s["slug"] != w["slug"] for s in w["siblings"])


def test_watch_filters(client):
    all_ = client.get("/api/v1/watches", params={"brand": "rolex"}).json()
    chrono = client.get("/api/v1/watches", params={"brand": "rolex", "complication": "chronograph"}).json()
    assert 0 < len(chrono) < len(all_)
    asc = client.get("/api/v1/watches", params={"sort": "price_asc"}).json()
    prices = [w["price"]["usd"] for w in asc]
    assert prices == sorted(prices)
    assert all("material" in w and "water_resistance_m" in w and "diameter_mm" in w for w in all_)


def test_search_transliterates_cyrillic(client):
    hits = client.get("/api/v1/search", params={"q": "ролекс сабмаринер"}).json()
    assert hits and hits[0]["kind"] == "watch" and "Submariner" in hits[0]["title"]


def test_404s(client):
    assert client.get("/api/v1/watches/does-not-exist").status_code == 404
    assert client.get("/definitely/not/a/page").status_code == 404


def test_spa_shell_has_server_side_meta(client):
    html = client.get("/watch/rolex-submariner-date").text
    assert "<title>Rolex Submariner Date" in html
    assert "<!--SSR" not in html


def test_spa_routes_and_manifest(client):
    res_watches = client.get("/watches")
    assert res_watches.status_code == 200
    assert "Каталог часов" in res_watches.text

    res_compare = client.get("/compare")
    assert res_compare.status_code == 200
    assert "Сравнение моделей" in res_compare.text

    res_manifest = client.get("/manifest.webmanifest")
    assert res_manifest.status_code == 200
    assert "Horologium" in res_manifest.text



def test_search_finds_calibers(client):
    hits = client.get("/api/v1/search", params={"q": "3235"}).json()
    assert hits[0]["kind"] == "movement" and hits[0]["url"] == "/movement/rolex-3235"
    assert any(h["kind"] == "movement" for h in client.get("/api/v1/search", params={"q": "El Primero"}).json())


def test_security_headers_and_server_mask(client):
    res = client.get("/api/v1/countries")
    assert res.headers["x-frame-options"] == "SAMEORIGIN"
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert "geolocation=()" in res.headers["permissions-policy"]
    assert res.headers["server"] == "Horologium"

    html_res = client.get("/watches")
    assert "default-src 'self'" in html_res.headers.get("content-security-policy", "")

