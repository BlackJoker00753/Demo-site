"""Catalogue coverage and physical architecture of the shipped educational models."""
import hashlib
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "frontend/assets/workshop/catalogue"


def test_every_catalogue_watch_has_a_bounded_described_workshop(client):
    watches = client.get("/api/v1/watches").json()
    index = json.loads((ASSETS / "index.json").read_text())
    assert set(index["models"]) == {w["slug"] for w in watches} - {"rolex-submariner"}
    assert {p.stem for p in ASSETS.glob("*.glb")} == set(index["models"])
    for card in watches:
        slug = card["slug"]
        if slug == "rolex-submariner":
            continue
        record = index["models"][slug]
        payload = (ASSETS / f"{slug}.glb").read_bytes()
        magic, version, length = struct.unpack_from("<III", payload)
        assert (magic, version, length) == (0x46546C67, 2, len(payload)), slug
        assert len(payload) == record["bytes"] <= 4 * 1024 * 1024, slug
        assert hashlib.sha256(payload).hexdigest() == record["sha256"], slug
        gltf = json.loads(payload[20:20 + struct.unpack_from("<I", payload, 12)[0]])
        nodes = [gltf["nodes"][n] for n in gltf["scenes"][0]["nodes"]]
        assert len(nodes) == record["parts"] >= 20, slug
        parts = [node["extras"]["workshop"] for node in nodes]
        assert len({p["name"] for p in parts}) == len(parts), slug
        assert all(p["text"] and p["title"] and p["material"] and 0 <= p["stage"] <= 6 for p in parts), slug
        assert all("uri" not in image for image in gltf.get("images", [])), slug
        triangles = sum(gltf["accessors"][p["indices"]]["count"] // 3
                        for mesh in gltf["meshes"] for p in mesh["primitives"])
        assert triangles == record["triangles"] <= 300_000, slug
        for node in nodes:
            extra = node["extras"]
            if extra["workshop"]["role"] == "screw":
                assert abs(sum(x * x for x in extra["workshop_axis"]) - 1) < 1e-5, slug
                assert extra["workshop_turns"] >= 2 and extra["workshop_pitch"] > 0, slug
        watch = client.get(f"/api/v1/watches/{slug}").json()
        roles = {p["role"] for p in parts}
        kind = watch["movement"]["type"]
        assert {"case", "mainplate", "movement_ring"} <= roles, slug
        if kind in {"automatic", "manual", "spring_drive"}:
            assert {"barrel", "barrel_cover", "mainspring", "barrel_arbor", "train"} <= roles, slug
            assert ("rotor" in roles) == (kind != "manual"), slug
            if kind == "spring_drive":
                assert {"glide", "stator", "quartz", "ic"} <= roles, slug
                assert not {"balance", "hairspring", "pallet", "escape"} & roles, slug
            else:
                assert {"balance", "hairspring", "pallet", "escape"} <= roles, slug
        else:
            assert {"battery", "circuit", "quartz", "ic"} <= roles, slug
            assert not {"barrel", "balance", "hairspring", "pallet", "escape"} & roles, slug
        if kind == "solar":
            assert "solar" in roles and "Аккумулятор" in {p["name"] for p in parts}, slug
        if kind == "smart":
            assert {"sensor", "haptic", "flex"} <= roles and "train" not in roles, slug
        if kind != "smart" and watch["render"]["dial"]["finish"] == "lcd":
            assert {"lcd_contact", "buzzer"} <= roles and "motor_rotor" not in roles, slug
        complications = {c["slug"] for c in watch["complications"]}
        if kind in {"automatic", "manual"} and complications & {"chronograph", "flyback", "split-seconds"}:
            assert {"chrono_control", "chrono_clutch", "chrono_lever", "counter"} <= roles, slug
        if "tourbillon" in complications:
            assert "cage" in roles, slug
        if "minute-repeater" in complications:
            assert {"gong", "hammer"} <= roles, slug


def test_build_dependencies_stay_out_of_the_workshop_loading_path():
    # Generators run offline. Runtime imports profiles only, and fetches one finished GLB.
    runtime = (ROOT / "frontend/js/ui/submariner-workshop.js").read_text()
    assert "build-model" not in runtime and "GLTFExporter" not in runtime
    assert "/assets/workshop/catalogue/${watch.slug}.glb" in runtime
