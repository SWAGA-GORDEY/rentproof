import { getDb } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { getPublishedListing, type ListingRecord } from "@/lib/listings";

export function isFavorite(userId: string, listingId: string): boolean {
  const row = getDb()
    .prepare("SELECT 1 AS ok FROM favorites WHERE user_id = ? AND listing_id = ?")
    .get(userId, listingId);
  return Boolean(row);
}

export function toggleFavorite(userId: string, listingId: string): boolean {
  const listing = getDb()
    .prepare("SELECT status FROM listings WHERE id = ?")
    .get(listingId) as { status: string } | undefined;
  if (!listing || listing.status !== "published") {
    throw new NotFoundError();
  }
  if (isFavorite(userId, listingId)) {
    getDb().prepare("DELETE FROM favorites WHERE user_id = ? AND listing_id = ?").run(userId, listingId);
    return false;
  }
  getDb()
    .prepare("INSERT INTO favorites (user_id, listing_id, created_at) VALUES (?, ?, ?)")
    .run(userId, listingId, new Date().toISOString());
  return true;
}

export function listFavorites(userId: string): ListingRecord[] {
  const rows = getDb()
    .prepare(
      `SELECT listing_id FROM favorites
       JOIN listings ON listings.id = favorites.listing_id
       WHERE favorites.user_id = ? AND listings.status = 'published'
       ORDER BY favorites.created_at DESC`,
    )
    .all(userId) as Array<{ listing_id: string }>;
  return rows.flatMap((row) => {
    const listing = getPublishedListing(row.listing_id);
    return listing ? [listing] : [];
  });
}
