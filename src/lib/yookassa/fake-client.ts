import { randomUUID } from "node:crypto";
import { yookassaAmountString } from "@/lib/money";
import type {
  CreateYooPaymentInput,
  CreateYooRefundInput,
  YooKassaClient,
  YooPayment,
  YooRefund,
} from "@/lib/yookassa/types";

type Stored = YooPayment & { capture: boolean };

const store = new Map<string, Stored>();
const refunds = new Map<string, YooRefund>();

/** Test-only in-memory ЮKassa. No network, no real money. */
export class FakeYooKassaClient implements YooKassaClient {
  async createPayment(input: CreateYooPaymentInput): Promise<YooPayment> {
    const id = `fake_${randomUUID()}`;
    const payment: Stored = {
      id,
      status: "pending",
      paid: false,
      amount: { value: yookassaAmountString(input.amountKopecks), currency: input.currency },
      description: input.description,
      confirmation: {
        type: "redirect",
        confirmation_url: `${input.returnUrl}${input.returnUrl.includes("?") ? "&" : "?"}fakeProviderPaymentId=${encodeURIComponent(id)}&fakeAction=pending`,
      },
      metadata: input.metadata,
      created_at: new Date().toISOString(),
      capture: input.capture !== false,
    };
    store.set(id, payment);
    return publicView(payment);
  }

  async getPayment(providerPaymentId: string): Promise<YooPayment> {
    const payment = store.get(providerPaymentId);
    if (!payment) {
      throw new Error("yookassa_not_found");
    }
    return publicView(payment);
  }

  async cancelPayment(providerPaymentId: string): Promise<YooPayment> {
    const payment = store.get(providerPaymentId);
    if (!payment) {
      throw new Error("yookassa_not_found");
    }
    if (payment.status === "succeeded") {
      throw new Error("yookassa_cannot_cancel");
    }
    payment.status = "canceled";
    payment.paid = false;
    payment.cancellation_details = { party: "merchant", reason: "canceled_by_merchant" };
    store.set(providerPaymentId, payment);
    return publicView(payment);
  }

  async createRefund(input: CreateYooRefundInput): Promise<YooRefund> {
    const payment = store.get(input.paymentId);
    if (!payment || payment.status !== "succeeded") {
      throw new Error("yookassa_refund_unavailable");
    }
    const id = `fake_refund_${randomUUID()}`;
    const refund: YooRefund = {
      id,
      status: "succeeded",
      amount: { value: yookassaAmountString(input.amountKopecks), currency: input.currency },
      payment_id: input.paymentId,
    };
    refunds.set(id, refund);
    return refund;
  }

  /** Simulate shopper completing or abandoning checkout. */
  succeed(providerPaymentId: string): YooPayment {
    const payment = store.get(providerPaymentId);
    if (!payment) {
      throw new Error("yookassa_not_found");
    }
    payment.status = "succeeded";
    payment.paid = true;
    store.set(providerPaymentId, payment);
    return publicView(payment);
  }

  fail(providerPaymentId: string): YooPayment {
    const payment = store.get(providerPaymentId);
    if (!payment) {
      throw new Error("yookassa_not_found");
    }
    payment.status = "canceled";
    payment.paid = false;
    payment.cancellation_details = { party: "payment_network", reason: "expired_on_confirmation" };
    store.set(providerPaymentId, payment);
    return publicView(payment);
  }

  clear(): void {
    store.clear();
    refunds.clear();
  }
}

function publicView(payment: Stored): YooPayment {
  const { capture: _capture, ...rest } = payment;
  return { ...rest };
}

let singleton: FakeYooKassaClient | null = null;

export function getFakeYooKassaClient(): FakeYooKassaClient {
  if (!singleton) {
    singleton = new FakeYooKassaClient();
  }
  return singleton;
}
