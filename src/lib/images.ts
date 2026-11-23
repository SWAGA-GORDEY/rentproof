import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getDb } from "@/lib/db";
import { ForbiddenError, ImageRejectedError, NotFoundError } from "@/lib/errors";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_LISTING_IMAGES = 8;
const MAX_ATTACHED = 6;

export type StoredImage = {
  id: string;
  mime: string;
  sizeBytes: number;
  createdAt: string;
};

export function uploadRoot(): string {
  const configured = process.env.RENTPROOF_UPLOAD_DIR?.trim();
  if (configured) return configured;
  if (process.env.RENDER === "true") return "/data/uploads";
  return path.join(process.cwd(), "data", "uploads");
}

export function sniffImage(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes.length < 12 || bytes.length > MAX_BYTES) {
    return null;
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function saveListingImage(listingId: string, bytes: Uint8Array): StoredImage {
  const mime = sniffImage(bytes);
  if (!mime) {
    throw new ImageRejectedError();
  }
  const count = getDb()
    .prepare("SELECT COUNT(*) AS count FROM listing_images WHERE listing_id = ?")
    .get(listingId) as { count: number };
  if (Number(count.count) >= MAX_LISTING_IMAGES) {
    throw new ImageRejectedError();
  }
  return insertImage("listing_images", listingId, bytes, mime);
}

export function listListingImages(listingId: string): StoredImage[] {
  return mapImages(
    getDb()
      .prepare(
        `SELECT id, mime, size_bytes, created_at FROM listing_images
         WHERE listing_id = ? ORDER BY sort_order, created_at`,
      )
      .all(listingId) as ImageRow[],
  );
}

export function saveAiImage(reportId: string, bytes: Uint8Array): StoredImage {
  const mime = sniffImage(bytes);
  if (!mime) {
    throw new ImageRejectedError();
  }
  return insertImage("ai_report_images", reportId, bytes, mime);
}

export function listAiImages(reportId: string): StoredImage[] {
  return mapImages(
    getDb()
      .prepare("SELECT id, mime, size_bytes, created_at FROM ai_report_images WHERE report_id = ? ORDER BY created_at")
      .all(reportId) as ImageRow[],
  );
}

export function saveEvidenceImage(evidenceId: string, bytes: Uint8Array): StoredImage {
  const mime = sniffImage(bytes);
  if (!mime) {
    throw new ImageRejectedError();
  }
  const count = getDb()
    .prepare("SELECT COUNT(*) AS count FROM condition_evidence_images WHERE evidence_id = ?")
    .get(evidenceId) as { count: number };
  if (Number(count.count) >= MAX_ATTACHED) {
    throw new ImageRejectedError();
  }
  return insertImage("condition_evidence_images", evidenceId, bytes, mime);
}

export function listEvidenceImages(evidenceId: string): StoredImage[] {
  return mapImages(
    getDb()
      .prepare(
        "SELECT id, mime, size_bytes, created_at FROM condition_evidence_images WHERE evidence_id = ? ORDER BY created_at",
      )
      .all(evidenceId) as ImageRow[],
  );
}

export type ImageAccess =
  | { kind: "listing"; listingStatus: string; ownerId: string }
  | { kind: "ai"; ownerId: string }
  | { kind: "evidence"; authorId: string; renterId: string; ownerId: string };

export function findImageAccess(imageId: string): { mime: string; storageName: string; access: ImageAccess } | null {
  const db = getDb();
  const listing = db
    .prepare(
      `SELECT listing_images.mime, listing_images.storage_name, listings.status, listings.owner_id
       FROM listing_images JOIN listings ON listings.id = listing_images.listing_id
       WHERE listing_images.id = ?`,
    )
    .get(imageId) as
    | { mime: string; storage_name: string; status: string; owner_id: string }
    | undefined;
  if (listing) {
    return {
      mime: listing.mime,
      storageName: listing.storage_name,
      access: { kind: "listing", listingStatus: listing.status, ownerId: listing.owner_id },
    };
  }

  const ai = db
    .prepare(
      `SELECT ai_report_images.mime, ai_report_images.storage_name, ai_reports.user_id
       FROM ai_report_images JOIN ai_reports ON ai_reports.id = ai_report_images.report_id
       WHERE ai_report_images.id = ?`,
    )
    .get(imageId) as { mime: string; storage_name: string; user_id: string } | undefined;
  if (ai) {
    return {
      mime: ai.mime,
      storageName: ai.storage_name,
      access: { kind: "ai", ownerId: ai.user_id },
    };
  }

  const evidence = db
    .prepare(
      `SELECT condition_evidence_images.mime, condition_evidence_images.storage_name,
              condition_evidence.author_id, bookings.renter_id, listings.owner_id
       FROM condition_evidence_images
       JOIN condition_evidence ON condition_evidence.id = condition_evidence_images.evidence_id
       JOIN bookings ON bookings.id = condition_evidence.booking_id
       JOIN listings ON listings.id = condition_evidence.listing_id
       WHERE condition_evidence_images.id = ?`,
    )
    .get(imageId) as
    | { mime: string; storage_name: string; author_id: string; renter_id: string; owner_id: string }
    | undefined;
  if (!evidence) {
    return null;
  }
  return {
    mime: evidence.mime,
    storageName: evidence.storage_name,
    access: {
      kind: "evidence",
      authorId: evidence.author_id,
      renterId: evidence.renter_id,
      ownerId: evidence.owner_id,
    },
  };
}

export function canViewImage(access: ImageAccess, user: { id: string; isAdmin: boolean } | null): boolean {
  if (access.kind === "listing") {
    return access.listingStatus === "published" || Boolean(user && (user.isAdmin || user.id === access.ownerId));
  }
  if (access.kind === "ai") {
    return Boolean(user && (user.isAdmin || user.id === access.ownerId));
  }
  return Boolean(user && (user.isAdmin || user.id === access.authorId || user.id === access.renterId || user.id === access.ownerId));
}

export function readImageFile(storageName: string): Buffer {
  if (!/^[0-9a-f-]{36}\.img$/.test(storageName)) {
    throw new NotFoundError();
  }
  const root = path.resolve(/*turbopackIgnore: true*/ uploadRoot());
  const file = path.resolve(/*turbopackIgnore: true*/ root, storageName);
  if (!file.startsWith(`${root}${path.sep}`)) {
    throw new ForbiddenError();
  }
  return readFileSync(/*turbopackIgnore: true*/ file);
}

export function removeListingImage(listingId: string, imageId: string): void {
  const row = getDb()
    .prepare("SELECT storage_name FROM listing_images WHERE id = ? AND listing_id = ?")
    .get(imageId, listingId) as { storage_name: string } | undefined;
  if (!row) {
    throw new NotFoundError();
  }
  getDb().prepare("DELETE FROM listing_images WHERE id = ? AND listing_id = ?").run(imageId, listingId);
}

function insertImage(table: string, parentId: string, bytes: Uint8Array, mime: string): StoredImage {
  const id = randomUUID();
  const storageName = `${id}.img`;
  const root = uploadRoot();
  mkdirSync(/*turbopackIgnore: true*/ root, { recursive: true });
  writeFileSync(/*turbopackIgnore: true*/ path.join(root, storageName), bytes);
  const createdAt = new Date().toISOString();
  const sort = table === "listing_images" ? nextSort(parentId) : 0;
  if (table === "listing_images") {
    getDb()
      .prepare(
        `INSERT INTO listing_images (id, listing_id, storage_name, mime, size_bytes, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, parentId, storageName, mime, bytes.length, sort, createdAt);
  } else if (table === "ai_report_images") {
    getDb()
      .prepare(
        `INSERT INTO ai_report_images (id, report_id, storage_name, mime, size_bytes, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(id, parentId, storageName, mime, bytes.length, createdAt);
  } else {
    getDb()
      .prepare(
        `INSERT INTO condition_evidence_images (id, evidence_id, storage_name, mime, size_bytes, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(id, parentId, storageName, mime, bytes.length, createdAt);
  }
  return { id, mime, sizeBytes: bytes.length, createdAt };
}

function nextSort(listingId: string): number {
  const row = getDb()
    .prepare("SELECT COALESCE(MAX(sort_order), 0) AS sort FROM listing_images WHERE listing_id = ?")
    .get(listingId) as { sort: number };
  return Number(row.sort) + 1;
}

type ImageRow = { id: string; mime: string; size_bytes: number; created_at: string };

function mapImages(rows: ImageRow[]): StoredImage[] {
  return rows.map((row) => ({
    id: row.id,
    mime: row.mime,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  }));
}
