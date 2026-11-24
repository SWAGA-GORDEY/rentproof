import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { closeDb, getDb, resolveDbDriver } from "@/lib/db";
import { authenticateUser, registerUser } from "@/lib/users";
import { ensureOwnerFromEnv } from "@/lib/owner";
import { loadStaffProfile } from "@/lib/rbac";
import { postLoginPath, OWNER_HOME } from "@/lib/staff-access";
import { dccDashboard } from "@/lib/dcc";

const databaseUrl =
  process.env.RENTPROOF_TEST_DATABASE_URL?.trim() ||
  "postgres://rentproof:rentproof_test@127.0.0.1:5432/rentproof_test";
const password = "Health-smoke-42!";

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

function withPostgres(): boolean {
  const prevDriver = process.env.RENTPROOF_DB_DRIVER;
  const prevUrl = process.env.DATABASE_URL;
  try {
    process.env.RENTPROOF_DB_DRIVER = "postgres";
    process.env.DATABASE_URL = databaseUrl;
    closeDb();
    getDb().prepare("SELECT 1 AS ok").get();
    return true;
  } catch {
    if (prevDriver === undefined) delete process.env.RENTPROOF_DB_DRIVER;
    else process.env.RENTPROOF_DB_DRIVER = prevDriver;
    if (prevUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prevUrl;
    closeDb();
    return false;
  }
}

const canRun = withPostgres();

describe("postgres health + auth smoke", { skip: !canRun }, () => {
  const prevDriver = process.env.RENTPROOF_DB_DRIVER;
  const prevUrl = process.env.DATABASE_URL;
  const prevOwner = process.env.OWNER_EMAIL;

  it("register, login, OWNER bind, dashboard on Postgres", async () => {
    process.env.RENTPROOF_DB_DRIVER = "postgres";
    process.env.DATABASE_URL = databaseUrl;
    closeDb();
    assert.equal(resolveDbDriver(), "postgres");

    const row = getDb().prepare("SELECT 1 AS ok").get() as { ok: number | string };
    assert.equal(Number(row.ok), 1);

    const email = uniqueEmail("smoke-owner");
    const user = await registerUser({
      name: "Smoke Owner",
      email,
      password,
      role: "landlord",
    });
    getDb().prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`).run(user.id);

    const session = await authenticateUser(email, password);
    assert.ok(session);

    // Test DB may already have an owner from prior suites — clear for isolated bootstrap.
    getDb().prepare(`UPDATE users SET staff_role = NULL WHERE staff_role = 'owner'`).run();
    process.env.OWNER_EMAIL = email;
    ensureOwnerFromEnv();
    const staff = loadStaffProfile(user.id);
    assert.equal(staff?.staffRole, "owner");
    assert.equal(staff?.isAdmin, true);
    assert.equal(postLoginPath(user), OWNER_HOME);

    const dash = dccDashboard();
    assert.ok(dash.users.total >= 1);
    assert.equal(dash.health.database, "ok");

    closeDb();
    if (prevDriver === undefined) delete process.env.RENTPROOF_DB_DRIVER;
    else process.env.RENTPROOF_DB_DRIVER = prevDriver;
    if (prevUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prevUrl;
    if (prevOwner === undefined) delete process.env.OWNER_EMAIL;
    else process.env.OWNER_EMAIL = prevOwner;
  });
});
