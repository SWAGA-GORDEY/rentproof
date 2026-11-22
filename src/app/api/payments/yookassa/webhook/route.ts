import { handleYooKassaWebhook, paymentsConfigured } from "@/lib/payments";
import { readYooKassaConfig } from "@/lib/yookassa";

/**
 * ЮKassa notification endpoint.
 * Authenticity: we re-fetch the payment via API and validate amount/currency.
 * Optional shared secret header if operator sets YOOKASSA_WEBHOOK_SECRET (custom; not required by ЮKassa).
 */
export async function POST(request: Request): Promise<Response> {
  const config = readYooKassaConfig();
  if (config.liveForbidden || !paymentsConfigured()) {
    return Response.json({ error: "billing_disabled" }, { status: 503 });
  }

  const expected = process.env.YOOKASSA_WEBHOOK_SECRET?.trim();
  if (expected) {
    const got = request.headers.get("x-rentproof-webhook-secret")?.trim();
    if (got !== expected) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const result = await handleYooKassaWebhook(body);
    return Response.json(result);
  } catch (error) {
    console.error("yookassa_webhook_failed", error instanceof Error ? error.name : "error");
    return Response.json({ error: "processing_failed" }, { status: 500 });
  }
}
