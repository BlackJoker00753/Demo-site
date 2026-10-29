"""Статика для быстрой загрузки: шрифты без дублей, шрифт иконок покрывает все иконки в коде,
облегчённые текстуры для слабых устройств на месте."""

import hashlib
import json
import importlib.util
import re
import struct
import io

from PIL import Image
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FRONT = ROOT / "frontend"


def test_submariner_workshop_asset_is_complete_and_bounded():
    """Guard the shipped model, named educational parts and mobile download budget."""
    directory = FRONT / "assets/workshop/submariner"
    payload = (directory / "submariner.glb").read_bytes()
    magic, version, length = struct.unpack_from("<III", payload)
    assert magic == 0x46546C67 and version == 2 and length == len(payload)
    assert len(payload) <= 4 * 1024 * 1024
    json_length, chunk_type = struct.unpack_from("<II", payload, 12)
    assert chunk_type == 0x4E4F534A
    model = json.loads(payload[20:20 + json_length])
    names = {node.get("name") for node in model["nodes"]}
    screws = [node for node in model["nodes"] if node.get("name", "").startswith("Винт")]
    assert len(screws) >= 20
    for screw in screws:
        thread = screw["extras"]
        assert abs(sum(axis * axis for axis in thread["workshop_axis"]) - 1) < 1e-5
        assert thread["workshop_turns"] >= 2 and thread["workshop_pitch"] > 0
    assert {"Корпус", "Безель", "Стекло", "Баланс", "Заводная пружина", "Вал барабана"} <= names
    assert len(model["scenes"][0]["nodes"]) >= 120
    assert all("uri" not in image for image in model["images"])
    # Ring masks must remain strips; square resizing makes mipmaps erase the fine numerals.
    binary = payload[28 + json_length:]
    for image in model["images"]:
        if image.get("name") == "Cerachrom":
            view = model["bufferViews"][image["bufferView"]]
            start = view.get("byteOffset", 0)
            with Image.open(io.BytesIO(binary[start:start + view["byteLength"]])) as texture:
                assert texture.width / texture.height > 20
    triangles = sum(model["accessors"][part["indices"]]["count"] // 3
                    for mesh in model["meshes"] for part in mesh["primitives"])
    assert triangles <= 220_000
    manifest = json.loads((directory / "model-info.json").read_text())
    assert manifest["bytes"] == len(payload)
    assert manifest["triangles"] == triangles
    assert manifest["sha256"] == hashlib.sha256(payload).hexdigest()


def _script(name: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / f"{name}.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_icons_subset():
    """Каждая иконка ph-* из кода есть в урезанном шрифте; новая иконка: перезапустить scripts/icons_subset.py."""
    m = _script("icons_subset")
    have = set(re.findall(r"\.(ph-[\w-]+):before", (FRONT / "assets/icons/icons.css").read_text()))
    known = set(m.glyph_map())
    missing = sorted(n for n in m.used_icons() if n in known and n not in have)
    assert not missing, f"нет в icons.woff2: {missing}"
    assert (FRONT / "assets/icons/icons.woff2").stat().st_size < 40_000
    index = (FRONT / "index.html").read_text()
    assert "/assets/icons/icons.css" in index and "/vendor/phosphor/" not in index


def test_fonts_have_no_duplicates():
    """Google Fonts отдаёт один вариативный файл на все начертания: в fonts.css он должен быть один раз."""
    css = (FRONT / "assets/fonts/fonts.css").read_text()
    files = re.findall(r"url\((/assets/fonts/[^)]+\.woff2)\)", css)
    assert files and len(files) == len(set(files))
    digests = {hashlib.md5((FRONT / f.lstrip("/")).read_bytes()).hexdigest() for f in files}
    assert len(digests) == len(files), "одинаковые файлы шрифтов под разными именами"
    on_disk = {f"/assets/fonts/{p.name}" for p in (FRONT / "assets/fonts").glob("*.woff2")}
    assert on_disk == set(files), "лишние или потерянные файлы шрифтов"


def test_lite_assets_for_weak_devices():
    """2K-ночь и карта стран, HDRI 1K и фоновый поток карты наведения (scripts/fetch_assets.py)."""
    for rel in ("assets/earth/night-2k.jpg", "assets/earth/country-ids-2k.png", "assets/hdri/monochrome_studio_04_1k.hdr",
                "js/globe/picker-worker.js"):
        assert (FRONT / rel).is_file(), rel


def test_globe_texture_preload_matches_fetch(client):
    """Глобус берёт текстуры через fetch: предзагрузка as="fetch", иначе файл скачивается дважды."""
    page = client.get("/").text
    assert '<link rel="preload" href="/assets/earth/day-2k.jpg" as="fetch" crossorigin="anonymous">' in page
    assert "day-2k.jpg" not in client.get("/watches").text
