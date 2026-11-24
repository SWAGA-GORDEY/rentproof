import { createHash, randomBytes, randomUUID } from "node:crypto";
import { writeAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { notifyUser } from "@/lib/notifications";

function generateCode(): string {
  return createHash("sha256")
    .update(randomBytes(16))
    .digest("base64url")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 10)
    .toUpperCase();
}

/** Ensure the user has a stable referral code (idempotent). */
export function ensureReferralCode(userId: string): string {
  const existing = getDb()
    .prepare(`SELECT code FROM referral_codes WHERE user_id = ?`)
    .get(userId) as { code: string } | undefined;
  if (existing) return existing.code;

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateCode();
    try {
      getDb()
        .prepare(`INSERT INTO referral_codes (id, user_id, code, created_at) VALUES (?, ?, ?, ?)`)
        .run(randomUUID(), userId, code, new Date().toISOString());
      return code;
    } catch {
      // Unique collision — retry.
    }
  }
  throw new Error("referral_code_exhausted");
}

export function resolveReferralCode(code: string): { id: string; userId: string; code: string } | null {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{6,16}$/.test(normalized)) return null;
  const row = getDb()
    .prepare(`SELECT id, user_id, code FROM referral_codes WHERE code = ?`)
    .get(normalized) as { id: string; user_id: string; code: string } | undefined;
  if (!row) return null;
  return { id: row.id, userId: row.user_id, code: row.code };
}

/**
 * Attribute a newly registered user to a referrer once.
 * Self-referral and double-attribution are rejected. No cash/plan rewards here.
 */
export function attributeReferral(referredUserId: string, rawCode: string | null | undefined): boolean {
  if (!rawCode) return false;
  const resolved = resolveReferralCode(rawCode);
  if (!resolved) return false;
  if (resolved.userId === referredUserId) return false;

  const already = getDb()
    .prepare(`SELECT id FROM referral_attributions WHERE referred_user_id = ?`)
    .get(referredUserId) as { id: string } | undefined;
  if (already) return false;

  getDb()
    .prepare(
      `INSERT INTO referral_attributions (id, referral_code_id, referrer_id, referred_user_id, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(randomUUID(), resolved.id, resolved.userId, referredUserId, new Date().toISOString());

  writeAudit(referredUserId, "referral.attributed", "user", resolved.userId, { code: resolved.code });
  notifyUser(resolved.userId, {
    kind: "referral",
    title: "Новый приглашённый пользователь",
    body: "По вашей реферальной ссылке зарегистрировался новый аккаунт. Денежные бонусы не начисляются автоматически.",
    href: "/account/settings",
  });
  return true;
}

export function listReferralsForUser(userId: string, limit = 50): Array<{ referredUserId: string; createdAt: string }> {
  return (
    getDb()
      .prepare(
        `SELECT referred_user_id, created_at FROM referral_attributions
         WHERE referrer_id = ? ORDER BY created_at DESC LIMIT ?`,
      )
      .all(userId, limit) as Array<{ referred_user_id: string; created_at: string }>
  ).map((row) => ({ referredUserId: row.referred_user_id, createdAt: row.created_at }));
}
