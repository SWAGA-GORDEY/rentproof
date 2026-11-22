import { ConsoleMailAdapter } from "@/lib/mail/console-adapter";
import { SmtpMailAdapter } from "@/lib/mail/smtp-adapter";
import type { MailAdapter, MailMessage } from "@/lib/mail/types";

export type { MailAdapter, MailMessage } from "@/lib/mail/types";

export function getMailAdapter(): MailAdapter {
  const driver = (process.env.MAIL_DRIVER ?? "auto").trim().toLowerCase();
  if (driver === "console") {
    return new ConsoleMailAdapter();
  }
  if (driver === "smtp" || (driver === "auto" && process.env.SMTP_HOST && process.env.SMTP_FROM)) {
    return new SmtpMailAdapter();
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
  return adapter.name === "smtp";
}
