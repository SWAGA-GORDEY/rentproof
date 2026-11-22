import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { isCategoryId, type CategoryId } from "@/lib/categories";
import { ConflictError, ForbiddenError, NotFoundError, PlanLimitError } from "@/lib/errors";
import { foldSearch, todayUtc } from "@/lib/format";
import { listListingImages, type StoredImage } from "@/lib/images";
import { notifyUser } from "@/lib/notifications";
import { listingAutoPublishEnabled } from "@/lib/plan-config";
import { planListingLimit, type PlanId } from "@/lib/plans";

export type ListingStatus = "draft" | "pending" | "published" | "rejected" | "archived";

export type SpecItem = { label: string; value: string };

export type ListingInput = {
  title: string;
  categoryId: CategoryId;
  city: string;
  description: string;
  pricePerDay: number;
  deposit: number;
  minDays: number;
  conditionScore: number | null;
  conditionNotes: string | null;
  specs: SpecItem[];
  availableFrom: string | null;
  availableTo: string | null;
  bookable: boolean;
};

export type ListingRecord = {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerCity: string | null;
  categoryId: string;
  title: string;
  description: string;
  city: string;
  pricePerDay: number;
  deposit: number;
  minDays: number;
  conditionScore: number | null;
  conditionNotes: string | null;
  specs: SpecItem[];
  status: ListingStatus;
  rejectionReason: string | null;
  availableFrom: string | null;
  availableTo: string | null;
  bookable: boolean;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  ratingAvg: number | null;
  reviewCount: number;
  images: StoredImage[];
};

export type CatalogFilters = {
  q: string;
  category: string;
  city: string;
  minPrice: number | null;
  maxPrice: number | null;
  sort: "new" | "price_asc" | "price_desc" | "rating";
  availableOnly: boolean;
  page: number;
};

const PAGE_SIZE = 9;

type ListingRow = {
  id: string;
  owner_id: string;
  owner_name: string;
  owner_city: string | null;
  category_id: string;
  title: string;
  description: string;
  city: string;
  price_per_day: number;
  deposit: number;
  min_days: number;
  condition_score: number | null;
  condition_notes: string | null;
  specs_json: string;
  status: string;
  rejection_reason: string | null;
  available_from: string | null;
  available_to: string | null;
  bookable: number;
  is_demo: number;
  created_at: string;
  updated_at: string;
  rating_avg: number | null;
  review_count: number;
};

const SELECT_LISTING = `
  SELECT listings.*, users.name AS owner_name, users.city AS owner_city,
    (SELECT COUNT(*) FROM reviews WHERE reviews.listing_id = listings.id AND reviews.status = 'published') AS review_count,
    (SELECT AVG(rating) FROM reviews WHERE reviews.listing_id = listings.id AND reviews.status = 'published') AS rating_avg
  FROM listings
  JOIN users ON users.id = listings.owner_id
`;

export function createListing(ownerId: string, input: ListingInput, submit: boolean): string {
  assertPlanCapacity(ownerId);
  const id = randomUUID();
  const now = new Date().toISOString();
  const status: ListingStatus = submit ? (listingAutoPublishEnabled() ? "published" : "pending") : "draft";
  getDb()
    .prepare(
      `INSERT INTO listings (
        id, owner_id, category_id, title, description, city, price_per_day, deposit, min_days,
        condition_score, condition_notes, specs_json, status, rejection_reason, available_from, available_to,
        bookable, is_demo, search_text, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, 0, ?, ?, ?)`,
    )
    .run(
      id,
      ownerId,
      input.categoryId,
      input.title,
      input.description,
      input.city,
      input.pricePerDay,
      input.deposit,
      input.minDays,
      input.conditionScore,
      input.conditionNotes,
      JSON.stringify(input.specs),
      status,
      input.availableFrom,
      input.availableTo,
      input.bookable ? 1 : 0,
      foldSearch(input.title, input.description, input.city),
      now,
      now,
    );
  writeAudit(ownerId, submit ? "listing.submit" : "listing.draft", "listing", id, { status });
  if (submit) {
    notifyUser(ownerId, {
      kind: "listing",
      title: status === "published" ? "Объявление опубликовано" : "Объявление отправлено на модерацию",
      body:
        status === "published"
          ? `«${input.title}» уже в каталоге. Вы можете снять его с публикации в любой момент.`
          : `«${input.title}» ожидает проверки.`,
      href: status === "published" ? `/catalog/${id}` : `/listings/${id}/edit`,
    });
  }
  return id;
}

export function updateListing(actorId: string, listingId: string, input: ListingInput, submit: boolean): void {
  const current = requireOwned(actorId, listingId);
  if (current.status === "archived") {
    throw new ConflictError("status");
  }
  const auto = listingAutoPublishEnabled();
  let resolved: ListingStatus;
  if (submit) {
    resolved = auto ? "published" : "pending";
  } else if (current.status === "published" && auto) {
    // Keep live listings published after edit when auto-publish is on.
    resolved = "published";
  } else if (current.status === "published") {
    resolved = "pending";
  } else if (current.status === "rejected") {
    resolved = "draft";
  } else {
    resolved = current.status;
  }
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE listings SET
        category_id = ?, title = ?, description = ?, city = ?, price_per_day = ?, deposit = ?, min_days = ?,
        condition_score = ?, condition_notes = ?, specs_json = ?, status = ?, rejection_reason = NULL,
        available_from = ?, available_to = ?, bookable = ?, search_text = ?, updated_at = ?
       WHERE id = ? AND owner_id = ?`,
    )
    .run(
      input.categoryId,
      input.title,
      input.description,
      input.city,
      input.pricePerDay,
      input.deposit,
      input.minDays,
      input.conditionScore,
      input.conditionNotes,
      JSON.stringify(input.specs),
      resolved,
      input.availableFrom,
      input.availableTo,
      input.bookable ? 1 : 0,
      foldSearch(input.title, input.description, input.city),
      now,
      listingId,
      actorId,
    );
  writeAudit(actorId, "listing.update", "listing", listingId, { status: resolved });
  if (submit || resolved !== current.status) {
    notifyUser(actorId, {
      kind: "listing",
      title: resolved === "published" ? "Объявление обновлено в каталоге" : "Статус объявления изменён",
      body: `«${input.title}» — ${resolved}.`,
      href: resolved === "published" ? `/catalog/${listingId}` : `/listings/${listingId}/edit`,
    });
  }
}

export function setOwnerListingStatus(
  actorId: string,
  listingId: string,
  status: "draft" | "pending" | "published" | "archived",
): void {
  const current = requireOwned(actorId, listingId);
  if ((status === "pending" || status === "published") && current.status === "archived") {
    throw new ConflictError("status");
  }
  if (status === "published" && !listingAutoPublishEnabled()) {
    throw new ConflictError("status");
  }
  if (status === "pending" || status === "published") {
    assertPlanCapacity(actorId, listingId);
  }
  const now = new Date().toISOString();
  const result = getDb()
    .prepare("UPDATE listings SET status = ?, rejection_reason = NULL, updated_at = ? WHERE id = ? AND owner_id = ?")
    .run(status, now, listingId, actorId);
  if (result.changes !== 1) {
    throw new NotFoundError();
  }
  writeAudit(actorId, "listing.status", "listing", listingId, { status });
  notifyUser(actorId, {
    kind: "listing",
    title:
      status === "archived"
        ? "Объявление в архиве"
        : status === "published"
          ? "Объявление снова в каталоге"
          : status === "pending"
            ? "Объявление на модерации"
            : "Объявление скрыто",
    body: `Статус «${current.title}» обновлён.`,
    href: status === "published" ? `/catalog/${listingId}` : `/listings/${listingId}/edit`,
  });
}

export function moderateListing(adminId: string, listingId: string, decision: "published" | "rejected", reason: string | null): void {
  const listing = getListingRow(listingId);
  if (!listing) {
    throw new NotFoundError();
  }
  const now = new Date().toISOString();
  getDb()
    .prepare("UPDATE listings SET status = ?, rejection_reason = ?, updated_at = ? WHERE id = ?")
    .run(decision, decision === "rejected" ? reason : null, now, listingId);
  writeAudit(adminId, "listing.moderate", "listing", listingId, { status: decision });
  notifyUser(listing.owner_id, {
    kind: "moderation",
    title: decision === "published" ? "Объявление опубликовано" : "Объявление отклонено",
    body: decision === "rejected" && reason ? reason : `«${listing.title}» — новый статус модерации.`,
    href: `/listings/${listingId}/edit`,
  });
}

export function getPublishedListing(id: string): ListingRecord | null {
  const row = getDb().prepare(`${SELECT_LISTING} WHERE listings.id = ? AND listings.status = 'published'`).get(id) as ListingRow | undefined;
  return row ? hydrate(row) : null;
}

/** Lightweight rows for sitemap / SEO indexes — published only, no invented listings. */
export function listPublishedListingSitemapEntries(): Array<{ id: string; updatedAt: string }> {
  const rows = getDb()
    .prepare(
      `SELECT id, updated_at FROM listings
       WHERE status = 'published'
       ORDER BY updated_at DESC
       LIMIT 5000`,
    )
    .all() as Array<{ id: string; updated_at: string }>;
  return rows.map((row) => ({ id: row.id, updatedAt: row.updated_at }));
}

export function getManageableListing(actorId: string, isAdmin: boolean, id: string): ListingRecord | null {
  const row = getDb().prepare(`${SELECT_LISTING} WHERE listings.id = ?`).get(id) as ListingRow | undefined;
  if (!row) {
    return null;
  }
  if (!isAdmin && row.owner_id !== actorId && row.status !== "published") {
    return null;
  }
  return hydrate(row);
}

export function getOwnedListing(actorId: string, id: string): ListingRecord {
  return requireOwned(actorId, id);
}

export function listOwnerListings(ownerId: string): ListingRecord[] {
  const rows = getDb()
    .prepare(`${SELECT_LISTING} WHERE listings.owner_id = ? ORDER BY listings.updated_at DESC`)
    .all(ownerId) as ListingRow[];
  return rows.map(hydrate);
}

export function searchListings(filters: CatalogFilters, now = new Date()): { items: ListingRecord[]; total: number; pageSize: number } {
  const where: string[] = ["listings.status = 'published'"];
  const params: Array<string | number> = [];
  const query = filters.q.trim().toLowerCase();
  if (query) {
    const like = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
    where.push("listings.search_text LIKE ? ESCAPE '\\'");
    params.push(like);
  }
  if (isCategoryId(filters.category)) {
    where.push("listings.category_id = ?");
    params.push(filters.category);
  }
  if (filters.city.trim()) {
    where.push("listings.city = ?");
    params.push(filters.city.trim());
  }
  if (filters.minPrice !== null) {
    where.push("listings.price_per_day >= ?");
    params.push(filters.minPrice);
  }
  if (filters.maxPrice !== null) {
    where.push("listings.price_per_day <= ?");
    params.push(filters.maxPrice);
  }
  if (filters.availableOnly) {
    const today = todayUtc(now);
    where.push("listings.bookable = 1");
    where.push("(listings.available_from IS NULL OR listings.available_from <= ?)");
    where.push("(listings.available_to IS NULL OR listings.available_to >= ?)");
    params.push(today, today);
  }

  const whereSql = where.join(" AND ");
  const totalRow = getDb()
    .prepare(`SELECT COUNT(*) AS count FROM listings WHERE ${whereSql}`)
    .get(...params) as { count: number };
  const order =
    filters.sort === "price_asc"
      ? "listings.price_per_day ASC"
      : filters.sort === "price_desc"
        ? "listings.price_per_day DESC"
        : filters.sort === "rating"
          ? "rating_avg DESC, listings.created_at DESC"
          : "listings.created_at DESC";
  const page = Math.max(1, filters.page);
  const offset = (page - 1) * PAGE_SIZE;
  const rows = getDb()
    .prepare(`${SELECT_LISTING} WHERE ${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`)
    .all(...params, PAGE_SIZE, offset) as ListingRow[];
  return { items: rows.map(hydrate), total: Number(totalRow.count), pageSize: PAGE_SIZE };
}

export function listCities(): string[] {
  const rows = getDb()
    .prepare("SELECT DISTINCT city FROM listings WHERE status = 'published' ORDER BY city")
    .all() as Array<{ city: string }>;
  return rows.map((row) => row.city);
}

export function countActiveListings(ownerId: string, exceptId?: string): number {
  const row = exceptId
    ? (getDb()
        .prepare("SELECT COUNT(*) AS count FROM listings WHERE owner_id = ? AND status != 'archived' AND id != ?")
        .get(ownerId, exceptId) as { count: number })
    : (getDb()
        .prepare("SELECT COUNT(*) AS count FROM listings WHERE owner_id = ? AND status != 'archived'")
        .get(ownerId) as { count: number });
  return Number(row.count);
}

function assertPlanCapacity(ownerId: string, exceptId?: string): void {
  const plan = readPlan(ownerId);
  const limit = planListingLimit(plan);
  if (countActiveListings(ownerId, exceptId) >= limit) {
    throw new PlanLimitError(plan, limit);
  }
}

function readPlan(userId: string): PlanId {
  const row = getDb().prepare("SELECT plan FROM users WHERE id = ?").get(userId) as { plan: string } | undefined;
  if (row?.plan === "plus" || row?.plan === "pro") {
    return row.plan;
  }
  return "free";
}

function requireOwned(actorId: string, listingId: string): ListingRecord {
  const row = getListingRow(listingId);
  if (!row) {
    throw new NotFoundError();
  }
  if (row.owner_id !== actorId) {
    throw new ForbiddenError();
  }
  return hydrate(row);
}

function getListingRow(id: string): ListingRow | undefined {
  return getDb().prepare(`${SELECT_LISTING} WHERE listings.id = ?`).get(id) as ListingRow | undefined;
}

function hydrate(row: ListingRow): ListingRecord {
  if (!isListingStatus(row.status)) {
    throw new Error("Unknown listing status");
  }
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    ownerCity: row.owner_city,
    categoryId: row.category_id,
    title: row.title,
    description: row.description,
    city: row.city,
    pricePerDay: row.price_per_day,
    deposit: row.deposit,
    minDays: row.min_days,
    conditionScore: row.condition_score,
    conditionNotes: row.condition_notes,
    specs: parseSpecs(row.specs_json),
    status: row.status,
    rejectionReason: row.rejection_reason,
    availableFrom: row.available_from,
    availableTo: row.available_to,
    bookable: row.bookable === 1,
    isDemo: row.is_demo === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ratingAvg: row.rating_avg === null ? null : Math.round(row.rating_avg * 10) / 10,
    reviewCount: Number(row.review_count ?? 0),
    images: listListingImages(row.id),
  };
}

function parseSpecs(value: string): SpecItem[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") {
        return [];
      }
      const record = item as { label?: unknown; value?: unknown };
      if (typeof record.label !== "string" || typeof record.value !== "string") {
        return [];
      }
      return [{ label: record.label, value: record.value }];
    });
  } catch {
    return [];
  }
}

function isListingStatus(value: string): value is ListingStatus {
  return value === "draft" || value === "pending" || value === "published" || value === "rejected" || value === "archived";
}

export function listingStatusLabel(status: ListingStatus): string {
  switch (status) {
    case "draft":
      return "Черновик";
    case "pending":
      return "На модерации";
    case "published":
      return "Опубликовано";
    case "rejected":
      return "Отклонено";
    case "archived":
      return "Архив";
  }
}
