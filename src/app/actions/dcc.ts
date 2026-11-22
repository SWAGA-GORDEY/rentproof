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

export async function dccBanUserAction(formData: FormData): Promise<void> {
  const { user, staff } = await requireStaff("users.ban");
  const userId = String(formData.get("userId") ?? "");
  const kind = String(formData.get("kind") ?? "permanent");
  const reason = String(formData.get("reason") ?? "");
  const days = Number(formData.get("days") ?? "7");
  const features = ["listings", "bookings", "ai", "crm"].filter((feature) => formData.get(`feature_${feature}`) === "on");
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
    if (error instanceof ForbiddenError || error instanceof NotFoundError) {
      redirect(`/admin/users/${userId}?error=ban`);
    }
    throw error;
  }
  void staff;
  redirect(`/admin/users/${userId}?saved=ban`);
}

export async function dccUnbanUserAction(formData: FormData): Promise<void> {
  const { user } = await requireStaff("users.unban");
  const userId = String(formData.get("userId") ?? "");
  try {
    liftBan(user.id, userId);
  } catch {
    redirect(`/admin/users/${userId}?error=unban`);
  }
  redirect(`/admin/users/${userId}?saved=unban`);
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

  if (!isPlanId(planRaw)) redirect(`/admin/users/${userId}?error=plan`);
  let days: number | null = Number(duration);
  if (duration === "indefinite") {
    if (staff.staffRole !== "owner" || !confirmIndefinite) {
      redirect(`/admin/users/${userId}?error=indefinite`);
    }
    days = null;
  } else if (!(GRANT_DURATIONS_DAYS as readonly number[]).includes(days)) {
    days = 30;
  }

  const sourceKind =
    source === "promotional" || source === "referral" ? source : "admin_granted";

  try {
    grantSubscription({
      actorId: user.id,
      userId,
      plan: planRaw as PlanId,
      sourceKind,
      days,
      reason,
      note,
    });
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof NotFoundError) {
      redirect(`/admin/users/${userId}?error=grant`);
    }
    throw error;
  }
  redirect(`/admin/users/${userId}?saved=grant`);
}

export async function dccRevokeSubscriptionAction(formData: FormData): Promise<void> {
  const { user } = await requireStaff("subscriptions.grant");
  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "revoked");
  const confirm = String(formData.get("confirm") ?? "") === "1";
  if (!confirm) redirect(`/admin/users/${userId}?error=confirm`);
  try {
    revokeToFree(user.id, userId, reason);
  } catch {
    redirect(`/admin/users/${userId}?error=revoke`);
  }
  redirect(`/admin/users/${userId}?saved=revoke`);
}

export async function dccExtendSubscriptionAction(formData: FormData): Promise<void> {
  const { user } = await requireStaff("subscriptions.grant");
  const userId = String(formData.get("userId") ?? "");
  const days = Number(formData.get("days") ?? "30");
  const reason = String(formData.get("reason") ?? "extend");
  try {
    extendSubscription(user.id, userId, Math.max(1, days), reason);
  } catch {
    redirect(`/admin/users/${userId}?error=extend`);
  }
  redirect(`/admin/users/${userId}?saved=extend`);
}

export async function dccAssignStaffAction(formData: FormData): Promise<void> {
  const { user } = await requireStaff("admins.manage");
  const email = String(formData.get("email") ?? "");
  const role = String(formData.get("role") ?? "moderator");
  const displayName = String(formData.get("displayName") ?? "");
  if (!isStaffRole(role) || role === "owner") redirect("/admin/staff?error=role");
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
      redirect("/admin/staff?error=assign");
    }
    throw error;
  }
  redirect("/admin/staff?saved=1");
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
    redirect("/admin/staff?error=update");
  }
  redirect("/admin/staff?saved=1");
}

export async function dccRevokeStaffAction(formData: FormData): Promise<void> {
  const { user } = await requireStaff("admins.manage");
  const userId = String(formData.get("userId") ?? "");
  try {
    revokeStaff(user.id, userId);
  } catch {
    redirect("/admin/staff?error=revoke");
  }
  redirect("/admin/staff?saved=1");
}

export async function dccModerateListingAction(formData: FormData): Promise<void> {
  const { user } = await requireStaff("listings.moderate");
  const listingId = String(formData.get("listingId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (decision !== "published" && decision !== "rejected" && decision !== "archived") {
    redirect("/admin/listings");
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
    redirect("/admin/listings?error=1");
  }
  redirect("/admin/listings?saved=1");
}

export async function dccAddAdminNoteAction(formData: FormData): Promise<void> {
  const { user } = await requireStaff("users.edit");
  const userId = String(formData.get("userId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (body.length < 2) redirect(`/admin/users/${userId}?error=note`);
  getDb()
    .prepare(`INSERT INTO admin_notes (id, user_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)`)
    .run(randomUUID(), userId, user.id, body, new Date().toISOString());
  writeAudit(user.id, "user.note", "user", userId, null);
  redirect(`/admin/users/${userId}?saved=note`);
}

export async function dccSaveSettingAction(formData: FormData): Promise<void> {
  const { user } = await requireStaff("settings.manage");
  const key = String(formData.get("key") ?? "");
  const value = String(formData.get("value") ?? "");
  try {
    setSetting(user.id, key, value);
  } catch {
    redirect("/admin/settings?error=1");
  }
  redirect("/admin/settings?saved=1");
}

export async function dccMarkNotificationAction(formData: FormData): Promise<void> {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  const all = String(formData.get("all") ?? "") === "1";
  if (all) markAllAdminNotificationsRead();
  else if (id) markAdminNotificationRead(id);
  redirect("/admin/notifications");
}

export async function dccCreateTicketAction(formData: FormData): Promise<void> {
  const { user } = await requireStaff("support.manage");
  const userId = String(formData.get("userId") ?? "");
  const category = String(formData.get("category") ?? "other");
  const subject = String(formData.get("subject") ?? "");
  const body = String(formData.get("body") ?? "");
  try {
    const id = createTicket({ userId, category, subject, body, actorId: user.id });
    redirect(`/admin/support/${id}`);
  } catch {
    redirect("/admin/support?error=1");
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
  redirect(`/admin/support/${ticketId}`);
}

export async function dccSaveLegalDraftAction(formData: FormData): Promise<void> {
  const { user } = await requireStaff("legal.manage");
  ensureLegalDrafts();
  const docType = String(formData.get("docType") ?? "") as LegalDocType;
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "");
  const version = String(formData.get("version") ?? "").trim() || `draft-${Date.now()}`;
  const current = getLatestLegalDocument(docType);
  if (!current) redirect("/admin/legal?error=missing");
  getDb()
    .prepare(
      `INSERT INTO legal_documents (id, doc_type, version, title, body_md, status, created_at, published_at)
       VALUES (?, ?, ?, ?, ?, 'draft', ?, NULL)`,
    )
    .run(randomUUID(), docType, version, title || current.title, body || current.bodyMd, new Date().toISOString());
  writeAudit(user.id, "legal.draft", "legal", docType, { version });
  redirect("/admin/legal?saved=1");
}
