"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { ConflictError, ForbiddenError, NotFoundError, RateLimitError } from "@/lib/errors";
import { isPlanId } from "@/lib/plans";
import {
  activateFreePlan,
  cancelLocalPayment,
  cancelSubscriptionRenewal,
  createRentalPayment,
  createSubscriptionPayment,
  fakeFailPayment,
  fakeSucceedPayment,
  getPayment,
  paymentsConfigured,
  syncPayment,
} from "@/lib/payments";
import { ensureRentalOrder } from "@/lib/rental-orders";
import { readYooKassaConfig } from "@/lib/yookassa";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function startSubscriptionCheckoutAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const plan = String(formData.get("plan") ?? "");
  if (!isPlanId(plan)) {
    redirect("/pricing?error=plan");
  }
  if (plan === "free") {
    activateFreePlan(user.id);
    redirect("/account/subscription?ok=free");
  }
  if (!paymentsConfigured()) {
    redirect("/pricing?error=billing");
  }
  try {
    const result = await createSubscriptionPayment(user.id, plan);
    if (result.confirmationUrl) {
      redirect(result.confirmationUrl);
    }
    redirect(`/payments/return?paymentId=${result.paymentId}`);
  } catch (error) {
    if (error instanceof RateLimitError) {
      redirect("/pricing?error=rate");
    }
    if (error instanceof ConflictError) {
      redirect(`/pricing?error=${error.code}`);
    }
    console.error("subscription_checkout_failed");
    redirect("/pricing?error=payment");
  }
}

export async function startRentalCheckoutAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) {
    redirect("/account/bookings?error=booking");
  }
  if (!paymentsConfigured()) {
    redirect(`/account/bookings/${bookingId}?error=billing`);
  }
  try {
    const order = ensureRentalOrder(user.id, user.isAdmin, bookingId);
    const result = await createRentalPayment(user.id, order.id);
    if (result.confirmationUrl) {
      redirect(result.confirmationUrl);
    }
    redirect(`/payments/return?paymentId=${result.paymentId}`);
  } catch (error) {
    if (error instanceof RateLimitError) {
      redirect(`/account/bookings/${bookingId}?error=rate`);
    }
    if (error instanceof ForbiddenError) {
      redirect(`/account/bookings/${bookingId}?error=forbidden`);
    }
    if (error instanceof NotFoundError) {
      redirect("/account/bookings?error=missing");
    }
    if (error instanceof ConflictError) {
      redirect(`/account/bookings/${bookingId}?error=${error.code}`);
    }
    console.error("rental_checkout_failed");
    redirect(`/account/bookings/${bookingId}?error=payment`);
  }
}

export async function syncPaymentAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const paymentId = String(formData.get("paymentId") ?? "");
  if (!paymentId) {
    redirect("/account/payments");
  }
  try {
    const payment = await syncPayment(paymentId, user.id);
    if (payment.status === "succeeded") {
      redirect(`/payments/success?paymentId=${payment.id}`);
    }
    if (payment.status === "canceled" || payment.status === "failed") {
      redirect(`/payments/fail?paymentId=${payment.id}`);
    }
    redirect(`/payments/return?paymentId=${payment.id}`);
  } catch {
    redirect("/account/payments?error=sync");
  }
}

export async function cancelPaymentAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const paymentId = String(formData.get("paymentId") ?? "");
  try {
    await cancelLocalPayment(user.id, paymentId);
  } catch {
    redirect(`/payments/fail?paymentId=${paymentId}&error=cancel`);
  }
  redirect(`/payments/fail?paymentId=${paymentId}`);
}

export async function cancelRenewalAction(): Promise<void> {
  const user = await requireUser();
  cancelSubscriptionRenewal(user.id);
  redirect("/account/subscription?renewal=off");
}

/** Only available when RENTPROOF_YOOKASSA_FAKE=1 (or node test). Simulates shopper result. */
export async function fakeConfirmAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const config = readYooKassaConfig();
  if (!config.fake) {
    redirect("/account/payments?error=fake");
  }
  const paymentId = String(formData.get("paymentId") ?? "");
  const outcome = String(formData.get("outcome") ?? "success");
  try {
    const existing = getPayment(paymentId);
    if (!existing || (existing.userId !== user.id && !user.isAdmin)) {
      redirect("/account/payments?error=forbidden");
    }
    const payment = outcome === "fail" ? await fakeFailPayment(paymentId) : await fakeSucceedPayment(paymentId);
    redirect(payment.status === "succeeded" ? `/payments/success?paymentId=${paymentId}` : `/payments/fail?paymentId=${paymentId}`);
  } catch {
    redirect(`/payments/fail?paymentId=${paymentId}`);
  }
}
