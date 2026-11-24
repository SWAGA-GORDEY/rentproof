import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  aiConfigured,
  publicAiStatus,
  readAiProviderConfig,
  sanitizeAiDiagnostic,
  testAiConnection,
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_OPENAI_MODEL,
} from "@/lib/ai-provider";

const KEYS = [
  "OPENAI_API_KEY",
  "TOKENLAVKA_KEY",
  "TOKENLAVKA_API_KEY",
  "OPENAI_BASE_URL",
  "TOKENLAVKA_BASE_URL",
  "OPENAI_MODEL",
  "OPENAI_VISION_MODEL",
  "TOKENLAVKA_MODEL",
] as const;
const saved: Record<string, string | undefined> = {};

function snapshotEnv() {
  for (const key of KEYS) {
    saved[key] = process.env[key];
  }
}

function restoreEnv() {
  for (const key of KEYS) {
    const value = saved[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function clearAiEnv() {
  for (const key of KEYS) {
    delete process.env[key];
  }
}

snapshotEnv();

afterEach(() => {
  restoreEnv();
});

describe("ai-provider", () => {
  it("reads API key only from process.env and never from browser-like sources", () => {
    clearAiEnv();
    assert.equal(aiConfigured(), false);
    assert.equal(readAiProviderConfig().apiKey, null);

    process.env.OPENAI_API_KEY = "sk-test-openai-key-aaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const fromOpenAi = readAiProviderConfig();
    assert.equal(fromOpenAi.configured, true);
    assert.equal(fromOpenAi.keySource, "OPENAI_API_KEY");
    assert.equal(fromOpenAi.baseUrl, DEFAULT_OPENAI_BASE_URL);
    assert.equal(fromOpenAi.model, DEFAULT_OPENAI_MODEL);

    clearAiEnv();
    process.env.TOKENLAVKA_KEY = "sk-test-tokenlavka-key-bbbbbbbbbbbbbbbbbbbbbbbbbb";
    const fromToken = readAiProviderConfig();
    assert.equal(fromToken.keySource, "TOKENLAVKA_KEY");
    assert.equal(fromToken.configured, true);

    clearAiEnv();
    process.env.TOKENLAVKA_API_KEY = "sk-test-tokenlavka-legacy-cccccccccccccccccccc";
    process.env.TOKENLAVKA_BASE_URL = "https://tokenlavka.com/custom/v1/";
    process.env.TOKENLAVKA_MODEL = "tokenlavka-model-id";
    const fromLegacyToken = readAiProviderConfig();
    assert.equal(fromLegacyToken.keySource, "TOKENLAVKA_API_KEY");
    assert.equal(fromLegacyToken.baseUrl, "https://tokenlavka.com/custom/v1");
    assert.equal(fromLegacyToken.model, "tokenlavka-model-id");
  });

  it("prefers OPENAI_MODEL over OPENAI_VISION_MODEL and custom base URL", () => {
    clearAiEnv();
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.OPENAI_BASE_URL = "https://tokenlavka.com/v1/";
    process.env.OPENAI_VISION_MODEL = "legacy-vision";
    process.env.OPENAI_MODEL = "gpt-6-luna";
    const config = readAiProviderConfig();
    assert.equal(config.baseUrl, "https://tokenlavka.com/v1");
    assert.equal(config.model, "gpt-6-luna");
  });

  it("public status never includes the api key", () => {
    clearAiEnv();
    process.env.OPENAI_API_KEY = "sk-secret-should-not-leak-cccccccccccccccccccccccc";
    const status = publicAiStatus();
    assert.equal(status.configured, true);
    assert.equal("apiKey" in status, false);
    assert.equal(JSON.stringify(status).includes("sk-secret"), false);
  });

  it("sanitizes diagnostics so keys are not echoed", () => {
    const cleaned = sanitizeAiDiagnostic('Bearer sk-abcdefghijklmnopqrstuvwxyz012345 Authorization api_key="sk-zzzzzzzzzzzzzzzzzzzzzzzzzzzz"');
    assert.equal(cleaned.includes("sk-abcdefghijklmnopqrstuvwxyz012345"), false);
    assert.equal(cleaned.includes("sk-zzzzzzzzzzzzzzzzzzzzzzzzzzzz"), false);
    assert.match(cleaned, /\[redacted\]/);
  });

  it("connection test reports missing key honestly without inventing success", async () => {
    clearAiEnv();
    const result = await testAiConnection({ timeoutMs: 1000 });
    assert.equal(result.ok, false);
    assert.equal(result.code, "missing_api_key");
    assert.equal(result.httpStatus, null);
    assert.equal(result.configured, false);
    assert.equal(JSON.stringify(result).includes("sk-"), false);
  });
});
