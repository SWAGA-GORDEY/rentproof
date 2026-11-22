import { randomUUID } from "node:crypto";
import { writeAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import type { PlanId } from "@/lib/plans";

/** Downgrade expired paid subscriptions to FREE. Safe to call on read paths. */
export function enforceSubscriptionExpiry(userId: string, now = new Date()): PlanId {
  const row = getDb()
    .prepare(
      `SELECT id, plan, status, expires_at FROM subscriptions
       WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
    )
    .get(userId) as { id: string; plan: string; status: string; expires_at: string | null } | undefined;

  const user = getDb().prepare(`SELECT plan FROM users WHERE id = ?`).get(userId) as { plan: string } | undefined;
  const current = user?.plan === "plus" || user?.plan === "pro" ? user.plan : "free";

  if (!row?.expires_at || row.plan === "free") {
    return current;
  }
  if (row.expires_at > now.toISOString()) {
    return current;
  }
  if (row.status === "expired") {
    if (current !== "free") {
      getDb().prepare(`UPDATE users SET plan = 'free', updated_at = ? WHERE id = ?`).run(now.toISOString(), userId);
    }
    return "free";
  }

  const stamp = now.toISOString();
  getDb().prepare(`UPDATE subscriptions SET status = 'expired', renewal_status = 'off', updated_at = ? WHERE id = ?`).run(stamp, row.id);
  getDb().prepare(`UPDATE users SET plan = 'free', updated_at = ? WHERE id = ?`).run(stamp, userId);
  getDb()
    .prepare(
      `INSERT INTO subscriptions (id, user_id, plan, mode, status, started_at, expires_at, renewal_status, created_at, updated_at)
       VALUES (?, ?, 'free', 'expiry', 'active', ?, NULL, 'off', ?, ?)`,
    )
    .run(randomUUID(), userId, stamp, stamp, stamp);
  writeAudit(userId, "subscription.expired", "subscription", row.id, { from: row.plan });
  return "free";
}
