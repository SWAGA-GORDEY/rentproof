#!/usr/bin/env node
/**
 * Audit a SQLite candidate without printing emails or password hashes.
 *
 *   SOURCE_SQLITE_PATH=/path/to/file.sqlite npm run db:audit-sqlite
 */
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const sourcePath =
  process.env.SOURCE_SQLITE_PATH?.trim() ||
  process.env.RENTPROOF_DB_PATH?.trim() ||
  path.join(process.cwd(), "data", "rentproof.sqlite");

if (!existsSync(sourcePath)) {
  console.log(JSON.stringify({ ok: false, error: "missing_file", sourcePath }, null, 2));
  process.exit(1);
}

const st = statSync(sourcePath);
const db = new DatabaseSync(sourcePath, { readOnly: true });
const tables = db
  .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`)
  .all() as Array<{ name: string }>;

function count(table: string): number {
  try {
    return Number((db.prepare(`SELECT COUNT(*) AS c FROM "${table}"`).get() as { c: number }).c);
  } catch {
    return -1;
  }
}

const counts: Record<string, number> = {};
for (const key of [
  "users",
  "subscriptions",
  "listings",
  "sessions",
  "payments",
  "bookings",
  "categories",
  "rental_orders",
]) {
  counts[key] = count(key);
}

let integrity: unknown = null;
try {
  integrity = Object.values(db.prepare("PRAGMA integrity_check").get() as object)[0];
} catch (err) {
  integrity = err instanceof Error ? err.message : String(err);
}

const emailDomains =
  counts.users > 0
    ? (
        db
          .prepare(
            `SELECT lower(substr(email, instr(email, '@') + 1)) AS domain, COUNT(*) AS c
             FROM users GROUP BY domain ORDER BY c DESC`,
          )
          .all() as Array<{ domain: string; c: number }>
      ).map((row) => ({ domain: row.domain, count: Number(row.c) }))
    : [];

const likelyTestUsers =
  counts.users > 0
    ? Number(
        (
          db
            .prepare(
              `SELECT COUNT(*) AS c FROM users
               WHERE email LIKE '%@example.test'
                  OR email LIKE '%@example.com'
                  OR email LIKE '%@rentproof.invalid'
                  OR email LIKE '%@test.com'`,
            )
            .get() as { c: number }
        ).c,
      )
    : 0;

const planCounts =
  counts.users > 0
    ? (
        db.prepare(`SELECT COALESCE(plan, '(null)') AS plan, COUNT(*) AS c FROM users GROUP BY plan`).all() as Array<{
          plan: string;
          c: number;
        }>
      ).map((row) => ({ plan: row.plan, count: Number(row.c) }))
    : [];

db.close();

const nonTestDomains = emailDomains.filter(
  (d) => !["example.test", "example.com", "rentproof.invalid", "test.com", "localhost"].includes(d.domain),
);

// Heuristic only — owner must still confirm provenance. Tiny owner-check
// fixtures with a single real-looking domain are NOT treated as Production.
const likelyProduction =
  integrity === "ok" &&
  counts.users >= 5 &&
  likelyTestUsers < counts.users &&
  nonTestDomains.length > 0 &&
  (counts.listings > 0 || counts.subscriptions > 0 || counts.payments > 0);

console.log(
  JSON.stringify(
    {
      ok: integrity === "ok",
      sourcePath,
      bytes: st.size,
      format: "sqlite3",
      integrity,
      tableCount: tables.length,
      hasUsersTable: tables.some((t) => t.name === "users"),
      counts,
      emailDomains,
      nonTestDomainCount: nonTestDomains.length,
      likelyTestUsers,
      planCounts,
      likelyProductionBackup: likelyProduction,
      note: "Emails and password hashes intentionally omitted.",
    },
    null,
    2,
  ),
);

process.exit(likelyProduction ? 0 : integrity === "ok" ? 2 : 1);
