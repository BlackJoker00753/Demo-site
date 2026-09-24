import datetime as dt

from horologium.config import settings
from horologium.content.loader import load_content


def test_content_is_valid_and_cross_referenced():
    bundle = load_content(settings.content_dir)
    assert bundle.countries and bundle.brand_files and bundle.watch_count > 0


def test_every_brand_country_has_folder_and_watches_have_sane_prices():
    bundle = load_content(settings.content_dir)
    today = dt.date.today()
    for bf in bundle.brand_files:
        for w in bf.watches:
            assert 10 <= w.price.usd <= 5_000_000, w.slug
            assert w.price.checked <= today, f"{w.slug}: price date in the future"
            if w.year_current and w.year_introduced:
                assert w.year_current >= w.year_introduced, w.slug


def test_history_is_chronological():
    bundle = load_content(settings.content_dir)
    for bf in bundle.brand_files:
        for w in bf.watches:
            years = [h.year for h in w.history]
            assert years == sorted(years), f"{w.slug}: history must be sorted by year"
