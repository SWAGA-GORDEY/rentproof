import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { migrate } from "@/lib/schema";
import { seed } from "@/lib/seed";

let database: DatabaseSync | null = null;
let persistenceWarned = false;

export function databasePath(): string {
  return process.env.RENTPROOF_DB_PATH ?? path.join(process.cwd(), "data", "rentproof.sqlite");
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
  const onPersistentDisk = normalized === "/data/rentproof.sqlite" || normalized.startsWith(`${path.sep}data${path.sep}`) || normalized.startsWith("/data/");
  if (onPersistentDisk) return;
  const message =
    `RENTPROOF_DB_PATH must point at the Render persistent disk (expected /data/...). ` +
    `Current path would lose accounts on redeploy.`;
  if (process.env.RENTPROOF_ALLOW_EPHEMERAL_DB === "1") {
    if (!persistenceWarned) {
      console.error("db_persistence_warning", { reason: "ephemeral_allowed" });
      persistenceWarned = true;
    }
    return;
  }
  throw new Error(message);
}

export function getDb(): DatabaseSync {
  if (database) {
    return database;
  }

  const file = databasePath();
  assertDurableDatabasePath(file);
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
