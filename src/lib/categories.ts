export const categories = [
  { id: "construction", name: "Строительное оборудование", description: "Техника и оснастка для площадки" },
  { id: "tools", name: "Инструменты", description: "Ручной и электроинструмент" },
  { id: "cars", name: "Автомобили", description: "Легковые и коммерческие машины" },
  { id: "motorcycles", name: "Мотоциклы", description: "Мотоциклы и скутеры" },
  { id: "electronics", name: "Электроника", description: "Ноутбуки, звук и приборы" },
  { id: "photo", name: "Фото- и видеотехника", description: "Камеры, свет и оптика" },
  { id: "appliances", name: "Бытовая техника", description: "Техника для дома и кухни" },
  { id: "sport", name: "Спортивное оборудование", description: "Инвентарь для тренировок и игр" },
  { id: "camping", name: "Туристическое снаряжение", description: "Палатки, походы и выезды" },
  { id: "other", name: "Другое", description: "Предметы вне остальных категорий" },
] as const;

export type CategoryId = (typeof categories)[number]["id"];

export function isCategoryId(value: string | null | undefined): value is CategoryId {
  return categories.some((category) => category.id === value);
}

export function categoryName(id: string): string {
  return categories.find((category) => category.id === id)?.name ?? "Категория";
}
