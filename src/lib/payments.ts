import { createHash, randomUUID } from "node:crypto";
import { writeAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { parseYookassaAmountToKopecks, rublesToKopecks } from "@/lib/money";
import { notifyUser } from "@/lib/notifications";
import { isPlanId, type PlanId, planPriceRub } from "@/lib/plans";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  billingProviderStatus,
  getYooKassaClient,
  readYooKassaConfig,
  type YooPayment,
} from "@/lib/yookassa";
import { getFakeYooKassaClient } from "@/lib/yookassa/fake-client";

export type PaymentPurpose = "subscription" | "rental";
export type PaymentStatus = "pending" | "waiting_for_capture" | "succeeded" | "canceled" | "failed";

export type PaymentRecord = {
  id: string;
  userId: string;
  purpose: PaymentPurpose;
  status: PaymentStatus;
  amountKopecks: number;
  currency: string;
  description: string;
  providerPaymentId: string | null;
  confirmationUrl: string | null;
  planId: PlanId | null;
  rentalOrderId: string | null;
  bookingId: string | null;
  createdAt: string;
  updatedAt: string;
  succeededAt: string | null;
};

type PaymentRow = {
  id: string;
  user_id: string;
  purpose: string;
  status: string;
  amount_kopecks: number;
  currency: string;
  description: string;
  provider_payment_id: string | null;
  confirmation_url: string | null;
  plan_id: string | null;
  rental_order_id: string | null;
  booking_id: string | null;
  created_at: string;
  updated_at: string;
  succeeded_at: string | null;
};

export function planPriceKopecks(planId: PlanId): number {
  return rublesToKopecks(planPriceRub(planId));
}

export function paymentsConfigured(): boolean {
  return billingProviderStatus().chargesEnabled;
}

export async function createSubscriptionPayment(
  userId: string,
  planId: PlanId,
): Promise<{ paymentId: string; confirmationUrl: string | null; reused: boolean }> {
  if (planId === "free") {
    activateFreePlan(userId);
    return { paymentId: "", confirmationUrl: null, reused: false };
  }
  assertTestBilling();
  consumeRateLimit(`pay:sub:${userId}`, 8, 60_000);

  const amount = planPriceKopecks(planId);
  const requestHash = hashPayload({ purpose: "subscription", planId, amount });
  const existingKey = findIdempotency(userId, "subscription", requestHash);
  if (existingKey?.payment_id) {
    const existing = getPayment(existingKey.payment_id);
    if (
      existing &&
      (existing.status === "pending" || existing.status === "waiting_for_capture") &&
      existing.confirmationUrl
    ) {
      return { paymentId: existing.id, confirmationUrl: existing.confirmationUrl, reused: true };
    }
  }

  const paymentId = randomUUID();
  const idempotencyKey = `sub_${userId}_${planId}_${paymentId}`;
  const now = new Date().toISOString();
  const description = `RentProof ${planId.toUpperCase()} — 30 дней (тест)`;
  const config = readYooKassaConfig();
  const returnUrl = withQuery(config.returnUrl, { paymentId });

  getDb()
    .prepare(
      `INSERT INTO payments (
        id, user_id, purpose, status, amount_kopecks, currency, description, provider, idempotency_key,
        plan_id, metadata_json, created_at, updated_at
      ) VALUES (?, ?, 'subscription', 'pending', ?, 'RUB', ?, 'yookassa', ?, ?, ?, ?, ?)`,
    )
    .run(paymentId, userId, amount, description, idempotencyKey, planId, JSON.stringify({ planId }), now, now);

  getDb()
    .prepare(
      `INSERT INTO payment_idempotency (idempotency_key, user_id, purpose, payment_id, request_hash, created_at)
       VALUES (?, ?, 'subscription', ?, ?, ?)`,
    )
    .run(idempotencyKey, userId, paymentId, requestHash, now);

  const yoo = await getYooKassaClient(config).createPayment({
    amountKopecks: amount,
    currency: "RUB",
    description,
    returnUrl,
    idempotencyKey,
    metadata: { paymentId, userId, purpose: "subscription", planId },
  });

  getDb()
    .prepare(
      `UPDATE payments SET provider_payment_id = ?, confirmation_url = ?, status = ?, updated_at = ? WHERE id = ?`,
    )
    .run(
      yoo.id,
      yoo.confirmation?.confirmation_url ?? null,
      mapProviderStatus(yoo.status),
      new Date().toISOString(),
      paymentId,
    );

  writeAudit(userId, "payment.subscription.create", "payment", paymentId, { planId, amount });
  return {
    paymentId,
    confirmationUrl: yoo.confirmation?.confirmation_url ?? null,
    reused: false,
  };
}

export async function createRentalPayment(
  userId: string,
  rentalOrderId: string,
): Promise<{ paymentId: string; confirmationUrl: string | null; reused: boolean }> {
  assertTestBilling();
  consumeRateLimit(`pay:rent:${userId}`, 8, 60_000);

  const order = getDb()
    .prepare(`SELECT * FROM rental_orders WHERE id = ?`)
    .get(rentalOrderId) as
    | {
        id: string;
        renter_id: string;
        booking_id: string;
        total_amount_kopecks: number;
        payment_status: string;
      }
    | undefined;
  if (!order) {
    throw new NotFoundError();
  }
  if (order.renter_id !== userId) {
    throw new ForbiddenError();
  }
  if (order.payment_status === "paid") {
    throw new ConflictError("already_paid");
  }

  const open = getDb()
    .prepare(
      `SELECT id, confirmation_url FROM payments
       WHERE rental_order_id = ? AND status IN ('pending', 'waiting_for_capture')
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(rentalOrderId) as { id: string; confirmation_url: string | null } | undefined;
  if (open?.confirmation_url) {
    return { paymentId: open.id, confirmationUrl: open.confirmation_url, reused: true };
  }

  const paymentId = randomUUID();
  const idempotencyKey = `rent_${rentalOrderId}_${paymentId}`;
  const now = new Date().toISOString();
  const description = `RentProof аренда (тест) ${rentalOrderId.slice(0, 8)}`;
  const config = readYooKassaConfig();
  const returnUrl = withQuery(config.returnUrl, { paymentId });

  getDb()
    .prepare(
      `INSERT INTO payments (
        id, user_id, purpose, status, amount_kopecks, currency, description, provider, idempotency_key,
        rental_order_id, booking_id, metadata_json, created_at, updated_at
      ) VALUES (?, ?, 'rental', 'pending', ?, 'RUB', ?, 'yookassa', ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      paymentId,
      userId,
      order.total_amount_kopecks,
      description,
      idempotencyKey,
      rentalOrderId,
      order.booking_id,
      JSON.stringify({ rentalOrderId, bookingId: order.booking_id }),
      now,
      now,
    );

  getDb()
    .prepare(
      `INSERT INTO payment_idempotency (idempotency_key, user_id, purpose, payment_id, request_hash, created_at)
       VALUES (?, ?, 'rental', ?, ?, ?)`,
    )
    .run(
      idempotencyKey,
      userId,
      paymentId,
      hashPayload({ rentalOrderId, amount: order.total_amount_kopecks }),
      now,
    );

  const yoo = await getYooKassaClient(config).createPayment({
    amountKopecks: order.total_amount_kopecks,
    currency: "RUB",
    description,
    returnUrl,
    idempotencyKey,
    metadata: { paymentId, userId, purpose: "rental", rentalOrderId },
  });

  getDb()
    .prepare(
      `UPDATE payments SET provider_payment_id = ?, confirmation_url = ?, status = ?, updated_at = ? WHERE id = ?`,
    )
    .run(
      yoo.id,
      yoo.confirmation?.confirmation_url ?? null,
      mapProviderStatus(yoo.status),
      new Date().toISOString(),
      paymentId,
    );

  getDb()
    .prepare(
      `UPDATE rental_orders SET payment_status = 'pending', rental_status = 'awaiting_payment',
        provider_payment_id = ?, updated_at = ? WHERE id = ?`,
    )
    .run(yoo.id, new Date().toISOString(), rentalOrderId);

  writeAudit(userId, "payment.rental.create", "payment", paymentId, { rentalOrderId });
  return {
    paymentId,
    confirmationUrl: yoo.confirmation?.confirmation_url ?? null,
    reused: false,
  };
}

export async function syncPayment(paymentId: string, actorId?: string | null): Promise<PaymentRecord> {
  const row = loadPaymentRow(paymentId);
  if (!row) {
    throw new NotFoundError();
  }
  if (actorId && row.user_id !== actorId) {
    const admin = getDb().prepare("SELECT is_admin FROM users WHERE id = ?").get(actorId) as
      | { is_admin: number }
      | undefined;
    if (!admin?.is_admin) {
      throw new ForbiddenError();
    }
  }
  if (!row.provider_payment_id) {
    return mapPayment(row);
  }
  if (row.status === "succeeded" || row.status === "canceled") {
    return mapPayment(row);
  }

  const yoo = await getYooKassaClient().getPayment(row.provider_payment_id);
  applyProviderPayment(row, yoo, "sync");
  const fresh = loadPaymentRow(paymentId);
  if (!fresh) {
    throw new NotFoundError();
  }
  return mapPayment(fresh);
}

export async function handleYooKassaWebhook(body: unknown): Promise<{ ok: true; result: string }> {
  assertTestBilling();
  const event = body as { type?: string; event?: string; object?: YooPayment };
  const eventType = event.event || event.type || "unknown";
  const object = event.object;
  if (!object?.id) {
    return { ok: true, result: "ignored_no_object" };
  }

  const row = getDb()
    .prepare(`SELECT * FROM payments WHERE provider_payment_id = ?`)
    .get(object.id) as PaymentRow | undefined;
  if (!row) {
    recordEvent(null, object.id, eventType, { id: object.id }, "unknown_payment");
    return { ok: true, result: "unknown_payment" };
  }

  const fresh = await getYooKassaClient().getPayment(object.id);
  const result = applyProviderPayment(row, fresh, eventType);
  recordEvent(row.id, `${object.id}:${eventType}:${fresh.status}`, eventType, { id: object.id, status: fresh.status }, result);
  return { ok: true, result };
}

export async function cancelLocalPayment(userId: string, paymentId: string): Promise<PaymentRecord> {
  assertTestBilling();
  const row = loadPaymentRow(paymentId);
  if (!row) {
    throw new NotFoundError();
  }
  if (row.user_id !== userId) {
    throw new ForbiddenError();
  }
  if (row.status === "succeeded") {
    throw new ConflictError("already_paid");
  }
  if (!row.provider_payment_id) {
    throw new ConflictError("no_provider");
  }

  const yoo = await getYooKassaClient().cancelPayment(
    row.provider_payment_id,
    `cancel_${paymentId}_${Date.now()}`,
  );
  applyProviderPayment(row, yoo, "cancel");
  const fresh = loadPaymentRow(paymentId);
  if (!fresh) {
    throw new NotFoundError();
  }
  writeAudit(userId, "payment.cancel", "payment", paymentId, {});
  return mapPayment(fresh);
}

export async function createRefundForPayment(
  adminId: string,
  paymentId: string,
  amountKopecks?: number,
): Promise<{ id: string; status: string }> {
  assertTestBilling();
  const admin = getDb().prepare("SELECT is_admin FROM users WHERE id = ?").get(adminId) as
    | { is_admin: number }
    | undefined;
  if (!admin?.is_admin) {
    throw new ForbiddenError();
  }
  const row = loadPaymentRow(paymentId);
  if (!row || row.status !== "succeeded" || !row.provider_payment_id) {
    throw new ConflictError("refund_unavailable");
  }
  const amount = amountKopecks ?? row.amount_kopecks;
  if (amount <= 0 || amount > row.amount_kopecks) {
    throw new ConflictError("amount");
  }
  const refundId = randomUUID();
  const now = new Date().toISOString();
  const idempotencyKey = `refund_${paymentId}_${refundId}`;
  try {
    const yoo = await getYooKassaClient().createRefund({
      paymentId: row.provider_payment_id,
      amountKopecks: amount,
      currency: "RUB",
      idempotencyKey,
      description: "RentProof test refund",
    });
    getDb()
      .prepare(
        `INSERT INTO refunds (
          id, payment_id, rental_order_id, amount_kopecks, currency, status, provider_refund_id, reason, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'RUB', ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        refundId,
        paymentId,
        row.rental_order_id,
        amount,
        yoo.status === "succeeded" ? "succeeded" : yoo.status,
        yoo.id,
        "admin_test_refund",
        adminId,
        now,
        now,
      );
    if (row.rental_order_id && yoo.status === "succeeded") {
      getDb()
        .prepare(`UPDATE rental_orders SET payment_status = 'refunded', updated_at = ? WHERE id = ?`)
        .run(now, row.rental_order_id);
    }
    writeAudit(adminId, "payment.refund", "payment", paymentId, { refundId, amount });
    return { id: refundId, status: yoo.status };
  } catch {
    getDb()
      .prepare(
        `INSERT INTO refunds (
          id, payment_id, rental_order_id, amount_kopecks, currency, status, reason, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'RUB', 'unavailable', ?, ?, ?, ?)`,
      )
      .run(refundId, paymentId, row.rental_order_id, amount, "provider_error", adminId, now, now);
    writeAudit(adminId, "payment.refund_failed", "payment", paymentId, { refundId });
    return { id: refundId, status: "unavailable" };
  }
}

export function listPaymentsForUser(userId: string, limit = 50): PaymentRecord[] {
  const rows = getDb()
    .prepare(`SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`)
    .all(userId, limit) as PaymentRow[];
  return rows.map(mapPayment);
}

export function getPaymentForUser(userId: string, paymentId: string, isAdmin = false): PaymentRecord | null {
  const row = loadPaymentRow(paymentId);
  if (!row) {
    return null;
  }
  if (!isAdmin && row.user_id !== userId) {
    return null;
  }
  return mapPayment(row);
}

export function getPayment(paymentId: string): PaymentRecord | null {
  const row = loadPaymentRow(paymentId);
  return row ? mapPayment(row) : null;
}

export function activateFreePlan(userId: string): void {
  const now = new Date().toISOString();
  getDb().prepare("UPDATE users SET plan = 'free', updated_at = ? WHERE id = ?").run(now, userId);
  getDb()
    .prepare(
      `INSERT INTO subscriptions (id, user_id, plan, mode, status, started_at, expires_at, renewal_status, created_at, updated_at)
       VALUES (?, ?, 'free', 'manual', 'active', ?, NULL, 'off', ?, ?)`,
    )
    .run(randomUUID(), userId, now, now, now);
  writeAudit(userId, "plan.free", "subscription", userId, {});
}

export function cancelSubscriptionRenewal(userId: string): void {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE subscriptions SET renewal_status = 'off', updated_at = ?
       WHERE user_id = ? AND id = (
         SELECT id FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1
       )`,
    )
    .run(now, userId, userId);
  writeAudit(userId, "subscription.renewal_off", "subscription", userId, {});
}

export function currentSubscription(userId: string): {
  plan: PlanId;
  status: string;
  expiresAt: string | null;
  renewalStatus: string;
  mode: string;
} | null {
  const row = getDb()
    .prepare(
      `SELECT plan, status, expires_at, renewal_status, mode FROM subscriptions
       WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
    )
    .get(userId) as
    | { plan: string; status: string; expires_at: string | null; renewal_status: string; mode: string }
    | undefined;
  if (!row || !isPlanId(row.plan)) {
    return null;
  }
  return {
    plan: row.plan,
    status: row.status,
    expiresAt: row.expires_at,
    renewalStatus: row.renewal_status,
    mode: row.mode,
  };
}

export async function fakeSucceedPayment(paymentId: string): Promise<PaymentRecord> {
  const row = loadPaymentRow(paymentId);
  if (!row?.provider_payment_id) {
    throw new NotFoundError();
  }
  getFakeYooKassaClient().succeed(row.provider_payment_id);
  return syncPayment(paymentId);
}

export async function fakeFailPayment(paymentId: string): Promise<PaymentRecord> {
  const row = loadPaymentRow(paymentId);
  if (!row?.provider_payment_id) {
    throw new NotFoundError();
  }
  getFakeYooKassaClient().fail(row.provider_payment_id);
  return syncPayment(paymentId);
}

function applyProviderPayment(row: PaymentRow, yoo: YooPayment, source: string): string {
  let amountKopecks: number;
  try {
    amountKopecks = parseYookassaAmountToKopecks(yoo.amount.value);
  } catch {
    recordEvent(row.id, yoo.id, source, { error: "bad_amount" }, "amount_parse_error");
    return "amount_parse_error";
  }
  if (yoo.amount.currency !== "RUB" || row.currency !== "RUB") {
    recordEvent(row.id, yoo.id, source, { currency: yoo.amount.currency }, "currency_mismatch");
    return "currency_mismatch";
  }
  if (amountKopecks !== row.amount_kopecks) {
    recordEvent(row.id, yoo.id, source, { expected: row.amount_kopecks, got: amountKopecks }, "amount_mismatch");
    return "amount_mismatch";
  }

  const now = new Date().toISOString();
  const status = mapProviderStatus(yoo.status);

  if (row.status === "succeeded" && status === "succeeded") {
    return "already_applied";
  }

  getDb()
    .prepare(
      `UPDATE payments SET status = ?, confirmation_url = COALESCE(?, confirmation_url),
        updated_at = ?,
        succeeded_at = CASE WHEN ? = 'succeeded' THEN COALESCE(succeeded_at, ?) ELSE succeeded_at END,
        canceled_at = CASE WHEN ? IN ('canceled', 'failed') THEN COALESCE(canceled_at, ?) ELSE canceled_at END
       WHERE id = ?`,
    )
    .run(status, yoo.confirmation?.confirmation_url ?? null, now, status, now, status, now, row.id);

  if (status === "succeeded") {
    if (row.purpose === "subscription" && row.plan_id && isPlanId(row.plan_id)) {
      activatePaidPlan(row.user_id, row.plan_id, row.id);
    }
    if (row.purpose === "rental" && row.rental_order_id) {
      markRentalPaid(row.rental_order_id, yoo.id);
    }
    notifyUser(row.user_id, {
      kind: "payment",
      title: "Оплата подтверждена",
      body:
        row.purpose === "subscription"
          ? "Подписка активирована после подтверждения ЮKassa."
          : "Оплата аренды принята.",
      href: "/account/payments",
    });
  }

  if (status === "canceled" || status === "failed") {
    if (row.rental_order_id) {
      getDb()
        .prepare(
          `UPDATE rental_orders SET payment_status = 'canceled', updated_at = ? WHERE id = ? AND payment_status = 'pending'`,
        )
        .run(now, row.rental_order_id);
    }
  }

  return `applied_${status}`;
}

function activatePaidPlan(userId: string, planId: PlanId, paymentId: string): void {
  const now = new Date();
  const started = now.toISOString();
  const expires = new Date(now.getTime() + 30 * 86_400_000).toISOString();
  getDb().prepare("UPDATE users SET plan = ?, updated_at = ? WHERE id = ?").run(planId, started, userId);
  getDb()
    .prepare(
      `INSERT INTO subscriptions (
        id, user_id, plan, mode, status, started_at, expires_at, payment_id, renewal_status, created_at, updated_at
      ) VALUES (?, ?, ?, 'yookassa_test', 'active', ?, ?, ?, 'off', ?, ?)`,
    )
    .run(randomUUID(), userId, planId, started, expires, paymentId, started, started);
  writeAudit(userId, "plan.paid", "subscription", paymentId, { planId, expires });
}

function markRentalPaid(rentalOrderId: string, providerPaymentId: string): void {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE rental_orders SET payment_status = 'paid', rental_status = 'paid',
        deal_status = 'payment_accepted', provider_payment_id = ?, updated_at = ? WHERE id = ?`,
    )
    .run(providerPaymentId, now, rentalOrderId);
}

function assertTestBilling(): void {
  const status = billingProviderStatus();
  if (status.liveForbidden) {
    throw new ConflictError("live_forbidden");
  }
  if (!status.chargesEnabled) {
    throw new ConflictError("billing_disabled");
  }
}

function mapProviderStatus(status: string): PaymentStatus {
  if (status === "succeeded") return "succeeded";
  if (status === "canceled") return "canceled";
  if (status === "waiting_for_capture") return "waiting_for_capture";
  if (status === "pending") return "pending";
  return "failed";
}

function loadPaymentRow(paymentId: string): PaymentRow | undefined {
  return getDb().prepare(`SELECT * FROM payments WHERE id = ?`).get(paymentId) as PaymentRow | undefined;
}

function mapPayment(row: PaymentRow): PaymentRecord {
  return {
    id: row.id,
    userId: row.user_id,
    purpose: row.purpose as PaymentPurpose,
    status: row.status as PaymentStatus,
    amountKopecks: row.amount_kopecks,
    currency: row.currency,
    description: row.description,
    providerPaymentId: row.provider_payment_id,
    confirmationUrl: row.confirmation_url,
    planId: row.plan_id && isPlanId(row.plan_id) ? row.plan_id : null,
    rentalOrderId: row.rental_order_id,
    bookingId: row.booking_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    succeededAt: row.succeeded_at,
  };
}

function findIdempotency(userId: string, purpose: string, requestHash: string) {
  return getDb()
    .prepare(
      `SELECT payment_id FROM payment_idempotency
       WHERE user_id = ? AND purpose = ? AND request_hash = ?
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(userId, purpose, requestHash) as { payment_id: string | null } | undefined;
}

function hashPayload(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function recordEvent(
  paymentId: string | null,
  providerEventId: string | null,
  eventType: string,
  payload: unknown,
  result: string,
): void {
  try {
    getDb()
      .prepare(
        `INSERT INTO payment_events (id, payment_id, provider_event_id, event_type, payload_json, processing_result, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        randomUUID(),
        paymentId,
        providerEventId,
        eventType,
        JSON.stringify(payload),
        result,
        new Date().toISOString(),
      );
  } catch {
    // duplicate provider event id
  }
}

function withQuery(url: string, params: Record<string, string>): string {
  const u = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    u.searchParams.set(key, value);
  }
  return u.toString();
}
