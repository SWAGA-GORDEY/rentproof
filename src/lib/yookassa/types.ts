export type YooPaymentStatus =
  | "pending"
  | "waiting_for_capture"
  | "succeeded"
  | "canceled";

export type YooPayment = {
  id: string;
  status: YooPaymentStatus;
  paid: boolean;
  amount: { value: string; currency: string };
  description?: string;
  confirmation?: { type: string; confirmation_url?: string };
  metadata?: Record<string, string>;
  created_at?: string;
  cancellation_details?: { party?: string; reason?: string };
};

export type CreateYooPaymentInput = {
  amountKopecks: number;
  currency: "RUB";
  description: string;
  returnUrl: string;
  metadata: Record<string, string>;
  idempotencyKey: string;
  capture?: boolean;
};

export type CreateYooRefundInput = {
  paymentId: string;
  amountKopecks: number;
  currency: "RUB";
  idempotencyKey: string;
  description?: string;
};

export type YooRefund = {
  id: string;
  status: "pending" | "succeeded" | "canceled";
  amount: { value: string; currency: string };
  payment_id: string;
};

export interface YooKassaClient {
  createPayment(input: CreateYooPaymentInput): Promise<YooPayment>;
  getPayment(providerPaymentId: string): Promise<YooPayment>;
  cancelPayment(providerPaymentId: string, idempotencyKey: string): Promise<YooPayment>;
  createRefund(input: CreateYooRefundInput): Promise<YooRefund>;
}
