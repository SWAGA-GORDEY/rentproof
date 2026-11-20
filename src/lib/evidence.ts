import { randomUUID } from "node:crypto";
import { writeAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { listEvidenceImages, saveEvidenceImage, type StoredImage } from "@/lib/images";

export type EvidencePhase = "before" | "after";

export type EvidenceRecord = {
  id: string;
  bookingId: string;
  listingId: string;
  authorId: string;
  authorName: string;
  phase: EvidencePhase;
  description: string;
  createdAt: string;
  images: StoredImage[];
};

export function addEvidence(
  actorId: string,
  bookingId: string,
  phase: EvidencePhase,
  description: string,
  files: Uint8Array[],
): string {
  const booking = getDb()
    .prepare(
      `SELECT bookings.status, bookings.renter_id, bookings.listing_id, listings.owner_id
       FROM bookings JOIN listings ON listings.id = bookings.listing_id
       WHERE bookings.id = ?`,
    )
    .get(bookingId) as
    | { status: string; renter_id: string; listing_id: string; owner_id: string }
    | undefined;
  if (!booking) {
    throw new NotFoundError();
  }
  if (actorId !== booking.renter_id && actorId !== booking.owner_id) {
    throw new ForbiddenError();
  }
  const allowed =
    phase === "before"
      ? booking.status === "pending" || booking.status === "confirmed" || booking.status === "completed"
      : booking.status === "confirmed" || booking.status === "completed";
  if (!allowed) {
    throw new ConflictError("status");
  }
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO condition_evidence (id, booking_id, listing_id, author_id, phase, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, bookingId, booking.listing_id, actorId, phase, description, new Date().toISOString());
  for (const file of files) {
    saveEvidenceImage(id, file);
  }
  writeAudit(actorId, "evidence.add", "evidence", id, { bookingId, phase });
  return id;
}

export function listEvidence(actorId: string, isAdmin: boolean, bookingId: string): EvidenceRecord[] {
  const booking = getDb()
    .prepare(
      `SELECT bookings.renter_id, listings.owner_id
       FROM bookings JOIN listings ON listings.id = bookings.listing_id
       WHERE bookings.id = ?`,
    )
    .get(bookingId) as { renter_id: string; owner_id: string } | undefined;
  if (!booking) {
    throw new NotFoundError();
  }
  if (!isAdmin && actorId !== booking.renter_id && actorId !== booking.owner_id) {
    throw new ForbiddenError();
  }
  const rows = getDb()
    .prepare(
      `SELECT condition_evidence.*, users.name AS author_name
       FROM condition_evidence JOIN users ON users.id = condition_evidence.author_id
       WHERE booking_id = ? ORDER BY created_at`,
    )
    .all(bookingId) as Array<{
    id: string;
    booking_id: string;
    listing_id: string;
    author_id: string;
    author_name: string;
    phase: string;
    description: string;
    created_at: string;
  }>;
  return rows.flatMap((row) => {
    if (row.phase !== "before" && row.phase !== "after") {
      return [];
    }
    return [
      {
        id: row.id,
        bookingId: row.booking_id,
        listingId: row.listing_id,
        authorId: row.author_id,
        authorName: row.author_name,
        phase: row.phase,
        description: row.description,
        createdAt: row.created_at,
        images: listEvidenceImages(row.id),
      },
    ];
  });
}
