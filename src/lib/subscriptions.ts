import { randomUUID } from "node:crypto";
import { writeAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { billingStatus, type PlanId } from "@/lib/plans";

export function assignDemoPlan(userId: string, plan: PlanId): void {
  const billing = billingStatus();
  if (billing.chargesEnabled) {
    throw new Error("Charges are not enabled");
  }
  const now = new Date().toISOString();
  getDb().prepare("UPDATE users SET plan = ?, updated_at = ? WHERE id = ?").run(plan, now, userId);
  getDb()
    .prepare("INSERT INTO subscriptions (id, user_id, plan, mode, created_at) VALUES (?, ?, ?, 'demo', ?)")
    .run(randomUUID(), userId, plan, now);
  writeAudit(userId, "plan.demo", "subscription", userId, { plan });
}

export function readPlan(userId: string): PlanId {
  const row = getDb().prepare("SELECT plan FROM users WHERE id = ?").get(userId) as { plan: string } | undefined;
  if (row?.plan === "plus" || row?.plan === "pro") {
    return row.plan;
  }
  return "free";
}
