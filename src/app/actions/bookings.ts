"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/app/actions/auth";
import { assertFeatureAllowed } from "@/lib/bans";
import { getCurrentUser } from "@/lib/current-user";
import {
  cancelBooking,
  completeBooking,
  confirmBooking,
  createBooking,
  rejectBooking,
} from "@/lib/bookings";
import { ConflictError, FeatureBlockedError, ForbiddenError, NotFoundError, RateLimitError } from "@/lib/errors";
import { parseBookingForm, parseReviewForm, safePath } from "@/lib/forms";
import { consumeRateLimit } from "@/lib/rate-limit";
import { createReview } from "@/lib/reviews";

async function actor() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function createBookingAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await actor();
  try {
    assertFeatureAllowed(user.id, "bookings");
  } catch (error) {
    if (error instanceof FeatureBlockedError) {
      return { message: "Бронирования ограничены для этого аккаунта." };
    }
    throw error;
  }
  const parsed = parseBookingForm(formData);
  if (!parsed.ok) {
    return { fieldErrors: parsed.fieldErrors };
  }
  try {
    consumeRateLimit(`booking:${user.id}`, 20, 60 * 60 * 1000);
    const result = createBooking(user.id, parsed.value.listingId, parsed.value.startDate, parsed.value.endDate, parsed.value.note);
    redirect(`/account/bookings/${result.id}?created=${result.created ? "1" : "0"}`);
  } catch (error) {
    if (isRedirect(error)) {
      throw error;
    }
    if (error instanceof RateLimitError) {
      return { message: "Слишком много заявок. Подождите и повторите." };
    }
    if (error instanceof ConflictError && error.code === "overlap") {
      return { message: "Эти даты пересекаются с уже подтверждённым бронированием." };
    }
    if (error instanceof ConflictError && error.code === "own-listing") {
      return { message: "Нельзя бронировать собственное объявление." };
    }
    if (error instanceof ConflictError) {
      return { message: "Даты не подходят: проверьте срок, минимум и окно доступности. Оплата не списывается." };
    }
    console.error("booking create failed");
    return { message: "Не удалось отправить заявку." };
  }
}

export async function bookingDecisionAction(formData: FormData): Promise<void> {
  const user = await actor();
  const bookingId = String(formData.get("bookingId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const next = safePath(formData.get("returnTo"), `/account/bookings/${bookingId}`);
  try {
    if (decision === "confirm") {
      confirmBooking(user.id, bookingId);
    } else if (decision === "reject") {
      rejectBooking(user.id, bookingId);
    } else if (decision === "cancel") {
      cancelBooking(user.id, bookingId);
    } else if (decision === "complete") {
      completeBooking(user.id, bookingId);
    } else {
      redirect(next);
    }
  } catch (error) {
    if (isRedirect(error)) {
      throw error;
    }
    const code = error instanceof ConflictError ? error.code : error instanceof ForbiddenError ? "forbidden" : "failed";
    redirect(`${next}${next.includes("?") ? "&" : "?"}error=${code}`);
  }
  redirect(next);
}

export async function createReviewAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await actor();
  const parsed = parseReviewForm(formData);
  if (!parsed.ok) {
    return { fieldErrors: parsed.fieldErrors };
  }
  try {
    createReview(user.id, parsed.value.bookingId, parsed.value.rating, parsed.value.body);
  } catch (error) {
    if (error instanceof ConflictError && error.code === "duplicate") {
      return { message: "Отзыв по этому бронированию уже сохранён." };
    }
    if (error instanceof ConflictError) {
      return { message: "Отзыв можно оставить после завершённой аренды." };
    }
    if (error instanceof ForbiddenError || error instanceof NotFoundError) {
      return { message: "Это бронирование вам недоступно." };
    }
    console.error("review failed");
    return { message: "Не удалось сохранить отзыв." };
  }
  redirect("/account/reviews?saved=1");
}

function isRedirect(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error && String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT");
}
