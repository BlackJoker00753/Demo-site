"""Render's external HTTPS address must survive the internal HTTP proxy."""

import pytest

from horologium.config import Settings


@pytest.mark.parametrize(("custom", "render", "expected"), [
    (None, None, None),
    (None, "https://example.onrender.com/", "https://example.onrender.com"),
    ("", "https://example.onrender.com", "https://example.onrender.com"),
    ("https://watches.example/", "https://example.onrender.com", "https://watches.example"),
])
def test_public_site_address_uses_render_with_custom_domain_override(monkeypatch, custom, render, expected):
    for key, value in (("HOROLOGIUM_SITE_URL", custom), ("RENDER_EXTERNAL_URL", render)):
        if value is None:
            monkeypatch.delenv(key, raising=False)
        else:
            monkeypatch.setenv(key, value)
    assert Settings().site_url == expected
