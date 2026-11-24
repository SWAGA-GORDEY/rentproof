/**
 * Server-only TokenLavka / OpenAI-compatible provider settings.
 * Never import this module from a Client Component.
 */

export const DEFAULT_OPENAI_BASE_URL = "https://tokenlavka.com/v1";
export const DEFAULT_OPENAI_MODEL = "gpt-6-luna";

export type AiProviderConfig = {
  configured: boolean;
  baseUrl: string;
  model: string;
  /** Present only while handling a request on the server. Never log or return this. */
  apiKey: string | null;
  keySource: "OPENAI_API_KEY" | "TOKENLAVKA_KEY" | "TOKENLAVKA_API_KEY" | null;
};

export type AiConnectionProbe = {
  ok: boolean;
  configured: boolean;
  baseUrl: string;
  model: string;
  keySource: AiProviderConfig["keySource"];
  httpStatus: number | null;
  code:
    | "ok"
    | "missing_api_key"
    | "provider_http"
    | "provider_timeout"
    | "provider_network"
    | "provider_empty"
    | "provider_parse";
  message: string;
  latencyMs: number | null;
};

/** Strip anything that looks like a secret from diagnostic text. */
export function sanitizeAiDiagnostic(text: string): string {
  return text
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/api[_-]?key["']?\s*[:=]\s*["']?[^"'\s,}+]+/gi, "api_key=[redacted]")
    .slice(0, 400);
}

export function readAiProviderConfig(): AiProviderConfig {
  const openaiKey = process.env.OPENAI_API_KEY?.trim() || "";
  const tokenlavkaKey = process.env.TOKENLAVKA_KEY?.trim() || "";
  const legacyTokenlavkaKey = process.env.TOKENLAVKA_API_KEY?.trim() || "";
  const apiKey = openaiKey || tokenlavkaKey || null;
  const resolvedKey = apiKey || legacyTokenlavkaKey || null;
  const keySource = openaiKey
    ? "OPENAI_API_KEY"
    : tokenlavkaKey
      ? "TOKENLAVKA_KEY"
      : legacyTokenlavkaKey
        ? "TOKENLAVKA_API_KEY"
        : null;
  const baseUrl = (
    process.env.OPENAI_BASE_URL?.trim() ||
    process.env.TOKENLAVKA_BASE_URL?.trim() ||
    DEFAULT_OPENAI_BASE_URL
  ).replace(/\/$/, "");
  const model =
    process.env.OPENAI_MODEL?.trim() ||
    process.env.OPENAI_VISION_MODEL?.trim() ||
    process.env.TOKENLAVKA_MODEL?.trim() ||
    DEFAULT_OPENAI_MODEL;
  return {
    configured: Boolean(resolvedKey),
    baseUrl,
    model,
    apiKey: resolvedKey,
    keySource,
  };
}

export function aiConfigured(): boolean {
  return readAiProviderConfig().configured;
}

export function publicAiStatus(): {
  configured: boolean;
  baseUrl: string;
  model: string;
  keySource: AiProviderConfig["keySource"];
} {
  const config = readAiProviderConfig();
  return {
    configured: config.configured,
    baseUrl: config.baseUrl,
    model: config.model,
    keySource: config.keySource,
  };
}

/**
 * Lightweight text-only probe against POST {base}/chat/completions.
 * Never returns or logs the API key.
 */
export async function testAiConnection(options?: { timeoutMs?: number }): Promise<AiConnectionProbe> {
  const config = readAiProviderConfig();
  const base = {
    configured: config.configured,
    baseUrl: config.baseUrl,
    model: config.model,
    keySource: config.keySource,
    latencyMs: null as number | null,
  };

  if (!config.apiKey) {
    return {
      ...base,
      ok: false,
      httpStatus: null,
      code: "missing_api_key",
      message:
        "Серверный ключ не задан. Укажите OPENAI_API_KEY (или TOKENLAVKA_KEY) в окружении процесса Node, не в браузере.",
    };
  }

  const timeoutMs = options?.timeoutMs ?? 20_000;
  const started = Date.now();
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0,
        max_tokens: 16,
        messages: [{ role: "user", content: "Ответь одним словом: ok" }],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const latencyMs = Date.now() - started;
    if (isTimeout(error)) {
      return {
        ...base,
        ok: false,
        httpStatus: null,
        code: "provider_timeout",
        message: "Таймаут при обращении к API. Проверьте OPENAI_BASE_URL и сеть хостинга.",
        latencyMs,
      };
    }
    return {
      ...base,
      ok: false,
      httpStatus: null,
      code: "provider_network",
      message: sanitizeAiDiagnostic(
        `Сеть недоступна для ${config.baseUrl}: ${error instanceof Error ? error.message : "unknown"}`,
      ),
      latencyMs,
    };
  }

  const latencyMs = Date.now() - started;
  if (!response.ok) {
    const raw = sanitizeAiDiagnostic(await response.text().catch(() => ""));
    return {
      ...base,
      ok: false,
      httpStatus: response.status,
      code: "provider_http",
      message: mapHttpStatus(response.status, raw),
      latencyMs,
    };
  }

  try {
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return {
        ...base,
        ok: false,
        httpStatus: response.status,
        code: "provider_empty",
        message: "API ответил 200, но без текста в choices[0].message.content.",
        latencyMs,
      };
    }
    return {
      ...base,
      ok: true,
      httpStatus: response.status,
      code: "ok",
      message: "Подключение к API успешно. Ключ принят, модель ответила.",
      latencyMs,
    };
  } catch {
    return {
      ...base,
      ok: false,
      httpStatus: response.status,
      code: "provider_parse",
      message: "API ответил 200, но тело ответа не JSON.",
      latencyMs,
    };
  }
}

export function mapHttpStatus(status: number, bodySnippet: string): string {
  const hint = bodySnippet ? ` Ответ: ${bodySnippet}` : "";
  switch (status) {
    case 401:
      return `401: ключ не принят шлюзом. Проверьте ключ и что Base URL указывает на TokenLavka (https://tokenlavka.com/v1), а не api.openai.com.${hint}`;
    case 402:
      return `402: баланс ключа исчерпан или недостаточен для запроса.${hint}`;
    case 404:
      return `404: путь не найден. В OPENAI_BASE_URL должно быть https://tokenlavka.com/v1 без /chat/completions.${hint}`;
    case 429:
      return `429: слишком частые запросы. Подождите и повторите.${hint}`;
    case 400:
      return `400: неверная модель или параметры. Проверьте OPENAI_MODEL / OPENAI_VISION_MODEL.${hint}`;
    case 502:
      return `502: модель на стороне поставщика не ответила.${hint}`;
    case 503:
      return `503: модель временно недоступна.${hint}`;
    default:
      return `HTTP ${status} от провайдера.${hint}`;
  }
}

export function providerErrorCode(status: number | null, kind: "http" | "timeout" | "network" | "parse" | "empty"): string {
  if (kind === "timeout") return "provider_timeout";
  if (kind === "network") return "provider_network";
  if (kind === "parse") return "provider_parse";
  if (kind === "empty") return "provider_empty";
  if (status === 401) return "provider_401";
  if (status === 402) return "provider_402";
  if (status === 404) return "provider_404";
  if (status === 429) return "provider_429";
  if (status != null) return `provider_http_${status}`;
  return "provider";
}

function isTimeout(error: unknown): boolean {
  return (
    (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) ||
    (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ABORT_ERR")
  );
}
