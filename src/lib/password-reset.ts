import { createHash, randomInt, randomUUID } from "node:crypto";
import { writeAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { RateLimitError } from "@/lib/errors";
import { sendMail, mailConfigured } from "@/lib/mail";
import { buildCodeEmail } from "@/lib/mail/templates";
import { hashPassword } from "@/lib/password";
import { consumeRateLimit } from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/site";

const CODE_TTL_MS = 60 * 60 * 1000;

function hashResetSecret(value: string): string {
  return createHash("sha256").update(value.trim()).digest("hex");
}

/**
 * Always returns ok-looking result to avoid email enumeration.
 * Issues a one-time 6-digit code only when the account exists.
 */
export async function requestPasswordReset(emailRaw: string): Promise<{ ok: true; note: string }> {
  const email = emailRaw.trim().toLowerCase();
  consumeRateLimit(`password-reset-request:${email}`, 3, 15 * 60 * 1000);

  const user = getDb().prepare(`SELECT id, email, name FROM users WHERE email = ?`).get(email) as
    | { id: string; email: string; name: string }
    | undefined;

  if (user) {
    const now = new Date();
    let code = "";
    let inserted = false;
    // 6-digit codes can collide historically under UNIQUE(token_hash) — retry.
    for (let attempt = 0; attempt < 12 && !inserted; attempt++) {
      code = String(randomInt(100000, 999999));
      try {
        getDb()
          .prepare(
            `INSERT INTO password_resets (id, user_id, token_hash, expires_at, used_at, created_at)
             VALUES (?, ?, ?, ?, NULL, ?)`,
          )
          .run(
            randomUUID(),
            user.id,
            hashResetSecret(code),
            new Date(now.getTime() + CODE_TTL_MS).toISOString(),
            now.toISOString(),
          );
        inserted = true;
      } catch {
        inserted = false;
      }
    }
    if (!inserted || !code) {
      return {
        ok: true,
        note: "Не удалось выпустить код сброса. Повторите попытку чуть позже.",
      };
    }

    const resetUrl = absoluteUrl(`/reset-password?email=${encodeURIComponent(user.email)}`);
    const mail = buildCodeEmail({
      kind: "reset",
      recipientName: user.name,
      code,
      expiresMinutes: 60,
      ctaUrl: resetUrl,
      ctaLabel: "Открыть страницу сброса пароля",
    });
    await sendMail({
      to: user.email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    writeAudit(user.id, "password.reset.issued", "user", user.id, null);
  }

  return {
    ok: true,
    note: mailConfigured()
      ? "Если аккаунт с таким email существует, мы отправили код для сброса пароля."
      : "Если аккаунт существует, код сброса создан на сервере. Настройте MAIL_DRIVER=resend и RESEND_API_KEY (или SMTP_*), чтобы письма уходили реально.",
  };
}

/**
 * Completes reset with email + 6-digit code (preferred), or a raw secret matching token_hash
 * (for tests / advanced links).
 */
export async function completePasswordReset(
  tokenOrCode: string,
  nextPassword: string,
  emailRaw?: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const secret = tokenOrCode.trim();
  consumeRateLimit(`password-reset-complete:${secret.slice(0, 16)}`, 10, 15 * 60 * 1000);

  let row: { id: string; user_id: string; expires_at: string; used_at: string | null } | undefined;

  const email = emailRaw?.trim().toLowerCase();
  if (email && /^\d{6}$/.test(secret)) {
    const user = getDb().prepare(`SELECT id FROM users WHERE email = ?`).get(email) as { id: string } | undefined;
    if (!user) {
      return { ok: false, reason: "invalid" };
    }
    row = getDb()
      .prepare(
        `SELECT id, user_id, expires_at, used_at FROM password_resets
         WHERE user_id = ? AND token_hash = ? ORDER BY created_at DESC LIMIT 1`,
      )
      .get(user.id, hashResetSecret(secret)) as typeof row;
  } else if (secret.length >= 32) {
    row = getDb()
      .prepare(`SELECT id, user_id, expires_at, used_at FROM password_resets WHERE token_hash = ?`)
      .get(hashResetSecret(secret)) as typeof row;
  } else if (/^\d{6}$/.test(secret)) {
    // Code without email — reject to avoid guessing across users.
    return { ok: false, reason: "invalid" };
  } else {
    row = getDb()
      .prepare(`SELECT id, user_id, expires_at, used_at FROM password_resets WHERE token_hash = ?`)
      .get(hashResetSecret(secret)) as typeof row;
  }

  if (!row) {
    return { ok: false, reason: "invalid" };
  }
  if (row.used_at) {
    return { ok: false, reason: "used" };
  }
  if (row.expires_at < new Date().toISOString()) {
    return { ok: false, reason: "expired" };
  }

  const nextHash = await hashPassword(nextPassword);
  const now = new Date().toISOString();
  getDb().prepare(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`).run(nextHash, now, row.user_id);
  getDb().prepare(`UPDATE password_resets SET used_at = ? WHERE id = ?`).run(now, row.id);
  getDb().prepare(`DELETE FROM sessions WHERE user_id = ?`).run(row.user_id);
  writeAudit(row.user_id, "password.reset.completed", "user", row.user_id, null);
  return { ok: true };
}

export { RateLimitError };
