"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { ConflictError, ForbiddenError, ImageRejectedError, NotFoundError, PlanLimitError, RateLimitError } from "@/lib/errors";
import { parseListingForm, readUpload } from "@/lib/forms";
import { removeListingImage, saveListingImage } from "@/lib/images";
import { createListing, getOwnedListing, setOwnerListingStatus, updateListing } from "@/lib/listings";
import { consumeRateLimit } from "@/lib/rate-limit";
import type { FormState } from "@/app/actions/auth";

async function actor() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function saveListingAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await actor();
  const parsed = parseListingForm(formData);
  if (!parsed.ok) {
    return { fieldErrors: parsed.fieldErrors };
  }
  const listingId = typeof formData.get("listingId") === "string" ? String(formData.get("listingId")) : "";
  try {
    consumeRateLimit(`listing:${user.id}`, 30, 60 * 60 * 1000);
    if (listingId) {
      updateListing(user.id, listingId, parsed.value, parsed.value.intent === "submit");
      redirect(`/listings/${listingId}/edit?saved=1`);
    }
    const id = createListing(user.id, parsed.value, parsed.value.intent === "submit");
    redirect(`/listings/${id}/edit?saved=1`);
  } catch (error) {
    return listingError(error);
  }
}

export async function listingStatusAction(formData: FormData): Promise<void> {
  const user = await actor();
  const listingId = String(formData.get("listingId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (status !== "draft" && status !== "pending" && status !== "published" && status !== "archived") {
    redirect("/account/listings");
  }
  try {
    setOwnerListingStatus(user.id, listingId, status as "draft" | "pending" | "published" | "archived");
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof NotFoundError) {
      redirect("/account/listings?error=forbidden");
    }
    redirect("/account/listings?error=status");
  }
  redirect(`/listings/${listingId}/edit?saved=1`);
}

export async function uploadListingPhotoAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await actor();
  const listingId = String(formData.get("listingId") ?? "");
  const file = readUpload(formData, "photo");
  if (!file) {
    return { message: "Выберите файл JPEG, PNG или WebP до 2 МБ." };
  }
  try {
    consumeRateLimit(`photo:${user.id}`, 40, 60 * 60 * 1000);
    getOwnedListing(user.id, listingId);
    const bytes = new Uint8Array(await file.arrayBuffer());
    saveListingImage(listingId, bytes);
  } catch (error) {
    if (isRedirect(error)) {
      throw error;
    }
    if (error instanceof ImageRejectedError) {
      return { message: "Файл не принят. Нужен JPEG, PNG или WebP до 2 МБ, не больше 8 снимков." };
    }
    if (error instanceof ForbiddenError || error instanceof NotFoundError) {
      return { message: "Нельзя добавить фото к чужому объявлению." };
    }
    if (error instanceof RateLimitError) {
      return { message: "Слишком много загрузок. Подождите и повторите." };
    }
    console.error("photo upload failed");
    return { message: "Не удалось сохранить фотографию." };
  }
  redirect(`/listings/${listingId}/edit?saved=1`);
}

export async function deleteListingPhotoAction(formData: FormData): Promise<void> {
  const user = await actor();
  const listingId = String(formData.get("listingId") ?? "");
  const imageId = String(formData.get("imageId") ?? "");
  try {
    getOwnedListing(user.id, listingId);
    removeListingImage(listingId, imageId);
  } catch {
    redirect("/account/listings?error=forbidden");
  }
  redirect(`/listings/${listingId}/edit?saved=1`);
}

function listingError(error: unknown): FormState {
  if (error instanceof PlanLimitError) {
    return { message: `На тарифе ${error.plan.toUpperCase()} доступно ${error.limit} активных объявлений. Архив не считается.` };
  }
  if (error instanceof ConflictError) {
    return { message: "Архивное объявление нельзя изменить. Создайте новое." };
  }
  if (error instanceof ForbiddenError) {
    return { message: "Можно менять только свои объявления." };
  }
  if (error instanceof NotFoundError) {
    return { message: "Объявление не найдено." };
  }
  if (error instanceof RateLimitError) {
    return { message: "Слишком много сохранений. Подождите и повторите." };
  }
  if (isRedirect(error)) {
    throw error;
  }
  console.error("listing action failed");
  return { message: "Не удалось сохранить объявление." };
}

function isRedirect(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error && String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT");
}
