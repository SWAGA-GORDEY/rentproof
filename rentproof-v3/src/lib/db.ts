import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Pool } from "pg";

type SqlValue = string | number | null | Uint8Array;
type Row = Record<string, string | number | null>;

const schema = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('tenant','owner','admin')),
    email_verified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS email_verifications (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL, salt TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS login_attempts (
    email TEXT PRIMARY KEY, window_start TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL, category TEXT NOT NULL, city TEXT NOT NULL,
    description TEXT NOT NULL, price_per_day INTEGER NOT NULL CHECK(price_per_day > 0),
    deposit INTEGER NOT NULL DEFAULT 0 CHECK(deposit >= 0), status TEXT NOT NULL DEFAULT 'pending'
      CHECK(status IN ('pending','published','hidden')), created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY, listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    renter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date TEXT NOT NULL, end_date TEXT NOT NULL, days INTEGER NOT NULL,
    total_price INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending'
      CHECK(status IN ('pending','confirmed','rejected','cancelled','completed')),
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ai_usage (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, day TEXT NOT NULL,
    requests INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(user_id,day)
  )`,
  `CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY, actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, subject_id TEXT, created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS listings_status_created ON listings(status, created_at)`,
  `CREATE INDEX IF NOT EXISTS bookings_renter_created ON bookings(renter_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS bookings_listing_dates ON bookings(listing_id, start_date, end_date)`,
];

let sqlite: DatabaseSync | null = null;
let pgPool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

function driver(): "sqlite" | "postgres" {
  if (process.env.DATABASE_URL?.trim()) return "postgres";
  if (process.env.RENDER === "true" || (process.env.NODE_ENV === "production" && process.env.RENTPROOF_ALLOW_SQLITE_PRODUCTION !== "1")) {
    throw new Error("DATABASE_URL is required in production. Configure PostgreSQL before deployment.");
  }
  return "sqlite";
}

function sqliteDb(): DatabaseSync {
  if (sqlite) return sqlite;
  const filename = process.env.RENTPROOF_DB_PATH?.trim() || path.join(process.cwd(), "data", "rentproof-v3.sqlite");
  mkdirSync(path.dirname(filename), { recursive: true });
  sqlite = new DatabaseSync(filename);
  sqlite.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  return sqlite;
}

function postgresPool(): Pool {
  if (!pgPool) {
    const connectionString = process.env.DATABASE_URL?.trim();
    if (!connectionString) throw new Error("DATABASE_URL is required.");
    pgPool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 10_000 });
  }
  return pgPool;
}

async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      if (driver() === "sqlite") {
        const db = sqliteDb();
        for (const statement of schema) db.exec(statement);
      } else {
        const pool = postgresPool();
        for (const statement of schema) await pool.query(statement);
      }
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

function sqliteSql(sql: string): string {
  return sql.replace(/\$\d+/g, "?");
}

export async function rows<T extends Row = Row>(sql: string, params: SqlValue[] = []): Promise<T[]> {
  await ensureSchema();
  if (driver() === "postgres") {
    const result = await postgresPool().query(sql, params);
    return result.rows as T[];
  }
  return sqliteDb().prepare(sqliteSql(sql)).all(...params) as T[];
}

export async function row<T extends Row = Row>(sql: string, params: SqlValue[] = []): Promise<T | null> {
  const result = await rows<T>(sql, params);
  return result[0] ?? null;
}

export async function execute(sql: string, params: SqlValue[] = []): Promise<number> {
  await ensureSchema();
  if (driver() === "postgres") {
    const result = await postgresPool().query(sql, params);
    return result.rowCount ?? 0;
  }
  return Number(sqliteDb().prepare(sqliteSql(sql)).run(...params).changes);
}

export async function pingDatabase(): Promise<void> {
  await row("SELECT 1 AS ok");
}

export function databaseDriver(): "sqlite" | "postgres" {
  return driver();
}
