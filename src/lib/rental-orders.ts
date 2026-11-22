import { randomUUID } from "node:crypto";
import { getBookingForParty, quoteBooking } from "@/lib/bookings";
import { getDb } from "@/lib/db";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { rublesToKopecks } from "@/lib/money";
import { computePlatformFeeKopecks } from "@/lib/yookassa";

export type RentalOrderRecord = {
  id: string;
  bookingId: string;
  renterId: string;
  ownerId: string;
  listingId: string;
  startDate: string;
  endDate: string;
  rentalAmountKopecks: number;
  platformFeeKopecks: number;
  depositAmountKopecks: number;
  totalAmountKopecks: number;
  currency: string;
  paymentStatus: string;
  rentalStatus: string;
  dealStatus: string;
  providerPaymentId: string | null;
  createdAt: string;
  updatedAt: string;
};

type OrderRow = {
  id: string;
  booking_id: string;
  renter_id: string;
  owner_id: string;
  listing_id: string;
  start_date: string;
  end_date: string;
  rental_amount_kopecks: number;
  platform_fee_kopecks: number;
  deposit_amount_kopecks: number;
  total_amount_kopecks: number;
  currency: string;
  payment_status: string;
  rental_status: string;
  deal_status: string;
  provider_payment_id: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Creates or returns existing rental order for a booking.
 * Totals are always recalculated on the server from listing quote — never from the browser.
 * Deposit is tracked but not included in chargeable total until Safe Deal is enabled.
 */
export function ensureRentalOrder(actorId: string, isAdmin: boolean, bookingId: string): RentalOrderRecord {
  const booking = getBookingForParty(actorId, isAdmin, bookingId);
  if (!booking) {
    throw new NotFoundError();
  }
  if (!isAdmin && booking.renterId !== actorId) {
    throw new ForbiddenError();
  }
  if (booking.status === "cancelled" || booking.status === "rejected") {
    throw new ConflictError("booking_closed");
  }

  const existing = getDb()
    .prepare(`SELECT * FROM rental_orders WHERE booking_id = ?`)
    .get(bookingId) as OrderRow | undefined;
  if (existing) {
    return mapOrder(existing);
  }

  const quote = quoteBooking(booking.listingId, booking.startDate, booking.endDate);
  const rentalAmountKopecks = rublesToKopecks(quote.rentAmount);
  const depositAmountKopecks = rublesToKopecks(quote.depositAmount);
  const platformFeeKopecks = computePlatformFeeKopecks(rentalAmountKopecks);
  // Charge rent + platform fee only. Deposit awaits Safe Deal (not held on RentProof balance).
  const totalAmountKopecks = rentalAmountKopecks + platformFeeKopecks;
  const now = new Date().toISOString();
  const id = randomUUID();

  getDb()
    .prepare(
      `INSERT INTO rental_orders (
        id, booking_id, renter_id, owner_id, listing_id, start_date, end_date,
        rental_amount_kopecks, platform_fee_kopecks, deposit_amount_kopecks, total_amount_kopecks,
        currency, payment_status, rental_status, deal_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'RUB', 'unpaid', 'created', 'safe_deal_unavailable', ?, ?)`,
    )
    .run(
      id,
      bookingId,
      booking.renterId,
      booking.ownerId,
      booking.listingId,
      booking.startDate,
      booking.endDate,
      rentalAmountKopecks,
      platformFeeKopecks,
      depositAmountKopecks,
      totalAmountKopecks,
      now,
      now,
    );

  return getRentalOrder(id)!;
}

export function getRentalOrder(orderId: string): RentalOrderRecord | null {
  const row = getDb().prepare(`SELECT * FROM rental_orders WHERE id = ?`).get(orderId) as OrderRow | undefined;
  return row ? mapOrder(row) : null;
}

export function getRentalOrderForBooking(bookingId: string): RentalOrderRecord | null {
  const row = getDb().prepare(`SELECT * FROM rental_orders WHERE booking_id = ?`).get(bookingId) as
    | OrderRow
    | undefined;
  return row ? mapOrder(row) : null;
}

export function getRentalOrderForParty(
  actorId: string,
  isAdmin: boolean,
  orderId: string,
): RentalOrderRecord | null {
  const order = getRentalOrder(orderId);
  if (!order) {
    return null;
  }
  if (!isAdmin && order.renterId !== actorId && order.ownerId !== actorId) {
    return null;
  }
  return order;
}

export function listRentalOrdersForUser(userId: string, limit = 50): RentalOrderRecord[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM rental_orders
       WHERE renter_id = ? OR owner_id = ?
       ORDER BY created_at DESC LIMIT ?`,
    )
    .all(userId, userId, limit) as OrderRow[];
  return rows.map(mapOrder);
}

export function requestSafeDealPayout(adminId: string, orderId: string): { status: string; message: string } {
  const admin = getDb().prepare("SELECT is_admin FROM users WHERE id = ?").get(adminId) as
    | { is_admin: number }
    | undefined;
  if (!admin?.is_admin) {
    throw new ForbiddenError();
  }
  const order = getRentalOrder(orderId);
  if (!order || order.paymentStatus !== "paid") {
    throw new ConflictError("not_paid");
  }
  const now = new Date().toISOString();
  const payoutId = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO payouts (
        id, rental_order_id, owner_id, amount_kopecks, currency, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'RUB', 'unavailable', ?, ?)`,
    )
    .run(
      payoutId,
      orderId,
      order.ownerId,
      order.rentalAmountKopecks,
      now,
      now,
    );
  getDb()
    .prepare(`UPDATE rental_orders SET deal_status = 'safe_deal_unavailable', updated_at = ? WHERE id = ?`)
    .run(now, orderId);
  return {
    status: "unavailable",
    message:
      "Безопасная сделка ЮKassa не подключена к магазину. Выплата владельцу не имитируется и не выполняется.",
  };
}

function mapOrder(row: OrderRow): RentalOrderRecord {
  return {
    id: row.id,
    bookingId: row.booking_id,
    renterId: row.renter_id,
    ownerId: row.owner_id,
    listingId: row.listing_id,
    startDate: row.start_date,
    endDate: row.end_date,
    rentalAmountKopecks: row.rental_amount_kopecks,
    platformFeeKopecks: row.platform_fee_kopecks,
    depositAmountKopecks: row.deposit_amount_kopecks,
    totalAmountKopecks: row.total_amount_kopecks,
    currency: row.currency,
    paymentStatus: row.payment_status,
    rentalStatus: row.rental_status,
    dealStatus: row.deal_status,
    providerPaymentId: row.provider_payment_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
