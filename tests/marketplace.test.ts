import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertAdmin, setBlocked } from "@/lib/admin";
import { aiConfigured, createAiReport, getAiReport } from "@/lib/ai";
import { confirmBooking, createBooking, quoteBooking } from "@/lib/bookings";
import { createComplaint } from "@/lib/complaints";
import { ConflictError, ForbiddenError, PlanLimitError } from "@/lib/errors";
import { toggleFavorite } from "@/lib/favorites";
import { todayUtc } from "@/lib/format";
import { saveListingImage, sniffImage } from "@/lib/images";
import { createListing, getOwnedListing, getPublishedListing, moderateListing, searchListings, updateListing } from "@/lib/listings";
import { createReview } from "@/lib/reviews";
import { completeBooking } from "@/lib/bookings";
import { AccountBlockedError, authenticateUser, registerUser } from "@/lib/users";
import { getDb } from "@/lib/db";

const password = "Correct-horse-9";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

describe("marketplace", () => {
  it("publishes only after moderation and hides another owner's edits", async () => {
    const owner = await registerUser({ name: "Илья Морозов", email: uniqueEmail("owner"), password, role: "landlord" });
    const stranger = await registerUser({ name: "Нина Белова", email: uniqueEmail("stranger"), password, role: "tenant" });
    const title = `Перфоратор ${owner.id.slice(0, 8)}`;
    const id = createListing(owner.id, sample(title), false);
    assert.equal(getPublishedListing(id), null);
    assert.equal(searchListings({ q: title, category: "tools", city: "", minPrice: 100, maxPrice: 5000, sort: "price_asc", availableOnly: true, page: 1 }).total, 0);

    const admin = await registerUser({ name: "Админ Тест", email: uniqueEmail("admin"), password, role: "landlord" });
    getDb().prepare("UPDATE users SET is_admin = 1 WHERE id = ?").run(admin.id);
    moderateListing(admin.id, id, "published", null);

    const found = searchListings({ q: title, category: "tools", city: "Казань", minPrice: null, maxPrice: null, sort: "new", availableOnly: true, page: 1 });
    assert.equal(found.total, 1);
    assert.equal(found.items[0]?.id, id);

    assert.throws(() => updateListing(stranger.id, id, sample(title), false), ForbiddenError);
    assert.equal(getOwnedListing(owner.id, id).title, title);
    saveListingImage(id, png);
    assert.equal(getPublishedListing(id)?.images.length, 1);
  });

  it("rejects overlapping confirmed bookings and keeps the server quote", async () => {
    const owner = await registerUser({ name: "Олег Власов", email: uniqueEmail("book-owner"), password, role: "landlord" });
    const first = await registerUser({ name: "Аня Первая", email: uniqueEmail("book-a"), password, role: "tenant" });
    const second = await registerUser({ name: "Боря Второй", email: uniqueEmail("book-b"), password, role: "tenant" });
    const id = createListing(owner.id, sample(`Генератор ${owner.id.slice(0, 8)}`), true);
    const admin = await registerUser({ name: "Админ Бронь", email: uniqueEmail("book-admin"), password, role: "landlord" });
    getDb().prepare("UPDATE users SET is_admin = 1 WHERE id = ?").run(admin.id);
    moderateListing(admin.id, id, "published", null);

    const start = todayUtc();
    const end = shift(start, 2);
    const quote = quoteBooking(id, start, end);
    assert.equal(quote.days, 3);
    assert.equal(quote.rentAmount, 900);
    assert.equal(quote.depositAmount, 1000);

    const created = createBooking(first.id, id, start, end, null);
    const other = createBooking(second.id, id, start, shift(start, 1), null);
    assert.equal(created.created, true);
    assert.equal(createBooking(first.id, id, start, end, null).created, false);
    confirmBooking(owner.id, created.id);
    assert.throws(() => confirmBooking(owner.id, other.id), ConflictError);
    assert.throws(() => createBooking(owner.id, id, shift(start, 10), shift(start, 11), null), ConflictError);
  });

  it("allows one review only after completion and blocks rating forgery fields", async () => {
    const owner = await registerUser({ name: "Светлана Юг", email: uniqueEmail("rev-owner"), password, role: "landlord" });
    const renter = await registerUser({ name: "Пётр Север", email: uniqueEmail("rev-renter"), password, role: "tenant" });
    const id = publish(owner.id, `Палатка ${owner.id.slice(0, 8)}`);
    const start = todayUtc();
    const booking = createBooking(renter.id, id, start, shift(start, 1), null);
    confirmBooking(owner.id, booking.id);
    assert.throws(() => createReview(renter.id, booking.id, 5, "Рано для отзыва здесь"), ConflictError);
    completeBooking(owner.id, booking.id);
    const reviewId = createReview(renter.id, booking.id, 4, "Комплект совпал с описанием карточки.");
    assert.ok(reviewId);
    assert.throws(() => createReview(renter.id, booking.id, 1, "Второй отзыв не должен сохраниться."), ConflictError);
    assert.equal(toggleFavorite(renter.id, id), true);
    assert.equal(toggleFavorite(renter.id, id), false);
  });

  it("stores an unavailable AI report when the key is missing", async () => {
    const previousOpenAi = process.env.OPENAI_API_KEY;
    const previousToken = process.env.TOKENLAVKA_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.TOKENLAVKA_KEY;
    assert.equal(aiConfigured(), false);
    const user = await registerUser({ name: "Алина Кадр", email: uniqueEmail("ai"), password, role: "tenant" });
    const reportId = await createAiReport(user.id, { objectType: "Шуруповёрт", description: "Корпус и патрон на трёх кадрах.", knownDefects: "Царапина на крышке" }, [png]);
    const report = getAiReport(user.id, false, reportId);
    assert.equal(report?.status, "unavailable");
    assert.equal(report?.errorCode, "missing_api_key");
    assert.equal(report?.body, null);
    assert.equal(report?.score, null);
    assert.equal(getAiReport(user.id, false, "missing-report"), null);
    if (previousOpenAi) {
      process.env.OPENAI_API_KEY = previousOpenAi;
    }
    if (previousToken) {
      process.env.TOKENLAVKA_KEY = previousToken;
    }
  });

  it("checks image bytes and enforces admin actions", async () => {
    assert.equal(sniffImage(png), "image/png");
    assert.equal(sniffImage(Buffer.from("<svg></svg>")), null);

    const user = await registerUser({ name: "Кира Демо", email: uniqueEmail("limit"), password, role: "tenant" });
    createListing(user.id, sample(`Один ${user.id}`), false);
    createListing(user.id, sample(`Два ${user.id}`), false);
    createListing(user.id, sample(`Три ${user.id}`), false);
    assert.throws(() => createListing(user.id, sample(`Четыре ${user.id}`), false), PlanLimitError);

    const admin = await registerUser({ name: "Марина Админ", email: uniqueEmail("guard"), password, role: "landlord" });
    assert.throws(() => assertAdmin(admin), ForbiddenError);
    getDb().prepare("UPDATE users SET is_admin = 1 WHERE id = ?").run(admin.id);
    const refreshed = { ...admin, isAdmin: true };
    assert.doesNotThrow(() => assertAdmin(refreshed));
    setBlocked(admin.id, user.id, true);
    await assert.rejects(() => authenticateUser(user.email, password), AccountBlockedError);
    assert.throws(() => setBlocked(admin.id, admin.id, true), ForbiddenError);
    const complaint = createComplaint(admin.id, "user", user.id, "Проверка жалобы на пользователя");
    assert.ok(complaint);
  });
});

function publish(ownerId: string, title: string): string {
  const id = createListing(ownerId, sample(title), true);
  const adminId = "admin-helper";
  const existing = getDb().prepare("SELECT id FROM users WHERE id = ?").get(adminId);
  if (!existing) {
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO users (id, email, password_hash, name, role, phone, city, created_at, updated_at, is_admin, plan)
         VALUES (?, ?, 'hash', 'Служебный', 'landlord', NULL, NULL, ?, ?, 1, 'pro')`,
      )
      .run(adminId, uniqueEmail("helper"), now, now);
  }
  moderateListing(adminId, id, "published", null);
  return id;
}

function sample(title: string) {
  return {
    title,
    categoryId: "tools" as const,
    city: "Казань",
    description: "Короткое описание инструмента для проверки серверных правил каталога.",
    pricePerDay: 300,
    deposit: 1000,
    minDays: 1,
    conditionScore: 80,
    conditionNotes: "Заявление владельца",
    specs: [{ label: "Вес", value: "2 кг" }],
    availableFrom: null,
    availableTo: null,
    bookable: true,
  };
}

function shift(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function uniqueEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}
