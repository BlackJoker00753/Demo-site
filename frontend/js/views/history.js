// История часового дела: 500 лет эволюции от первых карманных пружин до кремния и Haute Horlogerie.

import { api } from "../core/api.js";
import { html, qs, qsa } from "../core/dom.js";
import { reduced } from "../core/motion.js";

export const EPOCHS = [
  {
    id: "origin",
    period: "1510 - 1650",
    name: "Зарождение портативного времени",
    tagline: "Изобретение стальной пружины и освобождение от башенных гирь",
    accuracy: "Погрешность: ±1-2 часа в сутки",
    innovations: "Плоская пружина, шпиндельный спуск, фолиот",
    milestones: [
      {
        year: 1510,
        city: "Нюрнберг, Германия",
        inventor: "Петер Хенляйн (Peter Henlein)",
        title: "Изобретение стальной заводной пружины и «Нюрнбергские яйца»",
        desc: "Петер Хенляйн впервые применил упругую стальную полосу в качестве аккумулятора энергии вместо тяжелых свинцовых гирь. Появились первые переносные карманные и нашейные часы, работающие около 40 часов от одного завода.",
        tags: [{ label: "Германия", href: "/country/germany" }],
      },
      {
        year: 1574,
        city: "Женева, Швейцария",
        inventor: "Женевские золотых дел мастера",
        title: "Возникновение швейцарского часового кластера",
        desc: "Реформатор Жан Кальвин запретил ношение ювелирных украшений в Женеве. Золотых дел мастера и эмальеры объединились с бежавшими французскими гугенотами-часовщиками, превратив Женеву в мировую столицу точной механики.",
        tags: [{ label: "Швейцария", href: "/country/switzerland" }],
      },
    ],
  },
  {
    id: "science",
    period: "1650 - 1750",
    name: "Научная революция и изохронизм",
    tagline: "Математическая физика, волосок баланса и минутная стрелка",
    accuracy: "Погрешность: ±10-30 секунд в сутки",
    innovations: "Спираль баланса, рубиновые камни, минутный отсчет",
    milestones: [
      {
        year: 1675,
        city: "Гаага / Париж",
        inventor: "Христиан Гюйгенс (Christiaan Huygens)",
        title: "Изобретение спирали баланса (волоска)",
        desc: "Великий физик и астроном соединил колеблющееся маховое колесо с тонкой спиральной пружиной. Колебания баланса стали изохронными: точность портативных часов выросла более чем в 60 раз, позволив впервые установить на циферблат минутную стрелку.",
        tags: [{ label: "Калибры", href: "/movements" }],
      },
      {
        year: 1704,
        city: "Лондон, Англия",
        inventor: "Николя Фасьо де Дюйе, братья Дебофр",
        title: "Патент на часовые камни из натуральных рубинов и сапфиров",
        desc: "Технология сверления драгоценных корундов алмазным порошком позволила создать твердые и гладкие подшипники для стальных цапф. Трение и износ в узле баланса кардинально уменьшились, исключив быстрое истирание латунных мостов.",
        tags: [{ label: "Механика", href: "/movements" }],
      },
    ],
  },
  {
    id: "longitude",
    period: "1750 - 1800",
    name: "Битва за долготу и расцвет хронометрии",
    tagline: "Спасение флотов, рычажный спуск и гений Бреге",
    accuracy: "Погрешность: ±1-2 секунды в сутки",
    innovations: "Швейцарский анкерный спуск, морской хронометр H4, турбийон, спираль Бреге",
    milestones: [
      {
        year: 1754,
        city: "Лондон, Англия",
        inventor: "Томас Мюдж (Thomas Mudge)",
        title: "Изобретение швейцарского рычажного анкерного спуска",
        desc: "Мюдж создал свободный рычажный спуск (Swiss Lever Escapement), в котором баланс свободен от контакта со спусковым колесом большую часть своего периода, получая лишь короткий импульс. До сегодняшнего дня этот узел остается сердцем 99% механических часов планеты.",
        tags: [{ label: "Спуск калибра", href: "/movements" }],
      },
      {
        year: 1761,
        city: "Барроу / Лондон",
        inventor: "Джон Гаррисон (John Harrison)",
        title: "Морской хронометр H4: решение проблемы долготы на море",
        desc: "После 30 лет труда Гаррисон создал хронометр H4 с биметаллическим термокомпенсационным балансом. В 81-дневном плавании на Барбадос часы отстали всего на 5.1 секунды, позволив вычислять географическую долготу корабля с точностью до одной морской мили.",
        tags: [{ label: "Хронометрия", href: "/movements" }],
      },
      {
        year: 1795,
        city: "Париж, Франция",
        inventor: "Абрахам-Луи Бреге (Abraham-Louis Breguet)",
        title: "Спираль Бреге и противоударная система «парашют» (Pare-chute)",
        desc: "Бреге изогнул внешний виток волоска баланса по особой геометрии к центру, обеспечив абсолютно концентрическое сжатие спирали во всех положениях. В том же году он создал первую в истории эластичную противоударную защиту тонких цапф баланса.",
        tags: [{ label: "Breguet", href: "/brand/breguet" }],
      },
      {
        year: 1801,
        city: "Париж, Франция",
        inventor: "Абрахам-Луи Бреге (Abraham-Louis Breguet)",
        title: "Патент на регулятор Турбийон (Tourbillon)",
        desc: "Для компенсации гравитационного смещения центра тяжести баланса в вертикальном положении карманных часов Бреге поместил всю спусковую группу во вращающуюся каретку, совершающую полный оборот за 60 секунд. Главное усложнение высокого часового искусства.",
        tags: [
          { label: "Турбийон", href: "/complication/tourbillon" },
          { label: "Breguet", href: "/brand/breguet" },
        ],
      },
    ],
  },
  {
    id: "industry",
    period: "1800 - 1920",
    name: "Индустриализация и наручные часы",
    tagline: "Заводная головка без ключа, рождение мануфактур и авиация",
    accuracy: "Погрешность: ±2-5 секунд в сутки (COSC предшественники)",
    innovations: "Бесключевой завод, комплексная мануфактура, наручный корпус",
    milestones: [
      {
        year: 1845,
        city: "Женева, Швейцария",
        inventor: "Жан Адриан Филипп и Антуан Норбер де Патек",
        title: "Патент на завод и перевод стрелок заводной головкой без ключа",
        desc: "Адриан Филипп изобрел выдвижную заводную головку с муфтой, избавив владельцев от необходимости носить отдельный металлический ключ и открывать корпус часов, защитив механизм от дорожной пыли и влаги.",
        tags: [{ label: "Patek Philippe", href: "/brand/patek-philippe" }],
      },
      {
        year: 1865,
        city: "Ле-Локль, Швейцария",
        inventor: "Жорж Фавр-Жако (Georges Favre-Jacot)",
        title: "Основание Zenith: первая интегрированная мануфактура полного цикла",
        desc: "Фавр-Жако впервые собрал всех ремесленников, часовщиков, инженеров и литейщиков под крышей единой фабрики в Ле-Локле. Мануфактура получила рекордное число наград за хронометрическую точность (свыше 2330 первых призов обсерваторий).",
        tags: [{ label: "Zenith", href: "/brand/zenith" }],
      },
      {
        year: 1904,
        city: "Париж, Франция",
        inventor: "Луи Картье (Louis Cartier)",
        title: "Cartier Santos: рождение современных наручных часов",
        desc: "По просьбе легендарного бразильского пионера авиации Альберто Сантос-Дюмона, которому было опасно отрывать руки от штурвала для проверки карманных часов в полете, Луи Картье создал первые специализированные наручные мужские часы с геометричным безелем на винтах.",
        tags: [
          { label: "Cartier", href: "/brand/cartier" },
          { label: "Santos", href: "/watch/cartier-santos" },
        ],
      },
    ],
  },
  {
    id: "golden",
    period: "1920 - 1970",
    name: "Золотой век профессиональных инструментов",
    tagline: "Водонепроницаемость Oyster, ротор автоподзавода и покорение Луны",
    accuracy: "Погрешность: -4/+6 сек/сутки (официальные хронометры)",
    innovations: "Oyster, ротор 360°, автохронографы, лунный Speedmaster",
    milestones: [
      {
        year: 1926,
        city: "Женева, Швейцария",
        inventor: "Ганс Вильсдорф (Hans Wilsdorf), Rolex",
        title: "Rolex Oyster: первый в мире герметичный водонепроницаемый корпус",
        desc: "Завинчивающаяся задняя крышка и резьбовая заводная головка Twinlock создали абсолютный барьер для воды и пыли. В 1927 году Мерседес Гляйтце переплыла пролив Ла-Манш за 10 часов с часами Oyster на шее, доказав их полную неуязвимость.",
        tags: [
          { label: "Rolex", href: "/brand/rolex" },
          { label: "Submariner", href: "/watch/rolex-submariner" },
        ],
      },
      {
        year: 1931,
        city: "Женева, Швейцария",
        inventor: "Эмиль Борер (Emile Borer), Rolex",
        title: "Ротор автоподзавода Perpetual со свободным вращением на 360°",
        desc: "Rolex запатентовал инерционный полукруглый ротор, свободно вращающийся в обе стороны от любого естественного движения руки и непрерывно подзаводящий пружину. Конструкция легла в основу всех современных автоматических часов мира.",
        tags: [
          { label: "Rolex", href: "/brand/rolex" },
          { label: "Oyster Perpetual", href: "/watch/rolex-oyster-perpetual-41" },
        ],
      },
      {
        year: 1931,
        city: "Ле-Сентье, Швейцария",
        inventor: "Рене-Альфред Шово, Jaeger-LeCoultre",
        title: "Создание поворотного корпуса Reverso для защиты стекла",
        desc: "Разработан для британских офицеров в Индии, игравших в конное поло. Корпус часов переворачивается одним движением пальца в направляющих салазках, пряча сапфировое стекло и подставляя стальную глухую спинку ударам клюшек.",
        tags: [
          { label: "Jaeger-LeCoultre", href: "/brand/jaeger-lecoultre" },
          { label: "Reverso", href: "/watch/jaeger-lecoultre-reverso-tribute" },
        ],
      },
      {
        year: 1957,
        city: "Бьенн, Швейцария",
        inventor: "Omega (дизайнер Клод Балье)",
        title: "Трилогия профессиональных часов: Speedmaster, Seamaster 300, Railmaster",
        desc: "Omega представила хронограф с внешним тахиметрическим рантом Speedmaster, профессиональный дайвер Seamaster 300 и защищенный экраном из мягкого железа Railmaster (1000 Гаусс).",
        tags: [
          { label: "Omega", href: "/brand/omega" },
          { label: "Speedmaster", href: "/watch/omega-speedmaster-moonwatch" },
        ],
      },
      {
        year: 1969,
        city: "Ле-Локль / Женева / Токио",
        inventor: "Zenith, Chronomatic консорциум, Seiko",
        title: "Золотой год хронографов: гонка первого автоматического хронографа",
        desc: "В один год три инженерные группы совершили революцию: Zenith выпустил высокочастотный El Primero (36 000 пк/ч), консорциум Heuer-Breitling представил микророторный Calibre 11, а Seiko выпустила первый калибр с вертикальным зацеплением 6139.",
        tags: [
          { label: "Хронограф", href: "/complication/chronograph" },
          { label: "Zenith", href: "/brand/zenith" },
        ],
      },
      {
        year: 1969,
        city: "Хьюстон / Луна",
        inventor: "NASA и Omega",
        title: "Высадка на Луну: Omega Speedmaster на запястье Базза Олдрина",
        desc: "После 11 жестоких тестов NASA (температуры от -160°C до +93°C, вакуум, перегрузки 40G) Speedmaster Professional стал единственными официальными часами астронавтов и первыми часами на поверхности Луны 20 июля 1969 года.",
        tags: [
          { label: "Speedmaster Moonwatch", href: "/watch/omega-speedmaster-moonwatch" },
        ],
      },
    ],
  },
  {
    id: "quartz",
    period: "1969 - 2000",
    name: "Кварцевый кризис и механический ренессанс",
    tagline: "Кварцевый шторм, спасительный Swatch и триумф Гранд-усложнений",
    accuracy: "Погрешность: ±5 секунд в месяц (кварц) / COSC (механика)",
    innovations: "Кварцевый резонатор 32 768 Гц, спортивный люкс Джеральда Дженты, коаксиальный спуск",
    milestones: [
      {
        year: 1969,
        city: "Токио, Япония",
        inventor: "Suwa Seikosha / Seiko",
        title: "Seiko Quartz-Astron 35SQ: рождение кварцевой эры",
        desc: "25 декабря 1969 года Seiko выпустила первые в мире кварцевые наручные часы в золотом корпусе. Камертонный кристалл кварца и микросхема обеспечили недостижимую для механики точность ±5 сек/месяц, вызвав десятилетие глобального кризиса швейцарских фабрик.",
        tags: [
          { label: "Seiko", href: "/brand/seiko" },
          { label: "Япония", href: "/country/japan" },
        ],
      },
      {
        year: 1972,
        city: "Ле-Брассю, Швейцария",
        inventor: "Джеральд Джента (Gérald Genta) и Audemars Piguet",
        title: "Audemars Piguet Royal Oak: рождение спортивных часов класса люкс",
        desc: "За ночь до выставки в Базеле Джента создал стальные часы с видимыми винтами на восьмиугольном безеле и интегрированным браслетом. Сталь впервые стала дороже золота, открыв самую востребованную категорию современного часового рынка.",
        tags: [
          { label: "Audemars Piguet", href: "/brand/audemars-piguet" },
          { label: "Royal Oak", href: "/watch/audemars-piguet-royal-oak" },
        ],
      },
      {
        year: 1983,
        city: "Биль, Швейцария",
        inventor: "Николас Хайек (Nicolas Hayek) и Элмар Мок",
        title: "Запуск Swatch: спасение швейцарского часового сектора",
        desc: "Создание ярких пластиковых часов всего из 51 детали на автоматизированной линии вернуло Швейцарии долю мирового рынка и сформировало финансовую подушку Swatch Group для возрождения исторических мануфактур (Omega, Blancpain, Breguet).",
        tags: [
          { label: "Swatch", href: "/brand/swatch" },
          { label: "MoonSwatch", href: "/watch/swatch-moonswatch" },
        ],
      },
      {
        year: 1989,
        city: "Женева, Швейцария",
        inventor: "Patek Philippe",
        title: "Patek Philippe Calibre 89: триумф механического ренессанса",
        desc: "К своему 150-летию мануфактура создала сложнейшие карманные часы в мире на тот момент: 33 усложнения, 1728 деталей, 24 стрелки, карта звездного неба и дата Пасхи. Окончательное доказательство бессмертия механического искусства перед лицом электроники.",
        tags: [
          { label: "Patek Philippe", href: "/brand/patek-philippe" },
          { label: "Усложнения", href: "/glossary" },
        ],
      },
      {
        year: 1999,
        city: "Остров Мэн / Бьенн",
        inventor: "Джордж Дэниелс (George Daniels) и Omega",
        title: "Внедрение коаксиального спуска (Co-Axial Escapement)",
        desc: "Первый принципиально новый промышленный механический спуск за 250 лет. Благодаря радиальным микроимпульсам трение скольжения заменено трением качения, что позволило радикально снизить потребность в смазке и обеспечить феноменальную стабильность хода.",
        tags: [
          { label: "Omega", href: "/brand/omega" },
          { label: "Seamaster", href: "/watch/omega-seamaster-diver-300m" },
        ],
      },
    ],
  },
  {
    id: "silicon",
    period: "2000 - Настоящее время",
    name: "Кремниевая революция и авангард XXI века",
    tagline: "Монокристаллический кремний, Spring Drive и независимые мануфактуры",
    accuracy: "Погрешность: 0/+2 сек/сутки (METAS, Rolex Superlative, Grand Seiko)",
    innovations: "Кремний Silinvar, антимагнетизм 15 000 Гаусс, Spring Drive, золото 6N",
    milestones: [
      {
        year: 2001,
        city: "Ле-Локль, Швейцария",
        inventor: "Людвиг Окслин и Рольф Шнайдер, Ulysse Nardin",
        title: "Ulysse Nardin Freak: первый кремниевый спуск в истории",
        desc: "Первые часы без стрелок, заводной головки и циферблата. В карусельном механизме впервые применили спусковые колеса из монокристаллического кремния, выращенные методом фотолитографии (DRIE) и работающие абсолютно без смазки.",
        tags: [
          { label: "Ulysse Nardin", href: "/brand/ulysse-nardin" },
          { label: "Freak ONE", href: "/watch/ulysse-nardin-freak-one" },
        ],
      },
      {
        year: 2004,
        city: "Сиодзири, Япония",
        inventor: "Йосикадзу Акаханэ, Seiko Epson",
        title: "Grand Seiko 9R65: триумф технологии Spring Drive",
        desc: "28 лет разработки привели к созданию калибра, где заводная пружина передает энергию колесной передаче, а скорость вращения глайд-колеса с абсолютной точностью сдерживает бесконтактный электромагнитный тормоз, синхронизированный с кварцевым кристаллом.",
        tags: [
          { label: "Grand Seiko", href: "/brand/grand-seiko" },
          { label: "Калибр 9R65", href: "/movement/grand-seiko-9r65" },
        ],
      },
      {
        year: 2015,
        city: "Бьенн / Берн",
        inventor: "Omega и Швейцарский федеральный институт метрологии (METAS)",
        title: "Введение стандарта Master Chronometer (15 000 Гаусс)",
        desc: "Отказ от защитных внутренних экранов из мягкого железа: все детали спуска изготовлены из кремния (Si14) и немагнитных титановых сплавов. Часы выдерживают медицинский томограф МРТ без малейшего отклонения точности.",
        tags: [
          { label: "Каталог калибров", href: "/movements" },
          { label: "Omega", href: "/brand/omega" },
        ],
      },
      {
        year: 2026,
        city: "Женева / Гласхютте / Ла-Шо-де-Фон",
        inventor: "Мануфактуры Haute Horlogerie",
        title: "Эра независимого авторского часового искусства",
        desc: "Мастера F.P. Journe, MB&F, A. Lange & Söhne и Greubel Forsey возвели традиционную ручную отделку (англенаж, черная зеркальная полировка, мосты из цельного золота) в статус высокого искусства в эпоху нанотехнологий.",
        tags: [
          { label: "F.P. Journe", href: "/brand/fp-journe" },
          { label: "A. Lange & Söhne", href: "/brand/a-lange-soehne" },
        ],
      },
    ],
  },
];

export default {
  layer: "page",

  async data() {
    return { epochs: EPOCHS };
  },

  meta: () => ({
    title: "История часового дела: 500 лет эволюции от пружины до кремния | Horologium",
    crumbs: [{ label: "Глобус", href: "/" }, { label: "История" }],
  }),

  render({ epochs }) {
    const totalMilestones = epochs.reduce((acc, ep) => acc + ep.milestones.length, 0);

    return html`<article class="history-page">
      <!-- Герой страницы истории -->
      <header class="hhero container">
        <div class="hhero__content" data-reveal>
          <div class="hhero__badge">
            <i class="ph-light ph-hourglass-high" aria-hidden="true"></i>
            <span>Летопись часовой цивилизации</span>
          </div>
          <h1 class="display hhero__title">Великие эпохи часового искусства</h1>
          <p class="lead hhero__lead">
            От первых пружинных часов Петера Хенляйна 1510 года до морского хронометра Гаррисона, турбийона Бреге, водонепроницаемости Oyster и кремниевой революции XXI века: 500 лет непрерывной борьбы человека за идеальный изохронизм.
          </p>

          <div class="hhero__stats">
            <div class="hstat">
              <span class="hstat__num">7</span>
              <span class="hstat__label">Великих эпох</span>
            </div>
            <div class="hstat">
              <span class="hstat__num">${totalMilestones}</span>
              <span class="hstat__label">Ключевых вех</span>
            </div>
            <div class="hstat">
              <span class="hstat__num">500+</span>
              <span class="hstat__label">Лет эволюции</span>
            </div>
            <div class="hstat">
              <span class="hstat__num">0.05с</span>
              <span class="hstat__label">Эталонная точность</span>
            </div>
          </div>
        </div>

        <!-- Навигационная панель по эпохам -->
        <nav class="hepochs-nav" id="hepochs-nav" aria-label="Эпохи часового искусства" data-reveal>
          <div class="hepochs-nav__track">
            ${epochs.map(
              (ep, i) => html`<button
                type="button"
                class="hepoch-btn ${i === 0 ? "is-active" : ""}"
                data-target-epoch="${ep.id}"
              >
                <span class="hepoch-btn__period">${ep.period}</span>
                <span class="hepoch-btn__name">${ep.name}</span>
              </button>`
            )}
          </div>
        </nav>
      </header>

      <!-- Хронологическая вертикальная лента -->
      <section class="container htree-section" aria-label="Хронологическая лента">
        <div class="htree">
          ${epochs.map((ep) => html`
            <section class="hepoch" id="epoch-${ep.id}" data-epoch-id="${ep.id}">
              <header class="hepoch__header" data-reveal>
                <div class="hepoch__period-badge">${ep.period}</div>
                <h2 class="display hepoch__title">${ep.name}</h2>
                <p class="hepoch__tagline">${ep.tagline}</p>
                <div class="hepoch__specs">
                  <div class="hepoch__spec">
                    <span class="hepoch__spec-label">Точность эпохи:</span>
                    <span class="hepoch__spec-val">${ep.accuracy}</span>
                  </div>
                  <div class="hepoch__spec">
                    <span class="hepoch__spec-label">Ключевые прорывы:</span>
                    <span class="hepoch__spec-val">${ep.innovations}</span>
                  </div>
                </div>
              </header>

              <div class="hepoch__milestones">
                ${ep.milestones.map((m, idx) => html`
                  <article class="hcard" data-reveal style="--i:${idx}">
                    <div class="hcard__spine">
                      <div class="hcard__year">${m.year}</div>
                      <div class="hcard__dot"></div>
                    </div>
                    <div class="hcard__body">
                      <div class="hcard__meta">
                        <span class="hcard__city"><i class="ph-light ph-map-pin" aria-hidden="true"></i>${m.city}</span>
                        <span class="hcard__inventor"><i class="ph-light ph-user" aria-hidden="true"></i>${m.inventor}</span>
                      </div>
                      <h3 class="hcard__title">${m.title}</h3>
                      <p class="hcard__desc">${m.desc}</p>
                      <div class="hcard__tags">
                        ${m.tags.map((t) => html`<a href="${t.href}" data-link class="chip chip--sm">${t.label}</a>`)}
                      </div>
                    </div>
                  </article>
                `)}
              </div>
            </section>
          `)}
        </div>
      </section>

      <!-- Нижняя навигация -->
      <nav class="bnext container" aria-label="Дальше">
        <a class="link-arrow" href="/watches">Каталог 112 моделей часов <i class="ph-light ph-arrow-right" aria-hidden="true"></i></a>
        <a class="link-arrow" href="/movements">Каталог 110 калибров <i class="ph-light ph-arrow-right" aria-hidden="true"></i></a>
      </nav>
    </article>`;
  },

  mount(root) {
    const g = window.gsap;
    const navBtns = qsa(".hepoch-btn", root);
    const epochSections = qsa(".hepoch", root);

    // Плавный скролл к выбранной эпохе
    navBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const epId = btn.dataset.targetEpoch;
        const targetEl = qs(`#epoch-${epId}`, root);
        if (targetEl) {
          const top = targetEl.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top, behavior: "smooth" });
        }
        navBtns.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
      });
    });

    // Отслеживание текущей активной эпохи при скролле
    const onScroll = () => {
      let activeId = null;
      const scrollPos = window.scrollY + 180;

      epochSections.forEach((sec) => {
        const top = sec.offsetTop;
        const height = sec.offsetHeight;
        if (scrollPos >= top && scrollPos < top + height) {
          activeId = sec.dataset.epochId;
        }
      });

      if (activeId) {
        navBtns.forEach((btn) => {
          btn.classList.toggle("is-active", btn.dataset.targetEpoch === activeId);
        });
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  },
};
