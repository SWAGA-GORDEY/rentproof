import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dccNav } from "@/lib/admin-nav";
import { dccDashboard, dccEmailCenter, dccFinance, dccSecurityCenter } from "@/lib/dcc";
import { ensureOwnerFromEnv } from "@/lib/owner";
import { loadStaffProfile } from "@/lib/rbac";
import { postLoginPath, safeStaffNext, OWNER_HOME } from "@/lib/staff-access";
import { getDb } from "@/lib/db";
import { registerUser } from "@/lib/users";
import { grantSubscription } from "@/lib/admin-subscriptions";
import { planListingLimit } from "@/lib/plans";

const password = "Ultimate-owner-42";

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

describe("owner ultimate access", () => {
  it("nav includes security + email and redirects aliases exist in next.config", () => {
    const hrefs = dccNav.map((item) => item.href);
    assert.ok(hrefs.includes("/admin/security"));
    assert.ok(hrefs.includes("/admin/email"));
    assert.ok(dccNav.length >= 16);

    const config = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
    assert.match(config, /source:\s*"\/owner"/);
    assert.match(config, /source:\s*"\/control-center"/);
    assert.equal(config.includes('source: "/Admin"'), false);
    const proxy = readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8");
    assert.match(proxy, /normalizeAdminCasing|toLowerCase/);

    const denied = readFileSync(new URL("../src/app/staff-access-denied/page.tsx", import.meta.url), "utf8");
    assert.match(denied, /не страница 404/i);
  });

  it("OWNER_EMAIL bind + post-login goes to /owner; grants activate PRO", async () => {
    const email = uniqueEmail("ult-own");
    const owner = await registerUser({ name: "Ult Owner", email, password, role: "landlord" });
    getDb().prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`).run(owner.id);

    process.env.OWNER_EMAIL = email;
    ensureOwnerFromEnv();
    const staff = loadStaffProfile(owner.id);
    assert.equal(staff?.staffRole, "owner");
    assert.equal(postLoginPath(owner), OWNER_HOME);
    assert.equal(safeStaffNext("/owner/users", OWNER_HOME), "/owner/users");
    assert.equal(safeStaffNext("https://evil.example", OWNER_HOME), OWNER_HOME);

    grantSubscription({
      actorId: owner.id,
      userId: owner.id,
      plan: "pro",
      sourceKind: "owner_grant",
      days: 30,
      reason: "ultimate self pro",
    });
    const plan = (getDb().prepare(`SELECT plan FROM users WHERE id = ?`).get(owner.id) as { plan: string }).plan;
    assert.equal(plan, "pro");
    assert.ok(planListingLimit("pro") > planListingLimit("free"));
  });

  it("regular user post-login stays on /account", async () => {
    const user = await registerUser({
      name: "Ult User",
      email: uniqueEmail("ult-user"),
      password,
      role: "tenant",
    });
    assert.equal(postLoginPath(user), "/account");
  });

  it("dashboard/finance/security/email read real SQLite counters", () => {
    const dash = dccDashboard();
    assert.equal(typeof dash.users.total, "number");
    assert.ok(Array.isArray(dash.charts.revenueByDay));
    assert.ok(Array.isArray(dash.charts.activeUsersByDay));
    const finance = dccFinance();
    assert.match(finance.note, /OWNER_GRANT/);
    const security = dccSecurityCenter();
    assert.equal(typeof security.loginFailuresDay, "number");
    const email = dccEmailCenter();
    assert.equal(typeof email.configured, "boolean");
    assert.ok(!("apiKey" in email));
  });
});
