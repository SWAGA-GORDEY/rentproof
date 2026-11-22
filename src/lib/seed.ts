import type { DatabaseSync } from "node:sqlite";
import { categories } from "@/lib/categories";
import { foldSearch } from "@/lib/format";

/** Categories only. Demo listings and demo owner are intentionally not seeded. */
export function seed(db: DatabaseSync): void {
  const upsertCategory = db.prepare(
    `INSERT INTO categories (id, name, description, sort_order) VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, description = excluded.description, sort_order = excluded.sort_order`,
  );
  categories.forEach((category, index) => {
    upsertCategory.run(category.id, category.name, category.description, index);
  });

  // Remove legacy demo catalog rows if they still exist (safe, scoped by is_demo / known ids).
  purgeDemoListings(db);

  const blank = db.prepare("SELECT id, title, description, city FROM listings WHERE search_text = ''").all() as Array<{
    id: string;
    title: string;
    description: string;
    city: string;
  }>;
  const fill = db.prepare("UPDATE listings SET search_text = ? WHERE id = ?");
  for (const row of blank) {
    fill.run(foldSearch(row.title, row.description, row.city), row.id);
  }
}

function purgeDemoListings(db: DatabaseSync): void {
  const demoIds = db
    .prepare(
      `SELECT id FROM listings WHERE is_demo = 1 OR id LIKE 'demo-%' OR owner_id = 'demo-owner'`,
    )
    .all() as Array<{ id: string }>;
  if (demoIds.length === 0) {
    return;
  }
  const ids = demoIds.map((row) => row.id);
  const placeholders = ids.map(() => "?").join(",");

  // Child tables that may reference listings / bookings.
  db.prepare(
    `DELETE FROM favorites WHERE listing_id IN (${placeholders})`,
  ).run(...ids);
  db.prepare(
    `DELETE FROM reviews WHERE listing_id IN (${placeholders})`,
  ).run(...ids);
  db.prepare(
    `DELETE FROM listing_images WHERE listing_id IN (${placeholders})`,
  ).run(...ids);
  db.prepare(
    `DELETE FROM condition_evidence_images WHERE evidence_id IN (
       SELECT id FROM condition_evidence WHERE listing_id IN (${placeholders})
     )`,
  ).run(...ids);
  db.prepare(
    `DELETE FROM condition_evidence WHERE listing_id IN (${placeholders})`,
  ).run(...ids);

  const bookingIds = db
    .prepare(`SELECT id FROM bookings WHERE listing_id IN (${placeholders})`)
    .all(...ids) as Array<{ id: string }>;
  if (bookingIds.length > 0) {
    const bPlace = bookingIds.map(() => "?").join(",");
    const bIds = bookingIds.map((row) => row.id);
    db.prepare(`DELETE FROM rental_orders WHERE booking_id IN (${bPlace})`).run(...bIds);
    db.prepare(`DELETE FROM reviews WHERE booking_id IN (${bPlace})`).run(...bIds);
    db.prepare(`DELETE FROM bookings WHERE id IN (${bPlace})`).run(...bIds);
  }

  db.prepare(`DELETE FROM listings WHERE id IN (${placeholders})`).run(...ids);
  db.prepare(`DELETE FROM users WHERE id = 'demo-owner' OR email = 'demo-owner@rentproof.invalid'`).run();
}
