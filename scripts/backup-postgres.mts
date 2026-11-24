#!/usr/bin/env node
/**
 * Logical backup of PostgreSQL via pg_dump (when available) or JSON table export.
 * Never prints connection secrets. Does not delete source data.
 *
 *   DATABASE_URL=postgres://… npm run db:backup:pg
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import pg from "pg";
import { MIGRATE_TABLE_ORDER } from "../src/lib/migrate-tables.ts";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
const backupDir =
  process.env.RENTPROOF_BACKUP_DIR?.trim() || path.join(process.cwd(), "data", "backups");

if (!databaseUrl) {
  console.error(JSON.stringify({ ok: false, error: "DATABASE_URL required" }));
  process.exit(1);
}

mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dumpPath = path.join(backupDir, `rentproof-${stamp}.pg.dump`);
const jsonPath = path.join(backupDir, `rentproof-${stamp}.tables.json`);

const pgDump = spawnSync("pg_dump", ["--no-owner", "--format=custom", "--file", dumpPath, databaseUrl], {
  encoding: "utf8",
});

if (pgDump.status === 0 && existsSync(dumpPath)) {
  console.log(JSON.stringify({ ok: true, method: "pg_dump", dest: dumpPath }));
  process.exit(0);
}

// Fallback: JSON row export (portable, no pg_dump binary required).
const client = new pg.Client({
  connectionString: databaseUrl,
  ssl:
    databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")
      ? false
      : { rejectUnauthorized: false },
});
await client.connect();
const payload: Record<string, unknown[]> = {};
for (const table of MIGRATE_TABLE_ORDER) {
  try {
    const res = await client.query(`SELECT * FROM "${table}"`);
    payload[table] = res.rows;
  } catch {
    payload[table] = [];
  }
}
await client.end();
writeFileSync(jsonPath, JSON.stringify({ exportedAt: new Date().toISOString(), tables: payload }));
console.log(
  JSON.stringify({
    ok: true,
    method: "json_export",
    dest: jsonPath,
    pgDumpNote: pgDump.error?.message || pgDump.stderr || "pg_dump unavailable; used JSON fallback",
  }),
);
