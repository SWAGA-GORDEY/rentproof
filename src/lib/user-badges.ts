import { randomUUID } from "node:crypto";
import { writeAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { assertOwner } from "@/lib/rbac";
import { loadStaffProfile } from "@/lib/rbac";

/** Manual badges only — role/plan/verified are derived, not stored here. */
export const MANUAL_BADGE_KINDS = ["early_user", "tester", "partner"] as const;
export type ManualBadgeKind = (typeof MANUAL_BADGE_KINDS)[number];

export type DisplayBadge =
  | { kind: "owner"; label: "OWNER"; tone: "owner"; source: "derived" }
  | { kind: "admin"; label: "ADMIN"; tone: "staff"; source: "derived" }
  | { kind: "moderator"; label: "MODERATOR"; tone: "staff"; source: "derived" }
  | { kind: "support"; label: "SUPPORT"; tone: "staff"; source: "derived" }
  | { kind: "plus"; label: "PLUS"; tone: "plan"; source: "derived" }
  | { kind: "pro"; label: "PRO"; tone: "plan"; source: "derived" }
  | { kind: "verified"; label: "VERIFIED"; tone: "ok"; source: "derived" }
  | { kind: ManualBadgeKind; label: string; tone: "manual"; source: "manual"; id: string };

export function isManualBadgeKind(value: string): value is ManualBadgeKind {
  return (MANUAL_BADGE_KINDS as readonly string[]).includes(value);
}

export function listUserBadges(userId: string): DisplayBadge[] {
  const row = getDb()
    .prepare(
      `SELECT staff_role, plan, email_verified FROM users WHERE id = ?`,
    )
    .get(userId) as
    | { staff_role: string | null; plan: string; email_verified: number }
    | undefined;
  if (!row) return [];

  const badges: DisplayBadge[] = [];
  if (row.staff_role === "owner") badges.push({ kind: "owner", label: "OWNER", tone: "owner", source: "derived" });
  else if (row.staff_role === "admin") badges.push({ kind: "admin", label: "ADMIN", tone: "staff", source: "derived" });
  else if (row.staff_role === "moderator")
    badges.push({ kind: "moderator", label: "MODERATOR", tone: "staff", source: "derived" });
  else if (row.staff_role === "support")
    badges.push({ kind: "support", label: "SUPPORT", tone: "staff", source: "derived" });

  if (row.plan === "pro") badges.push({ kind: "pro", label: "PRO", tone: "plan", source: "derived" });
  else if (row.plan === "plus") badges.push({ kind: "plus", label: "PLUS", tone: "plan", source: "derived" });

  if (row.email_verified !== 0) badges.push({ kind: "verified", label: "VERIFIED", tone: "ok", source: "derived" });

  const manual = getDb()
    .prepare(
      `SELECT id, badge_kind FROM user_badges WHERE user_id = ? AND revoked_at IS NULL ORDER BY created_at`,
    )
    .all(userId) as Array<{ id: string; badge_kind: string }>;
  for (const item of manual) {
    if (!isManualBadgeKind(item.badge_kind)) continue;
    const label =
      item.badge_kind === "early_user" ? "EARLY USER" : item.badge_kind === "tester" ? "TESTER" : "PARTNER";
    badges.push({ kind: item.badge_kind, label, tone: "manual", source: "manual", id: item.id });
  }
  return badges;
}

export function assignManualBadge(input: {
  actorId: string;
  userId: string;
  kind: ManualBadgeKind;
  reason: string;
}): string {
  const actor = loadStaffProfile(input.actorId);
  if (!actor) throw new ForbiddenError();
  assertOwner(actor);
  // Never allow "owner" via badges — not in MANUAL_BADGE_KINDS.
  const user = getDb().prepare(`SELECT id FROM users WHERE id = ?`).get(input.userId) as { id: string } | undefined;
  if (!user) throw new NotFoundError();
  const reason = input.reason.trim();
  if (reason.length < 3) throw new ForbiddenError();

  const existing = getDb()
    .prepare(
      `SELECT id FROM user_badges WHERE user_id = ? AND badge_kind = ? AND revoked_at IS NULL`,
    )
    .get(input.userId, input.kind) as { id: string } | undefined;
  if (existing) return existing.id;

  const id = randomUUID();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO user_badges (id, user_id, badge_kind, granted_by, reason, created_at, revoked_at, revoked_by)
       VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)`,
    )
    .run(id, input.userId, input.kind, input.actorId, reason, now);
  writeAudit(input.actorId, "badge.assign", "user", input.userId, { kind: input.kind, reason: reason.slice(0, 120) });
  return id;
}

export function revokeManualBadge(input: { actorId: string; badgeId: string; reason: string }): void {
  const actor = loadStaffProfile(input.actorId);
  if (!actor) throw new ForbiddenError();
  assertOwner(actor);
  const row = getDb()
    .prepare(`SELECT id, user_id, badge_kind, revoked_at FROM user_badges WHERE id = ?`)
    .get(input.badgeId) as
    | { id: string; user_id: string; badge_kind: string; revoked_at: string | null }
    | undefined;
  if (!row || row.revoked_at) throw new NotFoundError();
  const now = new Date().toISOString();
  getDb()
    .prepare(`UPDATE user_badges SET revoked_at = ?, revoked_by = ? WHERE id = ?`)
    .run(now, input.actorId, row.id);
  writeAudit(input.actorId, "badge.revoke", "user", row.user_id, {
    kind: row.badge_kind,
    reason: input.reason.trim().slice(0, 120),
  });
}

export function ownerAssignedAt(userId: string): string | null {
  const row = getDb()
    .prepare(
      `SELECT created_at FROM audit_log
       WHERE entity_id = ? AND action IN ('owner.bootstrap', 'owner.recovery')
       ORDER BY created_at ASC LIMIT 1`,
    )
    .get(userId) as { created_at: string } | undefined;
  return row?.created_at ?? null;
}
