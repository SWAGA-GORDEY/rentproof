import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";

export type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export function notifyUser(userId: string, input: { kind: string; title: string; body: string; href?: string }): void {
  getDb()
    .prepare(
      `INSERT INTO notifications (id, user_id, kind, title, body, href, read_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
    )
    .run(randomUUID(), userId, input.kind, input.title, input.body, input.href ?? null, new Date().toISOString());
}

export function listNotifications(userId: string, limit = 20): NotificationItem[] {
  const rows = getDb()
    .prepare(
      `SELECT id, kind, title, body, href, read_at, created_at
       FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
    )
    .all(userId, limit) as Array<{
    id: string;
    kind: string;
    title: string;
    body: string;
    href: string | null;
    read_at: string | null;
    created_at: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    href: row.href,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

export function unreadCount(userId: string): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read_at IS NULL")
    .get(userId) as { count: number } | undefined;
  return Number(row?.count ?? 0);
}

export function markNotificationsRead(userId: string): void {
  getDb()
    .prepare("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL")
    .run(new Date().toISOString(), userId);
}

export function mailChannelStatus(): { configured: boolean; delivers: boolean; note: string } {
  const configured = Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
  if (!configured) {
    return {
      configured: false,
      delivers: false,
      note: "Почтовый канал не настроен. Письма не отправляются. События сохраняются в кабинете.",
    };
  }
  return {
    configured: true,
    delivers: false,
    note: "Адрес почтового сервера указан, но отправка писем в этой версии не подключена. Письма не уходят.",
  };
}
