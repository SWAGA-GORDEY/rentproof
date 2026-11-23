import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { grantSubscription, revokeToFree, extendSubscription } from "@/lib/admin-subscriptions";
import { adminErrorMessage, adminSavedMessage } from "@/lib/admin-action-feedback";
import { banUser, liftBan, activeBan, assertFeatureAllowed } from "@/lib/bans";
import { getDb } from "@/lib/db";
import { FeatureBlockedError, ForbiddenError } from "@/lib/errors";
import { planAiLimit, planListingLimit } from "@/lib/plans";
import { enforceSubscriptionExpiry } from "@/lib/subscription-lifecycle";
import { listRecentAudit } from "@/lib/audit";
import {
  AccountBlockedError,
  authenticateUser,
  createSession,
  readSessionUser,
  registerUser,
} from "@/lib/users";

const password = "Crit-ban-grant-99";

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

async function makeOwner() {
  const owner = await registerUser({
    name: "Crit Owner",
    email: uniqueEmail("crit-own"),
    password,
    role: "landlord",
  });
  getDb()
    .prepare(`UPDATE users SET staff_role = 'owner', is_admin = 1, email_verified = 1 WHERE id = ?`)
    .run(owner.id);
  return owner;
}

describe("DCC critical ban + grant", () => {
  it("1-2 OWNER can grant self PLUS then PRO with OWNER_GRANT", async () => {
    const owner = await makeOwner();
    grantSubscription({
      actorId: owner.id,
      userId: owner.id,
      plan: "plus",
      sourceKind: "owner_grant",
      days: 30,
      reason: "self plus",
    });
    let plan = (getDb().prepare(`SELECT plan FROM users WHERE id = ?`).get(owner.id) as { plan: string }).plan;
    assert.equal(plan, "plus");
    assert.equal(planListingLimit("plus") > planListingLimit("free"), true);

    grantSubscription({
      actorId: owner.id,
      userId: owner.id,
      plan: "pro",
      sourceKind: "owner_grant",
      days: 30,
      reason: "self pro upgrade",
    });
    plan = (getDb().prepare(`SELECT plan FROM users WHERE id = ?`).get(owner.id) as { plan: string }).plan;
    assert.equal(plan, "pro");
    assert.equal(planAiLimit("pro") > planAiLimit("plus"), true);

    const sub = getDb()
      .prepare(`SELECT source_kind, status FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`)
      .get(owner.id) as { source_kind: string; status: string };
    assert.equal(sub.source_kind, "owner_grant");
  });

  it("3-6 grant to other user persists across login and session reread", async () => {
    const owner = await makeOwner();
    const other = await registerUser({
      name: "Crit Other",
      email: uniqueEmail("crit-oth"),
      password,
      role: "landlord",
    });
    getDb().prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`).run(other.id);

    const paymentsBefore = Number(
      (getDb().prepare(`SELECT COUNT(*) AS c FROM payments WHERE user_id = ?`).get(other.id) as { c: number }).c,
    );

    grantSubscription({
      actorId: owner.id,
      userId: other.id,
      plan: "pro",
      sourceKind: "owner_grant",
      days: 90,
      reason: "grant other pro",
    });

    const paymentsAfter = Number(
      (getDb().prepare(`SELECT COUNT(*) AS c FROM payments WHERE user_id = ?`).get(other.id) as { c: number }).c,
    );
    assert.equal(paymentsAfter, paymentsBefore, "must not create fake payments");

    const loggedIn = await authenticateUser(other.email, password);
    assert.equal(loggedIn.plan, "pro");

    const token = createSession(other.id);
    const sessionUser = readSessionUser(token, new Date().toISOString());
    assert.ok(sessionUser);
    assert.equal(sessionUser.plan, "pro");
  });

  it("7 expiry downgrades plan to FREE", async () => {
    const owner = await makeOwner();
    const user = await registerUser({
      name: "Crit Exp",
      email: uniqueEmail("crit-exp"),
      password,
      role: "landlord",
    });
    getDb().prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`).run(user.id);

    grantSubscription({
      actorId: owner.id,
      userId: user.id,
      plan: "plus",
      sourceKind: "owner_grant",
      days: 7,
      reason: "will expire",
    });
    const sub = getDb()
      .prepare(`SELECT id FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`)
      .get(user.id) as { id: string };
    const past = new Date(Date.now() - 864e5).toISOString();
    getDb().prepare(`UPDATE subscriptions SET expires_at = ? WHERE id = ?`).run(past, sub.id);

    const plan = enforceSubscriptionExpiry(user.id);
    assert.equal(plan, "free");
    const row = getDb().prepare(`SELECT plan FROM users WHERE id = ?`).get(user.id) as { plan: string };
    assert.equal(row.plan, "free");
  });

  it("8-10 ban blocks auth + features; unban restores; OWNER not bannable", async () => {
    const owner = await makeOwner();
    const victim = await registerUser({
      name: "Crit Vic",
      email: uniqueEmail("crit-vic"),
      password,
      role: "tenant",
    });
    getDb().prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`).run(victim.id);

    banUser({
      actorId: owner.id,
      userId: victim.id,
      kind: "permanent",
      reason: "abuse critical",
      expiresAt: null,
      features: [],
    });
    assert.ok(activeBan(victim.id));
    await assert.rejects(
      () => authenticateUser(victim.email, password),
      (error) => error instanceof AccountBlockedError,
    );
    assert.throws(() => assertFeatureAllowed(victim.id, "listings"), FeatureBlockedError);

    liftBan(owner.id, victim.id);
    const ok = await authenticateUser(victim.email, password);
    assert.ok(ok);
    assert.equal(ok.blockedAt, null);
    assertFeatureAllowed(victim.id, "listings");

    assert.throws(
      () =>
        banUser({
          actorId: owner.id,
          userId: owner.id,
          kind: "permanent",
          reason: "cannot ban owner",
          expiresAt: null,
          features: [],
        }),
      ForbiddenError,
    );
  });

  it("11 actions write audit; 12 extend/revoke work", async () => {
    const owner = await makeOwner();
    const user = await registerUser({
      name: "Crit Aud",
      email: uniqueEmail("crit-aud"),
      password,
      role: "landlord",
    });
    getDb().prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`).run(user.id);

    grantSubscription({
      actorId: owner.id,
      userId: user.id,
      plan: "plus",
      sourceKind: "owner_grant",
      days: 30,
      reason: "audit grant",
    });
    extendSubscription(owner.id, user.id, 14, "extend audit");
    revokeToFree(owner.id, user.id, "revoke audit");
    banUser({
      actorId: owner.id,
      userId: user.id,
      kind: "temporary",
      reason: "temp audit",
      expiresAt: new Date(Date.now() + 864e5).toISOString(),
      features: [],
    });
    liftBan(owner.id, user.id);

    const audit = listRecentAudit(200);
    const actions = audit.filter((e) => e.actorId === owner.id || e.entityId === user.id).map((e) => e.action);
    assert.ok(actions.includes("subscription.grant"));
    assert.ok(actions.includes("subscription.extend"));
    assert.ok(actions.includes("subscription.revoke"));
    assert.ok(actions.includes("user.ban"));
    assert.ok(actions.includes("user.unban"));
  });

  it("flash messages cover ban/grant codes", () => {
    assert.match(adminSavedMessage("grant", "pro") ?? "", /PRO/);
    assert.match(adminSavedMessage("ban") ?? "", /заблокирован/i);
    assert.match(adminErrorMessage("ban_confirm") ?? "", /подтверд/i);
    assert.match(adminErrorMessage("grant_reason") ?? "", /причин/i);
    assert.match(adminErrorMessage("ban_owner") ?? "", /OWNER/);
  });
});
