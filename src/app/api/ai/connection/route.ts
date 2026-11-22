import { NextResponse } from "next/server";
import { publicAiStatus, testAiConnection } from "@/lib/ai";
import { consumeAiProbeBudget } from "@/lib/ai-budget";
import { getCurrentUser } from "@/lib/current-user";
import { RateLimitError } from "@/lib/errors";

/**
 * Safe AI diagnostics for operators.
 * GET — config presence only (no network call, no secrets).
 * POST — live TokenLavka probe (admin only). Response never includes the API key.
 */
export async function GET() {
  const status = publicAiStatus();
  return NextResponse.json(
    {
      configured: status.configured,
      baseUrl: status.baseUrl,
      model: status.model,
      keySource: status.keySource,
      note: status.configured
        ? "Ключ задан в окружении сервера. Браузер ключ не читает."
        : "Ключ на сервере отсутствует. Задайте OPENAI_API_KEY в Render/хостинге и перезапустите сервис.",
    },
    { status: 200 },
  );
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ ok: false, message: "Нужны права администратора." }, { status: 403 });
  }
  try {
    consumeAiProbeBudget();
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ ok: false, message: "Лимит AI-проверок исчерпан." }, { status: 429 });
    }
    throw error;
  }
  const probe = await testAiConnection();
  return NextResponse.json(
    {
      ok: probe.ok,
      configured: probe.configured,
      baseUrl: probe.baseUrl,
      model: probe.model,
      keySource: probe.keySource,
      httpStatus: probe.httpStatus,
      code: probe.code,
      message: probe.message,
      latencyMs: probe.latencyMs,
    },
    { status: probe.ok ? 200 : probe.code === "missing_api_key" ? 503 : 502 },
  );
}
