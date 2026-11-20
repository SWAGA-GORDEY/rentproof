import { randomUUID } from "node:crypto";
import { writeAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ImageRejectedError, NotFoundError, PlanLimitError } from "@/lib/errors";
import { listAiImages, saveAiImage, type StoredImage } from "@/lib/images";
import { planAiLimit, type PlanId } from "@/lib/plans";

export const AI_DISCLAIMER =
  "Это визуальная оценка по загруженным фотографиям, а не техническая экспертиза. По снимку нельзя установить, что предмет полностью исправен. Видимые признаки отделены от предположений.";

export const AI_METHODOLOGY =
  "Балл от 0 до 100 описывает только видимое на снимках состояние кадра: 100 означает, что в кадре не отмечено явных повреждений, и не означает исправность. Царапины, трещины, износ и плохие фотографии снижают балл. Нечёткие зоны снижают уверенность и не доказывают отсутствие дефектов.";

export type AiReportBody = {
  objectDescription: string;
  visibleDamage: string[];
  wear: string[];
  scratches: string[];
  cracks: string[];
  features: string[];
  photoQuality: string;
  uncertainty: string[];
  extraPhotos: string[];
  conclusion: string;
  observations: string[];
  assumptions: string[];
};

export type AiReportRecord = {
  id: string;
  userId: string;
  objectType: string;
  description: string;
  knownDefects: string | null;
  status: "completed" | "unavailable" | "failed";
  score: number | null;
  confidence: number | null;
  body: AiReportBody | null;
  model: string | null;
  errorCode: string | null;
  createdAt: string;
  images: StoredImage[];
};

const SYSTEM_RULES = `Ты визуальный ассистент RentProof. Ответь одним JSON-объектом без markdown.
Поля: objectDescription, visibleDamage, wear, scratches, cracks, features, photoQuality, uncertainty, extraPhotos, conclusion, observations, assumptions, score, confidence.
Массивы — строки. score — целое 0..100 только по видимому. confidence — число 0..1.
Не пиши, что предмет исправен, безопасен или пригоден к работе. Не ставь диагноз скрытым узлам.
observations — только то, что видно. assumptions — только осторожные оговорки, не факты.
Если кадра недостаточно, снижай confidence и перечисляй extraPhotos.`;

export function aiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function createAiReport(
  userId: string,
  input: { objectType: string; description: string; knownDefects: string | null },
  files: Uint8Array[],
): Promise<string> {
  const plan = readPlan(userId);
  const used = countReports(userId);
  const limit = planAiLimit(plan);
  if (used >= limit) {
    throw new PlanLimitError(plan, limit);
  }
  if (files.length < 1 || files.length > 4) {
    throw new ImageRejectedError();
  }
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO ai_reports (
        id, user_id, object_type, description, known_defects, status, score, confidence, report_json, model, error_code, created_at
      ) VALUES (?, ?, ?, ?, ?, 'failed', NULL, NULL, NULL, NULL, 'pending', ?)`,
    )
    .run(id, userId, input.objectType, input.description, input.knownDefects, now);

  const stored: Array<{ mime: string; bytes: Uint8Array }> = [];
  try {
    for (const file of files) {
      const image = saveAiImage(id, file);
      stored.push({ mime: image.mime, bytes: file });
    }
  } catch (error) {
    getDb().prepare("UPDATE ai_reports SET status = 'failed', error_code = 'image' WHERE id = ?").run(id);
    throw error;
  }

  if (!aiConfigured()) {
    getDb()
      .prepare("UPDATE ai_reports SET status = 'unavailable', error_code = 'missing_api_key', model = NULL, report_json = NULL WHERE id = ?")
      .run(id);
    writeAudit(userId, "ai.unavailable", "ai_report", id, null);
    return id;
  }

  try {
    const result = await callVision(input, stored);
    getDb()
      .prepare(
        `UPDATE ai_reports
         SET status = 'completed', score = ?, confidence = ?, report_json = ?, model = ?, error_code = NULL
         WHERE id = ?`,
      )
      .run(result.score, result.confidence, JSON.stringify(result.body), result.model, id);
    writeAudit(userId, "ai.completed", "ai_report", id, { score: result.score });
  } catch {
    getDb().prepare("UPDATE ai_reports SET status = 'failed', error_code = 'provider' WHERE id = ?").run(id);
    writeAudit(userId, "ai.failed", "ai_report", id, null);
  }
  return id;
}

export function getAiReport(userId: string, isAdmin: boolean, id: string): AiReportRecord | null {
  const row = getDb().prepare("SELECT * FROM ai_reports WHERE id = ?").get(id) as ReportRow | undefined;
  if (!row || (!isAdmin && row.user_id !== userId)) {
    return null;
  }
  return mapReport(row);
}

export function listAiReports(userId: string, plan: PlanId): AiReportRecord[] {
  const rows = getDb()
    .prepare("SELECT * FROM ai_reports WHERE user_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(userId, planAiLimit(plan)) as ReportRow[];
  return rows.map(mapReport);
}

export function requireAiReport(userId: string, isAdmin: boolean, id: string): AiReportRecord {
  const report = getAiReport(userId, isAdmin, id);
  if (!report) {
    throw new NotFoundError();
  }
  return report;
}

type ReportRow = {
  id: string;
  user_id: string;
  object_type: string;
  description: string;
  known_defects: string | null;
  status: string;
  score: number | null;
  confidence: number | null;
  report_json: string | null;
  model: string | null;
  error_code: string | null;
  created_at: string;
};

async function callVision(
  input: { objectType: string; description: string; knownDefects: string | null },
  files: Array<{ mime: string; bytes: Uint8Array }>,
): Promise<{ score: number; confidence: number; body: AiReportBody; model: string }> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("missing key");
  }
  const base = (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o-mini";
  const prompt = [
    SYSTEM_RULES,
    `Тип объекта: ${input.objectType}`,
    `Описание пользователя: ${input.description}`,
    `Известные дефекты со слов пользователя: ${input.knownDefects || "не указаны"}`,
  ].join("\n");
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            ...files.map((file) => ({
              type: "image_url",
              image_url: { url: `data:${file.mime};base64,${Buffer.from(file.bytes).toString("base64")}` },
            })),
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) {
    throw new Error("provider status");
  }
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("empty");
  }
  return { ...parseModelJson(content), model };
}

function parseModelJson(content: string): { score: number; confidence: number; body: AiReportBody } {
  const parsed = JSON.parse(content) as Record<string, unknown>;
  const score = clampScore(parsed.score);
  const confidence = clampConfidence(parsed.confidence);
  const body: AiReportBody = {
    objectDescription: text(parsed.objectDescription),
    visibleDamage: strings(parsed.visibleDamage),
    wear: strings(parsed.wear),
    scratches: strings(parsed.scratches),
    cracks: strings(parsed.cracks),
    features: strings(parsed.features),
    photoQuality: text(parsed.photoQuality),
    uncertainty: strings(parsed.uncertainty),
    extraPhotos: strings(parsed.extraPhotos),
    conclusion: text(parsed.conclusion),
    observations: strings(parsed.observations),
    assumptions: strings(parsed.assumptions),
  };
  if (!body.objectDescription || !body.conclusion) {
    throw new Error("incomplete");
  }
  return { score, confidence, body };
}

function mapReport(row: ReportRow): AiReportRecord {
  if (row.status !== "completed" && row.status !== "unavailable" && row.status !== "failed") {
    throw new Error("Unknown AI status");
  }
  return {
    id: row.id,
    userId: row.user_id,
    objectType: row.object_type,
    description: row.description,
    knownDefects: row.known_defects,
    status: row.status,
    score: row.score,
    confidence: row.confidence,
    body: row.report_json ? (JSON.parse(row.report_json) as AiReportBody) : null,
    model: row.model,
    errorCode: row.error_code,
    createdAt: row.created_at,
    images: listAiImages(row.id),
  };
}

function countReports(userId: string): number {
  const row = getDb().prepare("SELECT COUNT(*) AS count FROM ai_reports WHERE user_id = ?").get(userId) as { count: number };
  return Number(row.count);
}

function readPlan(userId: string): PlanId {
  const row = getDb().prepare("SELECT plan FROM users WHERE id = ?").get(userId) as { plan: string } | undefined;
  if (row?.plan === "plus" || row?.plan === "pro") {
    return row.plan;
  }
  return "free";
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 2000) : "";
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => (typeof item === "string" && item.trim() ? [item.trim().slice(0, 400)] : [])).slice(0, 12);
}

function clampScore(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    throw new Error("score");
  }
  return Math.max(0, Math.min(100, Math.round(number)));
}

function clampConfidence(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    throw new Error("confidence");
  }
  return Math.max(0, Math.min(1, Math.round(number * 100) / 100));
}
