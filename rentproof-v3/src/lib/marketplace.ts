import { execute, row, rows } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";

export type Listing = {
  id: string;
  owner_id: string;
  owner_name: string;
  title: string;
  category: string;
  city: string;
  description: string;
  price_per_day: number;
  deposit: number;
  status: "pending" | "published" | "hidden";
  created_at: string;
};

export type Booking = {
  id: string;
  listing_id: string;
  listing_title: string;
  renter_id: string;
  renter_name: string;
  owner_id: string;
  start_date: string;
  end_date: string;
  days: number;
  total_price: number;
  status: "pending" | "confirmed" | "rejected" | "cancelled" | "completed";
  created_at: string;
};

export async function publicListings(search = "", category = ""): Promise<Listing[]> {
  const query = search.trim().slice(0, 80);
  const selectedCategory = ["Инструмент", "Техника", "Для дома", "Другое"].includes(category) ? category : "";
  return rows<Listing>(
    `SELECT l.*,u.name AS owner_name FROM listings l JOIN users u ON u.id=l.owner_id
     WHERE l.status='published' AND ($1='' OR lower(l.title || ' ' || l.city || ' ' || l.category) LIKE $2)
     AND ($3='' OR l.category=$3)
     ORDER BY l.created_at DESC LIMIT 60`,
    [query, `%${query.toLowerCase()}%`, selectedCategory],
  );
}

export async function listingById(id: string): Promise<Listing | null> {
  return row<Listing>(
    `SELECT l.*,u.name AS owner_name FROM listings l JOIN users u ON u.id=l.owner_id
     WHERE l.id=$1 AND l.status='published'`,
    [id],
  );
}

export async function myListings(userId: string): Promise<Listing[]> {
  return rows<Listing>(
    `SELECT l.*,u.name AS owner_name FROM listings l JOIN users u ON u.id=l.owner_id
     WHERE l.owner_id=$1 ORDER BY l.created_at DESC`,
    [userId],
  );
}

export async function myBookings(user: SessionUser): Promise<Booking[]> {
  return rows<Booking>(
    `SELECT b.*,l.title AS listing_title,l.owner_id,r.name AS renter_name
     FROM bookings b JOIN listings l ON l.id=b.listing_id JOIN users r ON r.id=b.renter_id
     WHERE b.renter_id=$1 OR l.owner_id=$1 ORDER BY b.created_at DESC LIMIT 100`,
    [user.id],
  );
}

export async function adminStats() {
  const [users, listings, pending, bookings] = await Promise.all([
    row("SELECT COUNT(*) AS count FROM users"),
    row("SELECT COUNT(*) AS count FROM listings"),
    row("SELECT COUNT(*) AS count FROM listings WHERE status='pending'"),
    row("SELECT COUNT(*) AS count FROM bookings"),
  ]);
  return {
    users: Number(users?.count ?? 0),
    listings: Number(listings?.count ?? 0),
    pending: Number(pending?.count ?? 0),
    bookings: Number(bookings?.count ?? 0),
  };
}

export async function allListings(): Promise<Listing[]> {
  return rows<Listing>(
    `SELECT l.*,u.name AS owner_name FROM listings l JOIN users u ON u.id=l.owner_id
     ORDER BY CASE l.status WHEN 'pending' THEN 0 WHEN 'published' THEN 1 ELSE 2 END,l.created_at DESC LIMIT 200`,
  );
}

export async function allBookings(): Promise<Booking[]> {
  return rows<Booking>(
    `SELECT b.*,l.title AS listing_title,l.owner_id,r.name AS renter_name
     FROM bookings b JOIN listings l ON l.id=b.listing_id JOIN users r ON r.id=b.renter_id
     ORDER BY b.created_at DESC LIMIT 200`,
  );
}

export async function allUsers() {
  return rows<{ id: string; email: string; name: string; role: string; created_at: string }>(
    "SELECT id,email,name,role,created_at FROM users ORDER BY created_at DESC LIMIT 300",
  );
}

export async function setListingStatus(id: string, status: "published" | "hidden"): Promise<void> {
  await execute("UPDATE listings SET status=$1 WHERE id=$2", [status, id]);
}
