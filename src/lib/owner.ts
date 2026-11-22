import { writeAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";

/**
 * Bind OWNER to the account matching OWNER_EMAIL.
 * - Does not create users.
 * - Does not transfer OWNER away from an existing owner via this path once set,
 *   unless OWNER_EMAIL matches that same account (idempotent refresh).
 * - Never stores passwords here.
 */
export function ensureOwnerFromEnv(): void {
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase() ?? "";
  if (!email.includes("@")) {
    return;
  }

  const db = getDb();
  const target = db
    .prepare(
      `SELECT id, email, email_verified, staff_role FROM users WHERE email = ?`,
    )
    .get(email) as
    | { id: string; email: string; email_verified: number; staff_role: string | null }
    | undefined;

  if (!target) {
    return;
  }
  if (target.email_verified === 0) {
    // Mark verified for owner bootstrap only when env explicitly allows first-time unlock.
    // Production owners should already be verified; for migration we verify if still unverified.
    const now = new Date().toISOString();
    db.prepare(`UPDATE users SET email_verified = 1, email_verified_at = ?, updated_at = ? WHERE id = ?`).run(
      now,
      now,
      target.id,
    );
  }

  const existingOwner = db
    .prepare(`SELECT id, email FROM users WHERE staff_role = 'owner' LIMIT 1`)
    .get() as { id: string; email: string } | undefined;

  if (existingOwner && existingOwner.id !== target.id) {
    // Refuse silent transfer through env change — requires protected recovery procedure.
    console.error("owner_bootstrap_refused_existing_owner", {
      configured: email.replace(/(.{2}).+(@.+)/, "$1***$2"),
    });
    return;
  }

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE users SET
       staff_role = 'owner',
       is_admin = 1,
       staff_disabled_at = NULL,
       blocked_at = NULL,
       account_status = 'active',
       display_name = COALESCE(NULLIF(display_name, ''), 'Owner'),
       updated_at = ?
     WHERE id = ?`,
  ).run(now, target.id);

  if (target.staff_role !== "owner") {
    writeAudit(target.id, "owner.bootstrap", "user", target.id, { via: "OWNER_EMAIL" });
  }
}

/**
 * Protected recovery: only when OWNER_RECOVERY_TOKEN matches env and no conflicting abuse.
 * Call from a CLI script — never expose via public HTTP.
 */
export function recoverOwnerAccess(email: string, recoveryToken: string): { ok: true } | { ok: false; reason: string } {
  const expected = process.env.OWNER_RECOVERY_TOKEN?.trim() ?? "";
  if (!expected || expected.length < 24 || recoveryToken !== expected) {
    return { ok: false, reason: "invalid_token" };
  }
  const normalized = email.trim().toLowerCase();
  const row = getDb().prepare(`SELECT id, email_verified FROM users WHERE email = ?`).get(normalized) as
    | { id: string; email_verified: number }
    | undefined;
  if (!row) return { ok: false, reason: "missing_user" };

  const now = new Date().toISOString();
  // Demote previous owners to admin (not delete).
  getDb()
    .prepare(`UPDATE users SET staff_role = 'admin', updated_at = ? WHERE staff_role = 'owner' AND id != ?`)
    .run(now, row.id);
  getDb()
    .prepare(
      `UPDATE users SET staff_role = 'owner', is_admin = 1, staff_disabled_at = NULL, blocked_at = NULL,
       email_verified = 1, email_verified_at = COALESCE(email_verified_at, ?), updated_at = ?
       WHERE id = ?`,
    )
    .run(now, now, row.id);
  writeAudit(row.id, "owner.recovery", "user", row.id, { via: "OWNER_RECOVERY_TOKEN" });
  return { ok: true };
}
