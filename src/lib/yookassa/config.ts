import { siteOrigin } from "@/lib/site";

export type YooKassaMode = "test" | "live";

export type YooKassaConfig = {
  shopId: string;
  secretKey: string;
  apiUrl: string;
  mode: YooKassaMode;
  returnUrl: string;
  configured: boolean;
  fake: boolean;
  liveForbidden: boolean;
};

export function readYooKassaConfig(): YooKassaConfig {
  const modeRaw = (process.env.YOOKASSA_MODE ?? "test").trim().toLowerCase();
  const mode: YooKassaMode = modeRaw === "live" ? "live" : "test";
  const shopId = process.env.YOOKASSA_SHOP_ID?.trim() ?? "";
  const secretKey = process.env.YOOKASSA_SECRET_KEY?.trim() ?? "";
  const apiUrl = (process.env.YOOKASSA_API_URL?.trim() || "https://api.yookassa.ru/v3").replace(/\/$/, "");
  const returnUrl =
    process.env.YOOKASSA_RETURN_URL?.trim() || `${siteOrigin().replace(/\/$/, "")}/payments/return`;
  const explicitFake = process.env.RENTPROOF_YOOKASSA_FAKE === "1";
  const autoFakeForNodeTest = process.env.NODE_ENV === "test" && !shopId && !secretKey;
  const fake = explicitFake || autoFakeForNodeTest;
  const hasKeys = Boolean(shopId && secretKey);
  // Hard stop: this codebase never enables live charges without an explicit future change.
  const liveForbidden = mode === "live";
  return {
    shopId,
    secretKey,
    apiUrl,
    mode: liveForbidden ? "test" : mode,
    returnUrl,
    configured: (hasKeys || fake) && !liveForbidden,
    fake,
    liveForbidden,
  };
}

export function platformFeeBps(): number {
  const raw = Number(process.env.RENTPROOF_PLATFORM_FEE_BPS ?? "500");
  if (!Number.isFinite(raw) || raw < 0 || raw > 10_000) {
    return 500;
  }
  return Math.trunc(raw);
}

export function computePlatformFeeKopecks(rentalAmountKopecks: number): number {
  return Math.trunc((rentalAmountKopecks * platformFeeBps()) / 10_000);
}
