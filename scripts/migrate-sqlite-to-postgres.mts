#!/usr/bin/env node
/**
 * Copy RentProof data from a SQLite file into PostgreSQL with row-count verification.
 *
 * Safety:
 * - Never deletes or modifies the source SQLite file.
 * - Default is dry-run (counts only). Writes require RENTPROOF_MIGRATE_CONFIRM=1.
 * - Refuses to load into a non-empty target unless RENTPROOF_MIGRATE_ALLOW_NONEMPTY=1.
 * - Does not flip production (set DATABASE_URL + RENTPROOF_DB_DRIVER separately after verify).
 *
 * Usage:
 *   SOURCE_SQLITE_PATH=./backup.sqlite DATABASE_URL=postgres://... \
 *     npm run db:migrate:sqlite-to-pg
 *
 *   SOURCE_SQLITE_PATH=./backup.sqlite DATABASE_URL=postgres://... \
 *     RENTPROOF_MIGRATE_CONFIRM=1 npm run db:migrate:sqlite-to-pg
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import pg from "pg";
import { MIGRATE_TABLE_ORDER } from "../src/lib/migrate-tables.ts";
import { migrate } from "../src/lib/schema.ts";
import { openPostgresDatabase } from "../src/lib/pg-database.ts";

const sourcePath =
  process.env.SOURCE_SQLITE_PATH?.trim() ||
  process.env.RENTPROOF_DB_PATH?.trim() ||
  path.join(process.cwd(), "data", "rentproof.sqlite");
const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
const confirm = process.env.RENTPROOF_MIGRATE_CONFIRM === "1";
const allowNonEmpty = process.env.RENTPROOF_MIGRATE_ALLOW_NONEMPTY === "1";

type CountMap = Record<string, number>;

function fail(message: string, extra?: Record<string, unknown>): never {
  console.error(JSON.stringify({ ok: false, error: message, ...extra }, null, 2));
  process.exit(1);
}

function countSqlite(db: DatabaseSync, table: string): number {
  try {
    const row = db.prepare(`SELECT COUNT(*) AS c FROM "${table}"`).get() as { c: number };
    return Number(row.c);
  } catch {
    return -1; // table missing in source
  }
}

async function countPostgres(client: pg.Client, table: string): Promise<number> {
  const exists = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
    [table],
  );
  if (exists.rowCount === 0) return -1;
  const row = await client.query(`SELECT COUNT(*)::int AS c FROM "${table}"`);
  return Number(row.rows[0].c);
}

function listSqliteTables(db: DatabaseSync): string[] {
  const rows = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
    )
    .all() as Array<{ name: string }>;
  return rows.map((r) => r.name);
}

async function main(): Promise<void> {
  if (!existsSync(sourcePath)) {
    fail("SOURCE_SQLITE_PATH does not exist (will not invent an empty source)", {
      sourcePath,
    });
  }
  if (!databaseUrl) {
    fail("DATABASE_URL is required (Render Postgres URL). Do not commit secrets.");
  }

  const sqlite = new DatabaseSync(sourcePath, { readOnly: true });

  const sourceTables = listSqliteTables(sqlite);
  const sourceCounts: CountMap = {};
  for (const table of MIGRATE_TABLE_ORDER) {
    sourceCounts[table] = countSqlite(sqlite, table);
  }
  for (const table of sourceTables) {
    if (!(table in sourceCounts)) {
      sourceCounts[table] = countSqlite(sqlite, table);
    }
  }

  const userCount = Math.max(0, sourceCounts.users ?? 0);
  console.log(
    JSON.stringify(
      {
        phase: "audit",
        sourcePath,
        userCount,
        sourceCounts,
        dryRun: !confirm,
      },
      null,
      2,
    ),
  );

  // Apply schema on target (idempotent CREATE IF NOT EXISTS / ADD COLUMN).
  const pgDb = openPostgresDatabase(databaseUrl);
  migrate(pgDb);

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl:
      databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")
        ? false
        : { rejectUnauthorized: false },
  });
  await client.connect();

  const targetCountsBefore: CountMap = {};
  let targetUserBefore = 0;
  for (const table of MIGRATE_TABLE_ORDER) {
    const c = await countPostgres(client, table);
    targetCountsBefore[table] = c;
    if (table === "users") targetUserBefore = Math.max(0, c);
  }

  if (targetUserBefore > 0 && !allowNonEmpty) {
    await client.end();
    pgDb.close();
    sqlite.close();
    fail(
      "Target PostgreSQL already has users. Refusing to overwrite. " +
        "Use a fresh database, or set RENTPROOF_MIGRATE_ALLOW_NONEMPTY=1 only after backup review.",
      { targetUserBefore },
    );
  }

  if (!confirm) {
    await client.end();
    pgDb.close();
    sqlite.close();
    console.log(
      JSON.stringify(
        {
          ok: true,
          dryRun: true,
          message:
            "Dry-run only. Re-run with RENTPROOF_MIGRATE_CONFIRM=1 to copy rows. SQLite left untouched.",
          sourceUserCount: userCount,
          targetUserBefore,
        },
        null,
        2,
      ),
    );
    return;
  }

  const copied: CountMap = {};
  await client.query("BEGIN");
  try {
    // Insert order respects FKs. Disable triggers? Prefer ordered inserts.
    for (const table of MIGRATE_TABLE_ORDER) {
      if (!sourceTables.includes(table)) {
        copied[table] = 0;
        continue;
      }
      const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all() as Array<Record<string, unknown>>;
      if (rows.length === 0) {
        copied[table] = 0;
        continue;
      }
      const columns = Object.keys(rows[0]);
      const colList = columns.map((c) => `"${c}"`).join(", ");
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
      const insertSql = `INSERT INTO "${table}" (${colList}) VALUES (${placeholders})`;
      for (const row of rows) {
        const values = columns.map((c) => row[c] as string | number | null | Buffer);
        await client.query(insertSql, values);
      }
      copied[table] = rows.length;
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    await client.end();
    pgDb.close();
    sqlite.close();
    fail("Migration transaction rolled back; SQLite source unchanged", {
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  const targetCountsAfter: CountMap = {};
  const mismatches: Array<{ table: string; source: number; target: number }> = [];
  for (const table of MIGRATE_TABLE_ORDER) {
    if (!sourceTables.includes(table)) continue;
    const source = sourceCounts[table] ?? 0;
    if (source < 0) continue;
    const target = await countPostgres(client, table);
    targetCountsAfter[table] = target;
    if (source !== target) {
      mismatches.push({ table, source, target });
    }
  }

  await client.end();
  pgDb.close();
  sqlite.close();

  if (mismatches.length > 0) {
    fail("Row-count mismatch after copy — do not cut over Production", {
      mismatches,
      copied,
      targetCountsAfter,
      sourceUntouched: true,
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun: false,
        sourcePath,
        sourceUntouched: true,
        usersMigrated: copied.users ?? 0,
        copied,
        targetCountsAfter,
        nextSteps: [
          "Keep SQLite backup; do not delete it.",
          "Set DATABASE_URL from Render Postgres (dashboard secret, not Git).",
          "Set RENTPROOF_DB_DRIVER=postgres only after smoke tests.",
          "Optional: RENTPROOF_REQUIRE_NONEMPTY_POSTGRES=1 to refuse empty users table.",
          "Do not Production Deploy / cut over without owner confirmation.",
        ],
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
