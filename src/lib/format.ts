const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${days} суток`;
  }
  return `${days} суток`;
}

export function formatDateRu(iso: string): string {
  const date = iso.length === 10 ? new Date(`${iso}T00:00:00.000Z`) : new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeZone: "UTC" }).format(date);
}

export function isIsoDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function todayUtc(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function foldSearch(title: string, description: string, city: string): string {
  return `${title}\n${description}\n${city}`.toLowerCase();
}

export function inclusiveDays(start: string, end: string): number | null {
  if (!isIsoDate(start) || !isIsoDate(end) || end < start) {
    return null;
  }
  const startMs = Date.parse(`${start}T00:00:00.000Z`);
  const endMs = Date.parse(`${end}T00:00:00.000Z`);
  return Math.round((endMs - startMs) / 86_400_000) + 1;
}
