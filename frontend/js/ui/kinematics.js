// Интерактивная кинематическая схема механизмов:
// наглядно демонстрирует 5 ступеней преобразования энергии во время.

import { html, qsa } from "../core/dom.js";
import { num, vph } from "../core/format.js";

const FLOWS = {
  mechanical: {
    title: "Механическая кинематическая цепь",
    nodes: [
      {
        id: "energy",
        name: "Энергия",
        part: "Заводной барабан",
        icon: "ph-circle-dashed",
        role: "Накопление крутящего момента",
        desc: "Заводная пружина из упругого сплава (Nivaflex) свернута внутри барабана. При ручном заводе или вращении ротора пружина накапливает потенциальную энергию и плавно передает усилие на зубчатый венец барабана (запас хода до 70+ часов).",
        tech: "Крутящий момент: 0.15 - 0.40 Н·см",
      },
      {
        id: "train",
        name: "Передача",
        part: "Ангренаж",
        icon: "ph-gear-six",
        role: "Повышающий редуктор 1:3600",
        desc: "Система зубчатых колес и стальных трибов: центральное колесо делает 1 оборот в час, промежуточное колесо ускоряет передачу, а секундное колесо делает ровно 1 оборот в минуту, направляя крутящий момент к узлу спуска.",
        tech: "Ступени: Барабан → Центр → Промежуточное → Секундное",
      },
      {
        id: "escapement",
        name: "Спуск",
        part: "Анкерный механизм",
        icon: "ph-anchor",
        role: "Преобразование вращения в импульсы",
        desc: "Анкерная вилка с синтетическими рубиновыми паллетами периодически стопорит и освобождает зубья анкерного колеса. За один такт спуск передает крошечный силовой импульс на регулятор, издавая характерный часовой тик-так.",
        tech: "Материал: кремний или полированная сталь с рубинами",
      },
      {
        id: "regulator",
        name: "Регулятор",
        part: "Баланс-спираль",
        icon: "ph-wave-sine",
        role: "Генератор стабильной частоты",
        desc: "Маховое колесо баланса со спиралью совершает строго изохронные возвратно-вращательные колебания. Период колебаний не зависит от амплитуды и определяет точность хода всего часового механизма.",
        tech: "Частота: 28 800 полуколебаний/час (4 Гц, 8 шагов/сек)",
      },
      {
        id: "display",
        name: "Индикация",
        part: "Стрелочная передача",
        icon: "ph-clock",
        role: "Деление времени на стрелки",
        desc: "Минутный триб, вексельное и часовое колеса согласуют скорости стрелок на циферблате в строгом соотношении 1:12. Вращение передается на часовую, минутную и центральную секундную стрелки.",
        tech: "Передаточное число часового колеса: 12:1",
      },
    ],
  },
  spring_drive: {
    title: "Гибридная цепь Spring Drive",
    nodes: [
      {
        id: "energy",
        name: "Энергия",
        part: "Заводная пружина Spron",
        icon: "ph-circle-dashed",
        role: "Механический запас хода",
        desc: "Сверхэластичный сплав Spron 510 обеспечивает автономный запас хода до 72 часов исключительно от заводной пружины без каких-либо аккумуляторов или батареек.",
        tech: "Полная автономность, ручной и автоподзавод",
      },
      {
        id: "train",
        name: "Передача",
        part: "Колесная передача",
        icon: "ph-gear-six",
        role: "Прямая кинематика",
        desc: "Высокоточная передача вращает генераторный узел без анкерного трения, обеспечивая коэффициент полезного действия выше традиционных механических узлов.",
        tech: "Полированные зубья с микродопусками",
      },
      {
        id: "glide",
        name: "Глайд-узел",
        part: "Glide Wheel",
        icon: "ph-arrows-clockwise",
        role: "Однонаправленное вращение",
        desc: "Колесо свободного скольжения вращается строго 8 раз в секунду в одну сторону. Отсутствие возвратно-поступательных ударов исключает износ и шум.",
        tech: "Скорость вращения: ровно 8 оборотов в секунду",
      },
      {
        id: "tri_synchro",
        name: "Регулятор",
        part: "Трёхсинхронный регулятор",
        icon: "ph-cpu",
        role: "Кварцевый контроль и электромагнитный тормоз",
        desc: "Миниатюрный генератор вырабатывает микроток для питания кварцевого кристалла (32 768 Гц) и ИС. Микросхема сверяет скорость колеса и регулирует силу электромагнитного торможения.",
        tech: "Точность: ±1 секунда в сутки (±15 секунд в месяц)",
      },
      {
        id: "display",
        name: "Индикация",
        part: "Непрерывный ход",
        icon: "ph-clock",
        role: "Идеально плавное скольжение стрелки",
        desc: "Поскольку спуск не останавливает механизм, стрелка движется абсолютно плавно и бесшумно, отражая естественное непрерывное течение времени.",
        tech: "Движение: беспрерывное скольжение (True Glide)",
      },
    ],
  },
  quartz: {
    title: "Кварцевая электромеханическая цепь",
    nodes: [
      {
        id: "energy",
        name: "Питание",
        part: "Элемент питания",
        icon: "ph-battery-medium",
        role: "Постоянное напряжение 1.55 В",
        desc: "Оксид-серебряная батарея или солнечный аккумулятор Eco-Drive/Tough Solar обеспечивает стабильное питание микросхемы на протяжении нескольких лет.",
        tech: "Срок службы: от 3 до 10 лет",
      },
      {
        id: "regulator",
        name: "Резонатор",
        part: "Кварцевый камертон",
        icon: "ph-wave-sine",
        role: "Сверхвысокая частота 32 768 Гц",
        desc: "Микроскопический кварцевый резонатор в форме камертона под воздействием пьезоэлектрического эффекта вибрирует с эталонной частотой 32 768 колебаний в секунду.",
        tech: "Частота: 32 768 Гц = 2¹⁵ Гц",
      },
      {
        id: "divider",
        name: "Делитель",
        part: "Интегральная схема (ИС)",
        icon: "ph-cpu",
        role: "15-ступенчатый бинарный делитель",
        desc: "Микросхема делит частоту резонатора пополам 15 раз (32768 → 16384 → ... → 1) и формирует один управляющий электрический импульс строго каждую секунду.",
        tech: "Выходной импульс: ровно 1 Гц",
      },
      {
        id: "motor",
        name: "Привод",
        part: "Шаговый двигатель Лаве",
        icon: "ph-arrows-counter-clockwise",
        role: "Преобразование тока в движение",
        desc: "Электромагнитный двигатель Лаве поворачивает миниатюрный ротор на 180 градусов от каждого секундного импульса катушки.",
        tech: "Тип: биполярный шаговый мотор",
      },
      {
        id: "display",
        name: "Индикация",
        part: "Колесная передача циферблата",
        icon: "ph-clock",
        role: "Дискретный скачок стрелок",
        desc: "Передача колес перемещает секундную стрелку ровно на одно деление раз в секунду и синхронизирует минутную и часовую стрелки.",
        tech: "Шаг: 1 секундный скачок (Deadbeat-style)",
      },
    ],
  },
};

export function renderKinematicFlow(type = "automatic", frequencyVph = null) {
  let kind = "mechanical";
  if (type === "spring_drive") kind = "spring_drive";
  else if (["quartz", "solar", "kinetic", "smart"].includes(type)) kind = "quartz";

  const flow = FLOWS[kind];
  const activeNode = flow.nodes[0];

  return html`<div class="kflow" data-reveal data-kflow="${kind}">
    <div class="kflow__head">
      <div class="kflow__badge"><i class="ph-light ph-git-commit" aria-hidden="true"></i>${flow.title}</div>
      <h3 class="kflow__title">Как энергия превращается во время</h3>
      <p class="kflow__sub">Нажмите на любой узел цепи, чтобы увидеть его кинематическую роль в калибре:</p>
    </div>

    <div class="kflow__steps" role="tablist" aria-label="Ступени механизма">
      ${flow.nodes.map(
        (node, idx) => html`
          <button type="button" class="kflow__node ${idx === 0 ? "is-active" : ""}"
            data-node-id="${node.id}" data-kflow-step="${idx}" role="tab"
            aria-selected="${idx === 0 ? "true" : "false"}">
            <span class="kflow__node-num">${idx + 1}</span>
            <span class="kflow__node-icon"><i class="ph-light ${node.icon}" aria-hidden="true"></i></span>
            <span class="kflow__node-name">${node.name}</span>
            <span class="kflow__node-part">${node.part}</span>
          </button>
        `,
      )}
    </div>

    <div class="kflow__detail" id="kflow-detail-${kind}">
      <div class="kflow__detail-card">
        <div class="kflow__detail-top">
          <div>
            <span class="kflow__detail-tag">${activeNode.role}</span>
            <h4 class="kflow__detail-title">${activeNode.part}</h4>
          </div>
          <span class="kflow__detail-tech"><i class="ph-light ph-faders" aria-hidden="true"></i>${activeNode.tech}</span>
        </div>
        <p class="kflow__detail-desc">${activeNode.desc}</p>
      </div>
    </div>
  </div>`;
}

export function mountKinematicFlow(root) {
  const containers = qsa(".kflow", root);
  containers.forEach((container) => {
    const kind = container.dataset.kflow || "mechanical";
    const flow = FLOWS[kind] || FLOWS.mechanical;
    const buttons = qsa(".kflow__node", container);
    const detailBox = container.querySelector(".kflow__detail");

    if (!detailBox) return;

    buttons.forEach((btn, idx) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => {
          b.classList.remove("is-active");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("is-active");
        btn.setAttribute("aria-selected", "true");

        const node = flow.nodes[idx];
        if (node) {
          detailBox.innerHTML = `
            <div class="kflow__detail-card kflow__detail-card--enter">
              <div class="kflow__detail-top">
                <div>
                  <span class="kflow__detail-tag">${node.role}</span>
                  <h4 class="kflow__detail-title">${node.part}</h4>
                </div>
                <span class="kflow__detail-tech"><i class="ph-light ph-faders" aria-hidden="true"></i>${node.tech}</span>
              </div>
              <p class="kflow__detail-desc">${node.desc}</p>
            </div>
          `;
        }
      });
    });
  });
}
