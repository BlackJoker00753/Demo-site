# Сцена целиком: модель, механизм, свет-шатёр, камера и анимация разборки. Запуск в Blender:
#     G = {}; exec(open(".../scripts/blender/sub124060_scene.py").read(), G); G["make"](".../site")
# Рендер кадров (в фоне, без интерфейса):
#     Blender -b scene.blend -E CYCLES -o //frames/f_#### -a


def make(root, w=1600, h=900, samples=48):
    import bpy
    import math
    import os
    G = {"__name__": "sub"}
    for f in ("sub124060.py", "sub124060_movement.py", "sub124060_anim.py"):
        exec(open(os.path.join(root, "scripts/blender", f)).read(), G)
    for o in list(bpy.data.objects):
        if o.name in ("Часы", "Браслет 12", "Браслет 6") or o.type == "LIGHT":
            bpy.data.objects.remove(o, do_unlink=True)
    M = G["build"]("all", root)
    G["movement"](M, root)
    coll = bpy.data.collections["Submariner"]
    rt = bpy.data.objects.new("Часы", None)
    coll.objects.link(rt)
    for o in coll.objects:
        if o is not rt and o.parent is None:
            mw = o.matrix_world.copy()
            o.parent = rt
            o.matrix_world = mw
    cam = G["studio"](root, w=w, h=h, samples=samples)
    G["tent_world"](1.6)
    top = bpy.data.objects["Рассеиватель верх"]
    top.data.use_nodes = False
    top.location, top.rotation_euler, top.data.energy = (0, 0, 560), (0, 0, 0), 2500
    s = bpy.context.scene
    s.view_settings.exposure = -0.2
    s.render.film_transparent = False
    cam.data.lens = 100
    cam.rotation_euler = (0, 0, 0)
    G["animate"]()
    return G
