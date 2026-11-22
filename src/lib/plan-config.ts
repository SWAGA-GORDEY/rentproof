import type { PlanId } from "@/lib/plans";

/**
 * Central plan limits — change via env without rewriting business logic.
 * Defaults match approved RentProof tariff matrix (₽/month).
 */
export type PlanLimits = {
  listings: number;
  aiReports: number;
  history: number;
  customers: number;
};

export type PlanDefinition = {
  id: PlanId;
  name: string;
  /** Whole rubles per month */
  priceRub: number;
  period: string;
  audience: string;
  featured?: boolean;
  features: string[];
  limits: PlanLimits;
};

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : fallback;
}

export function getPlanDefinitions(): PlanDefinition[] {
  return [
    {
      id: "free",
      name: "Free",
      priceRub: intEnv("RENTPROOF_PLAN_FREE_PRICE_RUB", 0),
      period: "без абонентской платы",
      audience: "Базовый аккаунт",
      features: [
        "Регистрация и личный кабинет",
        "Ограниченные объявления и клиенты",
        "Базовое управление арендой",
        "Ограниченные ИИ-запросы",
        "Короткая история операций",
      ],
      limits: {
        listings: intEnv("RENTPROOF_PLAN_FREE_LISTINGS", 3),
        aiReports: intEnv("RENTPROOF_PLAN_FREE_AI", 5),
        history: intEnv("RENTPROOF_PLAN_FREE_HISTORY", 20),
        customers: intEnv("RENTPROOF_PLAN_FREE_CUSTOMERS", 20),
      },
    },
    {
      id: "plus",
      name: "Plus",
      priceRub: intEnv("RENTPROOF_PLAN_PLUS_PRICE_RUB", 299),
      period: "в месяц",
      audience: "Для регулярной сдачи",
      featured: true,
      features: [
        "Больше объявлений и клиентов",
        "Расширенная история аренды",
        "Больше ИИ-запросов",
        "Дополнительная аналитика",
        "Расширенный профиль",
      ],
      limits: {
        listings: intEnv("RENTPROOF_PLAN_PLUS_LISTINGS", 25),
        aiReports: intEnv("RENTPROOF_PLAN_PLUS_AI", 40),
        history: intEnv("RENTPROOF_PLAN_PLUS_HISTORY", 200),
        customers: intEnv("RENTPROOF_PLAN_PLUS_CUSTOMERS", 200),
      },
    },
    {
      id: "pro",
      name: "Pro",
      priceRub: intEnv("RENTPROOF_PLAN_PRO_PRICE_RUB", 799),
      period: "в месяц",
      audience: "Для активных арендодателей",
      features: [
        "Максимум объявлений и клиентов",
        "Максимальные лимиты ИИ в рамках бюджета",
        "Расширенная аналитика и отчёты",
        "Приоритет новым функциям",
        "Инструменты автоматизации",
      ],
      limits: {
        listings: intEnv("RENTPROOF_PLAN_PRO_LISTINGS", 200),
        aiReports: intEnv("RENTPROOF_PLAN_PRO_AI", 150),
        history: intEnv("RENTPROOF_PLAN_PRO_HISTORY", 1000),
        customers: intEnv("RENTPROOF_PLAN_PRO_CUSTOMERS", 2000),
      },
    },
  ];
}

export function getPlanDefinition(id: PlanId): PlanDefinition {
  const found = getPlanDefinitions().find((plan) => plan.id === id);
  if (!found) {
    throw new Error("unknown_plan");
  }
  return found;
}

export function getPlanLimits(id: PlanId): PlanLimits {
  return getPlanDefinition(id).limits;
}

/** When true (default), submit publishes immediately. Set RENTPROOF_LISTING_AUTO_PUBLISH=0 to require admin. */
export function listingAutoPublishEnabled(): boolean {
  return process.env.RENTPROOF_LISTING_AUTO_PUBLISH?.trim() !== "0";
}
