export const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "без абонентской платы",
    audience: "Базовый аккаунт",
    features: [
      "Каталог, поиск и бронирование",
      "До 3 активных объявлений",
      "5 отчётов AI-оценки",
      "Короткая история заявок",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    price: 1490,
    period: "в месяц, демонстрация",
    audience: "Для регулярной сдачи",
    featured: true,
    features: [
      "До 15 активных объявлений",
      "30 отчётов AI-оценки",
      "Полная история заявок и отзывов",
      "Фиксация состояния до и после",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 3990,
    period: "в месяц, демонстрация",
    audience: "Для активных арендодателей",
    features: [
      "До 100 активных объявлений",
      "200 отчётов AI-оценки",
      "Сводка по заявкам и расчёту аренды",
      "Управление парком объявлений",
    ],
  },
] as const;

export type PlanId = (typeof plans)[number]["id"];

const LIMITS: Record<PlanId, { listings: number; aiReports: number; history: number }> = {
  free: { listings: 3, aiReports: 5, history: 10 },
  plus: { listings: 15, aiReports: 30, history: 100 },
  pro: { listings: 100, aiReports: 200, history: 500 },
};

export function isPlanId(value: string): value is PlanId {
  return value === "free" || value === "plus" || value === "pro";
}

export function planListingLimit(plan: PlanId): number {
  return LIMITS[plan].listings;
}

export function planAiLimit(plan: PlanId): number {
  return LIMITS[plan].aiReports;
}

export function planHistoryLimit(plan: PlanId): number {
  return LIMITS[plan].history;
}

export function billingStatus(): { provider: string; configured: boolean; chargesEnabled: false } {
  return {
    provider: process.env.RENTPROOF_BILLING_PROVIDER?.trim() || "none",
    configured: false,
    chargesEnabled: false,
  };
}
