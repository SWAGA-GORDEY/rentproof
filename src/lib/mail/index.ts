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

export async function sendMail(message: MailMessage): Promise<{ delivered: boolean; adapter: string }> {
  const adapter = getMailAdapter();
  try {
    const result = await adapter.send(message);
    return { delivered: result.delivered, adapter: adapter.name };
  } catch (error) {
    console.error("mail_send_failed", {
      adapter: adapter.name,
      name: error instanceof Error ? error.name : "error",
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
