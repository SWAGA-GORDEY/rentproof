import { randomUUID } from "node:crypto";
import { getDb } from "../src/lib/db.ts";
import { hashPassword } from "../src/lib/password.ts";

const email = process.env.RENTPROOF_ADMIN_EMAIL?.trim().toLowerCase() ?? "";
const password = process.env.RENTPROOF_ADMIN_PASSWORD ?? "";

if (!email.includes("@") || password.length < 10) {
  console.error("Задайте RENTPROOF_ADMIN_EMAIL и RENTPROOF_ADMIN_PASSWORD (от 10 символов).");
  process.exit(1);
}

const db = getDb();
const now = new Date().toISOString();
const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: string } | undefined;
const passwordHash = await hashPassword(password);

if (existing) {
  db.prepare("UPDATE users SET password_hash = ?, is_admin = 1, blocked_at = NULL, updated_at = ? WHERE id = ?").run(
    passwordHash,
    now,
    existing.id,
  );
  console.log("Существующий пользователь назначен администратором.");
} else {
  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, phone, city, created_at, updated_at, is_admin, plan)
     VALUES (?, ?, ?, 'Администратор', 'landlord', NULL, NULL, ?, ?, 1, 'pro')`,
  ).run(randomUUID(), email, passwordHash, now, now);
  console.log("Администратор создан. Публичной регистрации администратора нет.");
}
