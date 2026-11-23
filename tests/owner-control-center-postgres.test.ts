/**
 * Owner Control Center parity on PostgreSQL.
 * Ensures every admin section still loads real counters from Postgres
 * without dropping routes, RBAC, or nav from PR #12/#13/#15/#16.
 *
 * Skips when RENTPROOF_TEST_DATABASE_URL is unset and local PG is unreachable.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dccNav } from "@/lib/admin-nav";
import { grantSubscription, listAllSubscriptions } from "@/lib/admin-subscriptions";
import { closeDb, getDb, resolveDbDriver } from "@/lib/db";
import {
  dccAiCenter,
  dccDashboard,
  dccEmailCenter,
  dccFinance,
  dccSecurityCenter,
} from "@/lib/dcc";
import { ensureOwnerFromEnv } from "@/lib/owner";
import { hasPermission, loadStaffProfile } from "@/lib/rbac";
import { dccHref, OWNER_HOME, postLoginPath, safeStaffNext } from "@/lib/staff-access";
import { registerUser } from "@/lib/users";

const password = "Occ-pg-pass-42!";
const databaseUrl =
  process.env.RENTPROOF_TEST_DATABASE_URL?.trim() ||
  "postgres://rentproof:rentproof_test@127.0.0.1:5432/rentproof_test";

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

function pgReachable(): boolean {
  const prevDriver = process.env.RENTPROOF_DB_DRIVER;
  const prevUrl = process.env.DATABASE_URL;
  try {
    process.env.RENTPROOF_DB_DRIVER = "postgres";
    process.env.DATABASE_URL = databaseUrl;
    closeDb();
    getDb().prepare("SELECT 1 AS ok").get();
    return true;
  } catch {
    return false;
  } finally {
    closeDb();
    if (prevDriver === undefined) delete process.env.RENTPROOF_DB_DRIVER;
    else process.env.RENTPROOF_DB_DRIVER = prevDriver;
    if (prevUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prevUrl;
  }
}

const canRun = pgReachable();

describe("owner control center on PostgreSQL", { skip: !canRun }, () => {
  const prevDriver = process.env.RENTPROOF_DB_DRIVER;
  const prevUrl = process.env.DATABASE_URL;
  const prevOwner = process.env.OWNER_EMAIL;

  function usePostgres(): void {
    process.env.RENTPROOF_DB_DRIVER = "postgres";
    process.env.DATABASE_URL = databaseUrl;
    closeDb();
  }

  function restoreEnv(): void {
    closeDb();
    if (prevDriver === undefined) delete process.env.RENTPROOF_DB_DRIVER;
    else process.env.RENTPROOF_DB_DRIVER = prevDriver;
    if (prevUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prevUrl;
    if (prevOwner === undefined) delete process.env.OWNER_EMAIL;
    else process.env.OWNER_EMAIL = prevOwner;
  }

  it("preserves OCC routes, nav, and aliases (owner/admin/control-center/denied)", () => {
    const hrefs = dccNav.map((item) => item.href);
    for (const required of [
      "/owner",
      "/owner/users",
      "/owner/finance",
      "/owner/subscriptions",
      "/owner/ai",
      "/owner/email",
      "/owner/security",
      "/owner/settings",
    ]) {
      assert.ok(hrefs.includes(required), `missing nav ${required}`);
    }
    assert.equal(dccHref(), OWNER_HOME);
    assert.equal(dccHref("/finance"), "/owner/finance");

    const config = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
    assert.match(config, /source:\s*"\/owner"/);
    assert.match(config, /source:\s*"\/control-center"/);
    assert.match(config, /destination:\s*"\/admin"/);

    for (const page of [
      "page.tsx",
      "users/page.tsx",
      "finance/page.tsx",
      "subscriptions/page.tsx",
      "ai/page.tsx",
      "email/page.tsx",
      "security/page.tsx",
      "settings/page.tsx",
    ]) {
      assert.equal(existsSync(new URL(`../src/app/admin/${page}`, import.meta.url)), true, page);
    }
    assert.equal(existsSync(new URL("../src/app/staff-access-denied/page.tsx", import.meta.url)), true);

    const currentUser = readFileSync(new URL("../src/lib/current-user.ts", import.meta.url), "utf8");
    assert.match(currentUser, /requireStaff/);
    assert.match(currentUser, /staff-access-denied/);
  });

  it("Dashboard / Users / Finance / Subscriptions / AI / Email / Security / Settings read Postgres", async () => {
    usePostgres();
    assert.equal(resolveDbDriver(), "postgres");

    const ownerEmail = uniqueEmail("pg-owner");
    const owner = await registerUser({
      name: "PG Owner",
      email: ownerEmail,
      password,
      role: "landlord",
    });
    getDb()
      .prepare(`UPDATE users SET email_verified = 1, staff_role = 'owner', is_admin = 1 WHERE id = ?`)
      .run(owner.id);

    process.env.OWNER_EMAIL = ownerEmail;
    ensureOwnerFromEnv();
    const staff = loadStaffProfile(owner.id);
    assert.equal(staff?.staffRole, "owner");
    assert.equal(hasPermission(staff!, "users.view"), true);
    assert.equal(hasPermission(staff!, "finance.view"), true);
    assert.equal(hasPermission(staff!, "subscriptions.grant"), true);
    assert.equal(postLoginPath(owner), OWNER_HOME);
    assert.equal(safeStaffNext("/owner/users", OWNER_HOME), "/owner/users");
    assert.equal(safeStaffNext("https://evil.test", OWNER_HOME), OWNER_HOME);

    const member = await registerUser({
      name: "PG Member",
      email: uniqueEmail("pg-member"),
      password,
      role: "tenant",
    });
    getDb().prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`).run(member.id);

    grantSubscription({
      actorId: owner.id,
      userId: member.id,
      plan: "plus",
      sourceKind: "owner_grant",
      days: 30,
      reason: "pg occ grant",
    });
    const plan = (getDb().prepare(`SELECT plan FROM users WHERE id = ?`).get(member.id) as { plan: string }).plan;
    assert.equal(plan, "plus");
    assert.ok(listAllSubscriptions(50).some((row) => row.userId === member.id && row.sourceKind === "owner_grant"));

    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO payments (
          id, user_id, purpose, status, amount_kopecks, currency, description, provider,
          idempotency_key, metadata_json, created_at, updated_at, succeeded_at
        ) VALUES (?, ?, 'subscription', 'succeeded', 29900, 'RUB', 'plus', 'yookassa', ?, '{}', ?, ?, ?)`,
      )
      .run(randomUUID(), member.id, `idem-${randomUUID()}`, now, now, now);

    getDb()
      .prepare(
        `INSERT INTO ai_reports (
          id, user_id, object_type, description, status, score, confidence, report_json, model, created_at
        ) VALUES (?, ?, 'camera', 'pg test', 'completed', 80, 0.9, '{}', 'test-model', ?)`,
      )
      .run(randomUUID(), member.id, now);

    getDb()
      .prepare(
        `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, meta, created_at)
         VALUES (?, ?, 'owner.grant_subscription', 'user', ?, NULL, ?)`,
      )
      .run(randomUUID(), owner.id, member.id, now);

    getDb()
      .prepare(
        `INSERT INTO login_attempts (email, attempted_at) VALUES (?, ?)`,
      )
      .run(member.email, now);

    // Dashboard
    const dash = dccDashboard();
    assert.ok(dash.users.total >= 2);
    assert.ok(dash.subscriptionsPlus >= 1 || dash.subscriptionsActive >= 1);
    assert.ok(dash.paymentsSucceeded >= 1);
    assert.ok(dash.revenueMonthKopecks >= 29900);
    assert.ok(dash.ai.total >= 1);
    assert.equal(dash.health.database, "ok");
    assert.ok(Array.isArray(dash.charts.registrationsByDay));
    assert.ok(Array.isArray(dash.planDistribution));
    assert.ok(dash.planDistribution.some((p) => p.id === "plus" && p.users >= 1));

    // Users (direct query path used by admin users page filters)
    const usersFound = getDb()
      .prepare(`SELECT COUNT(*) AS c FROM users WHERE lower(email) LIKE ?`)
      .get(`%${member.email.slice(0, 8).toLowerCase()}%`) as { c: number | string };
    assert.ok(Number(usersFound.c) >= 1);

    // Finance — grants must not inflate paid revenue note; succeeded payments do
    const finance = dccFinance();
    assert.ok(finance.revenueKopecks.allTime >= 29900);
    assert.ok(finance.paidTransactions >= 1);
    assert.match(finance.note, /OWNER_GRANT|не входят/i);
    assert.ok(finance.plus >= 1);

    // Subscriptions
    assert.ok(listAllSubscriptions(20).length >= 1);

    // AI Center
    const ai = dccAiCenter();
    assert.ok(ai.totals.all >= 1);
    assert.ok(ai.byPlan.some((row) => row.plan === "plus" && row.reports >= 1));
    assert.equal(typeof ai.keyConfigured, "boolean");

    // Email Center
    const email = dccEmailCenter();
    assert.equal(typeof email.configured, "boolean");
    assert.ok(["resend", "smtp", "console", "auto-unresolved"].includes(email.active));
    assert.equal(typeof email.week.verificationAndEmailAudit, "number");

    // Security Center
    const security = dccSecurityCenter();
    assert.ok(security.loginFailuresDay >= 1);
    assert.ok(security.ownerActions.length >= 1);
    assert.ok(security.roleChanges.length >= 1);

    // Settings (platform_settings upsert path used by admin settings)
    getDb()
      .prepare(
        `INSERT INTO platform_settings (key, value, updated_by, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
      )
      .run("occ_pg_probe", "1", owner.id, now);
    const setting = getDb()
      .prepare(`SELECT value FROM platform_settings WHERE key = ?`)
      .get("occ_pg_probe") as { value: string };
    assert.equal(setting.value, "1");

    restoreEnv();
  });

  it("regular users stay off OWNER home after login", async () => {
    usePostgres();
    const user = await registerUser({
      name: "PG Regular",
      email: uniqueEmail("pg-reg"),
      password,
      role: "tenant",
    });
    assert.equal(postLoginPath(user), "/account");
    const profile = loadStaffProfile(user.id);
    assert.equal(profile?.staffRole ?? null, null);
    assert.equal(hasPermission(profile!, "users.view"), false);
    restoreEnv();
  });
});

describe("owner control center postgres gate", () => {
  it("documents skip when Postgres is unavailable", () => {
    if (!canRun) {
      assert.ok(true, "Postgres unreachable — OCC PG suite skipped (CI without local PG)");
    } else {
      assert.equal(canRun, true);
    }
  });
});
