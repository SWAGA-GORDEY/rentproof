import { accessSync, constants, existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { migrate } from "@/lib/schema";
import { seed } from "@/lib/seed";

let database: DatabaseSync | null = null;
let persistenceWarned = false;

/** Render persistent disk mount path — never mkdir this from the app. */
export const RENDER_DISK_MOUNT = "/data";

/** Canonical SQLite filename on the Render persistent disk. */
export const RENDER_SQLITE_PATH = "/data/rentproof.sqlite";

function persistenceEnforced(): boolean {
  return (
    process.env.RENDER === "true" ||
    process.env.RENTPROOF_REQUIRE_PERSISTENT_DISK === "1"
  );
}

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
  return normalized === RENDER_SQLITE_PATH || normalized.startsWith(`${RENDER_DISK_MOUNT}/`);
}

export function isRenderDiskMount(dir: string): boolean {
  return path.resolve(dir) === path.resolve(RENDER_DISK_MOUNT);
}

/**
 * On Render (or when explicitly required), SQLite must live on the persistent
 * disk (/data/...). Ephemeral container FS loses accounts on every redeploy.
 * Local `next build` / tests are not blocked. Never wipes or migrates data.
 */
export function assertDurableDatabasePath(file = databasePath()): void {
  if (!persistenceEnforced()) return;
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
 * Verify the Render disk mount exists and is usable.
 * Never creates `/data` — the platform must mount it.
 */
export function assertPersistentDiskMount(mount = RENDER_DISK_MOUNT): void {
  if (!persistenceEnforced()) return;
  if (!existsSync(mount)) {
    throw new Error(
      `Persistent disk mount "${mount}" is missing. ` +
        `Attach a Render disk to this service with Mount Path ${mount}. ` +
        `The app will not create ${mount} (that causes EACCES).`,
    );
  }
  let st;
  try {
    st = statSync(mount);
  } catch (err) {
    throw new Error(
      `Persistent disk mount "${mount}" could not be read (${err instanceof Error ? err.message : String(err)}). ` +
        `Check the Render disk is attached at ${mount}.`,
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
        `Fix the Render disk mount/permissions; do not chown the whole disk from the app.`,
    );
  }
}

/**
 * On Render, refuse to invent an empty production DB if the persistent file is missing.
 * Local/dev may create the file (first run).
 */
export function assertExistingProductionDatabase(file = databasePath()): void {
  if (!persistenceEnforced()) return;
  if (process.env.RENTPROOF_ALLOW_CREATE_EMPTY_DB === "1") return;
  if (existsSync(file)) return;
  throw new Error(
    `SQLite file not found at "${path.resolve(file)}". ` +
      `Refusing to create an empty production database (would look like lost accounts). ` +
      `Restore the file on the /data disk or set RENTPROOF_ALLOW_CREATE_EMPTY_DB=1 only for intentional bootstrap.`,
  );
}

/** Confirm an existing SQLite file is readable/writable without modifying it. */
export function assertSqliteFileAccessible(file: string): void {
  if (!existsSync(file)) return;
  try {
    accessSync(file, constants.R_OK | constants.W_OK);
  } catch {
    throw new Error(
      `SQLite at "${path.resolve(file)}" is not readable/writable by the app process. ` +
        `Check ownership/permissions on the Render disk file (do not delete or recreate it).`,
    );
  }
}

/**
 * Ensure the SQLite parent directory exists when appropriate.
 * Never mkdir the Render mount point `/data` itself (EACCES on Render).
 * Only creates subdirectories under `/data` after the mount is verified,
 * or local `./data` for development.
 */
export function ensureSqliteParentDirectory(file: string): void {
  const dir = path.dirname(path.resolve(file));
  if (isRenderDiskMount(dir)) {
    // Mount must already exist — never mkdir('/data').
    if (!existsSync(dir)) {
      throw new Error(
        `Persistent disk mount "${dir}" is missing. ` +
          `Attach a Render disk with Mount Path ${dir}. The app will not create ${dir}.`,
      );
    }
    assertPersistentDiskMount(dir);
    return;
  }
  const mount = path.resolve(RENDER_DISK_MOUNT);
  if (dir.startsWith(`${mount}${path.sep}`)) {
    if (!existsSync(mount)) {
      throw new Error(
        `Persistent disk mount "${mount}" is missing. Cannot create "${dir}". ` +
          `Attach a Render disk with Mount Path ${mount}; do not mkdir ${mount} from the app.`,
      );
    }
    assertPersistentDiskMount(mount);
    mkdirSync(dir, { recursive: true });
    return;
  }
  mkdirSync(dir, { recursive: true });
}

/**
 * Ensure an upload directory under the persistent disk (or local data/).
 * Never mkdir `/data` itself; create only nested dirs like `/data/uploads`.
 */
export function ensureDataSubdirectory(dir: string): void {
  const resolved = path.resolve(dir);
  if (isRenderDiskMount(resolved)) {
    if (!existsSync(resolved)) {
      throw new Error(
        `Persistent disk mount "${resolved}" is missing. The app will not create it.`,
      );
    }
    assertPersistentDiskMount(resolved);
    return;
  }
  const mount = path.resolve(RENDER_DISK_MOUNT);
  if (resolved.startsWith(`${mount}${path.sep}`)) {
    if (!existsSync(mount)) {
      throw new Error(
        `Persistent disk mount "${mount}" is missing. Cannot create "${resolved}".`,
      );
    }
    assertPersistentDiskMount(mount);
    mkdirSync(resolved, { recursive: true });
    return;
  }
  mkdirSync(resolved, { recursive: true });
}

export function getDb(): DatabaseSync {
  if (database) {
    return database;
  }

  const file = databasePath();
  assertDurableDatabasePath(file);
  if (isPersistentDiskPath(file) || persistenceEnforced()) {
    assertPersistentDiskMount(RENDER_DISK_MOUNT);
  }
  assertExistingProductionDatabase(file);
  assertSqliteFileAccessible(file);
  ensureSqliteParentDirectory(file);
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
