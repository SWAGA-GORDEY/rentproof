"use server";

import { redirect } from "next/navigation";
import { grantSubscription, revokeToFree, extendSubscription, GRANT_DURATIONS_DAYS } from "@/lib/admin-subscriptions";
import { banUser, liftBan } from "@/lib/bans";
import { requireStaff } from "@/lib/current-user";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { getDb } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { randomUUID } from "node:crypto";
import { moderateListing } from "@/lib/listings";
import { assignStaff, revokeStaff, updateStaff } from "@/lib/staff";
import { isStaffRole, type Permission, ASSIGNABLE_PERMISSIONS, type StaffRole } from "@/lib/rbac";
import { isPlanId, type PlanId } from "@/lib/plans";
import { setSetting } from "@/lib/platform-settings";
import { markAdminNotificationRead, markAllAdminNotificationsRead } from "@/lib/admin-notifications";
import { addTicketMessage, createTicket, updateTicket } from "@/lib/support-tickets";
import { ensureLegalDrafts, getLatestLegalDocument, type LegalDocType } from "@/lib/legal";
import { assignManualBadge, isManualBadgeKind, revokeManualBadge } from "@/lib/user-badges";

export async function dccBanUserAction(formData: FormData): Promise<void> {
  const { user } = await requireStaff("users.ban");
  const userId = String(formData.get("userId") ?? "");
  const kind = String(formData.get("kind") ?? "permanent");
  const reason = String(formData.get("reason") ?? "");
  const days = Number(formData.get("days") ?? "7");
  const confirm = String(formData.get("confirmBan") ?? "") === "1";
  const features = ["listings", "bookings", "ai", "crm"].filter((feature) => formData.get(`feature_${feature}`) === "on");
  if (!confirm) redirect(`/owner/users/${userId}?error=ban_confirm`);
  if (reason.trim().length < 3) redirect(`/owner/users/${userId}?error=ban_reason`);
  try {
    banUser({
      actorId: user.id,
      userId,
      kind: kind === "temporary" ? "temporary" : kind === "feature" ? "feature" : "permanent",
      reason,
      expiresAt: kind === "temporary" ? new Date(Date.now() + Math.max(1, days) * 864e5).toISOString() : null,
      features,
    });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      redirect(`/owner/users/${userId}?error=ban_owner`);
    }
    if (error instanceof NotFoundError) {
      redirect(`/owner/users/${userId}?error=ban_missing`);
    }
    redirect(`/owner/users/${userId}?error=ban`);
  }
  redirect(`/owner/users/${userId}?saved=ban`);
}

export async function dccUnbanUserAction(formData: FormData): Promise<void> {
  const { user } = await requireStaff("users.unban");
  const userId = String(formData.get("userId") ?? "");
  const confirm = String(formData.get("confirmUnban") ?? "") === "1";
  if (!confirm) redirect(`/owner/users/${userId}?error=unban_confirm`);
  try {
    liftBan(user.id, userId);
  } catch {
    redirect(`/owner/users/${userId}?error=unban`);
  }
  redirect(`/owner/users/${userId}?saved=unban`);
}

export async function dccGrantSubscriptionAction(formData: FormData): Promise<void> {
  const { user, staff } = await requireStaff("subscriptions.grant");
  const userId = String(formData.get("userId") ?? "");
  const planRaw = String(formData.get("plan") ?? "plus");
  const source = String(formData.get("sourceKind") ?? "admin_granted");
  const duration = String(formData.get("duration") ?? "30");
  const reason = String(formData.get("reason") ?? "");
  const note = String(formData.get("note") ?? "");
  const confirmIndefinite = String(formData.get("confirmIndefinite") ?? "") === "1";

  if (!isPlanId(planRaw)) redirect(`/owner/users/${userId}?error=plan`);
  let days: number | null = Number(duration);
  if (duration === "indefinite") {
    if (staff.staffRole !== "owner" || !confirmIndefinite) {
      redirect(`/owner/users/${userId}?error=indefinite`);
    }
    days = null;
  } else if (!(GRANT_DURATIONS_DAYS as readonly number[]).includes(days)) {
    days = 30;
  }

  let sourceKind: "admin_granted" | "owner_grant" | "promotional" | "referral" = "admin_granted";
  if (source === "promotional" || source === "referral") {
    sourceKind = source;
  } else if (source === "owner_grant") {
    if (staff.staffRole !== "owner") {
      redirect(`/owner/users/${userId}?error=owner_grant`);
    }
    sourceKind = "owner_grant";
  } else if (staff.staffRole === "owner") {
    // OWNER grants default to OWNER_GRANT (no fake payment).
    sourceKind = "owner_grant";
  }

  const startsRaw = String(formData.get("startsAt") ?? "").trim();
  const startsAt = startsRaw ? new Date(startsRaw).toISOString() : undefined;
  if (startsRaw && Number.isNaN(Date.parse(startsRaw))) {
    redirect(`/owner/users/${userId}?error=starts`);
  }

  if (reason.trim().length < 3) {
    redirect(`/owner/users/${userId}?error=grant_reason`);
  }

  try {
    grantSubscription({
      actorId: user.id,
      userId,
      plan: planRaw as PlanId,
      sourceKind,
      days,
      reason,
      note,
      startsAt,
    });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      redirect(`/owner/users/${userId}?error=grant_forbidden`);
    }
    if (error instanceof NotFoundError) {
      redirect(`/owner/users/${userId}?error=grant_missing`);
    }
    redirect(`/owner/users/${userId}?error=grant`);
  }
  redirect(`/owner/users/${userId}?saved=grant&plan=${planRaw}`);
}

export async function dccRevokeSubscriptionAction(formData: FormData): Promise<void> {
  const { user } = await requireStaff("subscriptions.grant");
  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "revoked");
  const confirm = String(formData.get("confirm") ?? "") === "1";
  if (!confirm) redirect(`/owner/users/${userId}?error=confirm`);
  try {
    revokeToFree(user.id, userId, reason);
  } catch {
    redirect(`/owner/users/${userId}?error=revoke`);
  }
  redirect(`/owner/users/${userId}?saved=revoke`);
}

export async function dccExtendSubscriptionAction(formData: FormData): Promise<void> {
  const { user } = await requireStaff("subscriptions.grant");
  const userId = String(formData.get("userId") ?? "");
  const days = Number(formData.get("days") ?? "30");
  const reason = String(formData.get("reason") ?? "extend");
  try {
    extendSubscription(user.id, userId, Math.max(1, days), reason);
  } catch {
    redirect(`/owner/users/${userId}?error=extend`);
  }
  redirect(`/owner/users/${userId}?saved=extend`);
}

export async function dccAssignStaffAction(formData: FormData): Promise<void> {
  const { user } = await requireStaff("admins.manage");
  const email = String(formData.get("email") ?? "");
  const role = String(formData.get("role") ?? "moderator");
  const displayName = String(formData.get("displayName") ?? "");
  if (!isStaffRole(role) || role === "owner") redirect("/owner/staff?error=role");
  const permissions = ASSIGNABLE_PERMISSIONS.filter((perm) => formData.get(`perm_${perm}`) === "on");
  try {
    assignStaff({
      actorId: user.id,
      email,
      role: role as StaffRole,
      displayName,
      permissions: permissions as Permission[],
    });
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof NotFoundError) {
      redirect("/owner/staff?error=assign");
    }
    throw error;
  }
  redirect("/owner/staff?saved=1");
}

export async function dccUpdateStaffAction(formData: FormData): Promise<void> {
  const { user } = await requireStaff("admins.manage");
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  const displayName = String(formData.get("displayName") ?? "");
  const disabled = String(formData.get("disabled") ?? "");
  const permissions = ASSIGNABLE_PERMISSIONS.filter((perm) => formData.get(`perm_${perm}`) === "on");
  try {
    updateStaff({
      actorId: user.id,
      userId,
      role: isStaffRole(role) && role !== "owner" ? role : undefined,
      displayName,
      permissions: permissions as Permission[],
      disabled: disabled === "1" ? true : disabled === "0" ? false : undefined,
    });
  } catch {
    redirect("/owner/staff?error=update");
  }
  redirect("/owner/staff?saved=1");
}

export async function dccRevokeStaffAction(formData: FormData): Promise<void> {
  const { user } = await requireStaff("admins.manage");
  const userId = String(formData.get("userId") ?? "");
  try {
    revokeStaff(user.id, userId);
  } catch {
    redirect("/owner/staff?error=revoke");
  }
  redirect("/owner/staff?saved=1");
}

export async function dccModerateListingAction(formData: FormData): Promise<void> {
  const { user } = await requireStaff("listings.moderate");
  const listingId = String(formData.get("listingId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (decision !== "published" && decision !== "rejected" && decision !== "archived") {
    redirect("/owner/listings");
  }
  try {
    if (decision === "archived") {
      getDb()
        .prepare(`UPDATE listings SET status = 'archived', updated_at = ? WHERE id = ?`)
        .run(new Date().toISOString(), listingId);
      writeAudit(user.id, "listing.archive", "listing", listingId, null);
    } else {
      moderateListing(user.id, listingId, decision === "published" ? "published" : "rejected", reason || null);
    }
  } catch {
    redirect("/owner/listings?error=1");
  }
  redirect("/owner/listings?saved=1");
}

export async function dccAddAdminNoteAction(formData: FormData): Promise<void> {
  const { user } = await requireStaff("users.edit");
  const userId = String(formData.get("userId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (body.length < 2) redirect(`/owner/users/${userId}?error=note`);
  getDb()
    .prepare(`INSERT INTO admin_notes (id, user_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)`)
    .run(randomUUID(), userId, user.id, body, new Date().toISOString());
  writeAudit(user.id, "user.note", "user", userId, null);
  redirect(`/owner/users/${userId}?saved=note`);
}

export async function dccSaveSettingAction(formData: FormData): Promise<void> {
  const { user } = await requireStaff("settings.manage");
  const key = String(formData.get("key") ?? "");
  const value = String(formData.get("value") ?? "");
  try {
    setSetting(user.id, key, value);
  } catch {
    redirect("/owner/settings?error=1");
  }
  redirect("/owner/settings?saved=1");
}

export async function dccMarkNotificationAction(formData: FormData): Promise<void> {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  const all = String(formData.get("all") ?? "") === "1";
  if (all) markAllAdminNotificationsRead();
  else if (id) markAdminNotificationRead(id);
  redirect("/owner/notifications");
}

export async function dccCreateTicketAction(formData: FormData): Promise<void> {
  const { user } = await requireStaff("support.manage");
  const userId = String(formData.get("userId") ?? "");
  const category = String(formData.get("category") ?? "other");
  const subject = String(formData.get("subject") ?? "");
  const body = String(formData.get("body") ?? "");
  try {
    const id = createTicket({ userId, category, subject, body, actorId: user.id });
    redirect(`/owner/support/${id}`);
  } catch {
    redirect("/owner/support?error=1");
  }
}

export async function dccUpdateTicketAction(formData: FormData): Promise<void> {
  const { user } = await requireStaff("support.manage");
  const ticketId = String(formData.get("ticketId") ?? "");
  updateTicket(user.id, ticketId, {
    status: String(formData.get("status") || "") || undefined,
    priority: String(formData.get("priority") || "") || undefined,
    assigneeId: String(formData.get("assigneeId") || "") || undefined,
  });
  const message = String(formData.get("message") ?? "").trim();
  if (message) {
    addTicketMessage(user.id, ticketId, message, String(formData.get("internal") ?? "") === "1");
  }
  redirect(`/owner/support/${ticketId}`);
}

export async function dccSaveLegalDraftAction(formData: FormData): Promise<void> {
  const { user } = await requireStaff("legal.manage");
  ensureLegalDrafts();
  const docType = String(formData.get("docType") ?? "") as LegalDocType;
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "");
  const version = String(formData.get("version") ?? "").trim() || `draft-${Date.now()}`;
  const current = getLatestLegalDocument(docType);
  if (!current) redirect("/owner/legal?error=missing");
  getDb()
    .prepare(
      `INSERT INTO legal_documents (id, doc_type, version, title, body_md, status, created_at, published_at)
       VALUES (?, ?, ?, ?, ?, 'draft', ?, NULL)`,
    )
    .run(randomUUID(), docType, version, title || current.title, body || current.bodyMd, new Date().toISOString());
  writeAudit(user.id, "legal.draft", "legal", docType, { version });
  redirect("/owner/legal?saved=1");
}

export async function dccAssignBadgeAction(formData: FormData): Promise<void> {
  const { user } = await requireStaff("admins.manage");
  const userId = String(formData.get("userId") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const reason = String(formData.get("reason") ?? "");
  if (!isManualBadgeKind(kind)) redirect(`/owner/users/${userId}?error=badge`);
  try {
    assignManualBadge({ actorId: user.id, userId, kind, reason });
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof NotFoundError) {
      redirect(`/owner/users/${userId}?error=badge`);
    }
    throw error;
  }
  redirect(`/owner/users/${userId}?saved=badge`);
}

export async function dccRevokeBadgeAction(formData: FormData): Promise<void> {
  const { user } = await requireStaff("admins.manage");
  const userId = String(formData.get("userId") ?? "");
  const badgeId = String(formData.get("badgeId") ?? "");
  const reason = String(formData.get("reason") ?? "revoke");
  try {
    revokeManualBadge({ actorId: user.id, badgeId, reason });
  } catch {
    redirect(`/owner/users/${userId}?error=badge`);
  }
  redirect(`/owner/users/${userId}?saved=badge`);
}
