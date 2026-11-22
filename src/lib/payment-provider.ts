/**
 * Payment provider abstraction — future Russian acquirers plug in here.
 * No live charges in this stage; RentProof keeps RENTPROOF_PAYMENTS_ENABLED unset.
 */

export type PaymentIntent = {
  id: string;
  amountKopecks: number;
  currency: "RUB";
  description: string;
  metadata: Record<string, string>;
};

export type PaymentProviderResult = {
  providerPaymentId: string;
  status: "pending" | "succeeded" | "canceled" | "failed";
  confirmationUrl: string | null;
};

export interface PaymentProvider {
  readonly name: string;
  createPayment(intent: PaymentIntent, idempotencyKey: string): Promise<PaymentProviderResult>;
  getPayment(providerPaymentId: string): Promise<PaymentProviderResult>;
}

export class DisabledPaymentProvider implements PaymentProvider {
  readonly name = "disabled";

  async createPayment(): Promise<PaymentProviderResult> {
    throw new Error("payments_disabled");
  }

  async getPayment(): Promise<PaymentProviderResult> {
    throw new Error("payments_disabled");
  }
}

export function getPaymentProvider(): PaymentProvider {
  if (process.env.RENTPROOF_PAYMENTS_ENABLED?.trim() !== "1") {
    return new DisabledPaymentProvider();
  }
  // Concrete YooKassa wiring remains in src/lib/yookassa + payments.ts when enabled.
  return new DisabledPaymentProvider();
}
