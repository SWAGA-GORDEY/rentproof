export const categories = [
  {
    id: "construction",
    name: "Строительная техника",
    description: "Экскаваторы, погрузчики, генераторы",
  },
  {
    id: "tools",
    name: "Электроинструмент",
    description: "Измерение, резка и монтаж",
  },
  {
    id: "photo",
    name: "Фото и видео",
    description: "Камеры, свет и оптика",
  },
  {
    id: "transport",
    name: "Транспорт",
    description: "Фургоны и перевозка груза",
  },
  {
    id: "events",
    name: "Мероприятия",
    description: "Звук, свет и сцена",
  },
  {
    id: "sport",
    name: "Спорт и отдых",
    description: "Инвентарь для выезда",
  },
  {
    id: "space",
    name: "Площади",
    description: "Залы, студии и площадки",
  },
  {
    id: "special",
    name: "Спецтехника",
    description: "Вышки, подъём и доступ",
  },
] as const;

export type CategoryId = (typeof categories)[number]["id"];

export type Listing = {
  id: string;
  title: string;
  category: CategoryId;
  city: string;
  pricePerDay: number;
  deposit: number;
  minDays: number;
  condition: number;
  summary: string;
  terms: string[];
  draft?: boolean;
};

export const listings: Listing[] = [
  {
    id: "backhoe-kazan",
    title: "Экскаватор-погрузчик JCB 3CX",
    category: "construction",
    city: "Казань",
    pricePerDay: 18500,
    deposit: 80000,
    minDays: 2,
    condition: 88,
    summary:
      "Городские работы и короткие циклы. В карточке отмечены ковш, гидравлика и наработка.",
    terms: [
      "Минимальный срок — 2 суток",
      "Залог возвращается после сверки состояния",
      "Подача по Казани обсуждается до выдачи",
    ],
  },
  {
    id: "laser-moscow",
    title: "Лазерный нивелир Bosch GLL 3-80",
    category: "tools",
    city: "Москва",
    pricePerDay: 1200,
    deposit: 8000,
    minDays: 1,
    condition: 94,
    summary:
      "Три плоскости, штатив и приёмник в комплекте. Подходит для отделки и монтажа.",
    terms: [
      "Выдача в пределах МКАД",
      "Комплект сверяется по списку при возврате",
      "Питание — аккумулятор и запасной блок",
    ],
  },
  {
    id: "camera-spb",
    title: "Камера Sony FX3 с клеткой",
    category: "photo",
    city: "Санкт-Петербург",
    pricePerDay: 6400,
    deposit: 50000,
    minDays: 1,
    condition: 91,
    summary:
      "Кинокамера для съёмки зала и репортажа. Клетка, две батареи и карта памяти.",
    terms: [
      "Оптика в стоимость не входит",
      "Залог фиксируется до выдачи",
      "Возврат в том же районе города",
    ],
  },
  {
    id: "van-ekb",
    title: "Фургон Ford Transit, 10 м³",
    category: "transport",
    city: "Екатеринбург",
    pricePerDay: 7800,
    deposit: 30000,
    minDays: 1,
    condition: 84,
    summary:
      "Закрытый кузов для мебели и оборудования. Пробег на сутки указан в условиях.",
    terms: [
      "Лимит пробега — 200 км в сутки",
      "Каско арендатора в карточку не включено",
      "Возврат с полным баком",
    ],
  },
  {
    id: "sound-nsk",
    title: "Комплект звука на зал 150 человек",
    category: "events",
    city: "Новосибирск",
    pricePerDay: 9500,
    deposit: 25000,
    minDays: 1,
    condition: 90,
    summary:
      "Колонки, микшер и два радиомикрофона. Подходит для презентации и камерного концерта.",
    terms: [
      "Монтаж силами арендатора",
      "Список приборов сверяется по позициям",
      "Площадка готовит питание 220 В",
    ],
  },
  {
    id: "bikes-sochi",
    title: "Горные велосипеды, комплект 8 шт.",
    category: "sport",
    city: "Сочи",
    pricePerDay: 4200,
    deposit: 20000,
    minDays: 1,
    condition: 86,
    summary:
      "Одинаковый размер рамы и шлемы в комплекте. Для группы и короткого маршрута.",
    terms: [
      "Шлемы входят в комплект",
      "Выдача утром, возврат до 20:00",
      "Повреждение рамы фиксируется в досье",
    ],
  },
  {
    id: "loft-moscow",
    title: "Лофт-площадка 120 м²",
    category: "space",
    city: "Москва",
    pricePerDay: 22000,
    deposit: 40000,
    minDays: 1,
    condition: 93,
    summary:
      "Зал с дневным светом, гримёрной и отдельным входом. Для съёмки и камерного события.",
    terms: [
      "Тихие часы после 22:00",
      "Мебель из списка нельзя выносить",
      "Уборка входит в сдачу площадки",
    ],
  },
  {
    id: "boom-lift-samara",
    title: "Автовышка 22 метра",
    category: "special",
    city: "Самара",
    pricePerDay: 14000,
    deposit: 40000,
    minDays: 1,
    condition: 87,
    summary:
      "Доступ к фасаду и свету. В досье отмечены стрела, люлька и гидравлика.",
    terms: [
      "Нужен допуск оператора",
      "Площадка должна держать массу шасси",
      "Осмотр люльки до и после смены",
    ],
  },
];

export const featuredListing =
  listings.find((item) => item.id === "boom-lift-samara") ?? listings[0];

export function isCategoryId(value: string | null | undefined): value is CategoryId {
  return categories.some((category) => category.id === value);
}

export function categoryName(id: CategoryId): string {
  return categories.find((category) => category.id === id)?.name ?? id;
}

export function formatRubles(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDays(days: number): string {
  const mod10 = days % 10;
  const mod100 = days % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return `${days} сутки`;
  }
  return `${days} суток`;
}

export function buildCatalogHref(query: string, category: string): string {
  const params = new URLSearchParams();
  const trimmed = query.trim();
  if (trimmed) {
    params.set("q", trimmed);
  }
  if (isCategoryId(category)) {
    params.set("category", category);
  }
  const search = params.toString();
  return search ? `/?${search}` : "/";
}

export function listingMatches(listing: Listing, query: string, category: string): boolean {
  const normalized = query.trim().toLowerCase();
  const haystack = `${listing.title} ${listing.city} ${listing.summary}`.toLowerCase();
  const queryMatches = normalized.length === 0 || haystack.includes(normalized);
  const categoryMatches = category.length === 0 || listing.category === category;
  return queryMatches && categoryMatches;
}
