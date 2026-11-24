import { NextResponse } from "next/server";
import { databasePath, databaseUrl, getDb, resolveDbDriver } from "@/lib/db";

/**
 * Render / ops health check — does not expose secrets.
 * Returns 200 when the configured database answers SELECT 1.
 */
export async function GET() {
  const driver = resolveDbDriver();
  const started = Date.now();
  try {
    const row = getDb().prepare("SELECT 1 AS ok").get() as { ok: number | string } | undefined;
    const ok = Number(row?.ok) === 1;
    if (!ok) {
      return NextResponse.json(
        { ok: false, driver, database: "unexpected_result", latencyMs: Date.now() - started },
        { status: 503 },
      );
    }
    let userCount: number | null = null;
    try {
      const users = getDb().prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number | string };
      userCount = Number(users.c);
    } catch {
      userCount = null;
    }
    return NextResponse.json(
      {
        ok: true,
        driver,
        database: "up",
        users: userCount,
        sqlitePathConfigured: driver === "sqlite" ? Boolean(databasePath()) : undefined,
        databaseUrlConfigured: driver === "postgres" ? Boolean(databaseUrl()) : undefined,
        latencyMs: Date.now() - started,
      },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        driver,
        database: "down",
        message: err instanceof Error ? err.message.slice(0, 240) : "db_error",
        latencyMs: Date.now() - started,
      },
      { status: 503 },
    );
  }
}
