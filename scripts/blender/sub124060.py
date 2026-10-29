# Rolex Submariner 124060 в Blender: параметрическая модель по официальному фото Rolex
# (teardown_src/3d/rolex-submariner/upright-c.png, 3840 px, ≈46,3 px на мм) и паспортным размерам.
#
# Система координат: миллиметры, плоскость циферблата XY, Z к зрителю; 12 часов = +Y, 3 часа = +X.
# Запуск внутри Blender (через MCP или Text Editor):
#     exec(open(".../scripts/blender/sub124060.py").read()); build("all")
# Каждая деталь — отдельный объект в коллекции «Submariner», чтобы разбирать по одной.

import math

import bmesh
import bpy
from mathutils import Matrix, Vector

# ---------------------------------------------------------------- размеры (мм)
R_BEZEL_TIP = 20.5      # по зубцам безеля (⌀41)
R_CASE = 20.3           # средняя часть корпуса под безелем
LUG_TIP_Y = 23.8        # кончик ушка (47,6 мм от ушка до ушка)
LUG_IN_X = 10.5         # внутренний край ушка (ширина браслета 21)
LUG_TIP_OUT_X = 12.45   # внешний край ушка на кончике (≈24,9 мм по ушкам)
LUG_FLANK_SLOPE = 0.362 # внешний край ушка расходится к центру: dx/dy (по силуэту фото)
GUARD_X = 21.75         # защита головки (два выступа выше и ниже головки)
GUARD_OUT = 6.0         # внешний край выступов по Y
GUARD_IN = 3.7          # ниша под головку между выступами (головка ⌀6,8)
Z_CASE_TOP, Z_CASE_BOT = 0.0, -6.5
Z_BEZEL_TOP = 3.0
Z_CRYSTAL_TOP = 4.0
Z_BACK_BOT = -8.5
Z_DIAL = -0.8
CROWN_Z = -3.1

COLL = "Submariner"


# ---------------------------------------------------------------- сцена
def reset():
    s = bpy.context.scene
    s.unit_settings.system = "METRIC"
    s.unit_settings.scale_length = 0.001
    s.unit_settings.length_unit = "MILLIMETERS"
    for o in list(bpy.data.objects):
        if o.name in ("Cube",) or (o.users_collection and o.users_collection[0].name == COLL):
            bpy.data.objects.remove(o, do_unlink=True)
    if COLL not in bpy.data.collections:
        bpy.context.scene.collection.children.link(bpy.data.collections.new(COLL))
    for sp in (a.spaces.active for w in bpy.context.window_manager.windows for a in w.screen.areas if a.type == "VIEW_3D"):
        sp.clip_start, sp.clip_end = 0.1, 2000


def link(o):
    for c in o.users_collection:
        c.objects.unlink(o)
    bpy.data.collections[COLL].objects.link(o)
    return o


def mesh_obj(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    old = bpy.data.objects.get(name)
    if old:
        bpy.data.objects.remove(old, do_unlink=True)
    o = bpy.data.objects.new(name, me)
    return link(o)


ROOT = __file__.rsplit("/scripts/", 1)[0] if "__file__" in globals() else ""


# Свет предметной съёмки: большой рассеиватель над камерой (мягкий градиент в плоских поверхностях),
# узкие стрипы по бокам (блики на гранях ушек, безеля и головки), студийный HDRI слабо для отражений.
HDRI_STRENGTH = 0.5
EXPOSURE = -0.2
# Световой шатёр. Камера неподвижна на оси +Z, часы вращаются под светом (поворотный стол), поэтому
# свет одинаково хорош для любой стороны: большой рассеиватель сверху даёт градиент в плоскостях,
# высокие стрипы по бокам рисуют блики на гранях ушек, безеля и звеньев, нижняя полоса подсвечивает кромки.
LIGHTS = [
    # (имя, положение, размер, мощность, градиент)
    ("Рассеиватель верх", (0, 140, 520), (820, 600), 6.0e3, True),
    ("Стрип слева", (-280, 20, 140), (110, 760), 3.2e3, False),
    ("Стрип справа", (280, -20, 160), (110, 760), 2.6e3, False),
    ("Полоса снизу", (0, -300, 110), (760, 110), 2.0e3, False),
    ("Полоса сзади", (0, 330, 90), (760, 90), 1.2e3, False),
] + [(f"Кольцо {k}", (230 * math.cos(math.radians(45 + 90 * k)), 230 * math.sin(math.radians(45 + 90 * k)), 170),
      (140, 140), 0.9e3, False) for k in range(4)]


def studio(root, w=1000, h=1400, samples=64):
    """Предметная студия: HDRI (отражения), три софтбокса, чёрный фон, Cycles на GPU."""
    s = bpy.context.scene
    try:
        s.render.engine = "CYCLES"
    except TypeError:
        pass
    s.cycles.device = "GPU"
    s.cycles.samples = samples
    s.cycles.use_denoising = True
    s.render.resolution_x, s.render.resolution_y = w, h
    s.view_settings.view_transform = "AgX"
    s.view_settings.look = "AgX - Medium High Contrast"
    world = s.world or bpy.data.worlds.new("World")
    s.world = world
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()
    env = nt.nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(root + "/frontend/assets/hdri/monochrome_studio_04_2k.hdr", check_existing=True)
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs["Strength"].default_value = HDRI_STRENGTH
    black = nt.nodes.new("ShaderNodeBackground")
    black.inputs["Color"].default_value = (0, 0, 0, 1)
    lp = nt.nodes.new("ShaderNodeLightPath")
    mix = nt.nodes.new("ShaderNodeMixShader")
    out = nt.nodes.new("ShaderNodeOutputWorld")
    nt.links.new(env.outputs["Color"], bg.inputs["Color"])
    nt.links.new(lp.outputs["Is Camera Ray"], mix.inputs["Fac"])
    nt.links.new(bg.outputs["Background"], mix.inputs[1])
    nt.links.new(black.outputs["Background"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    for n in [l[0] for l in LIGHTS] + ["Софтбокс верх", "Софтбокс слева", "Софтбокс справа", "Light", "Camera"]:
        if n in bpy.data.objects:
            bpy.data.objects.remove(bpy.data.objects[n], do_unlink=True)

    def softbox(name, loc, size, power, gradient=False, target=(0, 0, 0)):
        ld = bpy.data.lights.new(name, "AREA")
        ld.shape, ld.size, ld.size_y, ld.energy = "RECTANGLE", size[0], size[1], power
        if gradient:
            # рассеиватель ярче к одному краю: в плоском металле градиент, как на снимках Rolex
            ld.use_nodes = True
            lnt = ld.node_tree
            em = next(n for n in lnt.nodes if n.type == "EMISSION")
            geo = lnt.nodes.new("ShaderNodeNewGeometry")     # Parametric: координаты на поверхности света 0..1
            sep = lnt.nodes.new("ShaderNodeSeparateXYZ")
            mr = lnt.nodes.new("ShaderNodeMapRange")
            mr.inputs["From Min"].default_value, mr.inputs["From Max"].default_value = 0.0, 1.0
            mr.inputs["To Min"].default_value, mr.inputs["To Max"].default_value = 0.25, 1.6
            lnt.links.new(geo.outputs["Parametric"], sep.inputs["Vector"])
            lnt.links.new(sep.outputs["Y"], mr.inputs["Value"])
            lnt.links.new(mr.outputs["Result"], em.inputs["Strength"])
        o = bpy.data.objects.new(name, ld)
        s.collection.objects.link(o)
        o.location = loc
        d = Vector(target) - Vector(loc)
        o.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        return o

    for name, loc, size, power, grad in LIGHTS:
        softbox(name, loc, size, power, grad)
    s.view_settings.exposure = EXPOSURE
    cd = bpy.data.cameras.new("Camera")
    cd.lens, cd.sensor_width = 200, 36
    cd.clip_start, cd.clip_end = 10, 5000
    cam = bpy.data.objects.new("Camera", cd)
    s.collection.objects.link(cam)
    s.camera = cam
    cam.location = (0, 0, 720)
    cam.rotation_euler = (0, 0, 0)
    return cam


def tent_world(strength=1.0, flags=((-60, 14), (35, 10), (150, 18), (-140, 8))):
    """Окружение-шатёр для отражений: светлый купол сверху, тёмный низ, тёмные флаги (азимут°, ширина°).
    Для лучей камеры фон чёрный. Так металл повсюду что-то отражает, а флаги рисуют тёмные линии на гранях."""
    s = bpy.context.scene
    nt = s.world.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Generated"], sep.inputs["Vector"])
    # купол: яркость от высоты над горизонтом
    dome = nt.nodes.new("ShaderNodeMapRange")
    dome.inputs["From Min"].default_value, dome.inputs["From Max"].default_value = -0.05, 0.45
    dome.inputs["To Min"].default_value, dome.inputs["To Max"].default_value = 0.02, 1.0
    dome.interpolation_type = "SMOOTHSTEP"
    nt.links.new(sep.outputs["Z"], dome.inputs["Value"])
    # чёрная карта вокруг объектива (зенит, камера над часами): глянец отражает чёрное, сатин собирает свет шире
    card = nt.nodes.new("ShaderNodeMapRange")
    card.inputs["From Min"].default_value, card.inputs["From Max"].default_value = 0.84, 0.93
    card.inputs["To Min"].default_value, card.inputs["To Max"].default_value = 1.0, 0.02
    card.interpolation_type = "SMOOTHSTEP"
    nt.links.new(sep.outputs["Z"], card.inputs["Value"])
    dm = nt.nodes.new("ShaderNodeMath"); dm.operation = "MULTIPLY"
    nt.links.new(dome.outputs["Result"], dm.inputs[0]); nt.links.new(card.outputs["Result"], dm.inputs[1])
    # азимут для флагов
    az = nt.nodes.new("ShaderNodeMath"); az.operation = "ARCTAN2"
    nt.links.new(sep.outputs["Y"], az.inputs[0]); nt.links.new(sep.outputs["X"], az.inputs[1])
    val = dm.outputs[0]
    for deg, width in flags:
        d = nt.nodes.new("ShaderNodeMath"); d.operation = "SUBTRACT"; d.inputs[1].default_value = math.radians(deg)
        nt.links.new(az.outputs[0], d.inputs[0])
        w = nt.nodes.new("ShaderNodeMath"); w.operation = "WRAP"
        w.inputs[1].default_value, w.inputs[2].default_value = -math.pi, math.pi
        nt.links.new(d.outputs[0], w.inputs[0])
        ab = nt.nodes.new("ShaderNodeMath"); ab.operation = "ABSOLUTE"
        nt.links.new(w.outputs[0], ab.inputs[0])
        fl = nt.nodes.new("ShaderNodeMapRange")
        fl.inputs["From Min"].default_value = math.radians(width) * 0.35
        fl.inputs["From Max"].default_value = math.radians(width) * 0.5
        fl.inputs["To Min"].default_value, fl.inputs["To Max"].default_value = 0.06, 1.0
        nt.links.new(ab.outputs[0], fl.inputs["Value"])
        mul = nt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"
        nt.links.new(val, mul.inputs[0]); nt.links.new(fl.outputs["Result"], mul.inputs[1])
        val = mul.outputs[0]
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs["Strength"].default_value = strength
    nt.links.new(val, bg.inputs["Color"])
    black = nt.nodes.new("ShaderNodeBackground")
    black.inputs["Color"].default_value = (0, 0, 0, 1)
    lp = nt.nodes.new("ShaderNodeLightPath")
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(lp.outputs["Is Camera Ray"], mix.inputs["Fac"])
    nt.links.new(bg.outputs["Background"], mix.inputs[1])
    nt.links.new(black.outputs["Background"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])


def render(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


# ---------------------------------------------------------------- 2D-контуры
def arc(cx, cy, r, a0, a1, step=0.5):
    """Точки дуги от a0 до a1 (градусы), шаг в градусах; направление по знаку a1-a0."""
    n = max(2, int(abs(a1 - a0) / step) + 1)
    return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / (n - 1))),
             cy + r * math.sin(math.radians(a0 + (a1 - a0) * i / (n - 1)))) for i in range(n)]


def _walk(pts, i, dist, step):
    """Точка на ломаной на расстоянии dist от pts[i] (step=-1 назад, +1 вперёд) и индекс за ней."""
    n, j, left, cur = len(pts), i, dist, Vector(pts[i])
    while True:
        k = (j + step) % n
        nxt = Vector(pts[k])
        seg = (nxt - cur).length
        if seg >= left or k == i:
            return cur + (nxt - cur).normalized() * min(left, seg), k
        left -= seg
        cur, j = nxt, k


def fillet(pts, idx, rf, n=14):
    """Скругление угла pts[idx]: точки ближе касательной длины выкидываются, вместо них кривая Безье."""
    p = Vector(pts[idx])
    a, b = Vector(pts[idx - 1]), Vector(pts[(idx + 1) % len(pts)])
    u, v = (a - p).normalized(), (b - p).normalized()
    ang = u.angle(v)
    if ang < 1e-3 or abs(ang - math.pi) < 1e-2:
        return pts
    t = rf / math.tan(ang / 2)
    A, ia = _walk(pts, idx, t, -1)   # ia: первая точка до кривой (назад)
    B, ib = _walk(pts, idx, t, +1)   # ib: первая точка после кривой
    curve = [tuple((1 - s) ** 2 * A + 2 * (1 - s) * s * p + s ** 2 * B) for s in (i / n for i in range(n + 1))]
    assert ia < idx < ib, "скругление через начало контура: начинайте контур с точки без скругления"
    return _dedupe(pts[:ia + 1] + curve + pts[ib:])


def _dedupe(pts, eps=1e-4):
    out = []
    for q in pts:
        if not out or (Vector(q) - Vector(out[-1])).length > eps:
            out.append(q)
    return out


def flank_x(y):
    return LUG_TIP_OUT_X + LUG_FLANK_SLOPE * (LUG_TIP_Y - y)


def flank_meets_circle():
    """y, где внешний край ушка (идя от кончика к центру) впервые входит в окружность корпуса."""
    y = LUG_TIP_Y
    while flank_x(y) ** 2 + y ** 2 > R_CASE ** 2 and y > 0:
        y -= 0.001
    return y


def case_outline():
    """Контур средней части корпуса сверху: окружность, четыре ушка, защита головки справа.

    Строится правая половина по часовой стрелке от 12 часов до 6, затем левая зеркально (без защиты).
    У каждой точки свой радиус скругления (0 = без скругления).
    """
    yf = flank_meets_circle()
    af = math.degrees(math.atan2(yf, flank_x(yf)))
    y_in = math.sqrt(R_CASE ** 2 - LUG_IN_X ** 2)
    a_in = math.degrees(math.atan2(y_in, LUG_IN_X))
    g0 = math.degrees(math.asin((GUARD_OUT + 2.0) / R_CASE))

    def half(guard):
        P = [(p, 0.0) for p in arc(0, 0, R_CASE, 90, a_in)]
        P[-1] = (P[-1][0], 0.8)                                  # ушко врастает в корпус
        P += [((LUG_IN_X, LUG_TIP_Y), 0.35), ((LUG_TIP_OUT_X, LUG_TIP_Y), 0.35)]
        P += [((flank_x(yf), yf), 2.2)]
        if guard:
            P += [(p, 0.0) for p in arc(0, 0, R_CASE, af, g0)[1:]]
            P[-1] = (P[-1][0], 1.6)
            P += [((GUARD_X, GUARD_OUT), 1.0), ((GUARD_X, GUARD_IN), 0.45), ((20.5, GUARD_IN), 0.4),
                  ((20.5, -GUARD_IN), 0.4), ((GUARD_X, -GUARD_IN), 0.45), ((GUARD_X, -GUARD_OUT), 1.0)]
            a = arc(0, 0, R_CASE, -g0, -af)
            P += [(a[0], 1.6)] + [(p, 0.0) for p in a[1:-1]]
        else:
            P += [(p, 0.0) for p in arc(0, 0, R_CASE, af, -af)[1:-1]]
        P += [((flank_x(yf), -yf), 2.2)]
        P += [((LUG_TIP_OUT_X, -LUG_TIP_Y), 0.35), ((LUG_IN_X, -LUG_TIP_Y), 0.35)]
        a = arc(0, 0, R_CASE, -a_in, -90)
        P += [(a[0], 0.8)] + [(p, 0.0) for p in a[1:]]
        return P

    right = half(True)
    left = [((-x, y), r) for (x, y), r in reversed(half(False))]
    P = right[:-1] + left[:-1]          # стыки на 12 и 6 часах не дублируются
    keep = [0] + [i for i in range(1, len(P)) if (Vector(P[i][0]) - Vector(P[i - 1][0])).length > 1e-4]
    P = [P[i] for i in keep]
    pts = [p for p, _ in P]
    for i in reversed(range(len(P))):
        if P[i][1] > 0:
            pts = fillet(pts, i, P[i][1])
    return pts


def side_profile():
    """Профиль сбоку (YZ): верх ушка опускается к кончику, низ слегка поднимается."""
    top, bot = [], []
    for i in range(41):
        y = -LUG_TIP_Y - 0.5 + (2 * LUG_TIP_Y + 1) * i / 40
        ay = abs(y)
        k = max(0.0, (ay - 15.0) / (LUG_TIP_Y - 15.0))
        top.append((y, Z_CASE_TOP - 2.3 * k ** 1.6))
        kb = max(0.0, (ay - 17.5) / (LUG_TIP_Y - 17.5))
        bot.append((y, Z_CASE_BOT + 0.9 * kb ** 1.4))
    return top + bot[::-1]


def extrude(name, pts2d, z0, z1, plane="XY"):
    bm = bmesh.new()
    vs = []
    for x, y in pts2d:
        if plane == "XY":
            vs.append(bm.verts.new((x, y, z0)))
        else:  # YZ-профиль, вытягивание вдоль X
            vs.append(bm.verts.new((z0, x, y)))
    f = bm.faces.new(vs)
    vec = (0, 0, z1 - z0) if plane == "XY" else (z1 - z0, 0, 0)
    r = bmesh.ops.extrude_face_region(bm, geom=[f])
    bmesh.ops.translate(bm, verts=[e for e in r["geom"] if isinstance(e, bmesh.types.BMVert)], vec=vec)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_obj(name, bm)


def uv_planar(o, size):
    """UV = проекция сверху на квадрат size×size мм с центром в оси часов (как кроп фото)."""
    me = o.data
    uv = me.uv_layers.new(name="UVMap")
    for loop in me.loops:
        co = me.vertices[loop.vertex_index].co
        uv.data[loop.index].uv = (co.x / size + 0.5, co.y / size + 0.5)


def uv_polar(o, r0, r1):
    """UV по кольцу: u = угол от 12 часов по часовой (0..1), v = радиус (r0 → 0, r1 → 1), как развёртка фото."""
    me = o.data
    uv = me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        us = []
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            us.append(((90 - math.degrees(math.atan2(co.y, co.x))) / 360) % 1.0)
        wrap = max(us) - min(us) > 0.5
        for li, u in zip(poly.loop_indices, us):
            co = me.vertices[me.loops[li].vertex_index].co
            r = math.hypot(co.x, co.y)
            uv.data[li].uv = (u + 1 if wrap and u < 0.5 else u, (r - r0) / (r1 - r0))


def boolean(target, cutter, op="DIFFERENCE", keep=False):
    mats = list(target.data.materials)
    nverts = len(target.data.vertices)
    bpy.context.view_layer.objects.active = target
    for solver in ("EXACT", "MANIFOLD"):
        m = target.modifiers.new("b", "BOOLEAN")
        m.operation, m.object, m.solver = op, cutter, solver
        if solver == "EXACT":
            m.use_hole_tolerant = True
        dg = bpy.context.evaluated_depsgraph_get()
        ok = len(target.evaluated_get(dg).to_mesh().vertices) > 0 or not nverts
        if ok:
            bpy.ops.object.modifier_apply(modifier=m.name)
            break
        target.modifiers.remove(m)
    else:
        raise RuntimeError(f"булева операция обнулила {target.name}")
    # операция добавляет пустые слоты материалов от резака: возвращаем список как был
    target.data.materials.clear()
    for x in mats:
        target.data.materials.append(x)
    for p in target.data.polygons:
        p.material_index = min(p.material_index, max(0, len(mats) - 1))
    if not keep:
        bpy.data.objects.remove(cutter, do_unlink=True)


def cylinder(name, r, z0, z1, seg=256, axis="Z", center=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=z1 - z0)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, (z0 + z1) / 2))
    if axis == "X":
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, "Y"))
    bmesh.ops.translate(bm, verts=bm.verts, vec=center)
    return mesh_obj(name, bm)


def finish(o, bevel=0.12, seg=3, angle=30):
    """Фаска по острым рёбрам и «жёсткие» нормали: так блестят кромки у студийных снимков."""
    b = o.modifiers.new("Фаска", "BEVEL")
    b.width, b.segments, b.limit_method, b.angle_limit = bevel, seg, "ANGLE", math.radians(angle)
    b.harden_normals = True
    b.miter_outer = "MITER_ARC"
    o.modifiers.new("Нормали", "WEIGHTED_NORMAL").keep_sharp = True
    for p in o.data.polygons:
        p.use_smooth = True
    o.data.set_sharp_from_angle(angle=math.radians(angle))
    return o


# ---------------------------------------------------------------- материалы
def principled(name, color, metallic=0.0, rough=0.3, coat=0.0, aniso=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Coat Weight"].default_value = coat
    bsdf.inputs["Anisotropic"].default_value = aniso
    return m, nt, bsdf


def brushed(name, along="Y", rough=0.26, scale=(600.0, 3.0)):
    """Сатинированная сталь: тонкие риски вдоль `along` (рельеф и разброс шероховатости)."""
    m, nt, bsdf = principled(name, (0.80, 0.80, 0.81), metallic=1.0, rough=rough)
    if any(n.type == "TEX_NOISE" for n in nt.nodes):
        return m
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    sx, sy = scale if along == "Y" else scale[::-1]
    mp.inputs["Scale"].default_value = (sx, sy, sx)
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 1.0
    nz.inputs["Detail"].default_value = 8.0
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.06
    bump.inputs["Distance"].default_value = 0.002
    rr = nt.nodes.new("ShaderNodeMapRange")
    rr.inputs["To Min"].default_value, rr.inputs["To Max"].default_value = rough - 0.06, rough + 0.06
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], nz.inputs["Vector"])
    nt.links.new(nz.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(nz.outputs["Fac"], rr.inputs["Value"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(rr.outputs["Result"], bsdf.inputs["Roughness"])
    return m


TEX = "teardown_src/3d/rolex-submariner/tex/"


def _mask_node(nt, root, fname, extension="REPEAT"):
    img = bpy.data.images.load(root + "/" + TEX + fname, check_existing=True)
    img.colorspace_settings.name = "Non-Color"
    n = nt.nodes.new("ShaderNodeTexImage")
    n.image, n.interpolation, n.extension = img, "Cubic", extension
    uvn = nt.nodes.new("ShaderNodeUVMap")
    nt.links.new(uvn.outputs["UV"], n.inputs["Vector"])
    return n


def _mix_inputs(nt, bsdf, mask, pairs):
    """Входы BSDF: значение a там, где маска 0, и b там, где 1."""
    for key, a, b in pairs:
        if isinstance(a, tuple):
            mx = nt.nodes.new("ShaderNodeMix")
            mx.data_type = "RGBA"
            sock = lambda coll, nm: next(x for x in coll if x.name == nm and x.type == "RGBA")
            sock(mx.inputs, "A").default_value = (*a, 1)
            sock(mx.inputs, "B").default_value = (*b, 1)
            fac = next(x for x in mx.inputs if x.name == "Factor" and x.type == "VALUE")
            nt.links.new(mask.outputs["Color"], fac)
            nt.links.new(sock(mx.outputs, "Result"), bsdf.inputs[key])
        else:
            mr = nt.nodes.new("ShaderNodeMapRange")
            mr.inputs["To Min"].default_value, mr.inputs["To Max"].default_value = a, b
            nt.links.new(mask.outputs["Color"], mr.inputs["Value"])
            nt.links.new(mr.outputs["Result"], bsdf.inputs[key])


def sapphire():
    """Плоский сапфир: свет проходит без преломления (плоская пластина почти не смещает картинку), отражение
    по Френелю. В лоб почти прозрачен, как стекло с просветлением, под углом бликует. Без шума каустики."""
    m = bpy.data.materials.get("Сапфир") or bpy.data.materials.new("Сапфир")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    gl = nt.nodes.new("ShaderNodeBsdfGlossy")
    gl.inputs["Roughness"].default_value = 0.015
    fr = nt.nodes.new("ShaderNodeFresnel")
    fr.inputs["IOR"].default_value = 1.35          # слабее, чем у голого сапфира (1,77): просветляющее покрытие
    mix = nt.nodes.new("ShaderNodeMixShader")
    # отражение только у внешней стороны: без преломления луч внутри пластины падает на грань под внешним
    # углом, и Френель изнутри дал бы полное внутреннее отражение (стекло гасило бы свет низких софтбоксов)
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    front = nt.nodes.new("ShaderNodeMath")
    front.operation = "SUBTRACT"
    front.inputs[0].default_value = 1.0
    nt.links.new(geo.outputs["Backfacing"], front.inputs[1])
    fac = nt.nodes.new("ShaderNodeMath")
    fac.operation = "MULTIPLY"
    nt.links.new(fr.outputs["Fac"], fac.inputs[0])
    nt.links.new(front.outputs["Value"], fac.inputs[1])
    nt.links.new(fac.outputs["Value"], mix.inputs["Fac"])
    nt.links.new(tr.outputs["BSDF"], mix.inputs[1])
    nt.links.new(gl.outputs["BSDF"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    return m


def _mask_node_any(fname):
    """Изображение маски из папки текстур (None, если нет)."""
    import os
    path = ROOT_DIR[0] + "/" + TEX + fname if ROOT_DIR else None
    if not path or not os.path.exists(path):
        return None
    img = bpy.data.images.load(path, check_existing=True)
    img.colorspace_settings.name = "Non-Color"
    return img


def brushed_with_mask(name, img):
    """Сатин с полированным рельефом по маске (UV 0..1 по центру детали): шероховатость падает, рельеф выше."""
    m, nt, bsdf = principled(name, (0.80, 0.80, 0.81), metallic=1.0, rough=0.26)
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image, tex.extension = img, "CLIP"
    uvn = nt.nodes.new("ShaderNodeUVMap")
    mp = nt.nodes.new("ShaderNodeMapping")
    # корона ≈4 мм по высоте в центре крышки: масштаб UV вокруг центра
    mp.inputs["Location"].default_value = (-1.25, -1.25, 0)
    mp.inputs["Scale"].default_value = (3.5, 3.5, 1)
    nt.links.new(uvn.outputs["UV"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], tex.inputs["Vector"])
    rr = nt.nodes.new("ShaderNodeMapRange")
    rr.inputs["To Min"].default_value, rr.inputs["To Max"].default_value = 0.26, 0.05
    nt.links.new(tex.outputs["Color"], rr.inputs["Value"])
    nt.links.new(rr.outputs["Result"], bsdf.inputs["Roughness"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Distance"].default_value = 0.06
    nt.links.new(tex.outputs["Color"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return m, nt, bsdf


def _fresh(name):
    m = bpy.data.materials.get(name)
    if m:
        bpy.data.materials.remove(m)
    return principled(name, (0.5, 0.5, 0.5))


ROOT_DIR = []


def materials(root=None):
    root = root or ROOT
    ROOT_DIR[:] = [root]
    M = {}
    M["polished"] = principled("Сталь полированная", (0.86, 0.86, 0.87), metallic=1.0, rough=0.06)[0]
    M["brushed"] = brushed("Сталь сатин вдоль Y", "Y")
    M["brushed_x"] = brushed("Сталь сатин вдоль X", "X")
    M["white_gold"] = principled("Белое золото полированное", (0.84, 0.83, 0.80), metallic=1.0, rough=0.05)[0]
    m, nt, bsdf = principled("Люминофор Chromalight", (0.86, 0.88, 0.86), rough=0.5)
    bsdf.inputs["Subsurface Weight"].default_value = 0.15
    M["lume"] = m
    M["sapphire"] = sapphire()
    # циферблат: чёрный лак и белая печать по маске с официального фото
    m, nt, bsdf = _fresh("Циферблат: лак и печать")
    mask = _mask_node(nt, root, "dial_print.png", "CLIP")
    _mix_inputs(nt, bsdf, mask, [("Base Color", (0.004, 0.004, 0.005), (0.86, 0.86, 0.85)), ("Roughness", 0.05, 0.32)])
    bsdf.inputs["Coat Weight"].default_value = 1.0
    bsdf.inputs["Coat Roughness"].default_value = 0.03
    M["dial"] = m
    # вставка: керамика и платина (зерно пескоструя), цифры утоплены гравировкой
    m, nt, bsdf = _fresh("Вставка: керамика и платина")
    mask = _mask_node(nt, root, "insert_platinum.png")
    _mix_inputs(nt, bsdf, mask, [("Base Color", (0.006, 0.006, 0.007), (0.70, 0.70, 0.71)), ("Metallic", 0.0, 1.0),
                                  ("Roughness", 0.05, 0.34), ("Coat Weight", 0.8, 0.0)])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.invert = True
    bump.inputs["Distance"].default_value = 0.05
    bump.inputs["Strength"].default_value = 0.8
    nt.links.new(mask.outputs["Color"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    M["insert"] = m
    M["ceramic"] = m
    # флажок: чёрный лак, лазерная гравировка матовее и чуть светлее
    m, nt, bsdf = _fresh("Флажок: гравировка ROLEX")
    mask = _mask_node(nt, root, "flange_engraving.png")
    _mix_inputs(nt, bsdf, mask, [("Base Color", (0.008, 0.008, 0.009), (0.05, 0.05, 0.05)), ("Roughness", 0.1, 0.55)])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.invert = True
    bump.inputs["Distance"].default_value = 0.01
    nt.links.new(mask.outputs["Color"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    M["flange"] = m
    return M


# ---------------------------------------------------------------- детали
def case_middle(M):
    body = extrude("Корпус", case_outline(), Z_CASE_BOT - 1, Z_CASE_TOP + 1)
    prof = extrude("_профиль", side_profile(), -30, 30, plane="YZ")
    boolean(body, prof, "INTERSECT")
    # внутренняя расточка: под стекло и циферблат, под механизм, под резьбу крышки
    boolean(body, cylinder("_r1", 15.75, Z_CASE_TOP - 1.6, Z_CASE_TOP + 1))
    boolean(body, cylinder("_r2", 14.6, Z_CASE_BOT - 1, Z_CASE_TOP))
    boolean(body, cylinder("_r3", 16.4, Z_CASE_BOT - 1, Z_CASE_BOT + 1.6))
    boolean(body, cylinder("_tube", 1.35, 18.0, 24.0, seg=64, axis="X", center=(0, 0, CROWN_Z)))
    o = finish(body, bevel=0.14)
    me = o.data
    me.materials.append(M["brushed"])
    me.materials.append(M["polished"])
    for p in me.polygons:
        # сатин сверху (верх ушек и корпуса), полировка по бокам и снизу
        p.material_index = 0 if p.normal.z > 0.45 else 1
    return o


def lathe(name, prof, seg=360):
    """Тело вращения: профиль [(r, z), ...] (замкнутый, против часовой в плоскости rz) вокруг оси Z."""
    bm = bmesh.new()
    vs = [bm.verts.new((r, 0, z)) for r, z in prof]
    edges = [bm.edges.new((vs[i], vs[(i + 1) % len(vs)])) for i in range(len(vs))]
    bmesh.ops.spin(bm, geom=vs + edges, cent=(0, 0, 0), axis=(0, 0, 1), angle=2 * math.pi, steps=seg, use_duplicate=False)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_obj(name, bm)


def bezel(M):
    """Безель: 60 полукруглых выборок по краю, полированный скат сверху, гнездо под вставку."""
    prof = [(15.7, 0.0), (20.15, 0.0), (20.5, 0.3), (20.5, 2.2), (20.38, 2.45), (19.12, 2.93),
            (19.06, 2.93), (19.06, 2.56), (15.7, 2.22)]
    o = lathe("Безель", prof, seg=720)
    rc, d = 0.95, 20.95
    bm = bmesh.new()
    for i in range(60):
        a = math.radians(90 + i * 6 + 3)          # выборки между зубцами; зубец на 12 часах под треугольником
        g = bmesh.ops.create_cone(bm, cap_ends=True, segments=48, radius1=rc, radius2=rc, depth=6)
        bmesh.ops.translate(bm, verts=g["verts"], vec=(d * math.cos(a), d * math.sin(a), 1.5))
    cut = mesh_obj("_выборки", bm)
    boolean(o, cut)
    finish(o, bevel=0.08, seg=2)
    o.data.materials.append(M["polished"])
    return o


def insert(M):
    """Вставка Cerachrom: чёрная керамика; цифры и деления с платиной (маска из официального фото)."""
    prof = [(15.44, 2.22), (19.03, 2.56), (19.03, 2.86), (15.44, 2.64)]
    o = lathe("Вставка безеля", prof, seg=720)
    uv_polar(o, 15.44, 19.03)
    finish(o, bevel=0.05, seg=2)
    o.data.materials.append(M["insert"])
    # капсула люминофора в оправе из белого золота над треугольником на нуле
    cup = lathe("Капсула безеля: оправа", [(0, 2.83), (0.62, 2.83), (0.66, 3.05), (0.6, 3.12), (0, 3.12)], seg=96)
    cup.location = (0, 18.15, 0.0)
    finish(cup, bevel=0.03, seg=2)
    cup.data.materials.append(M["white_gold"])
    pip = lathe("Капсула безеля: люминофор", [(0, 3.05), (0.5, 3.05), (0.5, 3.13), (0.35, 3.19), (0, 3.21)], seg=96)
    pip.location = (0, 18.15, 0.0)
    pip.data.materials.append(M["lume"])
    return o


def crystal(M):
    """Сапфир: плоский, с фаской по краю, сидит на прокладке в корпусе."""
    prof = [(0.0, 1.3), (15.38, 1.3), (15.38, 3.55), (14.95, 4.0), (0.0, 4.0)]
    o = lathe("Стекло", prof, seg=360)
    finish(o, bevel=0.06, seg=3)
    o.data.materials.append(M["sapphire"])
    return o


FL_R0, FL_R1 = 13.55, 14.2       # видимая наклонная часть флажка (замер по фото)
FL_RISE = 0.85                   # подъём наклона: буквы на фото сжаты по радиусу как при наклоне ≈52°


def flange(M):
    """Флажок (рехаут): наклонное чёрное кольцо с гравировкой ROLEX по кругу; над ним стальная опора стекла."""
    z1 = Z_DIAL + FL_RISE
    o = lathe("Флажок", [(FL_R0, Z_DIAL), (FL_R1, z1), (14.5, z1), (14.5, Z_DIAL - 0.05), (FL_R0, Z_DIAL - 0.05)], seg=720)
    uv_polar(o, FL_R0, FL_R1)
    o.data.materials.append(M["flange"])
    seat = lathe("Опора стекла", [(FL_R1, z1), (FL_R1, 1.27), (15.6, 1.27), (15.6, z1)], seg=360)
    finish(seat, bevel=0.04, seg=2)
    seat.data.materials.append(M["polished"])
    return o


def dial(M):
    prof = [(0.0, Z_DIAL - 0.4), (13.85, Z_DIAL - 0.4), (13.85, Z_DIAL), (0.0, Z_DIAL)]
    o = lathe("Циферблат", prof, seg=360)
    uv_planar(o, 2 * 14.7)                   # квадрат текстуры = кроп фото 29,4 мм
    o.data.materials.append(M["dial"])
    return o


# ---------------------------------------------------------------- метки и стрелки (замеры по фото)
MARK_H = 0.45                    # высота накладных меток над циферблатом


def _shape_mesh(name, outlines, z0, z1, bevel=0.04):
    """Плоские контуры (список замкнутых ломаных в мм) вытягиваются в одно тело и объединяются."""
    parts = []
    for i, pts in enumerate(outlines):
        parts.append(extrude(f"_{name}{i}", pts, z0, z1))
    o = parts[0]
    o.name = name
    o.data.name = name
    for extra in parts[1:]:
        boolean(o, extra, "UNION")
    finish(o, bevel=bevel, seg=2)
    return o


def _circle(cx, cy, r, n=64):
    return [(cx + r * math.cos(2 * math.pi * i / n), cy + r * math.sin(2 * math.pi * i / n)) for i in range(n)]


def _rot(pts, ang):
    c, s_ = math.cos(ang), math.sin(ang)
    return [(x * c - y * s_, x * s_ + y * c) for x, y in pts]


def _offset_poly(pts, d):
    """Сдвиг выпуклого контура внутрь на d (для люминофора внутри оправы)."""
    cx = sum(p[0] for p in pts) / len(pts)
    cy = sum(p[1] for p in pts) / len(pts)
    out = []
    for x, y in pts:
        v = Vector((x - cx, y - cy))
        L = v.length
        out.append((cx + v.x * max(0, L - d) / L, cy + v.y * max(0, L - d) / L) if L else (x, y))
    return out


def markers(M):
    """Накладные метки: оправа из белого золота и люминофор Chromalight внутри."""
    shapes = []
    for h in range(12):
        a = math.radians(90 - h * 30)
        if h == 0:                                       # треугольник вершиной к центру
            base_r, apex_r, half = 12.25, 7.95, 3.41 / 2
            loc = [(-half, base_r), (half, base_r), (0, apex_r)]
            loc = _rot([(x, y) for x, y in loc], a - math.pi / 2)
            shapes.append(("Метка 12", loc, 0.22))
        elif h in (3, 6, 9):
            r0, r1, half = 8.4, 12.4, 1.70 / 2
            loc = [(-half, r0), (half, r0), (half, r1), (-half, r1)]
            shapes.append((f"Метка {h}", _rot(loc, a - math.pi / 2), 0.2))
        else:
            r = 11.08
            shapes.append((f"Метка {h}", _circle(r * math.cos(a), r * math.sin(a), 1.21), 0.2))
    for name, pts, inset in shapes:
        rim = extrude(name, pts, Z_DIAL - 0.05, Z_DIAL + MARK_H)
        finish(rim, bevel=0.05, seg=2)
        rim.data.materials.append(M["white_gold"])
        lume = extrude(name + ": люминофор", _offset_poly(pts, inset), Z_DIAL + MARK_H - 0.04, Z_DIAL + MARK_H + 0.03)
        finish(lume, bevel=0.03, seg=2)
        lume.data.materials.append(M["lume"])


HAND_ANG = {"hour": 145.4, "minute": 26.45, "second": -96.25}   # положение на официальном фото (10:10:31)
HAND_Z = {"hour": Z_DIAL + 0.85, "minute": Z_DIAL + 1.25, "second": Z_DIAL + 1.65}
HAND_T = 0.2


def _hand(name, body, lume, z, ang, M, cap_r):
    rot = math.radians(ang - 90)
    o = _shape_mesh(name, [_rot(p, rot) for p in body], z, z + HAND_T, bevel=0.035)
    o.data.materials.append(M["white_gold"])
    for i, p in enumerate(lume):
        l = extrude(f"{name}: люминофор {i + 1}", _rot(p, rot), z + HAND_T - 0.03, z + HAND_T + 0.04)
        finish(l, bevel=0.02, seg=2)
        l.data.materials.append(M["lume"])
        l.parent = o
    tube = cylinder(f"{name}: втулка", cap_r, Z_DIAL + 0.05, z + HAND_T * 0.9, seg=64)
    tube.data.materials.append(M["white_gold"])
    tube.parent = o
    return o


def hands(M):
    """Стрелки по замерам с фото: часовая «Мерседес», минутная-шпага, секундная с кружком люминофора."""
    # часовая: втулка, стержень, круг ⌀2,94, копьё до 7,95 мм
    disc, R = 4.83, 1.47
    body = [_circle(0, 0, 0.78), [(-0.46, 0), (0.46, 0), (0.46, disc), (-0.46, disc)], _circle(0, disc, R),
            [(-0.92, disc + 0.9), (0.92, disc + 0.9), (0, 7.95)]]
    spokes = []                                        # люминофор: три сектора круга между спицами «Мерседеса»
    for k in range(3):
        a0 = math.radians(-90 + 120 * k + 12)
        a1 = math.radians(-90 + 120 * (k + 1) - 12)
        pts = [(0.17 * math.cos((a0 + a1) / 2), disc + 0.17 * math.sin((a0 + a1) / 2))]
        pts += [(1.2 * math.cos(a0 + (a1 - a0) * i / 16), disc + 1.2 * math.sin(a0 + (a1 - a0) * i / 16)) for i in range(17)]
        spokes.append(pts)
    lume = spokes + [[(-0.55, disc + 1.45), (0.55, disc + 1.45), (0, 7.45)], [(-0.27, 1.3), (0.27, 1.3), (0.27, disc - 1.25), (-0.27, disc - 1.25)]]
    _hand("Часовая стрелка", body, lume, HAND_Z["hour"], HAND_ANG["hour"], M, 0.78)
    # минутная: шпага до 12,48 мм
    body = [_circle(0, 0, 0.66), [(-0.36, 0), (0.36, 0), (0.56, 10.4), (0, 12.48), (-0.56, 10.4)]]
    lume = [[(-0.2, 2.0), (0.2, 2.0), (0.36, 10.2), (0, 11.6), (-0.36, 10.2)]]
    _hand("Минутная стрелка", body, lume, HAND_Z["minute"], HAND_ANG["minute"], M, 0.62)
    # секундная: тонкий стержень, кружок люминофора на 7,30 мм, противовес на 4,41 мм
    body = [_circle(0, 0, 0.55), [(-0.13, -4.41), (0.13, -4.41), (0.08, 13.0), (-0.08, 13.0)],
            _circle(0, 7.30, 0.57), _circle(0, -4.41, 0.49)]
    lume = [_circle(0, 7.30, 0.44, 48)]
    _hand("Секундная стрелка", body, lume, HAND_Z["second"], HAND_ANG["second"], M, 0.45)


def caseback(M):
    """Завинчивающаяся крышка: рифлёный край под ключ, полированный купол."""
    # снаружи купол и рифлёный фланец, внутри полость под механизм и ротор, резьбовой поясок уходит в корпус
    prof = [(0.0, Z_BACK_BOT), (11.5, Z_BACK_BOT), (14.6, Z_BACK_BOT + 0.55), (16.2, Z_BACK_BOT + 1.15),
            (16.2, Z_CASE_BOT + 0.05), (16.35, Z_CASE_BOT + 0.1), (16.35, Z_CASE_BOT + 1.6), (14.75, Z_CASE_BOT + 1.6),
            (14.75, Z_BACK_BOT + 0.9), (0.0, Z_BACK_BOT + 0.9)]
    o = lathe("Задняя крышка", prof, seg=720)
    bm = bmesh.new()
    for i in range(36):
        a = math.radians(i * 10)
        g = bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=0.42, radius2=0.42, depth=1.4)
        bmesh.ops.translate(bm, verts=g["verts"], vec=(16.45 * math.cos(a), 16.45 * math.sin(a), Z_BACK_BOT + 1.25))
    boolean(o, mesh_obj("_рифление", bm))
    finish(o, bevel=0.08, seg=2)
    o.data.materials.append(M["polished"])
    return o


def crown(M):
    """Заводная головка Triplock: 18 рёбер, полированная, трубка в корпусе."""
    R, L, x0 = 3.4, 3.65, 20.6          # кончик на 24,25 мм от оси, как на фото
    prof = [(0.0, 0.0), (R - 0.35, 0.0), (R, 0.35), (R, L - 0.7), (R - 0.55, L - 0.15), (R - 1.2, L), (0.0, L)]
    o = lathe("Головка", prof, seg=360)
    bm = bmesh.new()
    for i in range(18):
        a = math.radians(i * 20)
        g = bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=0.38, radius2=0.38, depth=L - 1.1)
        bmesh.ops.translate(bm, verts=g["verts"], vec=((R + 0.12) * math.cos(a), (R + 0.12) * math.sin(a), (L - 1.1) / 2 + 0.25))
    boolean(o, mesh_obj("_рёбра", bm))
    o.data.transform(Matrix.Rotation(math.pi / 2, 4, "Y"))
    o.location = (x0, 0, CROWN_Z)
    finish(o, bevel=0.06, seg=2)
    o.data.materials.append(M["polished"])
    tube = cylinder("Трубка головки", 1.3, 0, 1.4, seg=96, axis="X", center=(19.5, 0, CROWN_Z))
    tube.data.materials.append(M["polished"])
    return o


# ---------------------------------------------------------------- браслет Oyster
# Петля как на руке: эллипс в плоскости YZ, проходит через точки крепления у ушек. Звенья жёсткие и прямые
# между шарнирами на петле; ширина сужается с 21 мм у корпуса до 18 мм у застёжки (паспорт Oyster).
BR_A, BR_B, BR_N = 34.0, 25.0, 3.0  # петля-суперэллипс |y/a|^n + |z/b|^n = 1: плоский верх, браслет выходит из ушек под ≈21°
BR_ATTACH = (22.0, -3.9)           # пружинная шпилька в ушках (y, z): 1,8 мм от кончика, посередине толщины
BR_T = 3.2                         # толщина звена
BR_PITCH = 7.4                     # шаг звена
BR_END = 3.5                       # концевое звено выступает за шпильку до первого шарнира
BR_END_IN = 4.4                    # и уходит внутрь между ушками до корпуса
BR_CLASP = 34.0                    # длина застёжки Oysterlock
BR_W0, BR_W1 = 21.0, 18.0


def _loop():
    """Точки петли от крепления у 12 часов вокруг низа к креплению у 6 часов (суперэллипс в плоскости YZ)."""
    yA, zA = BR_ATTACH
    u = (1 - (yA / BR_A) ** BR_N) ** (1 / BR_N)
    zc = zA - BR_B * u
    sgn = lambda v: math.copysign(1.0, v)
    def P(t):
        c, s_ = math.cos(t), math.sin(t)
        return Vector((0, BR_A * sgn(c) * abs(c) ** (2 / BR_N), zc + BR_B * sgn(s_) * abs(s_) ** (2 / BR_N)))
    # параметр крепления: |cos t|^(2/n) = yA/a
    t0 = math.acos((yA / BR_A) ** (BR_N / 2))
    pts = []
    n = 3000
    for i in range(n + 1):
        t = t0 - (math.pi + 2 * t0) * i / n
        pts.append(P(t))
    acc = [0.0]
    for i in range(1, len(pts)):
        acc.append(acc[-1] + (pts[i] - pts[i - 1]).length)
    return pts, acc, zc


def _at(pts, acc, d):
    """Точка петли на расстоянии d от начала."""
    for i in range(1, len(acc)):
        if acc[i] >= d:
            f = (d - acc[i - 1]) / (acc[i] - acc[i - 1])
            return pts[i - 1].lerp(pts[i], f)
    return pts[-1]


def _frame(p0, p1, zc):
    """Матрица звена: X поперёк браслета, Y вдоль, Z наружу петли."""
    y = (p1 - p0).normalized()
    mid = (p0 + p1) / 2
    out = (mid - Vector((0, 0, zc)))
    out.x = 0
    z = (out - y * out.dot(y)).normalized()
    x = y.cross(z)
    m = Matrix((x, y, z)).transposed().to_4x4()
    m.translation = mid
    return m


def _block(name, w, L, T, crown=0.12, round_out=0.0, side=0):
    """Деталь звена: сверху слегка выпуклая, края на скосах. side: 0 центр, ±1 боковая (скругление наружу)."""
    bm = bmesh.new()
    nx, ny = 16, 8
    grid = {}
    for i in range(nx + 1):
        for j in range(ny + 1):
            x = -w / 2 + w * i / nx
            y = -L / 2 + L * j / ny
            u = x / (w / 2)
            v = y / (L / 2)
            # Oyster links have a gently pillowed top in both directions. The old
            # four-row surface and large outer slope produced visibly folded plates.
            zt = T / 2 + crown * (1 - u * u) + 0.13 * (1 - v * v)
            if side and round_out:
                k = max(0.0, side * u)                    # к внешнему краю браслета
                zt -= min(round_out, 0.28) * k ** 3
            grid[i, j, 1] = bm.verts.new((x, y, zt))
            grid[i, j, 0] = bm.verts.new((x, y, -T / 2))
    for i in range(nx):
        for j in range(ny):
            bm.faces.new([grid[i, j, 1], grid[i + 1, j, 1], grid[i + 1, j + 1, 1], grid[i, j + 1, 1]])
            bm.faces.new([grid[i, j, 0], grid[i, j + 1, 0], grid[i + 1, j + 1, 0], grid[i + 1, j, 0]])
    for i in range(nx):
        for j, rev in ((0, False), (ny, True)):
            q = [grid[i, j, 0], grid[i + 1, j, 0], grid[i + 1, j, 1], grid[i, j, 1]]
            bm.faces.new(q[::-1] if rev else q)
    for j in range(ny):
        for i, rev in ((0, True), (nx, False)):
            q = [grid[i, j, 0], grid[i, j + 1, 0], grid[i, j + 1, 1], grid[i, j, 1]]
            bm.faces.new(q[::-1] if rev else q)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_obj(name, bm)


def _link_finish(o, M, bevel=0.32):
    finish(o, bevel=max(bevel, 0.36), seg=6, angle=45)
    # Weighted normals flatten the broad convex surfaces into white facets.
    # Area-smoothed normals keep the highlight continuous across each link.
    for modifier in list(o.modifiers):
        if modifier.type == "WEIGHTED_NORMAL":
            o.modifiers.remove(modifier)
    o.data.materials.append(M["brushed"])
    o.data.materials.append(M["polished"])
    for p in o.data.polygons:
        p.material_index = 0 if p.normal.z > 0.6 else 1      # верх сатин, скосы и бока полированы


def _screw(name, w, M, head_side=1):
    """Винтовой штифт звена: стержень поперёк браслета, шлицевая головка на боку."""
    r, hr, hh = 0.5, 0.9, 0.35
    body = cylinder(name, r, -w / 2 + 0.15, w / 2 - hh, seg=48, axis="X")
    head = cylinder("_голова", hr, 0, hh, seg=64, axis="X", center=(w / 2 - hh, 0, 0))
    boolean(body, head, "UNION")
    slot = extrude("_шлиц", [(-0.12, -1.0), (0.12, -1.0), (0.12, 1.0), (-0.12, 1.0)], 0, 1)
    slot.data.transform(Matrix.Rotation(math.pi / 2, 4, "Y"))
    slot.location = (w / 2 - 0.12, 0, 0)
    bpy.context.view_layer.update()
    slot.data.transform(slot.matrix_world)
    slot.location = (0, 0, 0)
    boolean(body, slot)
    if head_side < 0:
        body.data.transform(Matrix.Rotation(math.pi, 4, "Z"))
    finish(body, bevel=0.04, seg=2)
    body.data.materials.append(M["polished"])
    return body


def bracelet(M):
    pts, acc, zc = _loop()
    total = acc[-1]
    avail = (total - 2 * BR_END - BR_CLASP) / 2
    n = max(1, round(avail / BR_PITCH))
    pitch = avail / n
    stations = [0.0, BR_END] + [BR_END + pitch * (i + 1) for i in range(n)]
    half = total / 2
    width = lambda d: BR_W0 + (BR_W1 - BR_W0) * min(1.0, d / (BR_END + avail))
    parts = []
    for side_name, sign in (("12", 1), ("6", -1)):
        for k in range(len(stations) - 1):
            d0, d1 = stations[k], stations[k + 1]
            if sign < 0:
                d0, d1 = total - d1, total - d0
            p0, p1 = _at(pts, acc, d0), _at(pts, acc, d1)
            mtx = _frame(p0, p1, zc)
            L = (p1 - p0).length - 0.12
            w = width(stations[k] + (stations[k + 1] - stations[k]) / 2)
            if k == 0:
                # между ушками: от корпуса до первого шарнира; внутренняя сторона повторяет окружность корпуса
                tang = (p1 - p0).normalized()
                a_ = p0 - tang * BR_END_IN
                em = _frame(a_, p1, zc)
                Le = (p1 - a_).length - 0.06
                o = _block(f"Концевое звено {side_name}", BR_W0 - 0.1, Le, BR_T + 0.4, crown=0.22)
                o.matrix_world = em
                bpy.context.view_layer.update()
                o.data.transform(o.matrix_world)
                o.matrix_world = Matrix.Identity(4)
                boolean(o, cylinder("_корпус", R_CASE + 0.05, -20, 10, seg=256))
                o.data.transform(em.inverted())
                # две продольные канавки: концевое звено продолжает рисунок звеньев из трёх частей
                for gx in (-0.22 * BR_W0, 0.22 * BR_W0):
                    gv = extrude("_канавка", [(gx - 0.07, -Le), (gx + 0.07, -Le), (gx + 0.07, Le), (gx - 0.07, Le)], (BR_T + 0.4) / 2 - 0.18, (BR_T + 0.4) / 2 + 1.0)
                    boolean(o, gv)
                o.matrix_world = em
                _link_finish(o, M, bevel=0.25)
                parts.append(o)
                # шпилька в ушках
                sb = cylinder(f"Шпилька {side_name}", 0.9, -BR_W0 / 2 - 0.9, BR_W0 / 2 + 0.9, seg=48, axis="X")
                sb.location = p0
                sb.data.materials.append(M["polished"])
                continue
            wc = 0.44 * w
            ws = (w - wc) / 2 - 0.06
            idx = f"{side_name}.{k}"
            c = _block(f"Звено {idx}: центр", wc, L, BR_T, crown=0.3)
            _link_finish(c, M)
            c.matrix_world = mtx
            for sgn, nm in ((-1, "лев"), (1, "прав")):
                sp = _block(f"Звено {idx}: {nm}", ws, L, BR_T, crown=0.08, round_out=1.3, side=sgn)
                _link_finish(sp, M)
                off = Matrix.Translation((sgn * (wc / 2 + 0.06 + ws / 2), 0, 0))
                sp.matrix_world = mtx @ off
            # винт в шарнире на конце звена, ближнем к застёжке
            sc = _screw(f"Винт {idx}", w, M, head_side=1 if sign > 0 else -1)
            sc.matrix_world = mtx @ Matrix.Translation((0, L / 2 + 0.06, -0.3))
            parts.append(c)
    # застёжка Oysterlock: изогнутая по низу петли крышка
    d = half
    p0, p1 = _at(pts, acc, d - BR_CLASP / 2), _at(pts, acc, d + BR_CLASP / 2)
    mtx = _frame(p0, p1, zc)
    cl = _block("Застёжка Oysterlock", BR_W1 + 0.4, BR_CLASP - 0.2, 3.8, crown=0.35)
    # изгиб по петле: Z каждой вершины опускается по дуге радиуса a²/b
    R = 60.0                                           # радиус изгиба крышки по низу петли
    for v in cl.data.vertices:
        v.co.z -= R - math.sqrt(max(0.0, R * R - v.co.y ** 2))
    _link_finish(cl, M)
    # корона на крышке застёжки: полированный рельеф по силуэту короны с официального циферблата
    uv_planar(cl, 14.0)
    crown_mask = _mask_node_any("crown_logo.png")
    if crown_mask:
        m = bpy.data.materials.get("Застёжка: сатин и корона")
        if m:
            bpy.data.materials.remove(m)
        m, nt, bsdf = brushed_with_mask("Застёжка: сатин и корона", crown_mask)
        cl.data.materials[0] = m
    cl.matrix_world = mtx
    return parts


PARTS = {"case": case_middle, "bezel": bezel, "insert": insert, "crystal": crystal, "flange": flange,
         "dial": dial, "markers": markers, "hands": hands, "caseback": caseback, "crown": crown, "bracelet": bracelet}


def build(which="all", root=None):
    if which == "all":
        reset()
    M = materials(root)
    names = PARTS if which == "all" else [which]
    for k in names:
        PARTS[k](M)
    return M
