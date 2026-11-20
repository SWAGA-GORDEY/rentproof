import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { writeAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { inclusiveDays, todayUtc } from "@/lib/format";
import { notifyUser } from "@/lib/notifications";
import { planHistoryLimit, type PlanId } from "@/lib/plans";

export type BookingStatus = "pending" | "confirmed" | "rejected" | "cancelled" | "completed";

export type Quote = {
  days: number;
  rentAmount: number;
  depositAmount: number;
};

export type BookingRecord = {
  id: string;
  listingId: string;
  listingTitle: string;
  listingCity: string;
  ownerId: string;
  ownerName: string;
  renterId: string;
  renterName: string;
  startDate: string;
  endDate: string;
  days: number;
  rentAmount: number;
  depositAmount: number;
  status: BookingStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DateRange = { startDate: string; endDate: string };

type BookingRow = {
  id: string;
  listing_id: string;
  listing_title: string;
  listing_city: string;
  owner_id: string;
  owner_name: string;
  renter_id: string;
  renter_name: string;
  start_date: string;
  end_date: string;
  days: number;
  rent_amount: number;
  deposit_amount: number;
  status: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

const SELECT_BOOKING = `
  SELECT bookings.*, listings.title AS listing_title, listings.city AS listing_city, listings.owner_id,
         owners.name AS owner_name, renters.name AS renter_name
  FROM bookings
  JOIN listings ON listings.id = bookings.listing_id
  JOIN users AS owners ON owners.id = listings.owner_id
  JOIN users AS renters ON renters.id = bookings.renter_id
`;

export function quoteBooking(listingId: string, startDate: string, endDate: string, now = new Date()): Quote {
  const listing = loadOpenListing(listingId);
  const days = validatedSpan(startDate, endDate, listing.min_days, listing.available_from, listing.available_to, now);
  return {
    days,
    rentAmount: days * listing.price_per_day,
    depositAmount: listing.deposit,
  };
}

export function createBooking(renterId: string, listingId: string, startDate: string, endDate: string, note: string | null, now = new Date()): { id: string; created: boolean } {
  return transaction(() => {
    const listing = loadOpenListing(listingId);
    if (listing.owner_id === renterId) {
      throw new ConflictError("own-listing");
    }
    const quote = {
      days: validatedSpan(startDate, endDate, listing.min_days, listing.available_from, listing.available_to, now),
    };
    if (hasConfirmedOverlap(getDb(), listingId, startDate, endDate)) {
      throw new ConflictError("overlap");
    }
    const existing = getDb()
      .prepare(
        `SELECT id FROM bookings
         WHERE listing_id = ? AND renter_id = ? AND start_date = ? AND end_date = ?
           AND status IN ('pending', 'confirmed')`,
      )
      .get(listingId, renterId, startDate, endDate) as { id: string } | undefined;
    if (existing) {
      return { id: existing.id, created: false };
    }
    const id = randomUUID();
    const stamp = now.toISOString();
    const rentAmount = quote.days * listing.price_per_day;
    getDb()
      .prepare(
        `INSERT INTO bookings (
          id, listing_id, renter_id, start_date, end_date, days, rent_amount, deposit_amount, status, note, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
      )
      .run(id, listingId, renterId, startDate, endDate, quote.days, rentAmount, listing.deposit, note, stamp, stamp);
    writeAudit(renterId, "booking.create", "booking", id, { listingId, startDate, endDate });
    notifyUser(listing.owner_id, {
      kind: "booking",
      title: "Новая заявка на аренду",
      body: `«${listing.title}», ${startDate} — ${endDate}.`,
      href: "/account/bookings",
    });
    notifyUser(renterId, {
      kind: "booking",
      title: "Заявка отправлена",
      body: `«${listing.title}» ожидает подтверждения арендодателя.`,
      href: "/account/bookings",
    });
    return { id, created: true };
  });
}

export function confirmBooking(actorId: string, bookingId: string): void {
  transition(actorId, bookingId, "confirmed", (booking) => {
    if (booking.owner_id !== actorId) {
      throw new ForbiddenError();
    }
    if (booking.status !== "pending") {
      throw new ConflictError("status");
    }
    if (hasConfirmedOverlap(getDb(), booking.listing_id, booking.start_date, booking.end_date, booking.id)) {
      throw new ConflictError("overlap");
    }
  });
}

export function rejectBooking(actorId: string, bookingId: string): void {
  transition(actorId, bookingId, "rejected", (booking) => {
    if (booking.owner_id !== actorId || booking.status !== "pending") {
      throw booking.owner_id === actorId ? new ConflictError("status") : new ForbiddenError();
    }
  });
}

export function cancelBooking(actorId: string, bookingId: string): void {
  transition(actorId, bookingId, "cancelled", (booking) => {
    const party = booking.owner_id === actorId || booking.renter_id === actorId;
    if (!party) {
      throw new ForbiddenError();
    }
    if (booking.status !== "pending" && booking.status !== "confirmed") {
      throw new ConflictError("status");
    }
  });
}

export function completeBooking(actorId: string, bookingId: string): void {
  transition(actorId, bookingId, "completed", (booking) => {
    const party = booking.owner_id === actorId || booking.renter_id === actorId;
    if (!party) {
      throw new ForbiddenError();
    }
    if (booking.status !== "confirmed") {
      throw new ConflictError("status");
    }
  });
}

export function getBookingForParty(actorId: string, isAdmin: boolean, bookingId: string): BookingRecord | null {
  const row = getDb().prepare(`${SELECT_BOOKING} WHERE bookings.id = ?`).get(bookingId) as BookingRow | undefined;
  if (!row || !isBookingStatus(row.status)) {
    return null;
  }
  if (!isAdmin && row.owner_id !== actorId && row.renter_id !== actorId) {
    return null;
  }
  return mapBooking(row);
}

export function listBookingsForUser(userId: string, plan: PlanId): BookingRecord[] {
  const limit = planHistoryLimit(plan);
  const rows = getDb()
    .prepare(
      `${SELECT_BOOKING}
       WHERE bookings.renter_id = ? OR listings.owner_id = ?
       ORDER BY bookings.created_at DESC LIMIT ?`,
    )
    .all(userId, userId, limit) as BookingRow[];
  return rows.flatMap((row) => (isBookingStatus(row.status) ? [mapBooking(row)] : []));
}

export function listConfirmedRanges(listingId: string): DateRange[] {
  const rows = getDb()
    .prepare(
      `SELECT start_date, end_date FROM bookings
       WHERE listing_id = ? AND status = 'confirmed' ORDER BY start_date`,
    )
    .all(listingId) as Array<{ start_date: string; end_date: string }>;
  return rows.map((row) => ({ startDate: row.start_date, endDate: row.end_date }));
}

export function listAllBookings(limit = 100): BookingRecord[] {
  const rows = getDb().prepare(`${SELECT_BOOKING} ORDER BY bookings.created_at DESC LIMIT ?`).all(limit) as BookingRow[];
  return rows.flatMap((row) => (isBookingStatus(row.status) ? [mapBooking(row)] : []));
}

export function bookingStatusLabel(status: BookingStatus): string {
  switch (status) {
    case "pending":
      return "Ожидает подтверждения";
    case "confirmed":
      return "Подтверждено";
    case "rejected":
      return "Отклонено";
    case "cancelled":
      return "Отменено";
    case "completed":
      return "Завершено";
  }
}

function transition(actorId: string, bookingId: string, status: BookingStatus, check: (row: BookingRow) => void): void {
  transaction(() => {
    const row = getDb().prepare(`${SELECT_BOOKING} WHERE bookings.id = ?`).get(bookingId) as BookingRow | undefined;
    if (!row || !isBookingStatus(row.status)) {
      throw new NotFoundError();
    }
    check(row);
    const stamp = new Date().toISOString();
    const result = getDb()
      .prepare("UPDATE bookings SET status = ?, updated_at = ? WHERE id = ? AND status = ?")
      .run(status, stamp, bookingId, row.status);
    if (result.changes !== 1) {
      throw new ConflictError("status");
    }
    writeAudit(actorId, "booking.status", "booking", bookingId, { from: row.status, to: status });
    const target = actorId === row.renter_id ? row.owner_id : row.renter_id;
    notifyUser(target, {
      kind: "booking",
      title: `Бронирование: ${bookingStatusLabel(status)}`,
      body: `«${row.listing_title}», ${row.start_date} — ${row.end_date}.`,
      href: "/account/bookings",
    });
  });
}

function loadOpenListing(listingId: string): {
  title: string;
  owner_id: string;
  price_per_day: number;
  deposit: number;
  min_days: number;
  available_from: string | null;
  available_to: string | null;
  bookable: number;
  status: string;
} {
  const listing = getDb()
    .prepare(
      `SELECT title, owner_id, price_per_day, deposit, min_days, available_from, available_to, bookable, status
       FROM listings WHERE id = ?`,
    )
    .get(listingId) as
    | {
        title: string;
        owner_id: string;
        price_per_day: number;
        deposit: number;
        min_days: number;
        available_from: string | null;
        available_to: string | null;
        bookable: number;
        status: string;
      }
    | undefined;
  if (!listing || listing.status !== "published" || listing.bookable !== 1) {
    throw new ConflictError("window");
  }
  return listing;
}

function validatedSpan(
  startDate: string,
  endDate: string,
  minDays: number,
  availableFrom: string | null,
  availableTo: string | null,
  now: Date,
): number {
  const days = inclusiveDays(startDate, endDate);
  const earliest = shiftDate(todayUtc(now), -1);
  const latestStart = shiftDate(todayUtc(now), 365);
  if (days === null || startDate < earliest || startDate > latestStart || days > 90 || days < minDays) {
    throw new ConflictError("window");
  }
  if (availableFrom && startDate < availableFrom) {
    throw new ConflictError("window");
  }
  if (availableTo && endDate > availableTo) {
    throw new ConflictError("window");
  }
  return days;
}

function shiftDate(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function hasConfirmedOverlap(db: DatabaseSync, listingId: string, startDate: string, endDate: string, exceptId?: string): boolean {
  const row = exceptId
    ? (db
        .prepare(
          `SELECT id FROM bookings
           WHERE listing_id = ? AND status = 'confirmed' AND id != ?
             AND start_date <= ? AND end_date >= ? LIMIT 1`,
        )
        .get(listingId, exceptId, endDate, startDate) as { id: string } | undefined)
    : (db
        .prepare(
          `SELECT id FROM bookings
           WHERE listing_id = ? AND status = 'confirmed'
             AND start_date <= ? AND end_date >= ? LIMIT 1`,
        )
        .get(listingId, endDate, startDate) as { id: string } | undefined);
  return Boolean(row);
}

function transaction<T>(fn: () => T): T {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const value = fn();
    db.exec("COMMIT");
    return value;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function mapBooking(row: BookingRow): BookingRecord {
  if (!isBookingStatus(row.status)) {
    throw new Error("Unknown booking status");
  }
  return {
    id: row.id,
    listingId: row.listing_id,
    listingTitle: row.listing_title,
    listingCity: row.listing_city,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    renterId: row.renter_id,
    renterName: row.renter_name,
    startDate: row.start_date,
    endDate: row.end_date,
    days: row.days,
    rentAmount: row.rent_amount,
    depositAmount: row.deposit_amount,
    status: row.status,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isBookingStatus(value: string): value is BookingStatus {
  return value === "pending" || value === "confirmed" || value === "rejected" || value === "cancelled" || value === "completed";
}
