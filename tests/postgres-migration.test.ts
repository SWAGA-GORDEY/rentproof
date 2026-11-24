import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { migrate } from "@/lib/schema";
import { seed } from "@/lib/seed";
import { resolveDbDriver, closeDb } from "@/lib/db";
import { openPostgresDatabase } from "@/lib/pg-database";
import { MIGRATE_TABLE_ORDER } from "@/lib/migrate-tables";
import { sqlitePlaceholdersToPostgres } from "@/lib/sql";
import type { RentproofDb } from "@/lib/sql";

function wrapSqlite(raw: DatabaseSync): RentproofDb {
  return {
    driver: "sqlite",
    prepare: (sql) => raw.prepare(sql),
    exec: (sql) => raw.exec(sql),
    close: () => raw.close(),
  };
}

describe("postgres migration prep", () => {
  it("maps sqlite placeholders without touching quoted question marks", () => {
    assert.equal(sqlitePlaceholdersToPostgres("SELECT * FROM t WHERE a = ? AND b = ?"), "SELECT * FROM t WHERE a = $1 AND b = $2");
    assert.equal(sqlitePlaceholdersToPostgres("SELECT '?' AS q WHERE id = ?"), "SELECT '?' AS q WHERE id = $1");
  });

  it("defaults to sqlite; postgres only when RENTPROOF_DB_DRIVER is explicit", () => {
    const prevDriver = process.env.RENTPROOF_DB_DRIVER;
    const prevUrl = process.env.DATABASE_URL;
    delete process.env.RENTPROOF_DB_DRIVER;
    process.env.DATABASE_URL = "postgres://example/db";
    assert.equal(resolveDbDriver(), "sqlite");
    process.env.RENTPROOF_DB_DRIVER = "postgres";
    assert.equal(resolveDbDriver(), "postgres");
    process.env.RENTPROOF_DB_DRIVER = "sqlite";
    assert.equal(resolveDbDriver(), "sqlite");
    if (prevDriver === undefined) delete process.env.RENTPROOF_DB_DRIVER;
    else process.env.RENTPROOF_DB_DRIVER = prevDriver;
    if (prevUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prevUrl;
  });

  it("copies fixture users into local Postgres with matching counts", { skip: !process.env.RENTPROOF_TEST_DATABASE_URL?.trim() }, async () => {
    const databaseUrl = process.env.RENTPROOF_TEST_DATABASE_URL!.trim();

    const dir = mkdtempSync(path.join(tmpdir(), "rp-mig-"));
    const sqlitePath = path.join(dir, "source.sqlite");
    const raw = new DatabaseSync(sqlitePath);
    const sqlite = wrapSqlite(raw);
    migrate(sqlite);
    seed(sqlite);

    const now = new Date().toISOString();
    sqlite
      .prepare(
        `INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at, plan, email_verified)
         VALUES (?, ?, ?, ?, 'landlord', ?, ?, 'plus', 1)`,
      )
      .run("user-1", "old@example.com", "$2b$10$abcdefghijklmnopqrstuv", "Old User", now, now);
    sqlite
      .prepare(
        `INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at, plan, email_verified)
         VALUES (?, ?, ?, ?, 'tenant', ?, ?, 'free', 1)`,
      )
      .run("user-2", "tenant@example.com", "$2b$10$abcdefghijklmnopqrstuv", "Tenant", now, now);
    sqlite
      .prepare(
        `INSERT INTO subscriptions (id, user_id, plan, mode, created_at, status, source_kind)
         VALUES (?, ?, 'plus', 'monthly', ?, 'active', 'paid')`,
      )
      .run("sub-1", "user-1", now);

    const sourceUsers = Number(
      (sqlite.prepare(`SELECT COUNT(*) AS c FROM users`).get() as { c: number }).c,
    );
    assert.equal(sourceUsers, 2);

    // Reset target schema for a clean copy (do not seed — copy categories from SQLite).
    const pg = openPostgresDatabase(databaseUrl);
    pg.exec(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO rentproof;
      GRANT ALL ON SCHEMA public TO public;
    `);
    migrate(pg);

    // Inline copy (same algorithm as migrate script) for the fixture tables we care about.
    const tables = ["users", "categories", "subscriptions"] as const;
    for (const table of tables) {
      const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all() as Array<Record<string, unknown>>;
      if (rows.length === 0) continue;
      const columns = Object.keys(rows[0]);
      const colList = columns.map((c) => `"${c}"`).join(", ");
      const placeholders = columns.map(() => "?").join(", ");
      const stmt = pg.prepare(`INSERT INTO "${table}" (${colList}) VALUES (${placeholders})`);
      for (const row of rows) {
        stmt.run(...columns.map((c) => row[c] as string | number | null));
      }
    }

    const pgUsers = Number((pg.prepare(`SELECT COUNT(*) AS c FROM users`).get() as { c: number | string }).c);
    const pgSubs = Number(
      (pg.prepare(`SELECT COUNT(*) AS c FROM subscriptions`).get() as { c: number | string }).c,
    );
    const oldUser = pg.prepare(`SELECT id, email, password_hash, plan FROM users WHERE email = ?`).get(
      "old@example.com",
    ) as { id: string; email: string; password_hash: string; plan: string };

    assert.equal(pgUsers, 2);
    assert.equal(pgSubs, 1);
    assert.equal(oldUser.id, "user-1");
    assert.equal(oldUser.password_hash, "$2b$10$abcdefghijklmnopqrstuv");
    assert.equal(oldUser.plan, "plus");
    assert.ok(MIGRATE_TABLE_ORDER.includes("users"));

    pg.close();
    sqlite.close();
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  });
});
