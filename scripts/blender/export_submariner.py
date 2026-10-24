"""Export the measured Blender model as a lightweight, individually pickable GLB.

Run after sub124060_textures.py:
    blender -b --python scripts/blender/export_submariner.py
The web viewer uses millimetres, with Blender's Z converted to glTF's Y.
"""
from pathlib import Path
import json
import math
import os
import shutil
import struct
import subprocess
import tempfile
import hashlib

import bpy
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "frontend/assets/workshop/submariner"
TEX = ROOT / "teardown_src/3d/rolex-submariner/tex"
OUT.mkdir(parents=True, exist_ok=True)
G = {"__name__": "sub", "ROOT": str(ROOT)}
for file in ("sub124060.py", "sub124060_movement.py"):
    source = (ROOT / "scripts/blender" / file).read_text()
    # MANIFOLD was added after Blender 4.3; FAST is the older fallback.
    if bpy.app.version < (4, 5, 0):
        source = source.replace('"MANIFOLD"', '"FAST"')
    exec(source, G)
# An engraving from the private source folder is not needed for the geometry.
G["_engraving"] = lambda *args, **kwargs: None
# Keep the silhouettes round without shipping cinema-resolution cylinders.
for name in ("cylinder", "lathe"):
    original = G[name]
    def limited(*args, _original=original, **kwargs):
        kwargs["seg"] = min(kwargs.get("seg", 128), 128)
        return _original(*args, **kwargs)
    G[name] = limited
M = G["build"]("all", str(ROOT))
G["movement"](M, str(ROOT))
# Open the educational barrel as well: its cover, spring and arbor are selectable.
barrel = bpy.data.objects["Барабан"]
z0 = G["Z_WHEEL"] - 1.3
cutter = G["cylinder"]("_полость барабана", 4.78, z0 - 0.1, G["Z_WHEEL"] - 0.22, center=(*G["P_BARREL"], 0))
G["boolean"](barrel, cutter)
spring_materials = {**M, "parachrom": M["steel_mv"]}
G["_hairspring"]("Заводная пружина", G["P_BARREL"], z0 + 0.25, spring_materials,
    turns=9, r0=0.65, r1=4.5, w=0.12, h=0.65)
arbor = G["cylinder"]("Вал барабана", 0.53, z0 - 0.1, G["Z_WHEEL"] + 0.12, center=(*G["P_BARREL"], 0))
arbor.data.materials.append(M["steel_mv"])
cover = bpy.data.objects["Барабан: крышка"]
cover.parent = None
cover.matrix_world = G["Matrix"].Identity(4)

def mask_material(name, filename, dark, light, metallic, roughness):
    source = bpy.data.images.load(str(TEX / filename), check_existing=True)
    original_w, original_h = source.size
    width = 1024 if original_w == original_h else 2048
    height = max(8, round(width * original_h / original_w))
    source.scale(width, height)
    values = np.array(source.pixels[:], dtype=np.float32).reshape(-1, 4)[:, :1]
    # Textures are sRGB; the measured material colours are linear.
    rgb = np.array(dark) + values * (np.array(light) - np.array(dark))
    rgb = np.where(rgb <= 0.0031308, rgb * 12.92, 1.055 * rgb ** (1 / 2.4) - 0.055)
    rgba = np.column_stack((rgb, np.ones(len(rgb)))).astype(np.float32)
    image = bpy.data.images.new(name, width=width, height=height)
    image.pixels[:] = rgba.ravel()
    image.filepath_raw = str(TEX / (name + ".png"))
    image.file_format = "PNG"
    image.save()
    mat, nt, bsdf = G["principled"](name, dark, metallic=metallic, rough=roughness, coat=0.45)
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = image
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    return mat

replacements = {
    M["dial"].name: mask_material("Dial", "dial_print.png", (0.004, 0.004, 0.005), (0.86, 0.86, 0.85), 0.05, 0.25),
    M["insert"].name: mask_material("Cerachrom", "insert_platinum.png", (0.006, 0.006, 0.007), (0.7, 0.7, 0.71), 0.3, 0.18),
    M["flange"].name: mask_material("Rehaut", "flange_engraving.png", (0.12, 0.13, 0.14), (0.3, 0.3, 0.31), 1.0, 0.26),
}
coll = bpy.data.collections["Submariner"]
objects = [o for o in coll.objects if o.type == "MESH"]
for o in objects:
    for slot in o.material_slots:
        if slot.material.name in replacements:
            slot.material = replacements[slot.material.name]
    o.select_set(True)
bpy.context.view_layer.objects.active = objects[0]
bpy.ops.object.convert(target="MESH")
# Keep all names and parent relationships; no animation or lights are baked in.
manifest = {"objects": len(objects), "source": "Blender model measured from official Rolex 124060 photographs", "units": "mm"}
(OUT / "model-info.json").write_text(json.dumps(manifest, indent=2) + "\n")
bpy.ops.export_scene.gltf(filepath=str(OUT / "submariner.glb"), export_format="GLB",
    use_selection=True, export_animations=False, export_cameras=False, export_lights=False,
    export_yup=True, export_apply=True, export_extras=True, export_image_format="WEBP",
    export_image_quality=90, export_unused_images=False)
print("WORKSHOP_EXPORTED", len(objects), (OUT / "submariner.glb").stat().st_size)
optimizer = os.environ.get("GLTFPACK") or shutil.which("gltfpack")
if optimizer:
    with tempfile.TemporaryDirectory(prefix="submariner-") as temp:
        original = Path(temp) / "original.glb"
        shutil.copyfile(OUT / "submariner.glb", original)
        subprocess.run([optimizer, "-i", str(original), "-o", str(OUT / "submariner.glb"), "-kn", "-km", "-ke", "-si", "0.75"], check=True)
payload = (OUT / "submariner.glb").read_bytes()
length = struct.unpack_from("<I", payload, 12)[0]
model = json.loads(payload[20:20 + length])
manifest.update(bytes=len(payload), sha256=hashlib.sha256(payload).hexdigest(),
    triangles=sum(model["accessors"][p["indices"]]["count"] // 3 for m in model["meshes"] for p in m["primitives"]),
    optimizer="gltfpack -kn -km -ke -si 0.75" if optimizer else None)
(OUT / "model-info.json").write_text(json.dumps(manifest, indent=2) + "\n")
