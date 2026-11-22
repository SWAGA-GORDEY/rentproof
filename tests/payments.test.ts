import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { confirmBooking, createBooking } from "@/lib/bookings";
import { closeDb, getDb } from "@/lib/db";
import { ConflictError, ForbiddenError } from "@/lib/errors";
import { todayUtc } from "@/lib/format";
import { createListing, moderateListing } from "@/lib/listings";
import {
  createRentalPayment,
  createSubscriptionPayment,
  fakeFailPayment,
  fakeSucceedPayment,
  getPayment,
  getPaymentForUser,
  handleYooKassaWebhook,
  listPaymentsForUser,
  planPriceKopecks,
  syncPayment,
} from "@/lib/payments";
import { ensureRentalOrder } from "@/lib/rental-orders";
import { readPlan } from "@/lib/subscriptions";
import { registerUser } from "@/lib/users";
import { getFakeYooKassaClient } from "@/lib/yookassa/fake-client";

const password = "Correct-horse-9";

describe("yookassa test payments", () => {
  it("activates Plus only after provider-confirmed success", async () => {
    const user = await registerUser({
      name: "Плательщик Плюс",
      email: uniqueEmail("plus"),
      password,
      role: "landlord",
    });
    assert.equal(readPlan(user.id), "free");

    const created = await createSubscriptionPayment(user.id, "plus");
    assert.ok(created.paymentId);
    assert.ok(created.confirmationUrl);
    assert.equal(getPayment(created.paymentId)?.status, "pending");
    assert.equal(readPlan(user.id), "free");

    const again = await createSubscriptionPayment(user.id, "plus");
    assert.equal(again.reused, true);
    assert.equal(again.paymentId, created.paymentId);

    const paid = await fakeSucceedPayment(created.paymentId);
    assert.equal(paid.status, "succeeded");
    assert.equal(readPlan(user.id), "plus");
    assert.equal(planPriceKopecks("plus"), 149_000);

    const dupWebhook = await handleYooKassaWebhook({
      event: "payment.succeeded",
      object: { id: paid.providerPaymentId!, status: "succeeded", amount: { value: "1490.00", currency: "RUB" }, paid: true },
    });
    assert.equal(dupWebhook.result === "already_applied" || dupWebhook.result.startsWith("applied_"), true);
  });

  it("keeps plan free on failed subscription payment", async () => {
    const user = await registerUser({
      name: "Отказ Оплаты",
      email: uniqueEmail("fail"),
      password,
      role: "landlord",
    });
    const created = await createSubscriptionPayment(user.id, "pro");
    const failed = await fakeFailPayment(created.paymentId);
    assert.equal(failed.status, "canceled");
    assert.equal(readPlan(user.id), "free");
  });

  it("rejects amount and currency mismatches on sync", async () => {
    const user = await registerUser({
      name: "Сумма Тест",
      email: uniqueEmail("amt"),
      password,
      role: "landlord",
    });
    const created = await createSubscriptionPayment(user.id, "plus");
    const payment = getPayment(created.paymentId)!;
    getDb()
      .prepare(`UPDATE payments SET amount_kopecks = ? WHERE id = ?`)
      .run(payment.amountKopecks + 100, payment.id);
    getFakeYooKassaClient().succeed(payment.providerPaymentId!);
    const synced = await syncPayment(payment.id);
    assert.equal(synced.status, "pending");
    assert.equal(readPlan(user.id), "free");

    getDb().prepare(`UPDATE payments SET amount_kopecks = ?, currency = 'USD' WHERE id = ?`).run(149_000, payment.id);
    const syncedFx = await syncPayment(payment.id);
    assert.equal(syncedFx.status, "pending");
  });

  it("charges rental order from server quote and blocks foreign access", async () => {
    const owner = await registerUser({ name: "Владелец", email: uniqueEmail("own"), password, role: "landlord" });
    const renter = await registerUser({ name: "Арендатор", email: uniqueEmail("rent"), password, role: "tenant" });
    const stranger = await registerUser({ name: "Чужой", email: uniqueEmail("x"), password, role: "tenant" });
    const listingId = createListing(owner.id, sample(`Компрессор ${owner.id.slice(0, 6)}`), true);
    const admin = await registerUser({ name: "Админ", email: uniqueEmail("adm"), password, role: "landlord" });
    getDb().prepare("UPDATE users SET is_admin = 1 WHERE id = ?").run(admin.id);
    moderateListing(admin.id, listingId, "published", null);

    const start = todayUtc();
    const end = shift(start, 1);
    const booking = createBooking(renter.id, listingId, start, end, null);
    const order = ensureRentalOrder(renter.id, false, booking.id);
    assert.equal(order.rentalAmountKopecks % 100, 0);
    assert.ok(order.platformFeeKopecks >= 0);
    assert.equal(order.totalAmountKopecks, order.rentalAmountKopecks + order.platformFeeKopecks);

    await assert.rejects(() => createRentalPayment(stranger.id, order.id), ForbiddenError);

    const pay = await createRentalPayment(renter.id, order.id);
    const again = await createRentalPayment(renter.id, order.id);
    assert.equal(again.reused, true);

    await fakeSucceedPayment(pay.paymentId);
    assert.equal(getPayment(pay.paymentId)?.status, "succeeded");
    assert.equal(getPaymentForUser(stranger.id, pay.paymentId), null);
    assert.ok(listPaymentsForUser(renter.id).some((item) => item.id === pay.paymentId));

    await assert.rejects(() => createRentalPayment(renter.id, order.id), ConflictError);

    confirmBooking(owner.id, booking.id);
  });

  it("survives database reopen with payment history", async () => {
    const user = await registerUser({ name: "Persist", email: uniqueEmail("persist"), password, role: "landlord" });
    const created = await createSubscriptionPayment(user.id, "plus");
    await fakeSucceedPayment(created.paymentId);
    closeDb();
    const again = getPayment(created.paymentId);
    assert.equal(again?.status, "succeeded");
    assert.equal(readPlan(user.id), "plus");
  });

  it("ignores webhook for unknown provider payment", async () => {
    const result = await handleYooKassaWebhook({
      event: "payment.succeeded",
      object: {
        id: "fake_unknown_payment",
        status: "succeeded",
        paid: true,
        amount: { value: "10.00", currency: "RUB" },
      },
    });
    assert.equal(result.result, "unknown_payment");
  });
});

function uniqueEmail(tag: string): string {
  return `${tag}.${Date.now()}.${Math.random().toString(16).slice(2)}@example.test`;
}

function shift(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function sample(title: string) {
  return {
    title,
    categoryId: "tools" as const,
    city: "Казань",
    description: "Тестовое объявление для оплаты аренды.",
    pricePerDay: 300,
    deposit: 1000,
    minDays: 1,
    conditionScore: 80,
    conditionNotes: null,
    specs: [{ label: "Тип", value: "тест" }],
    availableFrom: null,
    availableTo: null,
    bookable: true,
  };
}
