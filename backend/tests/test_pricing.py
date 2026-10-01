"""Извлечение цены со страницы: страница товара, коллекция, совпадение по референсу."""

import json

from horologium.pricing.providers import JsonLdProvider


def _page(*products: dict) -> str:
    return "".join(f'<script type="application/ld+json">{json.dumps(p)}</script>' for p in products)


def _product(name: str, price: str, sku: str = "") -> dict:
    return {"@type": "Product", "name": name, "sku": sku, "offers": {"@type": "Offer", "price": price, "priceCurrency": "USD"}}


URL = "https://brand.example/watches"


def test_single_product_page():
    q = JsonLdProvider().parse(_page(_product("Spirit Zulu Time", "3550")), URL)
    assert q and q.amount == 3550 and q.currency == "USD" and q.source == "brand.example"


def test_collection_page_is_ambiguous():
    page = _page({"@type": "ItemList", "itemListElement": [_product("Spirit 40", "2700"), _product("Spirit Zulu Time", "3550")]})
    assert JsonLdProvider().parse(page, URL) is None


def test_collection_page_matches_reference():
    page = _page(_product("Spirit 40", "2700", "L3.810.4.53.6"), _product("Spirit Zulu Time", "3550", "L3.812.4.50.6"))
    q = JsonLdProvider().parse(page, URL, ref="L38124506")
    assert q and q.amount == 3550


def test_no_price():
    assert JsonLdProvider().parse("<html></html>", URL) is None
