import { randomUUID } from "node:crypto";
import { writeAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import type { PlanId } from "@/lib/plans";
import { enforceSubscriptionExpiry } from "@/lib/subscription-lifecycle";

/** Admin / test helper only — never treat as paid confirmation. */
export function assignManualPlan(userId: string, plan: PlanId, mode = "manual"): void {
  const now = new Date().toISOString();
  getDb().prepare("UPDATE users SET plan = ?, updated_at = ? WHERE id = ?").run(plan, now, userId);
  getDb()
    .prepare(
      `INSERT INTO subscriptions (id, user_id, plan, mode, status, started_at, expires_at, renewal_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, NULL, 'off', ?, ?)`,
    )
    .run(randomUUID(), userId, plan, mode, now, now, now);
  writeAudit(userId, "plan.manual", "subscription", userId, { plan, mode });
}

/** @deprecated use assignManualPlan — kept for older call sites */
export function assignDemoPlan(userId: string, plan: PlanId): void {
  assignManualPlan(userId, plan, "demo");
}

export function readPlan(userId: string): PlanId {
  return enforceSubscriptionExpiry(userId);
}

export function listSubscriptionHistory(userId: string, limit = 20) {
  return getDb()
    .prepare(
      `SELECT id, plan, mode, status, started_at, expires_at, renewal_status, created_at
       FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
    )
    .all(userId, limit) as Array<{
    id: string;
    plan: string;
    mode: string;
    status: string;
    started_at: string | null;
    expires_at: string | null;
    renewal_status: string;
    created_at: string;
  }>;
}
