import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createAiReport, getAiReport } from "@/lib/ai";
import { aiHourlyLimit, aiMonthlyCap, aiVisionMaxTokens, consumeAiCallBudget } from "@/lib/ai-budget";
import { sanitizeAiDiagnostic } from "@/lib/ai-provider";
import { ImageRejectedError, RateLimitError } from "@/lib/errors";
import { parseAiForm } from "@/lib/forms";
import { sniffImage } from "@/lib/images";
import { registerUser } from "@/lib/users";

const password = "Correct-horse-9";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
}

const KEYS = ["OPENAI_API_KEY", "TOKENLAVKA_KEY"] as const;
const saved: Record<string, string | undefined> = {};
for (const key of KEYS) {
  saved[key] = process.env[key];
}

afterEach(() => {
  for (const key of KEYS) {
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("ai-qa guards", () => {
  it("rejects empty AI form fields", () => {
    const empty = new FormData();
    empty.set("objectType", "");
    empty.set("description", "");
    const parsed = parseAiForm(empty);
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.ok(parsed.fieldErrors.objectType);
      assert.ok(parsed.fieldErrors.description);
    }
  });

  it("rejects unsupported and oversized image bytes", () => {
    assert.equal(sniffImage(Buffer.from("%PDF-1.4")), null);
    assert.equal(sniffImage(Buffer.from("<svg></svg>")), null);
    const huge = Buffer.alloc(2 * 1024 * 1024 + 1, 1);
    assert.equal(sniffImage(huge), null);
    assert.equal(sniffImage(png), "image/png");
  });

  it("stores unavailable report without calling provider when key missing", async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.TOKENLAVKA_KEY;
    const user = await registerUser({ name: "QA Без Ключа", email: uniqueEmail("qa-nokey"), password, role: "tenant" });
    const id = await createAiReport(
      user.id,
      { objectType: "Дрель", description: "Корпус на одном кадре для проверки.", knownDefects: null },
      [png],
    );
    const report = getAiReport(user.id, false, id);
    assert.equal(report?.status, "unavailable");
    assert.equal(report?.errorCode, "missing_api_key");
    assert.equal(report?.body, null);
  });

  it("rejects zero photos before provider call", async () => {
    delete process.env.OPENAI_API_KEY;
    const user = await registerUser({ name: "QA Пусто", email: uniqueEmail("qa-empty"), password, role: "tenant" });
    await assert.rejects(
      () => createAiReport(user.id, { objectType: "Пила", description: "Описание достаточно длинное.", knownDefects: null }, []),
      ImageRejectedError,
    );
  });

  it("enforces AI call budget without retries", () => {
    assert.ok(aiHourlyLimit() >= 1);
    assert.ok(aiMonthlyCap() >= 1);
    assert.ok(aiVisionMaxTokens() >= 256);
    const userId = `budget-${Date.now()}`;
    const previousHourly = process.env.RENTPROOF_AI_HOURLY_LIMIT;
    process.env.RENTPROOF_AI_HOURLY_LIMIT = "1";
    try {
      consumeAiCallBudget(userId);
      assert.throws(() => consumeAiCallBudget(userId), RateLimitError);
    } finally {
      if (previousHourly === undefined) delete process.env.RENTPROOF_AI_HOURLY_LIMIT;
      else process.env.RENTPROOF_AI_HOURLY_LIMIT = previousHourly;
    }
  });

  it("never echoes API keys in sanitized diagnostics", () => {
    const dirty = 'Authorization: Bearer sk-abcdefghijklmnopqrstuvwxyz0123456789abcdef error from api';
    const clean = sanitizeAiDiagnostic(dirty);
    assert.equal(clean.includes("sk-abcdefghijklmnopqrstuvwxyz0123456789abcdef"), false);
    assert.match(clean, /\[redacted\]/);
  });
});
