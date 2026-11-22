import { readYooKassaConfig, type YooKassaConfig } from "@/lib/yookassa/config";
import { getFakeYooKassaClient } from "@/lib/yookassa/fake-client";
import { HttpYooKassaClient } from "@/lib/yookassa/http-client";
import type { YooKassaClient } from "@/lib/yookassa/types";

export { computePlatformFeeKopecks, platformFeeBps, readYooKassaConfig } from "@/lib/yookassa/config";
export type { YooKassaConfig } from "@/lib/yookassa/config";
export type { YooKassaClient, YooPayment } from "@/lib/yookassa/types";
export { getFakeYooKassaClient } from "@/lib/yookassa/fake-client";

let cached: { key: string; client: YooKassaClient } | null = null;

export function getYooKassaClient(config = readYooKassaConfig()): YooKassaClient {
  if (config.liveForbidden) {
    throw new Error("yookassa_live_forbidden");
  }
  if (config.fake) {
    return getFakeYooKassaClient();
  }
  if (!config.shopId || !config.secretKey) {
    throw new Error("yookassa_not_configured");
  }
  const key = `${config.apiUrl}|${config.shopId}|test`;
  if (cached?.key === key) {
    return cached.client;
  }
  const client = new HttpYooKassaClient(config);
  cached = { key, client };
  return client;
}

export function billingProviderStatus(config: YooKassaConfig = readYooKassaConfig()): {
  provider: string;
  mode: string;
  configured: boolean;
  chargesEnabled: boolean;
  fake: boolean;
  liveForbidden: boolean;
} {
  return {
    provider: "yookassa",
    mode: config.mode,
    configured: config.configured,
    // Test/fake only — never real production captures from this flag alone.
    chargesEnabled: config.configured && config.mode === "test" && !config.liveForbidden,
    fake: config.fake,
    liveForbidden: config.liveForbidden,
  };
}
