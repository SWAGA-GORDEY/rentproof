import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export async function ensureAdminFromEnv(): Promise<void> {
  const email = process.env.RENTPROOF_ADMIN_EMAIL?.trim().toLowerCase() ?? "";
  const password = process.env.RENTPROOF_ADMIN_PASSWORD ?? "";
  if (!email.includes("@") || password.length < 10) {
    return;
  }

  const db = getDb();
  const now = new Date().toISOString();
  const existing = db.prepare("SELECT id, is_admin FROM users WHERE email = ?").get(email) as
    | { id: string; is_admin: number }
    | undefined;

  if (existing) {
    if (existing.is_admin !== 1) {
      db.prepare("UPDATE users SET is_admin = 1, blocked_at = NULL, updated_at = ? WHERE id = ?").run(now, existing.id);
    }
    return;
  }

  const passwordHash = await hashPassword(password);
  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, phone, city, created_at, updated_at, is_admin, plan)
     VALUES (?, ?, ?, 'Администратор', 'landlord', NULL, NULL, ?, ?, 1, 'pro')`,
  ).run(randomUUID(), email, passwordHash, now, now);
}
