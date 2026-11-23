import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { migrate } from "@/lib/schema";
import { seed } from "@/lib/seed";

let database: DatabaseSync | null = null;
let persistenceWarned = false;

/** Canonical SQLite filename on the Render persistent disk. */
export const RENDER_SQLITE_PATH = "/data/rentproof.sqlite";

/**
 * Resolve the SQLite file path.
 * - Non-empty `RENTPROOF_DB_PATH` wins (trimmed).
 * - On Render, empty/missing env defaults to `/data/rentproof.sqlite` (never cwd).
 * - Local/dev defaults to `./data/rentproof.sqlite` under cwd.
 *
 * Important: empty-string env must not win over the Render default (`??` alone
 * treats "" as set and previously resolved to an ephemeral `/app/data/...` path).
 */
export function databasePath(): string {
  const configured = process.env.RENTPROOF_DB_PATH?.trim();
  if (configured) {
    return configured;
  }
  if (process.env.RENDER === "true") {
    return RENDER_SQLITE_PATH;
  }
  return path.join(process.cwd(), "data", "rentproof.sqlite");
}

export function isPersistentDiskPath(file: string): boolean {
  const normalized = path.resolve(file);
  return normalized === RENDER_SQLITE_PATH || normalized.startsWith("/data/");
}

/**
 * On Render (or when explicitly required), SQLite must live on the persistent
 * disk (/data/...). Ephemeral container FS loses accounts on every redeploy.
 * Local `next build` / tests are not blocked. Never wipes or migrates data.
 */
export function assertDurableDatabasePath(file = databasePath()): void {
  const enforce =
    process.env.RENDER === "true" ||
    process.env.RENTPROOF_REQUIRE_PERSISTENT_DISK === "1";
  if (!enforce) return;
  const normalized = path.resolve(file);
  if (isPersistentDiskPath(normalized)) return;
  const message =
    `RENTPROOF_DB_PATH must point at the Render persistent disk (expected ${RENDER_SQLITE_PATH}). ` +
    `Resolved path "${normalized}" would lose accounts on redeploy. ` +
    `Set RENTPROOF_DB_PATH=${RENDER_SQLITE_PATH} in Render Environment (do not leave it blank).`;
  if (process.env.RENTPROOF_ALLOW_EPHEMERAL_DB === "1") {
    if (!persistenceWarned) {
      console.error("db_persistence_warning", { reason: "ephemeral_allowed", path: normalized });
      persistenceWarned = true;
    }
    return;
  }
  throw new Error(message);
}

/**
 * On Render, refuse to invent an empty production DB if the persistent file is missing.
 * Local/dev may create the file (first run).
 */
export function assertExistingProductionDatabase(file = databasePath()): void {
  const enforce =
    process.env.RENDER === "true" ||
    process.env.RENTPROOF_REQUIRE_PERSISTENT_DISK === "1";
  if (!enforce) return;
  if (process.env.RENTPROOF_ALLOW_CREATE_EMPTY_DB === "1") return;
  if (existsSync(file)) return;
  throw new Error(
    `SQLite file not found at "${path.resolve(file)}". ` +
      `Refusing to create an empty production database (would look like lost accounts). ` +
      `Restore the file on the /data disk or set RENTPROOF_ALLOW_CREATE_EMPTY_DB=1 only for intentional bootstrap.`,
  );
}

export function getDb(): DatabaseSync {
  if (database) {
    return database;
  }

  const file = databasePath();
  assertDurableDatabasePath(file);
  assertExistingProductionDatabase(file);
  mkdirSync(path.dirname(file), { recursive: true });
  const next = new DatabaseSync(file);
  migrate(next);
  database = next;
  // seed() only upserts categories + purges legacy demo listings — never wipes users.
  seed(next);
  return next;
}

export function closeDb(): void {
  database?.close();
  database = null;
}
