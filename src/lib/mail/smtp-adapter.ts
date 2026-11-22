import nodemailer from "nodemailer";
import type { MailAdapter, MailMessage } from "@/lib/mail/types";

export class SmtpMailAdapter implements MailAdapter {
  readonly name = "smtp";

  async send(message: MailMessage): Promise<{ delivered: boolean; providerId?: string }> {
    const host = process.env.SMTP_HOST?.trim();
    const from = process.env.SMTP_FROM?.trim();
    if (!host || !from) {
      throw new Error("smtp_not_configured");
    }
    const port = Number(process.env.SMTP_PORT ?? "587");
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    const transport = nodemailer.createTransport({
      host,
      port: Number.isFinite(port) ? port : 587,
      secure: process.env.SMTP_SECURE === "1",
      auth: user && pass ? { user, pass } : undefined,
    });
    const info = await transport.sendMail({
      from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return { delivered: true, providerId: String(info.messageId ?? "") };
  }
}
