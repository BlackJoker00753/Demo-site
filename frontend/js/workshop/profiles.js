// Educational architecture follows the catalogue's movement type and complications.
const MECHANICAL = new Set(["automatic", "manual", "spring_drive"]);
export function workshopProfile(watch) {
  const type = watch.movement.type;
  const complications = new Set(watch.complications.map(item => typeof item === "string" ? item : item.slug));
  const digital = type !== "smart" && watch.render.dial.finish === "lcd";
  const mechanical = MECHANICAL.has(type);
  const chronograph = complications.has("chronograph") || complications.has("flyback") || complications.has("split-seconds");
  const family = digital ? "digital" : type === "spring_drive" ? "spring-drive" : chronograph && mechanical ? `${type}-chronograph` : type;
  const power = type === "automatic" || type === "spring_drive" ? ["Автоподзавод", "Ротор и передача автоподзавода пополняют запас энергии пружины."]
    : type === "manual" ? ["Ручной завод", "Храповое колесо, собачка и заводная передача удерживают и передают усилие завода."]
      : type === "solar" ? ["Свет и аккумулятор", "Солнечный элемент преобразует свет в электричество, аккумулятор хранит заряд."]
        : type === "kinetic" ? ["Генератор и накопитель", "Движение ротора приводит генератор, который заряжает накопитель."]
          : [type === "smart" ? "Аккумулятор" : "Батарея", "Источник питания снимается отдельно от электронной платы."];
  const regulator = type === "spring_drive" ? ["Регулятор Spring Drive", "Кварц, микросхема и электромагнитный тормоз регулируют колесо скольжения. Анкерного спуска нет."]
    : mechanical ? [chronograph ? "Хронограф и регулятор" : "Баланс и мосты", "После крепежа снимаются мосты и узлы, управляющие ритмом и дополнительными функциями."]
      : ["Электроника", "Кварцевый резонатор и электронная плата задают и обрабатывают сигналы времени."];
  return { type, family, mechanical, digital, chronograph, complications: [...complications],
    tourbillon: complications.has("tourbillon"),
    coaxial: /коаксиал|co.axial/i.test([watch.movement.description, ...(watch.movement.features || [])].join(" ")),
    steps: [
      ["Часы в сборе", "Поверните часы, чтобы рассмотреть корпус, стекло и браслет или ремешок."],
      ["Браслет и крепления", "Крепления освобождаются перед снятием ремешка и звеньев."],
      ["Крышка и головка", "Задняя крышка и органы управления открывают доступ к внутренним узлам."], power, regulator,
      [type === "smart" ? "Плата и датчики" : digital ? "Дисплей и контакты" : "Передача и платина", mechanical ? "Поочерёдно извлекаются колёса, барабан, его содержимое и платина." : "Отдельно доступны передача, опорная плата и электрические соединения."],
      [type === "smart" || digital ? "Экран и корпус" : "Циферблат и корпус", "Стекло, индикация и детали корпуса снимаются отдельными узлами."],
      ["Все детали", "Выберите деталь на столе или найдите её по названию. Доступны осмотр и обратная сборка."],
    ],
  };
}

export function catalogueCaption(profile, progress, reverse) {
  if (reverse) return "Последовательная установка деталей и затягивание креплений";
  const stage = Math.max(0, Math.min(7, Math.ceil(progress * 7 - 1e-6)));
  if (stage > 0 && stage < 7 && progress * 7 - (stage - 1) < 0.4) return "Освобождение крепежа перед снятием узла";
  return profile.steps[stage][1];
}
