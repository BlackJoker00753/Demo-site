# Механизм в духе калибра Rolex 3230 для разборки Submariner 124060 (выполняется после sub124060.py
# в том же пространстве имён: exec(open(...).read(), G); G["movement"](M, root)).
#
# Облик деталей по официальным материалам Rolex (teardown_src/3d/rolex-submariner/ref/): спуск Chronergy со
# скелетонированным колесом, баланс с золотым ободом, гайками Microstella и синей спиралью Parachrom, ротор
# Perpetual с радиальной шлифовкой и золотой надписью. Надпись и корона взяты с официального циферблата.
# Раскладка колёс правдоподобная, не чертёж калибра: калибр 3230 Rolex не публикует.
#
# Каждая деталь получает свойства для разборки: ["шаг"] (порядок), ["ход"] (куда уходит, мм),
# ["винт"] (выкручивается с вращением), ["ось_винта"].

MV_R = 14.2                  # радиус платины (калибр ⌀28,5 мм)
Z_PLATE_TOP = Z_DIAL - 0.45  # платина под циферблатом
Z_PLATE_BOT = Z_PLATE_TOP - 1.6
Z_WHEEL = Z_PLATE_BOT - 0.15
Z_BRIDGE_BOT = Z_PLATE_BOT - 1.55
Z_BRIDGE_TOP = Z_BRIDGE_BOT - 0.9
Z_AUTO_TOP = Z_BRIDGE_TOP - 0.15
Z_AUTO_BOT = Z_AUTO_TOP - 0.7
Z_ROTOR_TOP = Z_AUTO_BOT - 0.15

# раскладка (вид со стороны циферблата, мм)
P_BARREL = (3.7, 5.5)
P_W2 = (0.0, 0.0)
P_W3 = (5.6, -0.9)
P_W4 = (-2.7, -2.0)
P_ESC = (-5.0, -5.7)
P_PAL = (-2.3, -7.1)
P_BAL = (1.3, -8.4)


def _tag(o, step, travel, screw=False, axis=(0, 0, -1)):
    o["шаг"] = step
    o["ход"] = travel
    o["винт"] = screw
    o["ось_винта"] = axis
    return o


def _mat(name, color, metallic=1.0, rough=0.2, **kw):
    m, nt, bsdf = principled(name, color, metallic=metallic, rough=rough)
    for k, v in kw.items():
        bsdf.inputs[k].default_value = v
    return m


def cotes(name, color=(0.80, 0.80, 0.82), width=1.1):
    """Côtes de Genève: параллельные полосы шириной width, внутри каждой дуговая шлифовка (меняется анизотропия)."""
    m = bpy.data.materials.get(name)
    if m:
        bpy.data.materials.remove(m)
    m, nt, bsdf = principled(name, color, metallic=1.0, rough=0.22)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Object"], sep.inputs["Vector"])
    # фаза внутри полосы 0..1 по X
    div = nt.nodes.new("ShaderNodeMath"); div.operation = "DIVIDE"; div.inputs[1].default_value = width
    fr = nt.nodes.new("ShaderNodeMath"); fr.operation = "FRACT"
    nt.links.new(sep.outputs["X"], div.inputs[0]); nt.links.new(div.outputs[0], fr.inputs[0])
    # дуга шлифовального круга: высота рельефа = (фаза-0.5)^2
    sub_ = nt.nodes.new("ShaderNodeMath"); sub_.operation = "SUBTRACT"; sub_.inputs[1].default_value = 0.5
    sq = nt.nodes.new("ShaderNodeMath"); sq.operation = "POWER"; sq.inputs[1].default_value = 2.0
    nt.links.new(fr.outputs[0], sub_.inputs[0]); nt.links.new(sub_.outputs[0], sq.inputs[0])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.35
    bump.inputs["Distance"].default_value = 0.01
    nt.links.new(sq.outputs[0], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    bsdf.inputs["Anisotropic"].default_value = 0.6
    rr = nt.nodes.new("ShaderNodeMapRange")
    rr.inputs["To Min"].default_value, rr.inputs["To Max"].default_value = 0.16, 0.3
    nt.links.new(sq.outputs[0], rr.inputs["Value"])
    nt.links.new(rr.outputs["Result"], bsdf.inputs["Roughness"])
    return m


def radial_brushed(name, color=(0.82, 0.82, 0.84)):
    """Солнечная (радиальная) шлифовка ротора: анизотропия по касательной к окружности."""
    m = bpy.data.materials.get(name)
    if m:
        bpy.data.materials.remove(m)
    m, nt, bsdf = principled(name, color, metallic=1.0, rough=0.28)
    bsdf.inputs["Anisotropic"].default_value = 0.85
    tg = nt.nodes.new("ShaderNodeTangent")
    tg.direction_type = "RADIAL"
    tg.axis = "Z"
    nt.links.new(tg.outputs["Tangent"], bsdf.inputs["Tangent"])
    return m


def mv_materials(M):
    M["plate"] = _mat("Платина: родий, перляж", (0.78, 0.78, 0.80), rough=0.3)
    M["cotes"] = cotes("Мосты: Côtes de Genève")
    M["wheel"] = _mat("Колёса: бериллиевая бронза", (0.86, 0.60, 0.45), rough=0.18)
    M["steel_mv"] = _mat("Сталь механизма", (0.80, 0.80, 0.82), rough=0.12)
    M["ruby"] = _mat("Рубин", (0.55, 0.02, 0.05), metallic=0.0, rough=0.02, **{"Transmission Weight": 0.6, "IOR": 1.76})
    M["balance_gold"] = _mat("Баланс: золотистый обод", (0.92, 0.74, 0.42), rough=0.12)
    M["parachrom"] = _mat("Спираль Parachrom", (0.10, 0.28, 0.85), rough=0.15)
    M["rotor"] = radial_brushed("Ротор: радиальная шлифовка")
    M["gold_fill"] = _mat("Золотая гравировка", (0.95, 0.72, 0.30), rough=0.25)
    M["reversing"] = _mat("Реверсивные колёса", (0.86, 0.45, 0.42), rough=0.2)
    return M


# ---------------------------------------------------------------- детали-примитивы
def _gear(name, center, r, z0, z1, teeth, spokes=5, hub=0.55, rim=0.55, M=None, mat="wheel"):
    """Колесо: зубья трапецией, спицы вырезаны между ободом и ступицей."""
    pts = []
    for i in range(teeth):
        a0 = 2 * math.pi * i / teeth
        da = 2 * math.pi / teeth
        rr = r - 0.22
        for f, rad in ((0.0, rr), (0.18, r), (0.42, r), (0.6, rr)):
            a = a0 + da * f
            pts.append((center[0] + rad * math.cos(a), center[1] + rad * math.sin(a)))
    o = extrude(name, pts, z0, z1)
    if spokes and r > 1.4:
        inner = r - 0.22 - rim
        bm = bmesh.new()
        for k in range(spokes):
            a0 = 2 * math.pi * k / spokes + 0.22
            a1 = 2 * math.pi * (k + 1) / spokes - 0.22
            sec = [(center[0] + hub * 1.4 * math.cos((a0 + a1) / 2), center[1] + hub * 1.4 * math.sin((a0 + a1) / 2))]
            sec += [(center[0] + inner * math.cos(a0 + (a1 - a0) * j / 10), center[1] + inner * math.sin(a0 + (a1 - a0) * j / 10)) for j in range(11)]
            vs = [bm.verts.new((x, y, z1 + 0.5)) for x, y in sec]
            f = bm.faces.new(vs)
            ex = bmesh.ops.extrude_face_region(bm, geom=[f])
            bmesh.ops.translate(bm, verts=[e for e in ex["geom"] if isinstance(e, bmesh.types.BMVert)], vec=(0, 0, z0 - z1 - 1.0))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        boolean(o, mesh_obj("_спицы", bm))
    finish(o, bevel=0.03, seg=1)
    o.data.materials.append(M[mat])
    arbor = cylinder(name + ": ось", 0.16, z1 - 0.25, z0 + 0.25, seg=24, center=(center[0], center[1], 0))
    pin = cylinder(name + ": трибка", 0.42, z1 + 0.05, z1 + 0.6, seg=12, center=(center[0], center[1], 0))
    for x in (arbor, pin):
        x.data.materials.append(M["steel_mv"])
        x.parent = o
        x.matrix_parent_inverse = o.matrix_world.inverted()
    return o


def _jewel(name, xy, z, M):
    j = cylinder(name, 0.55, z - 0.05, z + 0.12, seg=32, center=(xy[0], xy[1], 0))
    finish(j, bevel=0.03, seg=2)
    j.data.materials.append(M["ruby"])
    return j


def _mv_screw(name, xy, z, M, r=0.6):
    """Винт моста: полированная головка со шлицем, стержень уходит в платину (ниже по Z — к крышке)."""
    head = cylinder(name, r, z - 0.12, z + 0.22, seg=40, center=(xy[0], xy[1], 0))
    shank = cylinder("_стержень", 0.32, z + 0.2, z + 1.6, seg=24, center=(xy[0], xy[1], 0))
    boolean(head, shank, "UNION")
    slot = extrude("_шлиц", [(xy[0] - r * 1.2, xy[1] - 0.09), (xy[0] + r * 1.2, xy[1] - 0.09),
                             (xy[0] + r * 1.2, xy[1] + 0.09), (xy[0] - r * 1.2, xy[1] + 0.09)], z - 0.3, z - 0.02)
    boolean(head, slot)
    finish(head, bevel=0.04, seg=2)
    head.data.materials.append(M["steel_mv"])
    return head


def _hull(circles, n=48):
    """Выпуклая оболочка набора окружностей [(x, y, r)] — контур моста."""
    pts = [(x + r * math.cos(2 * math.pi * i / n), y + r * math.sin(2 * math.pi * i / n)) for x, y, r in circles for i in range(n)]
    pts = sorted(set(pts))

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def _hairspring(name, center, z, M, turns=13, r0=0.55, r1=3.0, w=0.07, h=0.14):
    """Спираль Parachrom: архимедова спираль-лента."""
    bm = bmesh.new()
    n = turns * 64
    prev = None
    for i in range(n + 1):
        t = i / n
        a = 2 * math.pi * turns * t
        r = r0 + (r1 - r0) * t
        c, s_ = math.cos(a), math.sin(a)
        ring = [bm.verts.new((center[0] + (r + dr) * c, center[1] + (r + dr) * s_, z + dz)) for dr, dz in ((-w / 2, 0), (w / 2, 0), (w / 2, h), (-w / 2, h))]
        if prev:
            for k in range(4):
                bm.faces.new([prev[k], prev[(k + 1) % 4], ring[(k + 1) % 4], ring[k]])
        prev = ring
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = mesh_obj(name, bm)
    for p in o.data.polygons:
        p.use_smooth = True
    o.data.materials.append(M["parachrom"])
    return o


# ---------------------------------------------------------------- сборка механизма
def movement(M, root=None):
    root = root or ROOT
    mv_materials(M)
    parts = []
    # платина: диск с выборками под колёса (вид со стороны крышки)
    plate = cylinder("Платина", MV_R, Z_PLATE_BOT, Z_PLATE_TOP, seg=360)
    cuts = bmesh.new()
    for (x, y), r in ((P_BAL, 5.15), (P_ESC, 2.3), (P_PAL, 1.9)):
        g = bmesh.ops.create_cone(cuts, cap_ends=True, segments=96, radius1=r, radius2=r, depth=1.0)
        bmesh.ops.translate(cuts, verts=g["verts"], vec=(x, y, Z_PLATE_BOT))
    boolean(plate, mesh_obj("_выборки", cuts))
    finish(plate, bevel=0.06, seg=2)
    plate.data.materials.append(M["plate"])
    _tag(plate, 90, (0, 0, -60))
    parts.append(plate)
    ring = lathe("Кольцо механизма", [(MV_R + 0.02, Z_PLATE_BOT - 2.0), (14.55, Z_PLATE_BOT - 2.0), (14.55, Z_PLATE_TOP - 0.1), (MV_R + 0.02, Z_PLATE_TOP - 0.1)], seg=256)
    ring.data.materials.append(M["steel_mv"])
    _tag(ring, 89, (0, 0, -40))

    # колёсная передача
    zA0, zA1 = Z_WHEEL - 0.18, Z_WHEEL
    zB0, zB1 = Z_WHEEL - 0.75, Z_WHEEL - 0.57
    barrel = lathe("Барабан", [(0.0, Z_WHEEL - 1.3), (5.2, Z_WHEEL - 1.3), (5.2, Z_WHEEL - 0.05), (0.0, Z_WHEEL - 0.05)], seg=180)
    teeth = _gear("_зубья барабана", (0, 0), 5.45, Z_WHEEL - 1.3, Z_WHEEL - 1.0, 90, spokes=0, M=M)
    boolean(barrel, teeth, "UNION")
    barrel.location = (P_BARREL[0], P_BARREL[1], 0)
    finish(barrel, bevel=0.05, seg=2)
    barrel.data.materials.append(M["wheel"])
    lid = cylinder("Барабан: крышка", 5.0, Z_WHEEL - 1.36, Z_WHEEL - 1.28, seg=180, center=(P_BARREL[0], P_BARREL[1], 0))
    lid.data.materials.append(M["steel_mv"])
    lid.parent = barrel
    _tag(barrel, 70, (0, 0, -30))
    gears = [
        ("Центральное колесо", P_W2, 4.0, zA0, zA1, 80, 72),
        ("Промежуточное колесо", P_W3, 3.1, zB0, zB1, 75, 73),
        ("Секундное колесо", P_W4, 2.85, zB0, zB1, 70, 74),
        ("Анкерное колесо Chronergy", P_ESC, 1.95, zA0, zA1, 20, 76),
    ]
    for name, xy, r, z0, z1, n, step in gears:
        g = _gear(name, xy, r, z0, z1, n, spokes=5 if n > 20 else 4, M=M, mat="steel_mv" if "Chronergy" in name else "wheel")
        _tag(g, step, (0, 0, -26 - step % 5))
        parts.append(g)
    # анкерная вилка: стальная, два рубиновых палеты
    pal = extrude("Анкерная вилка", _rot([(-0.25, -2.6), (0.25, -2.6), (0.35, 1.9), (1.4, 2.4), (1.2, 2.8), (0, 2.3), (-1.2, 2.8), (-1.4, 2.4), (-0.35, 1.9)],
                                       math.atan2(P_BAL[1] - P_PAL[1], P_BAL[0] - P_PAL[0]) + math.pi / 2), zA0, zA1)
    pal.location = (P_PAL[0], P_PAL[1], 0)
    finish(pal, bevel=0.02, seg=1)
    pal.data.materials.append(M["steel_mv"])
    _tag(pal, 75, (0, 0, -28))
    # баланс: обод, две спицы, четыре гайки Microstella, спираль Parachrom
    bal = lathe("Баланс", [(4.15, zA0 - 0.55), (4.65, zA0 - 0.55), (4.65, zA0 - 0.05), (4.15, zA0 - 0.05)], seg=180)
    bal.location = (P_BAL[0], P_BAL[1], 0)
    arm = extrude("_спица", [(-4.3, -0.22), (4.3, -0.22), (4.3, 0.22), (-4.3, 0.22)], zA0 - 0.45, zA0 - 0.25)
    arm.location = (P_BAL[0], P_BAL[1], 0)
    bpy.context.view_layer.update()
    boolean(bal, arm, "UNION")
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2
        nut = cylinder("_гайка", 0.32, zA0 - 0.5, zA0 - 0.1, seg=24, center=(4.85 * math.cos(a), 4.85 * math.sin(a), 0))
        nut.location = (P_BAL[0], P_BAL[1], 0)
        bpy.context.view_layer.update()
        boolean(bal, nut, "UNION")
    bal.location = (P_BAL[0], P_BAL[1], 0)
    finish(bal, bevel=0.04, seg=2)
    bal.data.materials.append(M["balance_gold"])
    hs = _hairspring("Спираль Parachrom", P_BAL, zA0 - 0.7, M)
    hs.parent = bal
    hs.matrix_parent_inverse = bal.matrix_world.inverted()
    _tag(bal, 60, (0, 0, -34))

    # мосты: барабана и колёс (Côtes de Genève), баланса, анкера
    zb0, zb1 = Z_BRIDGE_BOT, Z_BRIDGE_TOP
    main = extrude("Мост барабана и колёс", _hull([(P_BARREL[0], P_BARREL[1], 6.1), (P_W2[0], P_W2[1], 4.2), (P_W3[0], P_W3[1], 3.9), (P_W4[0], P_W4[1], 3.6), (-6.2, 4.0, 3.2)]), zb1, zb0)
    clear = bmesh.new()
    for (x, y), r in ((P_BAL, 5.4), (P_ESC, 2.6), (P_PAL, 2.2)):
        g = bmesh.ops.create_cone(clear, cap_ends=True, segments=96, radius1=r, radius2=r, depth=4)
        bmesh.ops.translate(clear, verts=g["verts"], vec=(x, y, (zb0 + zb1) / 2))
    boolean(main, mesh_obj("_зазоры", clear))
    finish(main, bevel=0.07, seg=2)
    main.data.materials.append(M["cotes"])
    _tag(main, 50, (0, 0, -22))
    parts.append(main)
    for k, xy in enumerate(((-6.5, 6.2), (9.5, 3.0), (2.8, -3.8))):
        _tag(_mv_screw(f"Винт моста колёс {k + 1}", xy, zb1, M), 40 + k, (0, 0, -6), screw=True)
    for k, xy in enumerate((P_W2, P_W3, P_W4)):
        j = _jewel(f"Камень моста {k + 1}", xy, zb1, M)
        j.parent = main
        j.matrix_parent_inverse = main.matrix_world.inverted()
    # мост баланса — сквозной, на двух винтах
    t = Vector((-P_BAL[1], P_BAL[0])).normalized()
    c = Vector(P_BAL)
    a_, b_ = c - t * 6.4, c + t * 6.4
    nrm = Vector((-t.y, t.x)) * 1.45
    beam = [tuple(a_ - nrm), tuple(b_ - nrm), tuple(b_ + nrm), tuple(a_ + nrm)]
    bb = extrude("Мост баланса", beam, zb1 - 0.05, zb0 + 0.25)
    for e in (a_, b_):
        cap = cylinder("_ушко", 1.45, zb1 - 0.05, zb0 + 0.25, seg=48, center=(e.x, e.y, 0))
        boolean(bb, cap, "UNION")
    finish(bb, bevel=0.06, seg=2)
    bb.data.materials.append(M["cotes"])
    _tag(bb, 35, (0, 0, -24))
    for k, e in enumerate((a_, b_)):
        _tag(_mv_screw(f"Винт моста баланса {k + 1}", (e.x, e.y), zb1 - 0.05, M), 30 + k, (0, 0, -6), screw=True)
    jb = _jewel("Камень баланса (Paraflex)", P_BAL, zb1 - 0.05, M)
    jb.parent = bb
    jb.matrix_parent_inverse = bb.matrix_world.inverted()
    pb = extrude("Мост анкера", _hull([(P_PAL[0], P_PAL[1], 1.2), (P_ESC[0], P_ESC[1], 1.1)]), zb1, zb0 + 0.4)
    finish(pb, bevel=0.05, seg=2)
    pb.data.materials.append(M["cotes"])
    _tag(pb, 45, (0, 0, -20))
    _tag(_mv_screw("Винт моста анкера", ((P_PAL[0] + P_ESC[0]) / 2, (P_PAL[1] + P_ESC[1]) / 2), zb1, M, r=0.5), 44, (0, 0, -6), screw=True)

    # автоподзавод: мост с реверсивными колёсами
    auto = extrude("Мост автоподзавода", _circle(0, 0, 13.4, 180), Z_AUTO_BOT, Z_AUTO_TOP)
    clear = bmesh.new()
    for (x, y), r in ((P_BAL, 8.0), ((0, 0), 1.6)):
        g = bmesh.ops.create_cone(clear, cap_ends=True, segments=128, radius1=r, radius2=r, depth=4)
        bmesh.ops.translate(clear, verts=g["verts"], vec=(x, y, (Z_AUTO_BOT + Z_AUTO_TOP) / 2))
    boolean(auto, mesh_obj("_вырезы", clear))
    finish(auto, bevel=0.07, seg=2)
    auto.data.materials.append(M["cotes"])
    _tag(auto, 20, (0, 0, -18))
    for k, xy in enumerate(((-3.6, 3.2), (-0.4, 5.1))):
        g = _gear(f"Реверсивное колесо {k + 1}", xy, 1.55, Z_AUTO_BOT - 0.35, Z_AUTO_BOT - 0.15, 36, spokes=0, M=M, mat="reversing")
        g.parent = auto
        g.matrix_parent_inverse = auto.matrix_world.inverted()
    for k, xy in enumerate(((-9.8, -4.2), (9.9, 5.3), (-2.0, 11.6))):
        _tag(_mv_screw(f"Винт моста автоподзавода {k + 1}", xy, Z_AUTO_BOT, M), 15 + k, (0, 0, -6), screw=True)

    # ротор Perpetual: полудиск с тяжёлым ободом, радиальная шлифовка, золотая надпись PERPETUAL
    zr0, zr1 = Z_ROTOR_TOP - 0.6, Z_ROTOR_TOP
    half = [(13.9 * math.cos(math.radians(a)), 13.9 * math.sin(math.radians(a))) for a in range(190, 351, 2)] + \
           [(2.4 * math.cos(math.radians(a)), 2.4 * math.sin(math.radians(a))) for a in range(350, 189, -5)]
    rotor = extrude("Ротор Perpetual", half, zr0, zr1)
    rim = extrude("_обод", [(13.9 * math.cos(math.radians(a)), 13.9 * math.sin(math.radians(a))) for a in range(196, 345, 2)] +
                  [(11.2 * math.cos(math.radians(a)), 11.2 * math.sin(math.radians(a))) for a in range(344, 195, -2)], zr0 - 0.55, zr0 + 0.05)
    boolean(rotor, rim, "UNION")
    hub = cylinder("_ступица", 2.4, zr0 - 0.2, zr1 + 0.15, seg=96)
    boolean(rotor, hub, "UNION")
    uv_planar(rotor, 28.0)
    finish(rotor, bevel=0.06, seg=2)
    rotor.data.materials.append(M["rotor"])
    _tag(rotor, 10, (0, 0, -16))
    _tag(_mv_screw("Винт ротора", (0, 0), zr0 - 0.2, M, r=1.1), 5, (0, 0, -8), screw=True)
    word = _engraving("Надпись PERPETUAL", root, "word_perpetual.png", rotor, radius=8.6, z=zr0 - 0.002, height=1.1, M=M)
    return parts


def _engraving(name, root, fname, parent, radius, z, height, M):
    """Золотая надпись по дуге ротора: плоская полоса с маской слова (прозрачна вне букв)."""
    img = bpy.data.images.load(root + "/" + TEX + fname, check_existing=True)
    img.colorspace_settings.name = "Non-Color"
    w_px, h_px = img.size
    length = height * w_px / h_px
    ang = length / radius
    bm = bmesh.new()
    n = 64
    uv = bm.loops.layers.uv.new("UVMap")
    rows = []
    for i in range(n + 1):
        a = -math.pi / 2 + ang / 2 - ang * i / n       # по дуге у 6 часов (ротор обращён вниз)
        rows.append([bm.verts.new(((radius + dr) * math.cos(a), (radius + dr) * math.sin(a), z)) for dr in (-height / 2, height / 2)])
    for i in range(n):
        f = bm.faces.new([rows[i][0], rows[i + 1][0], rows[i + 1][1], rows[i][1]])
        for loop, (u, v) in zip(f.loops, ((i / n, 1), ((i + 1) / n, 1), ((i + 1) / n, 0), (i / n, 0))):
            loop[uv].uv = (u, v)
    o = mesh_obj(name, bm)
    m = bpy.data.materials.get("Надпись ротора") or bpy.data.materials.new("Надпись ротора")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    gold = nt.nodes.new("ShaderNodeBsdfPrincipled")
    gold.inputs["Base Color"].default_value = (0.95, 0.72, 0.30, 1)
    gold.inputs["Metallic"].default_value = 1.0
    gold.inputs["Roughness"].default_value = 0.3
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(tex.outputs["Color"], mix.inputs["Fac"])
    nt.links.new(tr.outputs["BSDF"], mix.inputs[1])
    nt.links.new(gold.outputs["BSDF"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    o.data.materials.append(m)
    o.parent = parent
    o.matrix_parent_inverse = parent.matrix_world.inverted()
    return o
