import { getPlanDefinition, getPlanDefinitions, getPlanLimits, type PlanDefinition } from "@/lib/plan-config";

export type PlanId = "free" | "plus" | "pro";

/** UI-facing plan cards sourced from central config (prices FREE / PLUS 299 / PRO 799). */
export const plans = getPlanDefinitions().map((plan) => ({
  id: plan.id,
  name: plan.name,
  price: plan.priceRub,
  period: plan.period,
  audience: plan.audience,
  ...(plan.featured ? { featured: true as const } : {}),
  features: plan.features,
}));

export type { PlanDefinition };

export function isPlanId(value: string): value is PlanId {
  return value === "free" || value === "plus" || value === "pro";
}

export function planListingLimit(plan: PlanId): number {
  return getPlanLimits(plan).listings;
}

export function planAiLimit(plan: PlanId): number {
  return getPlanLimits(plan).aiReports;
}

export function planHistoryLimit(plan: PlanId): number {
  return getPlanLimits(plan).history;
}

export function planCustomerLimit(plan: PlanId): number {
  return getPlanLimits(plan).customers;
}

export function planPriceRub(plan: PlanId): number {
  return getPlanDefinition(plan).priceRub;
}

/**
 * Payments stay off unless explicitly enabled.
 * Even then, live ЮKassa mode remains blocked in the YooKassa client.
 */
export function billingStatus(): {
  provider: string;
  mode: string;
  configured: boolean;
  chargesEnabled: boolean;
  fake: boolean;
} {
  const paymentsEnabled = process.env.RENTPROOF_PAYMENTS_ENABLED?.trim() === "1";
  if (!paymentsEnabled) {
    return {
      provider: "none",
      mode: "off",
      configured: false,
      chargesEnabled: false,
      fake: false,
    };
  }

  const provider = process.env.RENTPROOF_BILLING_PROVIDER?.trim() || "yookassa";
  if (provider !== "yookassa") {
    return { provider, mode: "off", configured: false, chargesEnabled: false, fake: false };
  }
  const mode = (process.env.YOOKASSA_MODE ?? "test").trim().toLowerCase() === "live" ? "live" : "test";
  const fake =
    process.env.RENTPROOF_YOOKASSA_FAKE === "1" ||
    (process.env.NODE_ENV === "test" && !process.env.YOOKASSA_SHOP_ID);
  const configured =
    mode !== "live" &&
    (fake || Boolean(process.env.YOOKASSA_SHOP_ID?.trim() && process.env.YOOKASSA_SECRET_KEY?.trim()));
  return {
    provider: "yookassa",
    mode,
    configured,
    chargesEnabled: configured && mode === "test",
    fake,
  };
}
