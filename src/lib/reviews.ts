import { randomUUID } from "node:crypto";
import { writeAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { notifyUser } from "@/lib/notifications";

export type ReviewRecord = {
  id: string;
  bookingId: string;
  authorId: string;
  authorName: string;
  subjectUserId: string;
  listingId: string;
  listingTitle: string;
  rating: number;
  body: string;
  status: "published" | "hidden";
  createdAt: string;
};

type ReviewRow = {
  id: string;
  booking_id: string;
  author_id: string;
  author_name: string;
  subject_user_id: string;
  listing_id: string;
  listing_title: string;
  rating: number;
  body: string;
  status: string;
  created_at: string;
};

const SELECT_REVIEW = `
  SELECT reviews.*, authors.name AS author_name, listings.title AS listing_title
  FROM reviews
  JOIN users AS authors ON authors.id = reviews.author_id
  JOIN listings ON listings.id = reviews.listing_id
`;

export function createReview(authorId: string, bookingId: string, rating: number, body: string): string {
  const booking = getDb()
    .prepare(
      `SELECT bookings.status, bookings.renter_id, bookings.listing_id, listings.owner_id, listings.title
       FROM bookings JOIN listings ON listings.id = bookings.listing_id
       WHERE bookings.id = ?`,
    )
    .get(bookingId) as
    | { status: string; renter_id: string; listing_id: string; owner_id: string; title: string }
    | undefined;
  if (!booking) {
    throw new NotFoundError();
  }
  if (booking.renter_id !== authorId) {
    throw new ForbiddenError();
  }
  if (booking.status !== "completed") {
    throw new ConflictError("status");
  }
  if (booking.owner_id === authorId) {
    throw new ForbiddenError();
  }
  const id = randomUUID();
  try {
    getDb()
      .prepare(
        `INSERT INTO reviews (
          id, booking_id, author_id, subject_user_id, listing_id, rating, body, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?)`,
      )
      .run(id, bookingId, authorId, booking.owner_id, booking.listing_id, rating, body, new Date().toISOString());
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed: reviews.booking_id")) {
      throw new ConflictError("duplicate");
    }
    throw error;
  }
  writeAudit(authorId, "review.create", "review", id, { bookingId, rating });
  notifyUser(booking.owner_id, {
    kind: "review",
    title: "Новый отзыв",
    body: `По аренде «${booking.title}» поставлена оценка ${rating} из 5.`,
    href: "/account/reviews",
  });
  return id;
}

export function listListingReviews(listingId: string): ReviewRecord[] {
  const rows = getDb()
    .prepare(`${SELECT_REVIEW} WHERE reviews.listing_id = ? AND reviews.status = 'published' ORDER BY reviews.created_at DESC`)
    .all(listingId) as ReviewRow[];
  return rows.map(mapReview);
}

export function listUserReviews(userId: string): ReviewRecord[] {
  const rows = getDb()
    .prepare(
      `${SELECT_REVIEW}
       WHERE (reviews.author_id = ? OR reviews.subject_user_id = ?) AND reviews.status = 'published'
       ORDER BY reviews.created_at DESC`,
    )
    .all(userId, userId) as ReviewRow[];
  return rows.map(mapReview);
}

export function userRating(userId: string): { average: number | null; count: number } {
  const row = getDb()
    .prepare(
      `SELECT AVG(rating) AS average, COUNT(*) AS count
       FROM reviews WHERE subject_user_id = ? AND status = 'published'`,
    )
    .get(userId) as { average: number | null; count: number };
  return {
    average: row.average === null ? null : Math.round(row.average * 10) / 10,
    count: Number(row.count),
  };
}

export function setReviewVisibility(adminId: string, reviewId: string, status: "published" | "hidden"): void {
  const result = getDb()
    .prepare("UPDATE reviews SET status = ? WHERE id = ?")
    .run(status, reviewId);
  if (result.changes !== 1) {
    throw new NotFoundError();
  }
  writeAudit(adminId, "review.moderate", "review", reviewId, { status });
}

function mapReview(row: ReviewRow): ReviewRecord {
  if (row.status !== "published" && row.status !== "hidden") {
    throw new Error("Unknown review status");
  }
  return {
    id: row.id,
    bookingId: row.booking_id,
    authorId: row.author_id,
    authorName: row.author_name,
    subjectUserId: row.subject_user_id,
    listingId: row.listing_id,
    listingTitle: row.listing_title,
    rating: row.rating,
    body: row.body,
    status: row.status,
    createdAt: row.created_at,
  };
}
