import { testAiConnection } from "../src/lib/ai-provider.ts";

const result = await testAiConnection();

const payload = {
  ok: result.ok,
  configured: result.configured,
  baseUrl: result.baseUrl,
  model: result.model,
  keySource: result.keySource,
  httpStatus: result.httpStatus,
  code: result.code,
  message: result.message,
  latencyMs: result.latencyMs,
};

console.log(JSON.stringify(payload, null, 2));
process.exit(result.ok ? 0 : 1);
