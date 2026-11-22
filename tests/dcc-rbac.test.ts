import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { banUser, liftBan, activeBan, assertFeatureAllowed, refreshBanState } from "@/lib/bans";
import { getDb } from "@/lib/db";
import { FeatureBlockedError, ForbiddenError } from "@/lib/errors";
import { ensureOwnerFromEnv } from "@/lib/owner";
import {
  assignStaff,
  revokeStaff,
  updateStaff,
} from "@/lib/staff";
import {
  grantSubscription,
  revokeToFree,
  extendSubscription,
  currentSubscriptionCard,
} from "@/lib/admin-subscriptions";
import { hasPermission, loadStaffProfile } from "@/lib/rbac";
import { promoteExistingUser } from "@/lib/admin";
import { registerUser } from "@/lib/users";
import { enforceSubscriptionExpiry } from "@/lib/subscription-lifecycle";

const password = "Correct-horse-9";

function email(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
}

function clearOwners(): void {
  getDb().prepare(`UPDATE users SET staff_role = NULL, is_admin = 0 WHERE staff_role = 'owner'`).run();
}

describe("dcc rbac and owner", () => {
  it("bootstraps OWNER from OWNER_EMAIL for an existing verified user", async () => {
    clearOwners();
    const ownerEmail = email("owner");
    const owner = await registerUser({ name: "Owner User", email: ownerEmail, password, role: "landlord" });
    getDb()
      .prepare(`UPDATE users SET email_verified = 1, email_verified_at = ? WHERE id = ?`)
      .run(new Date().toISOString(), owner.id);

    process.env.OWNER_EMAIL = ownerEmail;
    ensureOwnerFromEnv();
    const profile = loadStaffProfile(owner.id);
    assert.equal(profile?.staffRole, "owner");
    assert.equal(hasPermission(profile!, "admins.manage"), true);

    // Second different OWNER_EMAIL must not steal ownership.
    const other = await registerUser({ name: "Other", email: email("other"), password, role: "tenant" });
    getDb().prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`).run(other.id);
    process.env.OWNER_EMAIL = other.email;
    ensureOwnerFromEnv();
    assert.equal(loadStaffProfile(owner.id)?.staffRole, "owner");
    assert.notEqual(loadStaffProfile(other.id)?.staffRole, "owner");
    process.env.OWNER_EMAIL = ownerEmail;
  });

  it("prevents ban/demote of OWNER and privilege self-escalation patterns", async () => {
    clearOwners();
    const ownerEmail = email("owner2");
    const owner = await registerUser({ name: "Owner2", email: ownerEmail, password, role: "landlord" });
    getDb().prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`).run(owner.id);
    process.env.OWNER_EMAIL = ownerEmail;
    ensureOwnerFromEnv();

    const adminUser = await registerUser({ name: "Admin", email: email("admin"), password, role: "landlord" });
    getDb().prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`).run(adminUser.id);
    assignStaff({ actorId: owner.id, email: adminUser.email, role: "admin" });

    assert.throws(() => banUser({ actorId: adminUser.id, userId: owner.id, kind: "permanent", reason: "nope" }), ForbiddenError);
    assert.throws(() => {
      assignStaff({ actorId: adminUser.id, email: adminUser.email, role: "owner" });
    }, ForbiddenError);

    const mod = await registerUser({ name: "Mod", email: email("mod"), password, role: "tenant" });
    getDb().prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`).run(mod.id);
    assignStaff({ actorId: owner.id, email: mod.email, role: "moderator" });
    const modProfile = loadStaffProfile(mod.id)!;
    assert.equal(hasPermission(modProfile, "admins.manage"), false);
    assert.equal(hasPermission(modProfile, "subscriptions.grant"), false);

    const support = await registerUser({ name: "Support", email: email("sup"), password, role: "tenant" });
    getDb().prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`).run(support.id);
    assignStaff({ actorId: owner.id, email: support.email, role: "support" });
    assert.equal(hasPermission(loadStaffProfile(support.id)!, "subscriptions.manage"), false);

    revokeStaff(owner.id, mod.id);
    assert.equal(loadStaffProfile(mod.id)?.staffRole, null);

    // Non-owner cannot manage staff even if somehow calling the lib.
    assert.throws(
      () => assignStaff({ actorId: adminUser.id, email: email("x"), role: "moderator" }),
      ForbiddenError,
    );
    // admins.manage cannot be granted via override.
    updateStaff({
      actorId: owner.id,
      userId: adminUser.id,
      permissions: ["users.view", "admins.manage", "subscriptions.grant"],
    });
    assert.equal(hasPermission(loadStaffProfile(adminUser.id)!, "admins.manage"), false);
    assert.equal(hasPermission(loadStaffProfile(adminUser.id)!, "subscriptions.grant"), true);
    assert.throws(() => promoteExistingUser(email("nobody")), ForbiddenError);
  });

  it("bans and unbans regular users for real", async () => {
    clearOwners();
    const ownerEmail = email("owner3");
    const owner = await registerUser({ name: "Owner3", email: ownerEmail, password, role: "landlord" });
    getDb().prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`).run(owner.id);
    process.env.OWNER_EMAIL = ownerEmail;
    ensureOwnerFromEnv();

    const victim = await registerUser({ name: "Victim", email: email("vic"), password, role: "tenant" });
    banUser({ actorId: owner.id, userId: victim.id, kind: "temporary", reason: "spam ads", expiresAt: new Date(Date.now() + 864e5).toISOString() });
    assert.ok(activeBan(victim.id));
    const row = getDb().prepare(`SELECT blocked_at FROM users WHERE id = ?`).get(victim.id) as { blocked_at: string | null };
    assert.ok(row.blocked_at);
    liftBan(owner.id, victim.id);
    assert.equal(activeBan(victim.id), null);

    const featureUser = await registerUser({ name: "Feat", email: email("feat"), password, role: "landlord" });
    banUser({
      actorId: owner.id,
      userId: featureUser.id,
      kind: "feature",
      reason: "abuse listings",
      features: ["listings"],
    });
    assert.throws(() => assertFeatureAllowed(featureUser.id, "listings"), FeatureBlockedError);
    assert.doesNotThrow(() => assertFeatureAllowed(featureUser.id, "bookings"));

    const temp = await registerUser({ name: "Temp", email: email("temp"), password, role: "tenant" });
    const past = new Date(Date.now() - 60_000).toISOString();
    banUser({
      actorId: owner.id,
      userId: temp.id,
      kind: "temporary",
      reason: "temp spam",
      expiresAt: past,
    });
    // Force-expire path: refresh clears stale block after expiry.
    getDb()
      .prepare(`UPDATE account_bans SET expires_at = ? WHERE user_id = ? AND lifted_at IS NULL`)
      .run(past, temp.id);
    assert.equal(refreshBanState(temp.id), null);
    const cleared = getDb().prepare(`SELECT blocked_at FROM users WHERE id = ?`).get(temp.id) as {
      blocked_at: string | null;
    };
    assert.equal(cleared.blocked_at, null);
  });
});

describe("dcc subscription grants", () => {
  it("grants PLUS/PRO, extends, expires to FREE, and revokes without fake payments", async () => {
    clearOwners();
    const ownerEmail = email("owner4");
    const owner = await registerUser({ name: "Owner4", email: ownerEmail, password, role: "landlord" });
    getDb().prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`).run(owner.id);
    process.env.OWNER_EMAIL = ownerEmail;
    ensureOwnerFromEnv();

    const user = await registerUser({ name: "Sub User", email: email("sub"), password, role: "landlord" });
    grantSubscription({
      actorId: owner.id,
      userId: user.id,
      plan: "plus",
      sourceKind: "admin_granted",
      days: 30,
      reason: "promo test",
    });
    let card = currentSubscriptionCard(user.id)!;
    assert.equal(card.plan, "plus");
    assert.equal(card.source_kind, "admin_granted");
    assert.equal(card.status, "active");

    grantSubscription({
      actorId: owner.id,
      userId: user.id,
      plan: "pro",
      sourceKind: "admin_granted",
      days: 14,
      reason: "upgrade",
    });
    card = currentSubscriptionCard(user.id)!;
    assert.equal(card.plan, "pro");

    extendSubscription(owner.id, user.id, 7, "extend");
    card = currentSubscriptionCard(user.id)!;
    assert.ok(card.expires_at);

    // Force expiry
    const past = new Date(Date.now() - 60_000).toISOString();
    getDb().prepare(`UPDATE subscriptions SET expires_at = ? WHERE id = ?`).run(past, card.id);
    const plan = enforceSubscriptionExpiry(user.id);
    assert.equal(plan, "free");

    grantSubscription({
      actorId: owner.id,
      userId: user.id,
      plan: "plus",
      sourceKind: "promotional",
      days: 7,
      reason: "again",
    });
    revokeToFree(owner.id, user.id, "done");
    const after = getDb().prepare(`SELECT plan FROM users WHERE id = ?`).get(user.id) as { plan: string };
    assert.equal(after.plan, "free");
  });

  it("blocks staff without subscriptions.grant from being treated as grant-capable via defaults", async () => {
    clearOwners();
    const ownerEmail = email("owner5");
    const owner = await registerUser({ name: "Owner5", email: ownerEmail, password, role: "landlord" });
    getDb().prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`).run(owner.id);
    process.env.OWNER_EMAIL = ownerEmail;
    ensureOwnerFromEnv();
    const mod = await registerUser({ name: "Mod2", email: email("mod2"), password, role: "tenant" });
    getDb().prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`).run(mod.id);
    assignStaff({ actorId: owner.id, email: mod.email, role: "moderator" });
    updateStaff({ actorId: owner.id, userId: mod.id, permissions: ["users.view", "listings.moderate"] });
    assert.equal(hasPermission(loadStaffProfile(mod.id)!, "subscriptions.grant"), false);
  });
});
