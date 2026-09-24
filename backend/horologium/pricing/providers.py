"""Провайдеры цен.

Каждый провайдер получает URL страницы товара и пытается извлечь цену.
Большинство официальных сайтов брендов публикуют цену в разметке schema.org
(JSON-LD ``Product``/``Offer``) или в мета-тегах ``product:price:amount``;
это стабильнее, чем парсить вёрстку.

Сайты, закрытые антибот-защитой (Cloudflare challenge, 403), провайдер честно
пропускает: цена в каталоге остаётся последней проверенной вручную.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Protocol
from xml.etree import ElementTree

import httpx

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0 Safari/537.36 HorologiumPriceBot/1.0"
)
TIMEOUT = httpx.Timeout(20.0, connect=10.0)


@dataclass(frozen=True)
class PriceQuote:
    amount: float
    currency: str
    source: str
    url: str


class FetchBlocked(RuntimeError):
    """Сайт отдал антибот-заглушку или 4xx."""


class Provider(Protocol):
    name: str

    def quote(self, client: httpx.Client, url: str) -> PriceQuote | None: ...


def fetch_html(client: httpx.Client, url: str) -> str:
    resp = client.get(url, headers={"User-Agent": USER_AGENT, "Accept-Language": "en-US,en;q=0.9"})
    body = resp.text
    if resp.status_code >= 400 or "Just a moment..." in body[:2000] or "captcha" in body[:4000].lower():
        raise FetchBlocked(f"{resp.status_code} {url}")
    return body


def _walk(node):
    if isinstance(node, dict):
        yield node
        for v in node.values():
            yield from _walk(v)
    elif isinstance(node, list):
        for v in node:
            yield from _walk(v)


def _host(url: str) -> str:
    return httpx.URL(url).host.removeprefix("www.")


class JsonLdProvider:
    name = "json-ld"
    _script = re.compile(r'<script[^>]+application/ld\+json[^>]*>(.*?)</script>', re.S | re.I)

    def quote(self, client: httpx.Client, url: str) -> PriceQuote | None:
        page = fetch_html(client, url)
        for raw in self._script.findall(page):
            try:
                data = json.loads(raw.strip())
            except json.JSONDecodeError:
                continue
            for node in _walk(data):
                offer_type = node.get("@type")
                if offer_type in ("Offer", "AggregateOffer") or "price" in node or "lowPrice" in node:
                    price = node.get("price") or node.get("lowPrice")
                    currency = node.get("priceCurrency")
                    if price and currency:
                        try:
                            amount = float(str(price).replace(",", ""))
                        except ValueError:
                            continue
                        if amount > 0:
                            return PriceQuote(amount, currency.upper(), _host(url), url)
        return None


class MetaTagProvider:
    name = "meta"
    _amount = re.compile(r'<meta[^>]+(?:property|name)="(?:product|og):price:amount"[^>]+content="([\d.,]+)"', re.I)
    _currency = re.compile(r'<meta[^>]+(?:property|name)="(?:product|og):price:currency"[^>]+content="([A-Z]{3})"', re.I)

    def quote(self, client: httpx.Client, url: str) -> PriceQuote | None:
        page = fetch_html(client, url)
        a, c = self._amount.search(page), self._currency.search(page)
        if a and c:
            return PriceQuote(float(a.group(1).replace(",", "")), c.group(1).upper(), _host(url), url)
        return None


DEFAULT_PROVIDERS: list[Provider] = [JsonLdProvider(), MetaTagProvider()]


class FxRates:
    """Курсы ЕЦБ (бесплатно, без ключа) для пересчёта в доллары."""

    ECB_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"

    def __init__(self, client: httpx.Client):
        self._client = client
        self._per_eur: dict[str, float] | None = None

    def _load(self) -> dict[str, float]:
        if self._per_eur is None:
            xml = self._client.get(self.ECB_URL).text
            root = ElementTree.fromstring(xml)
            rates = {"EUR": 1.0}
            for el in root.iter():
                if el.get("currency") and el.get("rate"):
                    rates[el.get("currency")] = float(el.get("rate"))
            self._per_eur = rates
        return self._per_eur

    def to_usd(self, amount: float, currency: str) -> float:
        if currency == "USD":
            return amount
        rates = self._load()
        return amount / rates[currency] * rates["USD"]
