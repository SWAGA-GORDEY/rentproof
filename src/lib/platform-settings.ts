import { writeAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";

const DEFAULTS: Record<string, string> = {
  platform_name: "RentProof",
  support_email: "",
  registration_open: "1",
  moderation_required: "0",
  ai_enabled: "1",
  contact_phone: "",
};

export function getSetting(key: string): string {
  const row = getDb().prepare(`SELECT value FROM platform_settings WHERE key = ?`).get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? DEFAULTS[key] ?? "";
}

export function listSettings(): Record<string, string> {
  const rows = getDb().prepare(`SELECT key, value FROM platform_settings`).all() as Array<{
    key: string;
    value: string;
  }>;
  const out = { ...DEFAULTS };
  for (const row of rows) out[row.key] = row.value;
  return out;
}

export function setSetting(actorId: string, key: string, value: string): void {
  if (!(key in DEFAULTS) && !key.startsWith("feature_")) {
    throw new Error("unknown_setting");
  }
  // Never allow secret-like keys through this API.
  if (/secret|password|token|api_key|smtp_pass/i.test(key)) {
    throw new Error("forbidden_setting");
  }
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO platform_settings (key, value, updated_by, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
    )
    .run(key, value, actorId, now);
  writeAudit(actorId, "settings.update", "setting", key, { value: value.slice(0, 80) });
}
