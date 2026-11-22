import type { MailAdapter, MailMessage } from "@/lib/mail/types";

/** Dev/fallback adapter — never logs secrets or verification codes in full. */
export class ConsoleMailAdapter implements MailAdapter {
  readonly name = "console";

  async send(message: MailMessage): Promise<{ delivered: boolean; providerId?: string }> {
    console.info("mail_console", {
      adapter: this.name,
      to: maskEmail(message.to),
      subject: message.subject,
      chars: message.text.length,
    });
    return { delivered: false, providerId: `console_${Date.now()}` };
  }
}

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "***";
  return `${user.slice(0, 1)}***@${domain}`;
}
