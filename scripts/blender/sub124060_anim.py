# Хореография разборки Submariner 124060: часы разбираются в порядке часовщика, и каждая снятая деталь
# уходит на своё место во взорванной схеме вдоль оси часов (не улетает из кадра). Винты выкручиваются с
# вращением, крышка свинчивается, головка Triplock откручивается. Камера неподвижна, часы поворачиваются
# под светом (поворотный стол), камера плавно отъезжает по мере того, как растёт схема.
#
# Выполняется после sub124060.py и sub124060_movement.py в том же пространстве имён: G["animate"]().

FRAMES = 330


def _objs(*prefixes, exclude=()):
    out = []
    for o in bpy.data.collections[COLL].objects:
        if o.parent and o.parent.name not in ("Часы", "Браслет 12", "Браслет 6"):
            continue                       # дочерние детали едут с родителем
        if o.name.startswith(prefixes) and not o.name.startswith(exclude):
            out.append(o)
    return sorted(out, key=lambda o: o.name)


def _ease(fc_owner):
    ad = fc_owner.animation_data
    if not ad or not ad.action:
        return
    for fc in _fcurves(ad.action):
        for k in fc.keyframe_points:
            k.interpolation = "BEZIER"
            k.easing = "AUTO"


def _fcurves(action):
    if hasattr(action, "fcurves"):
        return action.fcurves
    out = []                                # слоёные действия Blender 5
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                out.extend(bag.fcurves)
    return out


def _move(o, f0, f1, delta, local=False):
    """Сдвиг на delta (мм) с f0 до f1; local: вдоль собственных осей детали."""
    base = o.location.copy()
    if local:
        delta = o.matrix_basis.to_3x3() @ Vector(delta)
    o.keyframe_insert("location", frame=f0)
    o.location = base + Vector(delta)
    o.keyframe_insert("location", frame=f1)
    o.location = base + Vector(delta)


def _spin(o, f0, f1, axis, turns):
    """Вращение вокруг собственной оси (0 = X, 2 = Z) на turns оборотов (знак = направление)."""
    r = o.rotation_euler.copy()
    o.keyframe_insert("rotation_euler", index=axis, frame=f0)
    r[axis] += 2 * math.pi * turns
    o.rotation_euler = r
    o.keyframe_insert("rotation_euler", index=axis, frame=f1)


def _unscrew(o, f0, f1, out_axis, out_sign, turns=2.5, back_out=1.2):
    """Винт: против часовой, если смотреть со стороны головки (правая резьба), и выход по резьбе.
    Взгляд с головки идёт против оси выхода, поэтому положительный поворот вокруг оси выхода."""
    _spin(o, f0, f1, out_axis, turns * out_sign)
    d = [0, 0, 0]
    d[out_axis] = back_out * out_sign
    _move(o, f0, f1, d, local=True)


def _group(parent_name, prefixes):
    """Детали, которые снимаются вместе (метки с циферблатом, капсула с вставкой)."""
    p = bpy.data.objects[parent_name]
    for o in list(bpy.data.collections[COLL].objects):
        if o.name.startswith(prefixes) and o is not p:
            mw = o.matrix_world.copy()
            o.parent = p
            o.matrix_world = mw


def _half(name, prefixes, root):
    """Половина браслета: все её детали под общим пустым объектом, чтобы увезти разом."""
    e = bpy.data.objects.get(name) or bpy.data.objects.new(name, None)
    if e.name not in bpy.data.collections[COLL].objects:
        bpy.data.collections[COLL].objects.link(e)
    e.parent = root
    e.location = (0, 0, 0)
    e.rotation_euler = (0, 0, 0)
    bpy.context.view_layer.update()
    for o in list(bpy.data.collections[COLL].objects):
        if o.parent == root and o.name.startswith(prefixes):
            mw = o.matrix_world.copy()
            o.parent = e
            o.matrix_world = mw
    return e


def animate():
    s = bpy.context.scene
    s.frame_start, s.frame_end = 0, FRAMES - 1
    root = bpy.data.objects["Часы"]
    root.rotation_euler = (0, 0, 0)
    for o in bpy.data.collections[COLL].objects:
        o.animation_data_clear()
    bpy.context.view_layer.update()
    _group("Циферблат", ("Метка",))
    _group("Вставка безеля", ("Капсула безеля",))
    _group("Флажок", ("Опора стекла",))
    _group("Платина", ("Кольцо механизма",))
    h12 = _half("Браслет 12", ("Звено 12.", "Винт 12.", "Концевое звено 12", "Шпилька 12"), root)
    h6 = _half("Браслет 6", ("Звено 6.", "Винт 6.", "Концевое звено 6", "Шпилька 6", "Застёжка"), root)

    # --- поворотный стол: портрет 3/4 → браслет снят → 3/4 сзади → вид сбоку на всю схему
    keys = [(0, (-55, 0, 18)), (20, (-55, 0, 22)), (100, (-60, 0, 24)), (130, (-128, 0, 22)), (258, (-128, 0, 30)),
            (300, (-82, 0, 28)), (FRAMES - 1, (-82, 0, 34))]
    for f, (rx, ry, rz) in keys:
        root.rotation_euler = (math.radians(rx), math.radians(ry), math.radians(rz))
        root.keyframe_insert("rotation_euler", frame=f)

    # --- браслет: винты выкручиваются (ось = X звена) и выходят вбок, звенья расходятся, концевые звенья выходят
    screws = _objs("Винт 12.", "Винт 6.")
    for i, sc in enumerate(screws):
        sign = -1 if sc.name.startswith("Винт 6.") else 1
        f0 = 20 + (i % 6) * 2
        _unscrew(sc, f0, f0 + 20, 0, sign, turns=3, back_out=2.5)
        _move(sc, f0 + 20, f0 + 36, (sign * 8.0, 0, 0), local=True)
    for i, ln in enumerate(_objs("Звено")):
        f0 = 52 + (i % 7) * 2
        _move(ln, f0, f0 + 22, (0, 0, 3.0), local=True)
    for ln in _objs("Концевое звено"):
        _move(ln, 60, 82, (0, 7.0 if "12" in ln.name else -7.0, 0))
    for sb in _objs("Шпилька"):
        _move(sb, 56, 74, (-15.0, 0, 0))
    _move(bpy.data.objects["Застёжка Oysterlock"], 54, 78, (0, 0, 6.0), local=True)
    # половины браслета уезжают по оси 12–6, пока часы смотрят циферблатом, и после выхода из кадра скрываются
    _move(h12, 80, 112, (0, 170.0, 0))
    _move(h6, 80, 112, (0, -170.0, 0))
    for h in (h12, h6):
        for o in [h] + list(h.children_recursive):
            o.hide_render = False
            o.keyframe_insert("hide_render", frame=113)
            o.hide_render = True
            o.keyframe_insert("hide_render", frame=114)
            o.hide_render = False

    # --- задняя крышка свинчивается (2 оборота) и уходит вниз схемы
    cb = bpy.data.objects["Задняя крышка"]
    _spin(cb, 128, 156, 2, -2)
    _move(cb, 128, 156, (0, 0, -3.0))
    _move(cb, 156, 172, (0, 0, -46.0))

    # --- механизм со стороны крышки: ротор, автоподзавод, баланс, анкер, колёса
    def screw_out(name, f0, far):
        o = bpy.data.objects[name]
        _unscrew(o, f0, f0 + 12, 2, -1, turns=3, back_out=1.4)
        _move(o, f0 + 12, f0 + 22, (0, 0, -(far - 1.4)))

    def lift(name, f0, far, dur=14):
        _move(bpy.data.objects[name], f0, f0 + dur, (0, 0, -far))

    screw_out("Винт ротора", 170, 40)
    lift("Ротор Perpetual", 184, 34)
    for k in range(3):
        screw_out(f"Винт моста автоподзавода {k + 1}", 192 + 2 * k, 30)
    lift("Мост автоподзавода", 206, 26)
    for k in range(2):
        screw_out(f"Винт моста баланса {k + 1}", 212 + 2 * k, 23)
    lift("Мост баланса", 224, 20)
    lift("Баланс", 230, 17)
    screw_out("Винт моста анкера", 220, 21)
    lift("Мост анкера", 232, 18.5)
    for k in range(3):
        screw_out(f"Винт моста колёс {k + 1}", 228 + 2 * k, 16)
    lift("Мост барабана и колёс", 242, 13.5)
    for i, name in enumerate(("Анкерное колесо Chronergy", "Анкерная вилка", "Секундное колесо", "Промежуточное колесо", "Центральное колесо", "Барабан")):
        lift(name, 248 + 3 * i, 11.5 - 0.6 * i)

    # --- головка Triplock откручивается и выходит вбок
    cr = bpy.data.objects["Головка"]
    _spin(cr, 260, 282, 0, 2.5)
    _move(cr, 260, 282, (2.2, 0, 0))
    _move(cr, 282, 296, (9.0, 0, 0))

    # --- лицевая сторона: безель со вставкой, стекло, стрелки, циферблат с метками, флажок
    front = [("Безель", 270, 30), ("Вставка безеля", 272, 35), ("Стекло", 276, 40), ("Секундная стрелка", 282, 22),
             ("Минутная стрелка", 285, 19), ("Часовая стрелка", 288, 16), ("Флажок", 290, 12), ("Циферблат", 292, 8)]
    for name, f0, far in front:
        _move(bpy.data.objects[name], f0, f0 + 18, (0, 0, far))
    for o in bpy.data.collections[COLL].objects:
        _ease(o)

    # --- камера отъезжает: от портрета часов до всей схемы
    cam = s.camera
    for f, dist, dy in ((0, 230, 0), (90, 240, 0), (130, 290, -2), (250, 340, -4), (300, 560, -6), (FRAMES - 1, 590, -6)):
        cam.location = (0, dy, dist)
        cam.keyframe_insert("location", frame=f)
    _ease(cam)
    return root
