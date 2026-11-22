import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { createCustomer, countCustomers } from "@/lib/customers";
import { getDb } from "@/lib/db";
import { issueEmailVerification, verifyEmailCode, hashVerificationCode } from "@/lib/email-verification";
import { PlanLimitError } from "@/lib/errors";
import { recordConsent, revokeConsent, getLatestLegalDocument, listUserConsents } from "@/lib/legal";
import { createListing, getPublishedListing, searchListings } from "@/lib/listings";
import { verifyPassword } from "@/lib/password";
import { listingAutoPublishEnabled, getPlanDefinition } from "@/lib/plan-config";
import { requestPasswordReset, completePasswordReset } from "@/lib/password-reset";
import { seed } from "@/lib/seed";
import { enforceSubscriptionExpiry } from "@/lib/subscription-lifecycle";
import { passwordHashForEmail, registerUser } from "@/lib/users";

const password = "Correct-horse-9";

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
}

describe("modernize: listings and plans", () => {
  it("auto-publishes submitted listings into the catalog", async () => {
    assert.equal(listingAutoPublishEnabled(), true);
    const owner = await registerUser({
      name: "Владелец Каталога",
      email: uniqueEmail("pub"),
      password,
      role: "landlord",
    });
    const id = createListing(
      owner.id,
      {
        title: "Перфоратор Bosch реальное объявление",
        categoryId: "tools",
        city: "Екатеринбург",
        description: "Рабочий инструмент для настоящей публикации без демо-данных и модерации.",
        pricePerDay: 500,
        deposit: 2000,
        minDays: 1,
        conditionScore: 90,
        conditionNotes: null,
        specs: [],
        availableFrom: null,
        availableTo: null,
        bookable: true,
      },
      true,
    );
    const listing = getPublishedListing(id);
    assert.equal(listing?.status, "published");
    const catalog = searchListings({
      q: "Перфоратор Bosch реальное",
      category: "",
      city: "",
      minPrice: null,
      maxPrice: null,
      sort: "new",
      availableOnly: false,
      page: 1,
    });
    assert.ok(catalog.items.some((item) => item.id === id));
  });

  it("keeps approved RUB prices for Plus and Pro", () => {
    assert.equal(getPlanDefinition("plus").priceRub, 299);
    assert.equal(getPlanDefinition("pro").priceRub, 799);
    assert.equal(getPlanDefinition("free").priceRub, 0);
  });

  it("purges demo listing ids from seed path", () => {
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT OR REPLACE INTO users (id, email, password_hash, name, role, phone, city, created_at, updated_at, is_admin, plan)
         VALUES ('demo-owner', 'demo-owner@rentproof.invalid', 'hash', 'Demo', 'landlord', NULL, NULL, ?, ?, 0, 'free')`,
      )
      .run(now, now);
    getDb()
      .prepare(
        `INSERT OR REPLACE INTO listings (
          id, owner_id, category_id, title, description, city, price_per_day, deposit, min_days,
          condition_score, condition_notes, specs_json, status, rejection_reason, available_from, available_to,
          bookable, is_demo, search_text, created_at, updated_at
        ) VALUES (
          'demo-drill', 'demo-owner', 'tools', 'Demo Drill', 'demo', 'Москва', 100, 100, 1,
          50, NULL, '[]', 'published', NULL, NULL, NULL, 1, 1, 'demo', ?, ?
        )`,
      )
      .run(now, now);

    seed(getDb());
    const left = getDb().prepare(`SELECT id FROM listings WHERE id = 'demo-drill'`).get() as { id: string } | undefined;
    assert.equal(left, undefined);
  });
});

describe("modernize: email verification and password reset", () => {
  it("verifies a one-time code and rejects reuse", async () => {
    const user = await registerUser({
      name: "Почта Тест",
      email: uniqueEmail("verify"),
      password,
      role: "tenant",
    });
    assert.equal(user.emailVerified, false);
    await issueEmailVerification(user.id, user.email);
    const known = "123456";
    getDb()
      .prepare(`UPDATE email_verifications SET code_hash = ?, attempts = 0, verified_at = NULL WHERE user_id = ?`)
      .run(hashVerificationCode(known), user.id);
    assert.deepEqual(verifyEmailCode(user.id, known), { ok: true });
    assert.deepEqual(verifyEmailCode(user.id, known), { ok: false, reason: "missing" });
    const verified = getDb().prepare(`SELECT email_verified FROM users WHERE id = ?`).get(user.id) as {
      email_verified: number;
    };
    assert.equal(verified.email_verified, 1);
  });

  it("resets password via hashed token", async () => {
    const email = uniqueEmail("reset");
    const user = await registerUser({ name: "Сброс Пароля", email, password, role: "tenant" });
    await requestPasswordReset(email);
    const knownToken = "a".repeat(64);
    getDb()
      .prepare(`UPDATE password_resets SET token_hash = ?, used_at = NULL WHERE user_id = ?`)
      .run(createHash("sha256").update(knownToken).digest("hex"), user.id);
    const next = "New-password-42";
    assert.deepEqual(await completePasswordReset(knownToken, next), { ok: true });
    const stored = passwordHashForEmail(email);
    assert.ok(stored);
    assert.equal(await verifyPassword(next, stored), true);
    assert.equal(await verifyPassword(password, stored), false);
    assert.ok(user.id);
  });
});

describe("modernize: CRM, consents, subscription expiry", () => {
  it("isolates customers per owner and enforces limits", async () => {
    const a = await registerUser({ name: "A", email: uniqueEmail("crm-a"), password, role: "landlord" });
    const b = await registerUser({ name: "B", email: uniqueEmail("crm-b"), password, role: "landlord" });
    const id = createCustomer(a.id, { name: "Клиент А", email: null, phone: null, notes: null });
    assert.equal(countCustomers(a.id), 1);
    assert.equal(countCustomers(b.id), 0);
    assert.ok(id);

    process.env.RENTPROOF_PLAN_FREE_CUSTOMERS = "1";
    assert.throws(
      () => createCustomer(a.id, { name: "Ещё", email: null, phone: null, notes: null }),
      PlanLimitError,
    );
    delete process.env.RENTPROOF_PLAN_FREE_CUSTOMERS;
  });

  it("records and revokes consents with document versions", async () => {
    const user = await registerUser({ name: "Consent", email: uniqueEmail("consent"), password, role: "tenant" });
    const doc = getLatestLegalDocument("marketing_consent");
    assert.ok(doc);
    recordConsent(user.id, "marketing", doc);
    let list = listUserConsents(user.id);
    assert.equal(list[0]?.consent_status, "accepted");
    revokeConsent(user.id, "marketing");
    list = listUserConsents(user.id);
    assert.equal(list[0]?.consent_status, "revoked");
  });

  it("downgrades expired paid subscription to free", async () => {
    const user = await registerUser({ name: "Expiry", email: uniqueEmail("exp"), password, role: "landlord" });
    const past = new Date(Date.now() - 60_000).toISOString();
    const now = new Date().toISOString();
    getDb().prepare(`UPDATE users SET plan = 'plus', updated_at = ? WHERE id = ?`).run(now, user.id);
    getDb()
      .prepare(
        `INSERT INTO subscriptions (id, user_id, plan, mode, status, started_at, expires_at, renewal_status, created_at, updated_at)
         VALUES (?, ?, 'plus', 'manual', 'active', ?, ?, 'off', ?, ?)`,
      )
      .run(`sub-${user.id}`, user.id, past, past, now, now);
    const plan = enforceSubscriptionExpiry(user.id);
    assert.equal(plan, "free");
    const row = getDb().prepare(`SELECT plan FROM users WHERE id = ?`).get(user.id) as { plan: string };
    assert.equal(row.plan, "free");
  });
});
