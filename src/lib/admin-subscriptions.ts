import { randomUUID } from "node:crypto";
import { writeAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { notifyUser } from "@/lib/notifications";
import type { PlanId } from "@/lib/plans";
import { isPlanId } from "@/lib/plans";
import { enforceSubscriptionExpiry } from "@/lib/subscription-lifecycle";

export type SubscriptionSourceKind =
  | "paid"
  | "admin_granted"
  | "owner_grant"
  | "promotional"
  | "referral";

export const GRANT_DURATIONS_DAYS = [7, 14, 30, 90, 180, 365] as const;

export type GrantSubscriptionInput = {
  actorId: string;
  userId: string;
  plan: PlanId;
  sourceKind: Exclude<SubscriptionSourceKind, "paid">;
  days: number | null; // null = indefinite (owner confirmation required by caller)
  reason: string;
  note?: string;
  startsAt?: string;
};

/** Manual grants never create payment rows. */
export function isManualSubscriptionSource(source: string): boolean {
  return source === "admin_granted" || source === "owner_grant" || source === "promotional" || source === "referral";
}

export function grantSubscription(input: GrantSubscriptionInput): string {
  if (!isPlanId(input.plan)) throw new ForbiddenError();
  if (input.plan === "free") {
    return revokeToFree(input.actorId, input.userId, input.reason, input.note);
  }
  const user = getDb().prepare(`SELECT id FROM users WHERE id = ?`).get(input.userId) as { id: string } | undefined;
  if (!user) throw new NotFoundError();

  const reason = input.reason.trim();
  if (reason.length < 3) throw new ForbiddenError();

  const startsAt = input.startsAt ?? new Date().toISOString();
  const expiresAt =
    input.days == null ? null : new Date(new Date(startsAt).getTime() + input.days * 864e5).toISOString();
  const now = new Date().toISOString();
  const id = randomUUID();

  // Close conflicting active paid/admin grants without deleting history.
  getDb()
    .prepare(
      `UPDATE subscriptions SET status = 'revoked', renewal_status = 'off', updated_at = ?
       WHERE user_id = ? AND status = 'active' AND plan != 'free'`,
    )
    .run(now, input.userId);

  const mode = input.sourceKind === "owner_grant" ? "owner_grant" : "admin_grant";
  getDb()
    .prepare(
      `INSERT INTO subscriptions (
         id, user_id, plan, mode, status, started_at, expires_at, renewal_status, created_at, updated_at,
         source_kind, granted_by, grant_reason, grant_note
       ) VALUES (?, ?, ?, ?, 'active', ?, ?, 'off', ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.userId,
      input.plan,
      mode,
      startsAt,
      expiresAt,
      now,
      now,
      input.sourceKind,
      input.actorId,
      reason,
      input.note?.trim() || null,
    );

  getDb().prepare(`UPDATE users SET plan = ?, updated_at = ? WHERE id = ?`).run(input.plan, now, input.userId);

  writeAudit(input.actorId, "subscription.grant", "subscription", id, {
    user_id: input.userId,
    plan: input.plan,
    days: input.days,
    source: input.sourceKind,
    reason: reason.slice(0, 120),
  });

  const daysLabel = input.days == null ? "бессрочно" : `${input.days} дн.`;
  notifyUser(input.userId, {
    kind: "subscription",
    title: `Тариф ${input.plan.toUpperCase()}`,
    body: `Вам предоставлен тариф ${input.plan.toUpperCase()} (${daysLabel}). Это административная выдача, не оплата.`,
    href: "/account/subscription",
  });
  return id;
}

export function revokeToFree(actorId: string, userId: string, reason: string, note?: string): string {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE subscriptions SET status = 'revoked', renewal_status = 'off', updated_at = ?
       WHERE user_id = ? AND status = 'active' AND plan != 'free'`,
    )
    .run(now, userId);

  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO subscriptions (
         id, user_id, plan, mode, status, started_at, expires_at, renewal_status, created_at, updated_at,
         source_kind, granted_by, grant_reason, grant_note
       ) VALUES (?, ?, 'free', 'admin_revoke', 'active', ?, NULL, 'off', ?, ?, 'admin_granted', ?, ?, ?)`,
    )
    .run(id, userId, now, now, now, actorId, reason.trim() || "revoked", note?.trim() || null);

  getDb().prepare(`UPDATE users SET plan = 'free', updated_at = ? WHERE id = ?`).run(now, userId);
  writeAudit(actorId, "subscription.revoke", "subscription", id, { user_id: userId, reason: reason.slice(0, 120) });
  notifyUser(userId, {
    kind: "subscription",
    title: "Подписка отозвана",
    body: "Доступ возвращён на тариф FREE.",
    href: "/account/subscription",
  });
  return id;
}

export function extendSubscription(actorId: string, userId: string, extraDays: number, reason: string): void {
  enforceSubscriptionExpiry(userId);
  const current = getDb()
    .prepare(
      `SELECT id, plan, expires_at FROM subscriptions
       WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
    )
    .get(userId) as { id: string; plan: string; expires_at: string | null } | undefined;
  if (!current || current.plan === "free") {
    throw new NotFoundError();
  }
  const base = current.expires_at ? new Date(current.expires_at).getTime() : Date.now();
  const next = new Date(base + extraDays * 864e5).toISOString();
  const now = new Date().toISOString();
  getDb()
    .prepare(`UPDATE subscriptions SET expires_at = ?, updated_at = ?, grant_reason = COALESCE(grant_reason, ?) WHERE id = ?`)
    .run(next, now, reason, current.id);
  writeAudit(actorId, "subscription.extend", "subscription", current.id, {
    user_id: userId,
    days: extraDays,
    new_expires: next,
  });
  notifyUser(userId, {
    kind: "subscription",
    title: "Подписка продлена",
    body: `Срок тарифа ${current.plan.toUpperCase()} продлён на ${extraDays} дн.`,
    href: "/account/subscription",
  });
}

export type AdminSubscriptionRow = {
  id: string;
  userId: string;
  email: string;
  name: string;
  plan: string;
  status: string;
  sourceKind: string;
  startedAt: string | null;
  expiresAt: string | null;
  grantedBy: string | null;
  grantReason: string | null;
  createdAt: string;
};

export function listAllSubscriptions(limit = 200): AdminSubscriptionRow[] {
  const rows = getDb()
    .prepare(
      `SELECT s.id, s.user_id, u.email, u.name, s.plan, s.status, s.source_kind, s.started_at, s.expires_at,
              s.granted_by, s.grant_reason, s.created_at
       FROM subscriptions s
       JOIN users u ON u.id = s.user_id
       ORDER BY s.created_at DESC LIMIT ?`,
    )
    .all(limit) as Array<{
    id: string;
    user_id: string;
    email: string;
    name: string;
    plan: string;
    status: string;
    source_kind: string;
    started_at: string | null;
    expires_at: string | null;
    granted_by: string | null;
    grant_reason: string | null;
    created_at: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    email: row.email,
    name: row.name,
    plan: row.plan,
    status: row.status,
    sourceKind: row.source_kind,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
    grantedBy: row.granted_by,
    grantReason: row.grant_reason,
    createdAt: row.created_at,
  }));
}

export function currentSubscriptionCard(userId: string) {
  enforceSubscriptionExpiry(userId);
  const row = getDb()
    .prepare(
      `SELECT id, plan, status, source_kind, started_at, expires_at, granted_by, grant_reason, grant_note, created_at
       FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
    )
    .get(userId) as
    | {
        id: string;
        plan: string;
        status: string;
        source_kind: string;
        started_at: string | null;
        expires_at: string | null;
        granted_by: string | null;
        grant_reason: string | null;
        grant_note: string | null;
        created_at: string;
      }
    | undefined;
  if (!row) return null;
  const daysLeft =
    row.expires_at == null
      ? null
      : Math.max(0, Math.ceil((new Date(row.expires_at).getTime() - Date.now()) / 864e5));
  return { ...row, daysLeft };
}
