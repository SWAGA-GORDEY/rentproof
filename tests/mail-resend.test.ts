import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import { getMailAdapter, mailConfigured } from "@/lib/mail";
import { buildCodeEmail } from "@/lib/mail/templates";

const previous = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in previous)) delete process.env[key];
  }
  Object.assign(process.env, previous);
});

describe("mail adapters", () => {
  it("selects resend when MAIL_DRIVER=resend", () => {
    process.env.MAIL_DRIVER = "resend";
    process.env.RESEND_API_KEY = "re_test_placeholder_not_a_real_key";
    assert.equal(getMailAdapter().name, "resend");
    assert.equal(mailConfigured(), true);
  });

  it("auto-selects resend when key present and no smtp", () => {
    process.env.MAIL_DRIVER = "auto";
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_FROM;
    process.env.RESEND_API_KEY = "re_test_placeholder_not_a_real_key";
    assert.equal(getMailAdapter().name, "resend");
  });

  it("keeps smtp when explicitly requested", () => {
    process.env.MAIL_DRIVER = "smtp";
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_FROM = "noreply@example.com";
    assert.equal(getMailAdapter().name, "smtp");
  });

  it("builds HTML code email without leaking raw HTML in code block", () => {
    const mail = buildCodeEmail({
      kind: "verify",
      recipientName: "Тест <script>",
      code: "123456",
      expiresMinutes: 10,
    });
    assert.match(mail.subject, /RentProof/);
    assert.match(mail.text, /123456/);
    assert.match(mail.html, /123456/);
    assert.equal(mail.html.includes("<script>"), false);
    assert.match(mail.html, /support@rentproof\.ru/);
  });
});
