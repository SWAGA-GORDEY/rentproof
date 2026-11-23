import { accessSync, constants, existsSync, mkdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { migrate } from "@/lib/schema";
import { seed } from "@/lib/seed";
import type { RentproofDb } from "@/lib/sql";

const require = createRequire(import.meta.url);

function openPostgresDatabase(connectionString: string): RentproofDb {
  const runtimePath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "pg-database-runtime.cjs",
  );
  const runtime = require(/*turbopackIgnore: true*/ runtimePath) as {
    openPostgresDatabase: (url: string) => RentproofDb;
  };
  return runtime.openPostgresDatabase(connectionString);
}

let database: RentproofDb | null = null;
let persistenceWarned = false;

/** Render persistent disk mount path — never mkdir this from the app (SQLite mode). */
export const RENDER_DISK_MOUNT = "/data";

/** Canonical SQLite filename on the Render persistent disk. */
export const RENDER_SQLITE_PATH = "/data/rentproof.sqlite";

export type DbDriver = "sqlite" | "postgres";

function persistenceEnforced(): boolean {
  return (
    process.env.RENDER === "true" ||
    process.env.RENTPROOF_REQUIRE_PERSISTENT_DISK === "1"
  );
}

/**
 * Resolve active driver.
 * Default remains **sqlite** so a stray DATABASE_URL never flips Production onto an
 * empty Postgres by accident. Cutover requires an explicit
 * `RENTPROOF_DB_DRIVER=postgres` (plus DATABASE_URL) after verified migration.
 */
export function resolveDbDriver(): DbDriver {
  const explicit = process.env.RENTPROOF_DB_DRIVER?.trim().toLowerCase();
  if (explicit === "postgres" || explicit === "postgresql") return "postgres";
  return "sqlite";
}

export function databaseUrl(): string {
  return process.env.DATABASE_URL?.trim() ?? "";
}

/**
 * Resolve the SQLite file path.
 * - Non-empty `RENTPROOF_DB_PATH` wins (trimmed).
 * - On Render, empty/missing env defaults to `/data/rentproof.sqlite` (never cwd).
 * - Local/dev defaults to `./data/rentproof.sqlite` under cwd.
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
  return normalized === RENDER_SQLITE_PATH || normalized.startsWith(`${RENDER_DISK_MOUNT}/`);
}

export function isRenderDiskMount(dir: string): boolean {
  return path.resolve(dir) === path.resolve(RENDER_DISK_MOUNT);
}

/**
 * On Render (or when explicitly required), SQLite must live on the persistent
 * disk (/data/...). Skipped when using managed Postgres (DATABASE_URL).
 */
export function assertDurableDatabasePath(file = databasePath()): void {
  if (resolveDbDriver() === "postgres") return;
  if (!persistenceEnforced()) return;
  const normalized = path.resolve(file);
  if (isPersistentDiskPath(normalized)) return;
  const message =
    `RENTPROOF_DB_PATH must point at the Render persistent disk (expected ${RENDER_SQLITE_PATH}). ` +
    `Resolved path "${normalized}" would lose accounts on redeploy. ` +
    `Set RENTPROOF_DB_PATH=${RENDER_SQLITE_PATH}, or migrate to Postgres (DATABASE_URL) after a verified copy.`;
  if (process.env.RENTPROOF_ALLOW_EPHEMERAL_DB === "1") {
    if (!persistenceWarned) {
      console.error("db_persistence_warning", { reason: "ephemeral_allowed", path: normalized });
      persistenceWarned = true;
    }
    return;
  }
  throw new Error(message);
}

export function assertPersistentDiskMount(mount = RENDER_DISK_MOUNT): void {
  if (resolveDbDriver() === "postgres") return;
  if (!persistenceEnforced()) return;
  if (!existsSync(mount)) {
    throw new Error(
      `Persistent disk mount "${mount}" is missing. ` +
        `Attach a Render disk with Mount Path ${mount}, or complete a verified migration to Render Postgres ` +
        `(DATABASE_URL + RENTPROOF_DB_DRIVER=postgres). The app will not create ${mount} (that causes EACCES).`,
    );
  }
  let st;
  try {
    st = statSync(mount);
  } catch (err) {
    throw new Error(
      `Persistent disk mount "${mount}" could not be read (${err instanceof Error ? err.message : String(err)}).`,
    );
  }
  if (!st.isDirectory()) {
    throw new Error(`Persistent disk mount "${mount}" exists but is not a directory.`);
  }
  try {
    accessSync(mount, constants.R_OK | constants.X_OK);
  } catch {
    throw new Error(
      `Persistent disk mount "${mount}" is not accessible (need read+execute). ` +
        `Fix Render disk permissions; do not chown the whole disk from the app.`,
    );
  }
}

export function assertExistingProductionDatabase(file = databasePath()): void {
  if (resolveDbDriver() === "postgres") return;
  if (!persistenceEnforced()) return;
  if (process.env.RENTPROOF_ALLOW_CREATE_EMPTY_DB === "1") return;
  if (existsSync(file)) return;
  throw new Error(
    `SQLite file not found at "${path.resolve(/*turbopackIgnore: true*/ file)}". ` +
      `Refusing to create an empty production database. ` +
      `Restore the file on /data, or migrate from a SQLite backup into Postgres before cutover.`,
  );
}

export function assertSqliteFileAccessible(file: string): void {
  if (resolveDbDriver() === "postgres") return;
  if (!existsSync(file)) return;
  try {
    accessSync(file, constants.R_OK | constants.W_OK);
  } catch {
    throw new Error(
      `SQLite at "${path.resolve(/*turbopackIgnore: true*/ file)}" is not readable/writable by the app process.`,
    );
  }
}

export function assertPostgresConfigured(): void {
  if (resolveDbDriver() !== "postgres") return;
  const url = databaseUrl();
  if (!url) {
    throw new Error(
      "RENTPROOF_DB_DRIVER=postgres requires DATABASE_URL (Render Postgres connection string). " +
        "Do not cut over until migrate-sqlite-to-postgres has verified row counts.",
    );
  }
  if (process.env.RENTPROOF_REQUIRE_NONEMPTY_POSTGRES === "1") {
    // Optional post-cutover safety: refuse empty users table (set after first successful migrate).
    // Checked lazily in getDb after open.
  }
}

export function ensureSqliteParentDirectory(file: string): void {
  if (resolveDbDriver() === "postgres") return;
  const dir = path.dirname(path.resolve(file));
  if (isRenderDiskMount(dir)) {
    if (!existsSync(dir)) {
      throw new Error(
        `Persistent disk mount "${dir}" is missing. The app will not create ${dir}.`,
      );
    }
    assertPersistentDiskMount(dir);
    return;
  }
  const mount = path.resolve(RENDER_DISK_MOUNT);
  if (dir.startsWith(`${mount}${path.sep}`)) {
    if (!existsSync(mount)) {
      throw new Error(
        `Persistent disk mount "${mount}" is missing. Cannot create "${dir}".`,
      );
    }
    assertPersistentDiskMount(mount);
    mkdirSync(dir, { recursive: true });
    return;
  }
  mkdirSync(dir, { recursive: true });
}

export function ensureDataSubdirectory(dir: string): void {
  const resolved = path.resolve(dir);
  if (isRenderDiskMount(resolved)) {
    if (!existsSync(resolved)) {
      throw new Error(
        `Persistent disk mount "${resolved}" is missing. The app will not create it.`,
      );
    }
    if (resolveDbDriver() === "sqlite") assertPersistentDiskMount(resolved);
    return;
  }
  const mount = path.resolve(RENDER_DISK_MOUNT);
  if (resolved.startsWith(`${mount}${path.sep}`)) {
    if (!existsSync(mount)) {
      throw new Error(
        `Persistent disk mount "${mount}" is missing. Cannot create "${resolved}". ` +
          `On diskless Render plans use object storage or a writable upload dir, not /data.`,
      );
    }
    if (resolveDbDriver() === "sqlite") assertPersistentDiskMount(mount);
    mkdirSync(resolved, { recursive: true });
    return;
  }
  mkdirSync(resolved, { recursive: true });
}

function wrapSqlite(raw: DatabaseSync): RentproofDb {
  return {
    driver: "sqlite",
    prepare: (sql) => raw.prepare(sql),
    exec: (sql) => raw.exec(sql),
    close: () => raw.close(),
  };
}

function openSqlite(): RentproofDb {
  const file = databasePath();
  assertDurableDatabasePath(file);
  if (isPersistentDiskPath(file) || persistenceEnforced()) {
    assertPersistentDiskMount(RENDER_DISK_MOUNT);
  }
  assertExistingProductionDatabase(file);
  assertSqliteFileAccessible(file);
  ensureSqliteParentDirectory(file);
  return wrapSqlite(new DatabaseSync(file));
}

function openPostgres(): RentproofDb {
  assertPostgresConfigured();
  return openPostgresDatabase(databaseUrl());
}

export function getDb(): RentproofDb {
  if (database) {
    return database;
  }

  const driver = resolveDbDriver();
  const next = driver === "postgres" ? openPostgres() : openSqlite();
  migrate(next);
  if (
    driver === "postgres" &&
    process.env.RENTPROOF_REQUIRE_NONEMPTY_POSTGRES === "1"
  ) {
    const row = next.prepare(`SELECT COUNT(*) AS c FROM users`).get() as { c: number | string };
    const count = Number(row?.c ?? 0);
    if (count < 1) {
      next.close();
      throw new Error(
        "PostgreSQL users table is empty. Refusing to serve production on an empty migrated DB. " +
          "Run migrate-sqlite-to-postgres against a SQLite backup first, then verify counts.",
      );
    }
  }
  database = next;
  // seed() only upserts categories + purges legacy demo listings — never wipes users.
  seed(next);
  return next;
}

export function closeDb(): void {
  database?.close();
  database = null;
}
