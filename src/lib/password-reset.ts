import { createHash, randomBytes, randomUUID } from "node:crypto";
import { writeAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { RateLimitError } from "@/lib/errors";
import { sendMail, mailConfigured } from "@/lib/mail";
import { hashPassword } from "@/lib/password";
import { consumeRateLimit } from "@/lib/rate-limit";

const TOKEN_TTL_MS = 60 * 60 * 1000;

function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function siteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Always returns ok-looking result to avoid email enumeration.
 * Issues a one-time token only when the account exists.
 */
export async function requestPasswordReset(emailRaw: string): Promise<{ ok: true; note: string }> {
  const email = emailRaw.trim().toLowerCase();
  consumeRateLimit(`password-reset-request:${email}`, 3, 15 * 60 * 1000);

  const user = getDb().prepare(`SELECT id, email FROM users WHERE email = ?`).get(email) as
    | { id: string; email: string }
    | undefined;

  if (user) {
    const token = randomBytes(32).toString("hex");
    const now = new Date();
    getDb()
      .prepare(
        `INSERT INTO password_resets (id, user_id, token_hash, expires_at, used_at, created_at)
         VALUES (?, ?, ?, ?, NULL, ?)`,
      )
      .run(
        randomUUID(),
        user.id,
        hashResetToken(token),
        new Date(now.getTime() + TOKEN_TTL_MS).toISOString(),
        now.toISOString(),
      );

    const link = `${siteBaseUrl()}/reset-password?token=${token}`;
    await sendMail({
      to: user.email,
      subject: "Сброс пароля RentProof",
      text: `Перейдите по ссылке, чтобы задать новый пароль (действует 1 час):\n\n${link}\n\nЕсли вы не запрашивали сброс, проигнорируйте письмо.`,
    });
    writeAudit(user.id, "password.reset.issued", "user", user.id, null);
  }

  return {
    ok: true,
    note: mailConfigured()
      ? "Если аккаунт с таким email существует, мы отправили ссылку для сброса пароля."
      : "Если аккаунт существует, токен сброса создан. Настройте SMTP (MAIL_DRIVER/SMTP_*), чтобы письма уходили реально.",
  };
}

export async function completePasswordReset(
  token: string,
  nextPassword: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  consumeRateLimit(`password-reset-complete:${token.slice(0, 16)}`, 10, 15 * 60 * 1000);
  const row = getDb()
    .prepare(
      `SELECT id, user_id, expires_at, used_at FROM password_resets WHERE token_hash = ?`,
    )
    .get(hashResetToken(token)) as
    | { id: string; user_id: string; expires_at: string; used_at: string | null }
    | undefined;

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
