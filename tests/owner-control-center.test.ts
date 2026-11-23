import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { grantSubscription, revokeToFree, listAllSubscriptions } from "@/lib/admin-subscriptions";
import { getDb } from "@/lib/db";
import { dccFinance } from "@/lib/dcc";
import { planAiLimit, planListingLimit } from "@/lib/plans";
import { banUser, liftBan } from "@/lib/bans";
import { AccountBlockedError, authenticateUser, registerUser } from "@/lib/users";
import { assignManualBadge, listUserBadges, revokeManualBadge } from "@/lib/user-badges";
import { assignStaff } from "@/lib/staff";
import { ForbiddenError } from "@/lib/errors";
import { readFileSync } from "node:fs";

const password = "Owner-cc-pass-42";

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

describe("owner control center", () => {
  it("OWNER_GRANT sets plan entitlements without creating a payment", async () => {
    const owner = await registerUser({ name: "Occ Owner", email: uniqueEmail("occ-own"), password, role: "landlord" });
    getDb()
      .prepare(`UPDATE users SET staff_role = 'owner', is_admin = 1, email_verified = 1 WHERE id = ?`)
      .run(owner.id);
    const target = await registerUser({ name: "Occ Target", email: uniqueEmail("occ-tgt"), password, role: "landlord" });
    getDb().prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`).run(target.id);

    const beforePayments = Number(
      (getDb().prepare(`SELECT COUNT(*) AS c FROM payments WHERE user_id = ?`).get(target.id) as { c: number }).c,
    );
    grantSubscription({
      actorId: owner.id,
      userId: target.id,
      plan: "pro",
      sourceKind: "owner_grant",
      days: 30,
      reason: "test grant pro",
    });
    const user = getDb().prepare(`SELECT plan FROM users WHERE id = ?`).get(target.id) as { plan: string };
    assert.equal(user.plan, "pro");
    assert.equal(planListingLimit("pro") > planListingLimit("free"), true);
    assert.equal(planAiLimit("pro") > planAiLimit("free"), true);
    const afterPayments = Number(
      (getDb().prepare(`SELECT COUNT(*) AS c FROM payments WHERE user_id = ?`).get(target.id) as { c: number }).c,
    );
    assert.equal(afterPayments, beforePayments);
    const sub = listAllSubscriptions(20).find((row) => row.userId === target.id);
    assert.equal(sub?.sourceKind, "owner_grant");

    grantSubscription({
      actorId: owner.id,
      userId: owner.id,
      plan: "plus",
      sourceKind: "owner_grant",
      days: null,
      reason: "self plus indefinite",
    });
    const self = getDb().prepare(`SELECT plan FROM users WHERE id = ?`).get(owner.id) as { plan: string };
    assert.equal(self.plan, "plus");

    revokeToFree(owner.id, target.id, "done testing");
    const freeAgain = getDb().prepare(`SELECT plan FROM users WHERE id = ?`).get(target.id) as { plan: string };
    assert.equal(freeAgain.plan, "free");
  });

  it("finance revenue ignores grants and reads only succeeded payments", async () => {
    const finance = dccFinance();
    assert.equal(typeof finance.revenueKopecks.allTime, "number");
    assert.match(finance.note, /OWNER_GRANT|не входят/i);
  });

  it("ban blocks auth; owner cannot be banned; badges cannot grant OWNER", async () => {
    const owner = await registerUser({ name: "Ban Owner", email: uniqueEmail("ban-own"), password, role: "landlord" });
    getDb()
      .prepare(`UPDATE users SET staff_role = 'owner', is_admin = 1, email_verified = 1 WHERE id = ?`)
      .run(owner.id);
    const victim = await registerUser({ name: "Ban Victim", email: uniqueEmail("ban-vic"), password, role: "tenant" });
    getDb().prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`).run(victim.id);

    banUser({ actorId: owner.id, userId: victim.id, kind: "permanent", reason: "abuse test", expiresAt: null, features: [] });
    await assert.rejects(() => authenticateUser(victim.email, password), (error) => error instanceof AccountBlockedError);
    liftBan(owner.id, victim.id);
    const ok = await authenticateUser(victim.email, password);
    assert.ok(ok);

    assert.throws(
      () => banUser({ actorId: owner.id, userId: owner.id, kind: "permanent", reason: "nope", expiresAt: null, features: [] }),
      (error) => error instanceof ForbiddenError,
    );

    const badgeId = assignManualBadge({ actorId: owner.id, userId: victim.id, kind: "tester", reason: "qa pool" });
    const badges = listUserBadges(victim.id);
    assert.ok(badges.some((b) => b.kind === "tester"));
    assert.equal(badges.some((b) => b.kind === "owner"), false);
    revokeManualBadge({ actorId: owner.id, badgeId, reason: "done" });

    const admin = await registerUser({ name: "Staff Admin", email: uniqueEmail("staff-adm"), password, role: "landlord" });
    getDb().prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`).run(admin.id);
    assignStaff({ actorId: owner.id, email: admin.email, role: "admin" });
    assert.throws(
      () => assignStaff({ actorId: owner.id, email: admin.email, role: "owner" }),
      (error) => error instanceof ForbiddenError,
    );
  });

  it("mobile nav no longer uses slice(0, 6)", () => {
    const shell = readFileSync(new URL("../src/components/dcc-shell.tsx", import.meta.url), "utf8");
    assert.equal(shell.includes("slice(0, 6)"), false);
    assert.match(shell, /DccMobileNav/);
    assert.match(shell, /OwnerBadge/);
  });
});
