import { randomUUID } from "node:crypto";
import { writeAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { FeatureBlockedError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { notifyUser } from "@/lib/notifications";
import { isOwnerUser } from "@/lib/rbac";

export type BanKind = "permanent" | "temporary" | "feature";

export const BAN_FEATURES = ["listings", "bookings", "ai", "crm"] as const;
export type BanFeature = (typeof BAN_FEATURES)[number];

export type BanRecord = {
  id: string;
  userId: string;
  kind: BanKind;
  reason: string;
  features: string[];
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
  liftedAt: string | null;
  liftedBy: string | null;
};

export function listBans(userId: string): BanRecord[] {
  const rows = getDb()
    .prepare(`SELECT * FROM account_bans WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`)
    .all(userId) as Array<Record<string, unknown>>;
  return rows.map(mapBan);
}

export function activeBan(userId: string, now = new Date()): BanRecord | null {
  const iso = now.toISOString();
  const row = getDb()
    .prepare(
      `SELECT * FROM account_bans
       WHERE user_id = ? AND lifted_at IS NULL
         AND (expires_at IS NULL OR expires_at > ?)
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(userId, iso) as Record<string, unknown> | undefined;
  return row ? mapBan(row) : null;
}

/** Lift expired temporary bans and clear stale account blocks caused by them. */
export function refreshBanState(userId: string, now = new Date()): BanRecord | null {
  const active = activeBan(userId, now);
  if (active) return active;

  const iso = now.toISOString();
  const expired = getDb()
    .prepare(
      `SELECT id FROM account_bans
       WHERE user_id = ? AND lifted_at IS NULL AND expires_at IS NOT NULL AND expires_at <= ?`,
    )
    .all(userId, iso) as Array<{ id: string }>;

  if (expired.length > 0) {
    getDb()
      .prepare(
        `UPDATE account_bans SET lifted_at = ?
         WHERE user_id = ? AND lifted_at IS NULL AND expires_at IS NOT NULL AND expires_at <= ?`,
      )
      .run(iso, userId, iso);

    const stillBlocked = getDb()
      .prepare(
        `SELECT id FROM account_bans
         WHERE user_id = ? AND lifted_at IS NULL
           AND kind IN ('permanent', 'temporary')
           AND (expires_at IS NULL OR expires_at > ?)`,
      )
      .get(userId, iso) as { id: string } | undefined;

    if (!stillBlocked) {
      getDb()
        .prepare(`UPDATE users SET blocked_at = NULL, account_status = 'active', updated_at = ? WHERE id = ?`)
        .run(iso, userId);
    }
  }

  return activeBan(userId, now);
}

export function assertFeatureAllowed(userId: string, feature: BanFeature): void {
  const ban = refreshBanState(userId);
  if (!ban) return;
  if (ban.kind === "permanent" || ban.kind === "temporary") {
    throw new FeatureBlockedError(feature);
  }
  if (ban.kind === "feature") {
    const features = ban.features.length ? ban.features : [...BAN_FEATURES];
    if (features.includes(feature)) {
      throw new FeatureBlockedError(feature);
    }
  }
}

export function banUser(input: {
  actorId: string;
  userId: string;
  kind: BanKind;
  reason: string;
  expiresAt?: string | null;
  features?: string[];
}): string {
  if (input.actorId === input.userId) throw new ForbiddenError();
  if (isOwnerUser(input.userId)) throw new ForbiddenError();

  const target = getDb().prepare(`SELECT id, staff_role FROM users WHERE id = ?`).get(input.userId) as
    | { id: string; staff_role: string | null }
    | undefined;
  if (!target) throw new NotFoundError();
  if (target.staff_role === "owner") throw new ForbiddenError();

  const reason = input.reason.trim();
  if (reason.length < 3) throw new ForbiddenError();

  const id = randomUUID();
  const now = new Date().toISOString();
  const expires =
    input.kind === "temporary" ? input.expiresAt ?? new Date(Date.now() + 7 * 864e5).toISOString() : input.expiresAt ?? null;

  const features =
    input.kind === "feature"
      ? (input.features ?? []).filter((f): f is BanFeature => (BAN_FEATURES as readonly string[]).includes(f))
      : [];
  const storedFeatures = input.kind === "feature" && features.length === 0 ? [...BAN_FEATURES] : features;

  getDb()
    .prepare(
      `INSERT INTO account_bans (id, user_id, kind, reason, features_json, created_by, created_at, expires_at, lifted_at, lifted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)`,
    )
    .run(
      id,
      input.userId,
      input.kind,
      reason,
      JSON.stringify(storedFeatures),
      input.actorId,
      now,
      expires,
    );

  if (input.kind !== "feature") {
    getDb()
      .prepare(`UPDATE users SET blocked_at = ?, account_status = 'blocked', updated_at = ? WHERE id = ?`)
      .run(now, now, input.userId);
    getDb().prepare(`DELETE FROM sessions WHERE user_id = ?`).run(input.userId);
  }

  writeAudit(input.actorId, "user.ban", "user", input.userId, {
    kind: input.kind,
    reason: reason.slice(0, 120),
    expires_at: expires,
  });
  notifyUser(input.userId, {
    kind: "account",
    title: "Ограничение аккаунта",
    body: `Доступ ограничен. Причина: ${reason}`,
    href: "/support",
  });
  return id;
}

export function liftBan(actorId: string, userId: string, banId?: string): void {
  if (isOwnerUser(userId) === false && !getDb().prepare(`SELECT id FROM users WHERE id = ?`).get(userId)) {
    throw new NotFoundError();
  }
  const now = new Date().toISOString();
  if (banId) {
    getDb()
      .prepare(`UPDATE account_bans SET lifted_at = ?, lifted_by = ? WHERE id = ? AND user_id = ? AND lifted_at IS NULL`)
      .run(now, actorId, banId, userId);
  } else {
    getDb()
      .prepare(`UPDATE account_bans SET lifted_at = ?, lifted_by = ? WHERE user_id = ? AND lifted_at IS NULL`)
      .run(now, actorId, userId);
  }
  getDb()
    .prepare(`UPDATE users SET blocked_at = NULL, account_status = 'active', updated_at = ? WHERE id = ?`)
    .run(now, userId);
  writeAudit(actorId, "user.unban", "user", userId, banId ? { ban_id: banId } : null);
  notifyUser(userId, {
    kind: "account",
    title: "Аккаунт разблокирован",
    body: "Ограничения сняты. Можно снова пользоваться сервисом.",
    href: "/account",
  });
}

function mapBan(row: Record<string, unknown>): BanRecord {
  let features: string[] = [];
  try {
    features = JSON.parse(String(row.features_json ?? "[]")) as string[];
  } catch {
    features = [];
  }
  return {
    id: String(row.id),
    userId: String(row.user_id),
    kind: row.kind as BanKind,
    reason: String(row.reason),
    features,
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
    expiresAt: (row.expires_at as string | null) ?? null,
    liftedAt: (row.lifted_at as string | null) ?? null,
    liftedBy: (row.lifted_by as string | null) ?? null,
  };
}
