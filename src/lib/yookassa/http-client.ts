import { yookassaAmountString } from "@/lib/money";
import type { YooKassaConfig } from "@/lib/yookassa/config";
import type {
  CreateYooPaymentInput,
  CreateYooRefundInput,
  YooKassaClient,
  YooPayment,
  YooRefund,
} from "@/lib/yookassa/types";

export class HttpYooKassaClient implements YooKassaClient {
  private readonly config: YooKassaConfig;

  constructor(config: YooKassaConfig) {
    this.config = config;
  }

  async createPayment(input: CreateYooPaymentInput): Promise<YooPayment> {
    return this.request<YooPayment>("POST", "/payments", input.idempotencyKey, {
      amount: { value: yookassaAmountString(input.amountKopecks), currency: input.currency },
      capture: input.capture !== false,
      confirmation: { type: "redirect", return_url: input.returnUrl },
      description: input.description.slice(0, 128),
      metadata: input.metadata,
    });
  }

  async getPayment(providerPaymentId: string): Promise<YooPayment> {
    return this.request<YooPayment>("GET", `/payments/${encodeURIComponent(providerPaymentId)}`);
  }

  async cancelPayment(providerPaymentId: string, idempotencyKey: string): Promise<YooPayment> {
    return this.request<YooPayment>(
      "POST",
      `/payments/${encodeURIComponent(providerPaymentId)}/cancel`,
      idempotencyKey,
      {},
    );
  }

  async createRefund(input: CreateYooRefundInput): Promise<YooRefund> {
    return this.request<YooRefund>("POST", "/refunds", input.idempotencyKey, {
      payment_id: input.paymentId,
      amount: { value: yookassaAmountString(input.amountKopecks), currency: input.currency },
      description: input.description?.slice(0, 250),
    });
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    idempotencyKey?: string,
    body?: unknown,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Basic ${Buffer.from(`${this.config.shopId}:${this.config.secretKey}`).toString("base64")}`,
      "Content-Type": "application/json",
    };
    if (idempotencyKey) {
      headers["Idempotence-Key"] = idempotencyKey;
    }
    const response = await fetch(`${this.config.apiUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!response.ok) {
      const code =
        json && typeof json === "object" && "code" in json
          ? String((json as { code: unknown }).code)
          : `http_${response.status}`;
      // Never log secret or full card/payment payloads.
      console.error("yookassa_request_failed", { path, status: response.status, code });
      throw new Error(`yookassa_${code}`);
    }
    return json as T;
  }
}
