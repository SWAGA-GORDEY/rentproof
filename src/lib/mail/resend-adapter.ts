import { Resend } from "resend";
import type { MailAdapter, MailMessage } from "@/lib/mail/types";

/**
 * Official Resend HTTP API adapter.
 * From-address: MAIL_FROM / SMTP_FROM, default onboarding@resend.dev (Resend test sender).
 */
export class ResendMailAdapter implements MailAdapter {
  readonly name = "resend";

  async send(message: MailMessage): Promise<{ delivered: boolean; providerId?: string }> {
    const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
    if (!apiKey) {
      throw new Error("resend_not_configured");
    }
    const from =
      process.env.MAIL_FROM?.trim() ||
      process.env.SMTP_FROM?.trim() ||
      "RentProof <onboarding@resend.dev>";

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html ?? message.text.replaceAll("\n", "<br />"),
    });

    if (error) {
      // Never log API key or message body (may contain codes).
      console.error("mail_resend_failed", { name: error.name, message: error.message });
      throw new Error("resend_send_failed");
    }
    return { delivered: true, providerId: data?.id };
  }
}
