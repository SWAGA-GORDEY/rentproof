import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

let database: DatabaseSync | null = null;

export function databasePath(): string {
  return process.env.RENTPROOF_DB_PATH ?? path.join(process.cwd(), "data", "rentproof.sqlite");
}

export function getDb(): DatabaseSync {
  if (database) {
    return database;
  }

  const file = databasePath();
  mkdirSync(path.dirname(file), { recursive: true });
  const next = new DatabaseSync(file);
  next.exec("PRAGMA journal_mode = WAL;");
  next.exec("PRAGMA foreign_keys = ON;");
  next.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('landlord', 'tenant')),
      phone TEXT,
      city TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS sessions_expires_at ON sessions(expires_at);

    CREATE TABLE IF NOT EXISTS login_attempts (
      email TEXT NOT NULL,
      attempted_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS login_attempts_email_time
      ON login_attempts(email, attempted_at);
  `);
  database = next;
  return next;
}

export function closeDb(): void {
  database?.close();
  database = null;
}
