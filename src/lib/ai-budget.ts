import { RateLimitError } from "@/lib/errors";
import { consumeRateLimit } from "@/lib/rate-limit";

/** Soft monthly/hourly caps aligned with ~500 ₽/month TokenLavka budget. */
export function aiHourlyLimit(): number {
  const raw = Number(process.env.RENTPROOF_AI_HOURLY_LIMIT ?? "4");
  return Number.isFinite(raw) && raw > 0 ? Math.min(20, Math.floor(raw)) : 4;
}

export function aiMonthlyCap(): number {
  const raw = Number(process.env.RENTPROOF_AI_MONTHLY_CAP ?? "40");
  return Number.isFinite(raw) && raw > 0 ? Math.min(200, Math.floor(raw)) : 40;
}

export function aiVisionMaxTokens(): number {
  const raw = Number(process.env.RENTPROOF_AI_MAX_TOKENS ?? "1200");
  return Number.isFinite(raw) && raw >= 256 ? Math.min(4000, Math.floor(raw)) : 1200;
}

/**
 * Enforce per-user hourly and site-wide monthly caps before any paid provider call.
 * Does not retry; a single RateLimitError stops the request.
 */
export function consumeAiCallBudget(userId: string): void {
  consumeRateLimit(`ai:${userId}`, aiHourlyLimit(), 60 * 60 * 1000);
  try {
    consumeRateLimit(`ai:monthly:global`, aiMonthlyCap(), 30 * 24 * 60 * 60 * 1000);
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error;
    }
    throw error;
  }
}

/** Admin/text probes also spend tokens — share the monthly global bucket. */
export function consumeAiProbeBudget(): void {
  consumeRateLimit(`ai:probe:hourly`, 6, 60 * 60 * 1000);
  consumeRateLimit(`ai:monthly:global`, aiMonthlyCap(), 30 * 24 * 60 * 60 * 1000);
}
