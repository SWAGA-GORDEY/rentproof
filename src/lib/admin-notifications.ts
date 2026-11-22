import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";

export function notifyAdminAudience(input: {
  kind: string;
  title: string;
  body: string;
  href?: string;
  audience?: string;
}): void {
  getDb()
    .prepare(
      `INSERT INTO admin_notifications (id, audience, kind, title, body, href, read_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
    )
    .run(
      randomUUID(),
      input.audience ?? "owner",
      input.kind,
      input.title,
      input.body,
      input.href ?? null,
      new Date().toISOString(),
    );
}

export function listAdminNotifications(limit = 50) {
  return getDb()
    .prepare(
      `SELECT id, audience, kind, title, body, href, read_at, created_at
       FROM admin_notifications ORDER BY created_at DESC LIMIT ?`,
    )
    .all(limit) as Array<{
    id: string;
    audience: string;
    kind: string;
    title: string;
    body: string;
    href: string | null;
    read_at: string | null;
    created_at: string;
  }>;
}

export function markAdminNotificationRead(id: string): void {
  getDb()
    .prepare(`UPDATE admin_notifications SET read_at = ? WHERE id = ? AND read_at IS NULL`)
    .run(new Date().toISOString(), id);
}

export function markAllAdminNotificationsRead(): void {
  getDb()
    .prepare(`UPDATE admin_notifications SET read_at = ? WHERE read_at IS NULL`)
    .run(new Date().toISOString());
}
