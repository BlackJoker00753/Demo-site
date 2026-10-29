// Build-time geometry. Shipped watches load a baked GLB; phones do not run this generator.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import * as M from "../watch3d/materials.js";
import { gearShape, bridgeShape } from "../watch3d/shapes.js";

const TAU = Math.PI * 2;
const extrude = (shape, depth, bevel = .025) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: !!bevel, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 24 });
const mesh = (g, m) => new THREE.Mesh(g, m);
const cyl = (r, h, m, segments = 48) => mesh(new THREE.CylinderGeometry(r, r, h, segments).rotateX(Math.PI / 2), m);
const box = (w, h, d, m) => mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(.12, d / 4)), m);
const wheel = (r, teeth, m, spokes = 5) => mesh(extrude(gearShape(r, teeth, { spokes }), .18), m);

export function buildDetailedMovement(watch, profile, L, add) {
  const R = L.movR, depth = Math.max(1.4, L.movZ1 - L.zB1 - .15), dz = depth / 4.5;
  const Z = n => L.movZ1 - n * dz;
  const steel = M.metal("steel", "brushed"), polished = M.metal("steel", "polished"), gold = M.gilt();
  const plate = M.movementMetal(watch.render.movement_plate || "rhodium", "perlage");
  const bridges = M.movementMetal(watch.render.movement_plate || "rhodium", "cotes");
  const blue = M.blued(), ruby = M.ruby();
  const place = (o, x, y, n) => { o.position.set(x * R, y * R, Z(n)); return o; };
  const part = (role, name, o, stage, text, material = "Материалы и отделка показаны условно; точный состав зависит от исполнения") => add(role, name, o, stage, text, material);
  const screw = (name, x, y, n, stage, radius = .045 * R) => {
    const o = new THREE.Group(), head = cyl(radius, .23 * dz, blue, 20), slot = box(radius * 1.5, radius * .22, .05, M.painted("#151a21"));
    slot.position.z = -.135 * dz; o.add(head, slot);
    const stem = cyl(radius * .42, .8 * dz, polished, 12); stem.position.z = .35 * dz; o.add(stem);
    place(o, x, y, n);
    const node = part("screw", name, o, stage, "Резьбовое соединение удерживает соседний узел. Сначала винт выходит по оси, затем узел можно снять.", "Воронёная или полированная сталь");
    Object.assign(node.userData, { workshop_axis: [0, -1, 0], workshop_turns: 3, workshop_pitch: .12 * dz });
    return node;
  };
  const bearing = (name, x, y, n, stage) => part("jewel", name, place(cyl(.044 * R, .18 * dz, ruby, 20), x, y, n), stage, "Каменная опора уменьшает трение на оси и удерживает её в заданном положении.", "Синтетический рубин");
  const coil = (r0, r1, turns, material, thickness = .025) => {
    const pts = Array.from({ length: 241 }, (_, i) => { const t = i / 240, a = t * turns * TAU, r = r0 + (r1 - r0) * t; return new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0); });
    return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, thickness, 5, false), material);
  };
  const bridge = (name, points, n, stage) => part("bridge", name, place(mesh(extrude(bridgeShape(points.map(([x, y]) => [x * R, y * R]), .11 * R), .4 * dz, .06), bridges), 0, 0, n), stage, "Мост удерживает оси узла и ограничивает их перемещение. Винты снимаются до подъёма моста.");

  part("mainplate", "Платина", place(cyl(R, .65 * dz, plate, 72), 0, 0, .4), 5, "Несущая основа механизма. В ней расположены посадочные места колёс, мостов и опор.");
  part("movement_ring", "Кольцо механизма", place(mesh(new THREE.TorusGeometry(R * 1.035, .25, 8, 80), steel), 0, 0, 1), 5, "Фиксирует механизм внутри корпуса и не даёт ему смещаться.");

  if (profile.mechanical) {
    const drum = new THREE.Group(), br = .29 * R;
    const wall = mesh(new THREE.CylinderGeometry(br, br, 1.1 * dz, 64, 1, true).rotateX(Math.PI / 2), gold);
    drum.add(wall, cyl(br, .12 * dz, gold));
    const teeth = wheel(br * 1.04, 66, gold, 0); teeth.position.z = .53 * dz; drum.add(teeth);
    part("barrel", "Барабан", place(drum, -.36, .34, 1.3), 5, "Корпус заводной пружины передаёт накопленный момент колёсной передаче.");
    part("barrel_cover", "Барабан: крышка", place(cyl(br * .99, .12 * dz, steel), -.36, .34, 1.95), 5, "Закрывает барабан и удерживает пружину внутри. В модели открывается после извлечения узла.");
    part("mainspring", "Заводная пружина", place(coil(br * .17, br * .87, 6, steel, .05), -.36, .34, 1.45), 5, "Хранит энергию завода. Медленно распрямляясь, создаёт момент, который приводит механизм в действие.", "Упругий часовой сплав");
    part("barrel_arbor", "Вал барабана", place(cyl(br * .1, 1.3 * dz, polished, 16), -.36, .34, 1.3), 5, "Передаёт заводное усилие внутреннему концу пружины.");
    const gears = [["Центральное колесо", 0, 0, .23, 80], ["Промежуточное колесо", .32, -.22, .18, 72], ["Секундное колесо", .1, -.48, .16, 64]];
    for (const [i, [name, x, y, r, teethCount]] of gears.entries()) {
      const o = new THREE.Group(); o.add(wheel(R * r, teethCount, gold), cyl(.035 * R, .9 * dz, polished, 12));
      part("train", name, place(o, x, y, 1.3 + i * .25), 5, "Передаёт вращение следующей ступени механизма. Соотношение зубьев задаёт скорость соответствующей оси.", "Латунь и стальной триб");
      bearing(`Каменная опора колеса ${i + 1}`, x, y, 2.9, 4);
    }
    bridge("Мост колёсной передачи", [[-.1, .1], [.42, -.14], [.18, -.6], [-.25, -.3]], 2.5, 4);
    for (const [i, p] of [[-.1, .1], [.42, -.14], [-.25, -.3]].entries()) screw(`Винт моста передачи ${i + 1}`, ...p, 3, 4);
    const ratchet = wheel(.26 * R, 48, steel, 4);
    part("ratchet", "Храповое колесо", place(ratchet, -.36, .34, 2.7), 3, "Передаёт усилие завода валу барабана. Собачка не даёт ему свободно вращаться обратно.");
    part("click", "Собачка завода", place(box(R * .17, R * .07, .18, steel), -.63, .34, 2.8), 3, "Удерживает храповое колесо от обратного вращения.");
    part("click_spring", "Пружина собачки", place(coil(.04 * R, .1 * R, 1.2, steel), -.65, .45, 2.8), 3, "Прижимает собачку к зубьям храпового колеса.");
    screw("Винт храпового колеса", -.36, .34, 3, 3);
    if (profile.type === "automatic" || profile.type === "spring_drive") {
      const rotor = new THREE.Group(), shape = new THREE.Shape();
      shape.absarc(0, 0, R * .92, .07, Math.PI - .07, false); shape.absarc(0, 0, R * .18, Math.PI - .2, .2, true); shape.closePath();
      rotor.add(mesh(extrude(shape, .4 * dz, .06), bridges));
      part("rotor", "Ротор автоподзавода", place(rotor, 0, 0, 4), 3, "Инерционный груз поворачивается при движениях руки и через передачу заводит пружину.");
      part("rotor_bearing", "Подшипник ротора", place(mesh(new THREE.TorusGeometry(.13 * R, .045 * R, 8, 32), polished), 0, 0, 4), 3, "Опора, вокруг которой поворачивается ротор.");
      screw("Винт ротора", 0, 0, 4.15, 3);
      for (let i = 0; i < 2; i++) part("reverser", `Колесо автоподзавода ${i + 1}`, place(wheel(.12 * R, 40, gold), -.15 + i * .25, .55, 3.2), 3, "Передаёт движение ротора к заводной передаче.");
      bridge("Мост автоподзавода", [[-.5, .55], [0, .65], [.35, .55]], 3.5, 3);
      screw("Винт моста автоподзавода", .35, .55, 3.8, 3);
    }
    if (profile.type === "spring_drive") {
      part("glide", "Колесо скольжения", place(wheel(.18 * R, 8, polished, 6), .55, -.25, 2), 4, "Вращается в одну сторону. Его скорость контролирует электронный регулятор Spring Drive; баланса и анкерной вилки здесь нет.");
      part("stator", "Статор регулятора", place(box(.25 * R, .11 * R, .4 * dz, M.painted("#b87333", { metalness: .8 })), .65, -.05, 2.1), 4, "Участвует в выработке электричества и электромагнитном торможении колеса скольжения.", "Медная обмотка и магнитопровод");
      part("quartz", "Кварцевый резонатор", place(cyl(.065 * R, .3 * R, polished, 16), .42, .15, 2.4), 4, "Даёт опорную частоту для регулятора Spring Drive.");
      part("ic", "Микросхема регулятора", place(box(.2 * R, .18 * R, .3, M.painted("#1b2427")), .55, .32, 2.5), 4, "Сравнивает скорость вращения с кварцевой опорой и управляет торможением.");
    } else {
      const x = profile.tourbillon ? .45 : .53, y = profile.tourbillon ? -.35 : -.15, r = .22 * R;
      const balance = new THREE.Group(); balance.add(mesh(new THREE.TorusGeometry(r, .035 * R, 10, 64), gold));
      for (let i = 0; i < 3; i++) { const arm = box(r * 2, .035 * R, .15, gold); arm.rotation.z = i * Math.PI / 3; balance.add(arm); }
      part("balance", "Баланс", place(balance, x, y, 2.2), 4, "Колебательная система вместе со спиралью задаёт ритм работы механизма.");
      part("hairspring", "Спираль баланса", place(coil(.035 * R, .16 * R, 8, blue), x, y, 2.6), 4, "Возвращает баланс к равновесию. Её упругость участвует в определении периода колебаний.", "Упругий сплав или кремний; форма показана условно");
      part("balance_staff", "Ось баланса", place(cyl(.025 * R, 1 * dz, polished, 12), x, y, 2.3), 4, "Соединяет колесо баланса с опорами и роликом спуска.");
      bearing("Камень баланса", x, y, 3.2, 4);
      const escape = wheel(.1 * R, 15, polished, 3);
      part("escape", profile.coaxial ? "Коаксиальное спусковое колесо" : "Анкерное колесо", place(escape, profile.tourbillon ? x - .1 : .4, profile.tourbillon ? y + .1 : -.63, 1.8), 4, "Спуск поочерёдно останавливает и освобождает это колесо, передавая импульсы регулятору. Геометрия спуска в учебной модели условная.");
      const fork = new THREE.Group(); fork.add(box(.19 * R, .04 * R, .14, polished));
      for (const a of [-1, 1]) { const pallet = box(.03 * R, .055 * R, .12, ruby); pallet.position.set(a * .08 * R, .02 * R, 0); fork.add(pallet); }
      part("pallet", profile.coaxial ? "Рычаг коаксиального спуска" : "Анкерная вилка", place(fork, profile.tourbillon ? x : .52, profile.tourbillon ? y + .08 : -.45, 2), 4, "Дозирует движение спуска и передаёт импульсы балансу. Для специальных спусков форма упрощена.");
      if (profile.tourbillon) part("cage", "Каретка турбийона", place(mesh(new THREE.TorusGeometry(r * 1.2, .04 * R, 8, 64), polished), x, y, 3.1), 4, "Объединяет регулятор и элементы спуска во вращающемся узле. Компоновка каретки учебная.");
      bridge("Мост баланса", [[.9, .02], [x, y], [.85, -.38]], 3, 4);
      screw("Винт моста баланса", .86, -.32, 3.3, 4);
    }
    if (profile.chronograph) {
      part("chrono_control", "Переключатель хронографа", place(wheel(.13 * R, 8, blue, 0), -.55, -.4, 3), 4, "Согласует команды запуска, остановки и сброса. Конструкция управляющего узла зависит от калибра и показана условно.");
      part("chrono_clutch", "Муфта хронографа", place(wheel(.15 * R, 48, gold), -.25, -.35, 2.9), 4, "Подключает счётчики хронографа к приводу.");
      for (let i = 0; i < 2; i++) {
        const lever = box(.5 * R, .06 * R, .2, polished); lever.rotation.z = i ? -.35 : .55;
        part("chrono_lever", i ? "Рычаг сброса хронографа" : "Рычаг включения хронографа", place(lever, -.4, -.15 - i * .2, 3.25), 4, "Передаёт команду от кнопки к управляющему узлу или механизму возврата стрелок.");
        part("counter", `Счётное колесо хронографа ${i + 1}`, place(wheel(.11 * R, 40, gold), -.2 + i * .4, -.6, 2.8), 4, "Участвует в передаче показаний на отдельный счётчик прошедшего времени.");
      }
      screw("Винт узла хронографа", -.6, -.2, 3.5, 4);
    }
  } else {
    const green = M.painted("#174d3f", { roughness: .4, metalness: .15 }), copper = M.painted("#ad653c", { metalness: .85, roughness: .3 });
    part("circuit", "Электронная плата", place(box(R * 1.3, R * .85, .35 * dz, green), .05, -.15, 2), 4, "Соединяет электронные узлы и проводит сигналы управления.", "Плата, медные дорожки и электронные компоненты");
    part("ic", "Микросхема", place(box(R * .32, R * .28, .3 * dz, M.painted("#171c24")), .1, -.15, 2.4), 4, "Обрабатывает сигналы времени и управляет индикацией или другими функциями.");
    part("quartz", "Кварцевый резонатор", place(cyl(.06 * R, .32 * R, polished, 16), -.45, -.35, 2.6), 4, "Создаёт стабильную опорную частоту для электронной схемы.");
    const rechargeable = ["solar", "kinetic", "smart"].includes(profile.type);
    part("battery", rechargeable ? "Аккумулятор" : "Батарея", place(profile.type === "smart" ? box(R * 1.2, R * .9, .9 * dz, M.painted("#282d35")) : cyl(.32 * R, .9 * dz, polished), -.25, .25, 3), 3, rechargeable ? "Хранит заряд для питания электронных узлов и допускает зарядку." : "Питает кварцевую схему и электрический привод.");
    part("battery_contact", "Контакт питания", place(box(.45 * R, .06 * R, .12, gold), -.25, .4, 3.5), 3, "Обеспечивает электрическое соединение источника питания с платой.");
    screw("Винт контакта питания", -.45, .4, 3.7, 3);
    if (profile.type === "solar") part("solar", "Солнечный элемент", place(cyl(R * .85, .1, M.painted("#273446", { metalness: .4 })), 0, 0, .9), 3, "Преобразует свет в электричество для зарядки накопителя. Расположение относительно циферблата в модели упрощено.");
    if (profile.type === "kinetic") {
      part("rotor", "Ротор генератора", place(mesh(new THREE.CylinderGeometry(R * .8, R * .8, .4 * dz, 48, 1, false, 0, Math.PI).rotateX(Math.PI / 2), steel), 0, 0, 3.9), 3, "Передаёт движение руки генератору, а не заводной пружине.");
      part("generator", "Генератор", place(cyl(R * .13, .6 * dz, copper), .55, .15, 3.2), 3, "Преобразует механическую энергию ротора в электрическую.");
    }
    if (profile.type === "smart") {
      const definitions = [
        [/пульс/i, "Оптический датчик пульса", "Светодиоды и приёмник отслеживают изменение отражённого от кожи света, связанное с пульсом."],
        [/SpO2|кислород/i, "Оптический датчик SpO2", "Сравнивает отражение света разных длин волн для оценки насыщения крови кислородом."],
        [/акселерометр/i, "Акселерометр", "Измеряет ускорение корпуса. Сигнал используется для анализа движений и подсчёта шагов."],
        [/барометр/i, "Барометр", "Измеряет атмосферное давление; показания можно использовать для оценки высоты и изменения погоды."],
      ];
      const features = (watch.movement.features || []).join(" ");
      const sensors = definitions.filter(([pattern]) => pattern.test(features));
      for (const [i, [, name, description]] of sensors.entries()) part("sensor", name, place(cyl(.055 * R, .25, M.painted(i % 2 ? "#277f53" : "#151a21")), Math.cos(i * Math.PI / 2) * .25, Math.sin(i * Math.PI / 2) * .25, 4), 5, `${description} Форма и размещение в учебной модели упрощены.`, "Электронный измерительный узел; корпус и чувствительный элемент показаны условно");
      part("haptic", "Модуль вибрации", place(box(R * .4, R * .2, .5, steel), .5, .4, 3.2), 5, "Создаёт тактильный отклик.");
      part("flex", "Шлейф дисплея", place(box(R * .1, R * .8, .05, copper), .45, -.1, 2.7), 5, "Соединяет дисплей с электронной платой.");
    } else if (profile.digital) {
      part("lcd_contact", "Контакт дисплея", place(box(R * 1.2, R * .08, .2, M.painted("#30343b")), 0, .5, 1.5), 5, "Соединяет сегменты ЖК-дисплея с электронной платой.");
      part("buzzer", "Пьезоизлучатель", place(cyl(.35 * R, .15, gold), .1, 0, 3.9), 5, "Создаёт звуковые сигналы электронных часов.");
    } else {
      const motor = new THREE.Group(); motor.add(box(.55 * R, .08 * R, .15, steel), cyl(.09 * R, .25 * R, copper));
      part("coil", "Катушка шагового двигателя", place(motor, .45, .3, 2.7), 5, "Преобразует электрические импульсы в магнитное поле.");
      part("motor_rotor", "Ротор шагового двигателя", place(cyl(.08 * R, .35, polished), .55, .05, 2.7), 5, "Поворачивается под действием магнитного поля и приводит колёсную передачу.");
      for (let i = 0; i < 3; i++) part("train", `Колесо электронной передачи ${i + 1}`, place(wheel((.18 - i * .035) * R, 36, gold), .15 + i * .1, -.15 - i * .2, 1.4 + i * .3), 5, "Передаёт вращение от электрического двигателя стрелкам.");
    }
    for (let i = 0; i < 3; i++) screw(`Винт электронной платы ${i + 1}`, Math.cos(i * TAU / 3) * .6, Math.sin(i * TAU / 3) * .6, 2.8, 4);
  }

  const c = new Set(profile.complications);
  if (c.has("moonphase")) {
    const disc = new THREE.Group(); disc.add(cyl(R * .22, .14, M.painted("#142a50")));
    for (const side of [-1, 1]) { const moon = cyl(R * .065, .02, gold, 24); moon.position.set(side * R * .12, 0, -.085); disc.add(moon); }
    part("moonphase", "Диск лунной фазы", place(disc, 0, -.45, .5), 6, "Поворачивается относительно окна и показывает видимую фазу Луны. Передача и точность зависят от калибра.");
  }
  if (c.has("big-date")) part("big_date", "Второй разряд большой даты", place(wheel(R * .21, 31, steel, 0), .25, .35, .6), 6, "Участвует в раздельной индикации разрядов большой даты. Форма и расположение дисков зависят от калибра.");
  if (c.has("radio-sync")) part("antenna", "Антенна радиосинхронизации", place(box(R * .8, R * .12, .25, M.painted("#53505b")), 0, -.65, 2.6), 4, "Принимает сигнал точного времени, который обрабатывает электроника часов.");
  if (profile.mechanical) {
    const modules = [];
    if (c.has("gmt") || c.has("world-time")) modules.push(["Передача второго часового пояса", "Связывает основную передачу с дополнительной индикацией часового пояса."]);
    if (c.has("annual-calendar") || c.has("perpetual-calendar")) modules.push(["Программное колесо календаря", "Задаёт последовательность переключений календаря. Полная программа календаря здесь упрощена."]);
    if (c.has("day-date")) modules.push(["Диск дня недели", "Переключает обозначение дня недели."]);
    if (c.has("power-reserve")) modules.push(["Дифференциал запаса хода", "Связывает состояние завода с указателем оставшегося запаса."]);
    if (c.has("retrograde")) modules.push(["Возвратный узел ретрограда", "Накапливает усилие и возвращает указатель в начало шкалы."]);
    if (c.has("split-seconds")) modules.push(["Узел сплит-хронографа", "Позволяет остановить дополнительную секундную стрелку для промежуточного отсчёта."]);
    if (c.has("flyback")) modules.push(["Рычаг flyback", "Позволяет сбросить и возобновить отсчёт хронографа одной командой."]);
    if (c.has("alarm")) modules.push(["Передача будильника", "Управляет механическим сигналом в выбранное время."]);
    for (const [i, [name, text]] of modules.entries()) part("complication", name, place(wheel(R * .14, 40, steel), -.55 + (i % 3) * .4, -.4 + Math.floor(i / 3) * .35, 1.2), 4, text);
    if (c.has("minute-repeater") || c.has("alarm")) {
      for (let i = 0; i < 2; i++) {
        part("gong", `Гонг ${i + 1}`, place(mesh(new THREE.TorusGeometry(R * (.8 + i * .07), .07, 6, 80, Math.PI * 1.7), polished), 0, 0, 1.8), 4, "Упругий звуковой элемент. Молоточек возбуждает его колебания.");
        part("hammer", `Молоточек ${i + 1}`, place(box(R * .18, R * .12, .25, polished), -.7, -.2 + i * .25, 2.4), 4, "Ударяет по гонгу, создавая звук.");
      }
    }
  }
}
