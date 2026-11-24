import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { row, rows } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Войдите в аккаунт, чтобы пользоваться AI." }, { status: 401 });

  const config = readProviderConfig();
  if (!config.apiKey) return NextResponse.json({ error: "AI-ключ ещё не настроен на сервере." }, { status: 503 });
  if (process.env.OPENAI_TEST_MODE === "1" || process.env.TOKENLAVKA_TEST_MODE === "1") {
    return NextResponse.json({ error: "AI выключен в тестовом режиме." }, { status: 503 });
  }

  let input: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 8_000) return NextResponse.json({ error: "Слишком большой запрос." }, { status: 413 });
    input = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }
  const title = asText(input.title, 100);
  const category = asText(input.category, 50);
  const city = asText(input.city, 80);
  const notes = asText(input.notes, 1_200);
  if (title.length < 3) return NextResponse.json({ error: "Сначала укажите название вещи." }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);
  try {
    const usage = await row<{ requests: number }>("SELECT requests FROM ai_usage WHERE user_id=$1 AND day=$2", [user.id, today]);
    if (Number(usage?.requests ?? 0) >= 5) return NextResponse.json({ error: "Дневной лимит AI-подсказок исчерпан (5 в день)." }, { status: 429 });

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.35,
        max_tokens: 550,
        messages: [
          { role: "system", content: "Ты редактор объявлений сервиса аренды RentProof. Напиши короткое и понятное объявление на русском: что сдают, кому пригодится, состояние только по данным пользователя, правила передачи и важные условия. Не выдумывай характеристики, гарантию, доставку или комплектацию. Если данных нет, не добавляй их. Верни только текст черновика, без заголовков и markdown." },
          { role: "user", content: `Название: ${title}\nКатегория: ${category || "не указана"}\nГород: ${city || "не указан"}\nФакты от владельца: ${notes || "не указаны"}` },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
      cache: "no-store",
    });
    if (!response.ok) {
      return NextResponse.json({ error: response.status === 429 ? "AI временно перегружен. Попробуйте позже." : "AI-провайдер не ответил. Попробуйте позже." }, { status: 502 });
    }
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const draft = payload.choices?.[0]?.message?.content?.trim().slice(0, 2_400);
    if (!draft) return NextResponse.json({ error: "AI вернул пустой черновик." }, { status: 502 });
    const recorded = await rows<{ requests: number }>(
      `INSERT INTO ai_usage (user_id,day,requests) VALUES ($1,$2,1)
       ON CONFLICT(user_id,day) DO UPDATE SET requests=ai_usage.requests+1
       WHERE ai_usage.requests < 5 RETURNING requests`,
      [user.id, today],
    );
    if (recorded.length === 0) return NextResponse.json({ error: "Дневной лимит AI-подсказок исчерпан (5 в день)." }, { status: 429 });
    return NextResponse.json({ draft }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Не удалось связаться с AI. Проверьте настройки и повторите позже." }, { status: 502 });
  }
}

function asText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().replace(/[\u0000-\u001f]/g, " ").slice(0, max) : "";
}

function readProviderConfig() {
  const apiKey = process.env.OPENAI_API_KEY?.trim() || process.env.TOKENLAVKA_KEY?.trim() || process.env.TOKENLAVKA_API_KEY?.trim() || "";
  const baseUrl = (process.env.OPENAI_BASE_URL?.trim() || process.env.TOKENLAVKA_BASE_URL?.trim() || "https://tokenlavka.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL?.trim() || process.env.OPENAI_VISION_MODEL?.trim() || process.env.TOKENLAVKA_MODEL?.trim() || "gpt-6-luna";
  return { apiKey, baseUrl, model };
}
