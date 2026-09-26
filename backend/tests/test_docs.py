"""Журнал ведётся в двух копиях (docs/PROGRESS.md и Progress.md в корне): они должны совпадать."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_progress_copies_in_sync():
    a = (ROOT / "docs" / "PROGRESS.md").read_text(encoding="utf-8")
    b = (ROOT / "Progress.md").read_text(encoding="utf-8")
    assert a == b, "docs/PROGRESS.md и Progress.md разошлись: допишите блок в оба файла"
