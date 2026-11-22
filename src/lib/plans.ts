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
    period: "в месяц, тест ЮKassa",
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
    period: "в месяц, тест ЮKassa",
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

export function billingStatus(): {
  provider: string;
  mode: string;
  configured: boolean;
  chargesEnabled: boolean;
  fake: boolean;
} {
  // Lazy import avoided: keep plans free of circular deps by reading env here and
  // mirroring yookassa/billingProviderStatus for UI that only needs flags.
  const provider = process.env.RENTPROOF_BILLING_PROVIDER?.trim() || "yookassa";
  if (provider !== "yookassa" && provider !== "none") {
    return { provider, mode: "off", configured: false, chargesEnabled: false, fake: false };
  }
  const mode = (process.env.YOOKASSA_MODE ?? "test").trim().toLowerCase() === "live" ? "live" : "test";
  const fake = process.env.RENTPROOF_YOOKASSA_FAKE === "1" || (process.env.NODE_ENV === "test" && !process.env.YOOKASSA_SHOP_ID);
  const configured =
    mode !== "live" &&
    (fake || Boolean(process.env.YOOKASSA_SHOP_ID?.trim() && process.env.YOOKASSA_SECRET_KEY?.trim()));
  return {
    provider: provider === "none" && !configured ? "none" : "yookassa",
    mode,
    configured,
    chargesEnabled: configured && mode === "test",
    fake,
  };
}
