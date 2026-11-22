"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/app/actions/auth";
import { createAiReport, testAiConnection, type AiConnectionProbe } from "@/lib/ai";
import { consumeAiProbeBudget } from "@/lib/ai-budget";
import { getCurrentUser } from "@/lib/current-user";
import { ImageRejectedError, PlanLimitError, RateLimitError } from "@/lib/errors";
import { parseAiForm, readUploads } from "@/lib/forms";

export async function analyzeAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const parsed = parseAiForm(formData);
  if (!parsed.ok) {
    return { fieldErrors: parsed.fieldErrors };
  }
  const files = readUploads(formData, "photos");
  if (files.length < 1 || files.length > 4) {
    return { message: "Загрузите от 1 до 4 фотографий JPEG, PNG или WebP, каждая до 2 МБ." };
  }
  try {
    // Budget is enforced once inside createAiReport before the provider call (no double-count, no retries).
    const bytes = await Promise.all(files.map(async (file) => new Uint8Array(await file.arrayBuffer())));
    const id = await createAiReport(user.id, parsed.value, bytes);
    redirect(`/ai-assessment/${id}`);
  } catch (error) {
    if (isRedirect(error)) {
      throw error;
    }
    if (error instanceof PlanLimitError) {
      return { message: `На тарифе ${error.plan.toUpperCase()} сохраняется до ${error.limit} отчётов.` };
    }
    if (error instanceof ImageRejectedError) {
      return { message: "Фотография не прошла проверку типа или размера." };
    }
    if (error instanceof RateLimitError) {
      return { message: "Достигнут лимит AI-запросов (час или месяц). Подождите или снизьте частоту." };
    }
    console.error("ai action failed");
    return { message: "Не удалось сохранить запрос на анализ." };
  }
}

/** Admin-only live probe. Never returns the API key. */
export async function testAiConnectionAction(): Promise<AiConnectionProbe | { ok: false; message: string }> {
  const user = await getCurrentUser();
  if (!user?.isAdmin) {
    return { ok: false, message: "Нужны права администратора." };
  }
  try {
    consumeAiProbeBudget();
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { ok: false, message: "Лимит AI-проверок исчерпан. Повторите позже." };
    }
    throw error;
  }
  return testAiConnection();
}

function isRedirect(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error && String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT");
}
