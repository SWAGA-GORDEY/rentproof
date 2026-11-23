import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { ConsoleMailAdapter } from "@/lib/mail/console-adapter";
import { ResendMailAdapter } from "@/lib/mail/resend-adapter";
import { SmtpMailAdapter } from "@/lib/mail/smtp-adapter";
import type { MailAdapter, MailMessage } from "@/lib/mail/types";

export type { MailAdapter, MailMessage } from "@/lib/mail/types";

export function getMailAdapter(): MailAdapter {
  const driver = (process.env.MAIL_DRIVER ?? "auto").trim().toLowerCase();

  if (driver === "console") {
    return new ConsoleMailAdapter();
  }
  if (driver === "resend") {
    return new ResendMailAdapter();
  }
  if (driver === "smtp" || (driver === "auto" && process.env.SMTP_HOST && process.env.SMTP_FROM)) {
    return new SmtpMailAdapter();
  }
  // auto: prefer Resend when key is present
  if (driver === "auto" && process.env.RESEND_API_KEY?.trim()) {
    return new ResendMailAdapter();
  }
  return new ConsoleMailAdapter();
}

function recordMailDelivery(input: {
  adapter: string;
  to: string;
  subject: string;
  delivered: boolean;
  providerId?: string;
  errorCode?: string;
}): void {
  try {
    // Never store message body (may contain verification codes).
    getDb()
      .prepare(
        `INSERT INTO mail_delivery_log (
           id, adapter, recipient_domain, subject, delivered, provider_id, error_code, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        randomUUID(),
        input.adapter,
        input.to.includes("@") ? input.to.split("@")[1]!.toLowerCase() : "unknown",
        input.subject.slice(0, 180),
        input.delivered ? 1 : 0,
        input.providerId ?? null,
        input.errorCode ?? null,
        new Date().toISOString(),
      );
  } catch (error) {
    console.error("mail_delivery_log_failed", {
      name: error instanceof Error ? error.name : "error",
    });
  }
}

export async function sendMail(message: MailMessage): Promise<{ delivered: boolean; adapter: string }> {
  const adapter = getMailAdapter();
  try {
    const result = await adapter.send(message);
    recordMailDelivery({
      adapter: adapter.name,
      to: message.to,
      subject: message.subject,
      delivered: result.delivered,
      providerId: result.providerId,
    });
    return { delivered: result.delivered, adapter: adapter.name };
  } catch (error) {
    console.error("mail_send_failed", {
      adapter: adapter.name,
      name: error instanceof Error ? error.name : "error",
    });
    recordMailDelivery({
      adapter: adapter.name,
      to: message.to,
      subject: message.subject,
      delivered: false,
      errorCode: error instanceof Error ? error.message.slice(0, 80) : "send_failed",
    });
    return { delivered: false, adapter: adapter.name };
  }
}

export function mailConfigured(): boolean {
  const adapter = getMailAdapter();
  if (adapter.name === "smtp") {
    return Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_FROM?.trim());
  }
  if (adapter.name === "resend") {
    return Boolean(process.env.RESEND_API_KEY?.trim());
  }
  return false;
}

export function mailFromAddress(): string {
  return (
    process.env.MAIL_FROM?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    "RentProof <onboarding@resend.dev>"
  );
}
