#!/usr/bin/env node
/**
 * Compare table counts between a SQLite file and DATABASE_URL Postgres.
 * Read-only. Never deletes either database.
 *
 *   SOURCE_SQLITE_PATH=./backup.sqlite DATABASE_URL=postgres://... npm run db:verify-counts
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import pg from "pg";
import { MIGRATE_TABLE_ORDER } from "../src/lib/migrate-tables.ts";

const sourcePath =
  process.env.SOURCE_SQLITE_PATH?.trim() ||
  process.env.RENTPROOF_DB_PATH?.trim() ||
  path.join(process.cwd(), "data", "rentproof.sqlite");
const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

if (!existsSync(sourcePath)) {
  console.error(JSON.stringify({ ok: false, error: "missing_sqlite", sourcePath }));
  process.exit(1);
}
if (!databaseUrl) {
  console.error(JSON.stringify({ ok: false, error: "missing_DATABASE_URL" }));
  process.exit(1);
}

const sqlite = new DatabaseSync(sourcePath, { readOnly: true });
const client = new pg.Client({
  connectionString: databaseUrl,
  ssl:
    databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")
      ? false
      : { rejectUnauthorized: false },
});
await client.connect();

const comparisons: Array<{ table: string; sqlite: number; postgres: number; match: boolean }> = [];
for (const table of MIGRATE_TABLE_ORDER) {
  let sqliteCount = -1;
  try {
    sqliteCount = Number(
      (sqlite.prepare(`SELECT COUNT(*) AS c FROM "${table}"`).get() as { c: number }).c,
    );
  } catch {
    sqliteCount = -1;
  }
  let pgCount = -1;
  try {
    const exists = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
      [table],
    );
    if ((exists.rowCount ?? 0) > 0) {
      pgCount = Number((await client.query(`SELECT COUNT(*)::int AS c FROM "${table}"`)).rows[0].c);
    }
  } catch {
    pgCount = -1;
  }
  if (sqliteCount < 0 && pgCount < 0) continue;
  comparisons.push({
    table,
    sqlite: Math.max(0, sqliteCount),
    postgres: Math.max(0, pgCount),
    match: sqliteCount === pgCount,
  });
}

await client.end();
sqlite.close();

const mismatches = comparisons.filter((c) => !c.match);
const users = comparisons.find((c) => c.table === "users");
console.log(
  JSON.stringify(
    {
      ok: mismatches.length === 0,
      sourcePath,
      users,
      mismatches,
      comparisons,
    },
    null,
    2,
  ),
);
process.exit(mismatches.length === 0 ? 0 : 2);
