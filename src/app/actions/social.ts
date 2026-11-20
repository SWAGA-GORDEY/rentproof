"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/current-user";
import { saveContactMessage, createComplaint } from "@/lib/complaints";
import { addEvidence } from "@/lib/evidence";
import { ConflictError, ForbiddenError, ImageRejectedError, NotFoundError, RateLimitError } from "@/lib/errors";
import { parseComplaintForm, parseContactForm, parsePasswordForm, parsePlanForm, readUploads, safePath } from "@/lib/forms";
import { toggleFavorite } from "@/lib/favorites";
import { consumeRateLimit } from "@/lib/rate-limit";
import { assignDemoPlan } from "@/lib/subscriptions";
import { changePassword, InvalidCredentialsError } from "@/lib/users";
import { clearSession } from "@/lib/current-user";
import { markNotificationsRead } from "@/lib/notifications";

async function actor() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function toggleFavoriteAction(formData: FormData): Promise<void> {
  const user = await actor();
  const listingId = String(formData.get("listingId") ?? "");
  const next = safePath(formData.get("returnTo"), `/catalog/${listingId}`);
  try {
    toggleFavorite(user.id, listingId);
  } catch {
    redirect(`${next}${next.includes("?") ? "&" : "?"}error=favorite`);
  }
  redirect(next);
}

export async function complaintAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await actor();
  const parsed = parseComplaintForm(formData);
  if (!parsed.ok) {
    return { fieldErrors: parsed.fieldErrors };
  }
  try {
    consumeRateLimit(`complaint:${user.id}`, 10, 60 * 60 * 1000);
    createComplaint(user.id, parsed.value.targetType, parsed.value.targetId, parsed.value.reason);
  } catch (error) {
    if (error instanceof ConflictError) {
      return { message: "Жалоба по этому объекту уже открыта." };
    }
    if (error instanceof NotFoundError) {
      return { message: "Объект жалобы не найден." };
    }
    if (error instanceof RateLimitError) {
      return { message: "Слишком много жалоб. Подождите и повторите." };
    }
    console.error("complaint failed");
    return { message: "Не удалось отправить жалобу." };
  }
  return { message: "Жалоба отправлена. Она видна в административной панели." };
}

export async function evidenceAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await actor();
  const bookingId = String(formData.get("bookingId") ?? "");
  const phase = String(formData.get("phase") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  if (phase !== "before" && phase !== "after") {
    return { message: "Выберите этап: до аренды или после." };
  }
  if (description.length < 5 || description.length > 1000) {
    return { fieldErrors: { description: "Описание: от 5 до 1000 символов" } };
  }
  const files = readUploads(formData, "photos");
  if (files.length < 1 || files.length > 4) {
    return { message: "Приложите от 1 до 4 фотографий JPEG, PNG или WebP." };
  }
  try {
    consumeRateLimit(`evidence:${user.id}`, 20, 60 * 60 * 1000);
    const bytes = await Promise.all(files.map(async (file) => new Uint8Array(await file.arrayBuffer())));
    addEvidence(user.id, bookingId, phase, description, bytes);
  } catch (error) {
    if (typeof error === "object" && error !== null && "digest" in error && String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    if (error instanceof ImageRejectedError) {
      return { message: "Фото не принято. Нужен JPEG, PNG или WebP до 2 МБ." };
    }
    if (error instanceof ForbiddenError || error instanceof NotFoundError) {
      return { message: "Эта заявка вам недоступна." };
    }
    if (error instanceof ConflictError) {
      return { message: "Для этого статуса заявки выбранный этап недоступен." };
    }
    if (error instanceof RateLimitError) {
      return { message: "Слишком много загрузок. Подождите и повторите." };
    }
    console.error("evidence failed");
    return { message: "Не удалось сохранить фиксацию состояния." };
  }
  redirect(`/account/bookings/${bookingId}?saved=1`);
}

export async function contactAction(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseContactForm(formData);
  if (!parsed.ok) {
    return { fieldErrors: parsed.fieldErrors };
  }
  try {
    consumeRateLimit(`contact:${parsed.value.email}`, 5, 60 * 60 * 1000);
    saveContactMessage(parsed.value.name, parsed.value.email, parsed.value.message);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { message: "Слишком много сообщений с этого адреса. Попробуйте позже." };
    }
    console.error("contact failed");
    return { message: "Не удалось сохранить сообщение." };
  }
  return { message: "Сообщение сохранено. Почтовая отправка не выполняется, пока канал не настроен." };
}

export async function selectPlanAction(formData: FormData): Promise<void> {
  const user = await actor();
  const plan = parsePlanForm(formData);
  if (!plan) {
    redirect("/pricing?error=plan");
  }
  assignDemoPlan(user.id, plan);
  redirect("/account/settings?plan=1");
}

export async function changePasswordAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await actor();
  const parsed = parsePasswordForm(formData);
  if (!parsed.ok) {
    return { fieldErrors: parsed.fieldErrors };
  }
  try {
    await changePassword(user.id, parsed.value.currentPassword, parsed.value.nextPassword);
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return { fieldErrors: { currentPassword: "Текущий пароль не подошёл" } };
    }
    console.error("password change failed");
    return { message: "Не удалось сменить пароль." };
  }
  await clearSession();
  redirect("/login?reason=password");
}

export async function markReadAction(): Promise<void> {
  const user = await actor();
  markNotificationsRead(user.id);
  redirect("/account");
}
