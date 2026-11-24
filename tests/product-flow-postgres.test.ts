import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { closeDb, getDb, resolveDbDriver } from "@/lib/db";
import { createListing } from "@/lib/listings";
import { createBooking } from "@/lib/bookings";
import { issueEmailVerification, verifyEmailCode } from "@/lib/email-verification";
import { ensureReferralCode, attributeReferral, listReferralsForUser } from "@/lib/referrals";
import { authenticateUser, registerUser } from "@/lib/users";
import { dccEmailCenter, dccDashboard } from "@/lib/dcc";
import { searchListings } from "@/lib/listings";
import { notifyUser, listNotifications } from "@/lib/notifications";

const databaseUrl =
  process.env.RENTPROOF_TEST_DATABASE_URL?.trim() ||
  "postgres://rentproof:rentproof_test@127.0.0.1:5432/rentproof_test";
const password = "Product-flow-42!";

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

function withPostgres(): boolean {
  const prevDriver = process.env.RENTPROOF_DB_DRIVER;
  const prevUrl = process.env.DATABASE_URL;
  try {
    process.env.RENTPROOF_DB_DRIVER = "postgres";
    process.env.DATABASE_URL = databaseUrl;
    closeDb();
    getDb().prepare("SELECT 1 AS ok").get();
    return true;
  } catch {
    if (prevDriver === undefined) delete process.env.RENTPROOF_DB_DRIVER;
    else process.env.RENTPROOF_DB_DRIVER = prevDriver;
    if (prevUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prevUrl;
    closeDb();
    return false;
  }
}

const canRun = withPostgres();

describe("product flow on postgres", { skip: !canRun }, () => {
  it("register → verify → listing → booking → referral → search → notifications", async () => {
    process.env.RENTPROOF_DB_DRIVER = "postgres";
    process.env.DATABASE_URL = databaseUrl;
    process.env.MAIL_DRIVER = "console";
    closeDb();
    assert.equal(resolveDbDriver(), "postgres");

    const landlordEmail = uniqueEmail("landlord");
    const tenantEmail = uniqueEmail("tenant");
    const landlord = await registerUser({
      name: "Landlord Flow",
      email: landlordEmail,
      password,
      role: "landlord",
    });
    await issueEmailVerification(landlord.id, landlord.email, landlord.name);
    const codeRow = getDb()
      .prepare(`SELECT id FROM email_verifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`)
      .get(landlord.id) as { id: string } | undefined;
    assert.ok(codeRow);

    // Replace hash with a known 6-digit code for deterministic verify.
    const { hashVerificationCode } = await import("@/lib/email-verification");
    const known = "424242";
    getDb()
      .prepare(`UPDATE email_verifications SET code_hash = ?, attempts = 0, verified_at = NULL, expires_at = ? WHERE id = ?`)
      .run(hashVerificationCode(known), new Date(Date.now() + 600_000).toISOString(), codeRow.id);
    assert.equal(verifyEmailCode(landlord.id, known).ok, true);
    assert.equal(verifyEmailCode(landlord.id, known).ok, false); // one-shot

    await authenticateUser(landlordEmail, password);

    const listingId = createListing(
      landlord.id,
      {
        title: "Тестовый перфоратор Bosch",
        categoryId: "tools",
        city: "Екатеринбург",
        description: "Лёгкий перфоратор для короткой аренды",
        pricePerDay: 1500,
        deposit: 5000,
        minDays: 1,
        conditionScore: 90,
        conditionNotes: null,
        specs: [{ label: "Мощность", value: "800Вт" }],
        availableFrom: null,
        availableTo: null,
        bookable: true,
      },
      true,
    );
    // Publish for search (bypass moderation in test).
    getDb()
      .prepare(`UPDATE listings SET status = 'published', updated_at = ? WHERE id = ?`)
      .run(new Date().toISOString(), listingId);

    const tenant = await registerUser({
      name: "Tenant Flow",
      email: tenantEmail,
      password,
      role: "tenant",
    });
    getDb().prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`).run(tenant.id);

    const refCode = ensureReferralCode(landlord.id);
    assert.ok(attributeReferral(tenant.id, refCode));
    assert.equal(attributeReferral(tenant.id, refCode), false); // no double credit
    assert.equal(listReferralsForUser(landlord.id).length >= 1, true);

    const start = new Date();
    start.setUTCDate(start.getUTCDate() + 2);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 2);
    const booking = createBooking(
      tenant.id,
      listingId,
      start.toISOString().slice(0, 10),
      end.toISOString().slice(0, 10),
      "product-flow",
    );
    assert.ok(booking.id);

    const found = searchListings({
      q: "перфоратор",
      category: "tools",
      city: "Екатеринбург",
      minPrice: null,
      maxPrice: null,
      sort: "new",
      availableOnly: false,
      page: 1,
    });
    assert.ok(found.items.some((item) => item.id === listingId));

    notifyUser(tenant.id, {
      kind: "system",
      title: "Тест",
      body: "Уведомление product-flow",
      href: "/account",
    });
    assert.ok(listNotifications(tenant.id).some((n) => n.title === "Тест"));

    const email = dccEmailCenter();
    assert.ok(typeof email.week.delivered === "number");
    assert.ok(Array.isArray(email.recentDeliveries));

    const dash = dccDashboard();
    assert.ok(dash.users.total >= 2);
    assert.equal(dash.health.database, "ok");

    // Mail issue leaves a delivery log row (console → delivered=false).
    await issueEmailVerification(tenant.id, tenant.email, tenant.name);
    const mailRows = getDb()
      .prepare(`SELECT COUNT(*) AS c FROM mail_delivery_log WHERE adapter = 'console'`)
      .get() as { c: number | string };
    assert.ok(Number(mailRows.c) >= 1);

    closeDb();
  });
});
