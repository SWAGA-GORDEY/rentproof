import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
import { tmpdir } from "node:os";
import path from "node:path";
import { closeDb, getDb } from "@/lib/db";
import { ForbiddenError } from "@/lib/errors";
import { createListing, getOwnedListing, updateListing } from "@/lib/listings";
import { createBooking, confirmBooking, getBookingForParty } from "@/lib/bookings";
import { registerUser } from "@/lib/users";
import { loadStaffProfile } from "@/lib/rbac";

const password = "Idor-test-42xx!";

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
}

describe("security IDOR guards", () => {
  let ownerId = "";
  let otherId = "";
  let renterId = "";
  let listingId = "";
  let bookingId = "";

  before(async () => {
    process.env.RENTPROOF_DB_DRIVER = "sqlite";
    delete process.env.DATABASE_URL;
    delete process.env.RENDER;
    process.env.RENTPROOF_ALLOW_CREATE_EMPTY_DB = "1";
    process.env.RENTPROOF_DB_PATH = path.join(tmpdir(), `rentproof-idor-${Date.now()}.sqlite`);
    closeDb();
    getDb();

    const owner = await registerUser({
      name: "Owner A",
      email: uniqueEmail("owner-a"),
      password,
      role: "landlord",
    });
    const other = await registerUser({
      name: "Owner B",
      email: uniqueEmail("owner-b"),
      password,
      role: "landlord",
    });
    const renter = await registerUser({
      name: "Renter C",
      email: uniqueEmail("renter-c"),
      password,
      role: "tenant",
    });
    ownerId = owner.id;
    otherId = other.id;
    renterId = renter.id;
    getDb().prepare(`UPDATE users SET email_verified = 1 WHERE id IN (?, ?, ?)`).run(owner.id, other.id, renter.id);

    listingId = createListing(
      ownerId,
      {
        title: "IDOR drill press",
        categoryId: "tools",
        city: "Казань",
        description: "Private listing for IDOR checks",
        pricePerDay: 900,
        deposit: 3000,
        minDays: 1,
        conditionScore: 80,
        conditionNotes: null,
        specs: [],
        availableFrom: null,
        availableTo: null,
        bookable: true,
      },
      true,
    );
    getDb()
      .prepare(`UPDATE listings SET status = 'published', updated_at = ? WHERE id = ?`)
      .run(new Date().toISOString(), listingId);

    const start = new Date();
    start.setUTCDate(start.getUTCDate() + 3);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    bookingId = createBooking(
      renterId,
      listingId,
      start.toISOString().slice(0, 10),
      end.toISOString().slice(0, 10),
      null,
    ).id;
  });

  it("rejects foreign listing updates and ownership reads", () => {
    assert.throws(
      () =>
        updateListing(
          otherId,
          listingId,
          {
            title: "Hijacked",
            categoryId: "tools",
            city: "Казань",
            description: "should fail",
            pricePerDay: 1,
            deposit: 1,
            minDays: 1,
            conditionScore: null,
            conditionNotes: null,
            specs: [],
            availableFrom: null,
            availableTo: null,
            bookable: true,
          },
          false,
        ),
      (err: unknown) => err instanceof ForbiddenError,
    );
    assert.throws(() => getOwnedListing(otherId, listingId), (err: unknown) => err instanceof ForbiddenError);
    assert.equal(getOwnedListing(ownerId, listingId).title, "IDOR drill press");
  });

  it("hides bookings from strangers and blocks foreign confirm", () => {
    assert.equal(getBookingForParty(otherId, false, bookingId), null);
    assert.ok(getBookingForParty(renterId, false, bookingId));
    assert.ok(getBookingForParty(ownerId, false, bookingId));
    assert.throws(() => confirmBooking(otherId, bookingId), (err: unknown) => err instanceof ForbiddenError);
  });

  it("does not elevate regular users to staff", () => {
    for (const id of [otherId, ownerId, renterId]) {
      const profile = loadStaffProfile(id);
      assert.ok(profile);
      assert.equal(profile.isAdmin, false);
      assert.equal(profile.staffRole, null);
      assert.deepEqual(profile.permissions, []);
    }
  });
});
