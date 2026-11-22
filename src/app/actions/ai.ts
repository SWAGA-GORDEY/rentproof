"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/app/actions/auth";
import { createAiReport, testAiConnection, type AiConnectionProbe } from "@/lib/ai";
import { assertFeatureAllowed } from "@/lib/bans";
import { getCurrentUser } from "@/lib/current-user";
import { FeatureBlockedError, ImageRejectedError, PlanLimitError, RateLimitError } from "@/lib/errors";
import { parseAiForm, readUploads } from "@/lib/forms";
import { consumeRateLimit } from "@/lib/rate-limit";
import { hasPermission, loadStaffProfile } from "@/lib/rbac";

export async function analyzeAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  try {
    assertFeatureAllowed(user.id, "ai");
  } catch (error) {
    if (error instanceof FeatureBlockedError) {
      return { message: "AI-оценка ограничена для этого аккаунта." };
    }
    throw error;
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
    consumeRateLimit(`ai:${user.id}`, 8, 60 * 60 * 1000);
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
      return { message: "Слишком много запусков анализа. Подождите и повторите." };
    }
    console.error("ai action failed");
    return { message: "Не удалось сохранить запрос на анализ." };
  }
}

/** Staff-only live probe. Never returns the API key. */
export async function testAiConnectionAction(): Promise<AiConnectionProbe | { ok: false; message: string }> {
  const user = await getCurrentUser();
  const staff = user ? loadStaffProfile(user.id) : null;
  if (!staff || !hasPermission(staff, "ai.view")) {
    return { ok: false, message: "Нужны права AI Control." };
  }
  return testAiConnection();
}

function isRedirect(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error && String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT");
}
