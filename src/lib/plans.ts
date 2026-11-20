export const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "без абонентской платы",
    audience: "Для первого объявления",
    features: [
      "Просмотр каталога и фильтров",
      "Одно объявление в правилах тарифа",
      "Цена, залог и срок в карточке",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    price: 1490,
    period: "в месяц",
    audience: "Для регулярной сдачи",
    featured: true,
    features: [
      "До 15 объявлений",
      "Расширенный блок состояния",
      "Карточка выше базовых в каталоге",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 3990,
    period: "в месяц",
    audience: "Для парка техники",
    features: [
      "Объявления без лимита тарифа",
      "Несколько карточек команды",
      "Отдельная очередь проверки",
    ],
  },
] as const;

export type PlanId = (typeof plans)[number]["id"];
