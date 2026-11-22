/** Whole rubles ↔ integer kopecks. Never use float for money. */

export function rublesToKopecks(rubles: number): number {
  if (!Number.isInteger(rubles) || rubles < 0) {
    throw new Error("invalid_rubles");
  }
  return rubles * 100;
}

export function kopecksToRubles(kopecks: number): number {
  if (!Number.isInteger(kopecks)) {
    throw new Error("invalid_kopecks");
  }
  return kopecks / 100;
}

export function formatKopecks(kopecks: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(kopecksToRubles(kopecks));
}

export function yookassaAmountString(kopecks: number): string {
  return kopecksToRubles(kopecks).toFixed(2);
}

export function parseYookassaAmountToKopecks(value: string): number {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) {
    throw new Error("invalid_amount");
  }
  const whole = Number(match[1]);
  const frac = (match[2] ?? "").padEnd(2, "0");
  return whole * 100 + Number(frac);
}
