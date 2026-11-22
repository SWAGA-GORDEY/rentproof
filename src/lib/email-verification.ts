import { createHash, randomInt, randomUUID } from "node:crypto";
import { writeAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { RateLimitError } from "@/lib/errors";
import { sendMail, mailConfigured } from "@/lib/mail";
import { buildCodeEmail } from "@/lib/mail/templates";
import { consumeRateLimit } from "@/lib/rate-limit";

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function hashVerificationCode(code: string): string {
  return createHash("sha256").update(code.trim()).digest("hex");
}

export async function issueEmailVerification(
  userId: string,
  email: string,
  recipientName?: string,
): Promise<{ sent: boolean; adapter: string }> {
  consumeRateLimit(`email-verify-send:${userId}`, 3, 15 * 60 * 1000);
  const code = String(randomInt(100000, 999999));
  const now = new Date();
  const expires = new Date(now.getTime() + CODE_TTL_MS).toISOString();
  getDb()
    .prepare(
      `INSERT INTO email_verifications (id, user_id, code_hash, expires_at, attempts, created_at)
       VALUES (?, ?, ?, ?, 0, ?)`,
    )
    .run(randomUUID(), userId, hashVerificationCode(code), expires, now.toISOString());

  const mail = buildCodeEmail({
    kind: "verify",
    recipientName,
    code,
    expiresMinutes: 10,
  });
  const result = await sendMail({
    to: email,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
  writeAudit(userId, "email.verification.issued", "user", userId, {
    adapter: result.adapter,
    delivered: result.delivered ? 1 : 0,
  });
  return { sent: result.delivered, adapter: result.adapter };
}

export function verifyEmailCode(userId: string, code: string): { ok: true } | { ok: false; reason: string } {
  consumeRateLimit(`email-verify-try:${userId}`, 20, 15 * 60 * 1000);
  const row = getDb()
    .prepare(
      `SELECT id, code_hash, expires_at, attempts, verified_at FROM email_verifications
       WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
    )
    .get(userId) as
    | { id: string; code_hash: string; expires_at: string; attempts: number; verified_at: string | null }
    | undefined;
  if (!row || row.verified_at) {
    return { ok: false, reason: "missing" };
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: "attempts" };
  }
  if (row.expires_at < new Date().toISOString()) {
    return { ok: false, reason: "expired" };
  }
  getDb()
    .prepare(`UPDATE email_verifications SET attempts = attempts + 1 WHERE id = ?`)
    .run(row.id);
  if (row.code_hash !== hashVerificationCode(code)) {
    return { ok: false, reason: "invalid" };
  }
  const now = new Date().toISOString();
  getDb().prepare(`UPDATE email_verifications SET verified_at = ? WHERE id = ?`).run(now, row.id);
  getDb()
    .prepare(`UPDATE users SET email_verified = 1, email_verified_at = ?, updated_at = ? WHERE id = ?`)
    .run(now, now, userId);
  writeAudit(userId, "email.verified", "user", userId, null);
  return { ok: true };
}

export function isEmailVerified(userId: string): boolean {
  const row = getDb().prepare(`SELECT email_verified FROM users WHERE id = ?`).get(userId) as
    | { email_verified: number }
    | undefined;
  return row?.email_verified === 1;
}

export function verificationMailNote(): string {
  return mailConfigured()
    ? "Мы отправили код на ваш email. Проверьте входящие и папку «Спам»."
    : "Почтовый сервис ещё не настроен. Код создан на сервере; задайте MAIL_DRIVER=resend и RESEND_API_KEY (или SMTP_*), чтобы письма уходили реально.";
}

export { RateLimitError };
