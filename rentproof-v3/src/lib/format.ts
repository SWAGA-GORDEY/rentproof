export function rubles(value: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value) + " ₽";
}

export function dateLabel(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(date);
}

export function statusLabel(value: string): string {
  const labels: Record<string, string> = {
    pending: "На проверке", published: "Опубликовано", hidden: "Скрыто",
    confirmed: "Подтверждено", rejected: "Отклонено", cancelled: "Отменено", completed: "Завершено",
  };
  return labels[value] ?? value;
}
