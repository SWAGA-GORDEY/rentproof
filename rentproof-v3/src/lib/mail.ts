export async function sendVerificationCode(email: string, name: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Email delivery is not configured. Set RESEND_API_KEY before accepting registrations.");
    }
    console.info("rentproof_dev_verification_code", { email, code });
    return;
  }

  const from = process.env.MAIL_FROM?.trim() || "RentProof <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Код подтверждения RentProof",
      text: `Здравствуйте, ${name}!\n\nКод подтверждения аккаунта: ${code}\nОн действует 15 минут. Если вы не создавали аккаунт, просто проигнорируйте письмо.`,
      html: `<div style="font-family:Arial,sans-serif;color:#112b31"><h1>Подтвердите email</h1><p>Здравствуйте, ${escapeHtml(name)}!</p><p>Введите этот код в RentProof:</p><p style="font-size:28px;font-weight:bold;letter-spacing:8px">${code}</p><p>Код действует 15 минут.</p></div>`,
    }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("Письмо не отправлено. Проверьте настройки почтового провайдера.");
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}
