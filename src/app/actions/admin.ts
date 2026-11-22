"use server";

import { redirect } from "next/navigation";
import { setBlocked } from "@/lib/admin";
import { requireStaff } from "@/lib/current-user";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { moderateListing } from "@/lib/listings";
import { resolveComplaint } from "@/lib/complaints";
import { setReviewVisibility } from "@/lib/reviews";

export async function moderateListingAction(formData: FormData): Promise<void> {
  const { user } = await requireStaff("listings.moderate");
  const listingId = String(formData.get("listingId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (decision !== "published" && decision !== "rejected") {
    redirect("/admin/listings");
  }
  if (decision === "rejected" && reason.length < 3) {
    redirect(`/admin/listings?error=reason`);
  }
  try {
    moderateListing(user.id, listingId, decision, reason || null);
  } catch (error) {
    if (error instanceof NotFoundError) {
      redirect("/admin/listings?error=missing");
    }
    throw error;
  }
  redirect("/admin/listings?saved=1");
}

export async function blockUserAction(formData: FormData): Promise<void> {
  const blocked = String(formData.get("blocked") ?? "") === "1";
  const { user } = await requireStaff(blocked ? "users.ban" : "users.unban");
  const userId = String(formData.get("userId") ?? "");
  try {
    setBlocked(user.id, userId, blocked);
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof NotFoundError) {
      redirect("/admin/users?error=forbidden");
    }
    throw error;
  }
  redirect("/admin/users?saved=1");
}

export async function resolveComplaintAction(formData: FormData): Promise<void> {
  const { user } = await requireStaff("listings.moderate");
  const complaintId = String(formData.get("complaintId") ?? "");
  const status = String(formData.get("status") ?? "");
  const resolution = String(formData.get("resolution") ?? "").trim();
  if ((status !== "resolved" && status !== "dismissed") || resolution.length < 3) {
    redirect("/admin/reports?error=resolution");
  }
  try {
    resolveComplaint(user.id, complaintId, status, resolution);
  } catch (error) {
    if (error instanceof NotFoundError) {
      redirect("/admin/reports?error=missing");
    }
    throw error;
  }
  redirect("/admin/reports?saved=1");
}

export async function hideReviewAction(formData: FormData): Promise<void> {
  const { user } = await requireStaff("listings.moderate");
  const reviewId = String(formData.get("reviewId") ?? "");
  const status = String(formData.get("status") ?? "") === "hidden" ? "hidden" : "published";
  try {
    setReviewVisibility(user.id, reviewId, status);
  } catch (error) {
    if (error instanceof NotFoundError) {
      redirect("/admin/reports?error=missing");
    }
    throw error;
  }
  redirect("/admin/reports?saved=1");
}
