import { siteOrigin } from "@/lib/site";

export type CodeEmailKind = "verify" | "reset";

const SUPPORT_EMAIL = "support@rentproof.ru";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Professional RentProof transactional email (inline CSS for clients). */
export function buildCodeEmail(input: {
  kind: CodeEmailKind;
  recipientName?: string;
  code: string;
  expiresMinutes: number;
  ctaUrl?: string;
  ctaLabel?: string;
}): { subject: string; text: string; html: string } {
  const brand = "RentProof";
  const origin = siteOrigin();
  const rawName = (input.recipientName ?? "").trim() || "друг";
  const name = escapeHtml(rawName);
  const code = escapeHtml(input.code);
  const minutes = input.expiresMinutes;
  const ctaUrl = input.ctaUrl?.trim();
  const ctaLabel = escapeHtml(input.ctaLabel?.trim() || "Открыть страницу");

  const isVerify = input.kind === "verify";
  const subject = isVerify ? `${brand}: код подтверждения` : `${brand}: код восстановления пароля`;
  const headline = isVerify ? "Подтвердите ваш email" : "Восстановление пароля";
  const leadText = isVerify
    ? `Здравствуйте, ${rawName}! Добро пожаловать в ${brand}. Введите код ниже, чтобы активировать аккаунт.`
    : `Здравствуйте, ${rawName}! Вы запросили сброс пароля в ${brand}. Введите код ниже на странице восстановления.`;
  const leadHtml = isVerify
    ? `Здравствуйте, ${name}! Добро пожаловать в ${brand}. Введите код ниже, чтобы активировать аккаунт.`
    : `Здравствуйте, ${name}! Вы запросили сброс пароля в ${brand}. Введите код ниже на странице восстановления.`;
  const ignore = isVerify
    ? "Если вы не регистрировались на RentProof, просто проигнорируйте это письмо."
    : "Если вы не запрашивали сброс пароля, проигнорируйте письмо — аккаунт останется без изменений.";

  const text = [
    leadText,
    "",
    `Код: ${input.code}`,
    `Действует ${minutes} минут.`,
    ctaUrl ? `\n${input.ctaLabel ?? "Страница"}: ${ctaUrl}` : "",
    "",
    ignore,
    "",
    `Поддержка: ${SUPPORT_EMAIL}`,
    origin,
  ]
    .filter((line, index, arr) => !(line === "" && arr[index - 1] === ""))
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2f7;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #d5e4f6;border-radius:24px;overflow:hidden;">
          <tr>
            <td style="background:#0c2340;padding:28px 32px;">
              <p style="margin:0;font-family:Georgia,serif;font-size:26px;font-weight:700;letter-spacing:-0.02em;color:#f4f7fb;">
                Rent<span style="color:#d5e4f6;">Proof</span>
              </p>
              <p style="margin:8px 0 0;font-family:system-ui,-apple-system,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#9eb6d4;">
                Аренда без риска
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0;font-family:system-ui,-apple-system,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#3d6ea8;">
                ${isVerify ? "Активация" : "Безопасность"}
              </p>
              <h1 style="margin:12px 0 0;font-family:Georgia,serif;font-size:28px;line-height:1.2;color:#0c2340;">
                ${headline}
              </h1>
              <p style="margin:16px 0 0;font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.6;color:#3a4658;">
                ${leadHtml}
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px 0;">
                <tr>
                  <td align="center" style="background:#f4f7fb;border:1px solid #d5e4f6;border-radius:16px;padding:24px;">
                    <p style="margin:0;font-family:system-ui,-apple-system,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#6b7c93;">
                      Ваш код
                    </p>
                    <p style="margin:12px 0 0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:36px;font-weight:700;letter-spacing:0.28em;color:#0c2340;">
                      ${code}
                    </p>
                    <p style="margin:14px 0 0;font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:#6b7c93;">
                      Действует ${minutes} минут · одноразовый
                    </p>
                  </td>
                </tr>
              </table>
              ${
                ctaUrl
                  ? `<p style="margin:0 0 20px;font-family:system-ui,-apple-system,sans-serif;font-size:14px;"><a href="${escapeHtml(ctaUrl)}" style="color:#0c2340;font-weight:600;text-decoration:none;">${ctaLabel} →</a></p>`
                  : ""
              }
              <p style="margin:0;font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.6;color:#6b7c93;">
                ${ignore}
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #d5e4f6;padding:20px 32px;background:#f8fafc;">
              <p style="margin:0;font-family:system-ui,-apple-system,sans-serif;font-size:12px;line-height:1.5;color:#6b7c93;">
                Поддержка: <a href="mailto:${SUPPORT_EMAIL}" style="color:#0c2340;font-weight:600;text-decoration:none;">${SUPPORT_EMAIL}</a><br />
                <a href="${escapeHtml(origin)}" style="color:#3d6ea8;text-decoration:none;">${escapeHtml(origin.replace(/^https?:\/\//, ""))}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
