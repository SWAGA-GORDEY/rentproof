import { writeAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { listAllBookings } from "@/lib/bookings";
import { listRecentAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notifications";

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  plan: string;
  isAdmin: boolean;
  blockedAt: string | null;
  city: string | null;
  createdAt: string;
};

export function assertAdmin(user: { isAdmin: boolean }): void {
  if (!user.isAdmin) {
    throw new ForbiddenError();
  }
}

export function listUsers(): AdminUser[] {
  const rows = getDb()
    .prepare(
      `SELECT id, email, name, role, plan, is_admin, blocked_at, city, created_at
       FROM users ORDER BY created_at DESC`,
    )
    .all() as Array<{
    id: string;
    email: string;
    name: string;
    role: string;
    plan: string;
    is_admin: number;
    blocked_at: string | null;
    city: string | null;
    created_at: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    plan: row.plan,
    isAdmin: row.is_admin === 1,
    blockedAt: row.blocked_at,
    city: row.city,
    createdAt: row.created_at,
  }));
}

export function setBlocked(adminId: string, userId: string, blocked: boolean): void {
  if (adminId === userId) {
    throw new ForbiddenError();
  }
  const target = getDb().prepare("SELECT is_admin FROM users WHERE id = ?").get(userId) as { is_admin: number } | undefined;
  if (!target) {
    throw new NotFoundError();
  }
  if (target.is_admin === 1) {
    throw new ForbiddenError();
  }
  const stamp = blocked ? new Date().toISOString() : null;
  getDb().prepare("UPDATE users SET blocked_at = ?, updated_at = ? WHERE id = ?").run(stamp, new Date().toISOString(), userId);
  if (blocked) {
    getDb().prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  }
  writeAudit(adminId, blocked ? "user.block" : "user.unblock", "user", userId, null);
  notifyUser(userId, {
    kind: "account",
    title: blocked ? "Аккаунт заблокирован" : "Аккаунт разблокирован",
    body: blocked ? "Вход временно недоступен. Обратитесь через контакты." : "Можно снова войти в кабинет.",
    href: "/account",
  });
}

export function adminStats(): {
  users: number;
  listings: number;
  published: number;
  pending: number;
  bookings: number;
  openComplaints: number;
} {
  const count = (sql: string) => Number((getDb().prepare(sql).get() as { count: number }).count);
  return {
    users: count("SELECT COUNT(*) AS count FROM users"),
    listings: count("SELECT COUNT(*) AS count FROM listings"),
    published: count("SELECT COUNT(*) AS count FROM listings WHERE status = 'published'"),
    pending: count("SELECT COUNT(*) AS count FROM listings WHERE status = 'pending'"),
    bookings: count("SELECT COUNT(*) AS count FROM bookings"),
    openComplaints: count("SELECT COUNT(*) AS count FROM complaints WHERE status = 'open'"),
  };
}

export function adminOverview() {
  return {
    stats: adminStats(),
    bookings: listAllBookings(30),
    audit: listRecentAudit(30),
  };
}

export function promoteExistingUser(email: string): void {
  const now = new Date().toISOString();
  const result = getDb()
    .prepare("UPDATE users SET is_admin = 1, blocked_at = NULL, updated_at = ? WHERE email = ?")
    .run(now, email.trim().toLowerCase());
  if (result.changes !== 1) {
    throw new NotFoundError();
  }
}
