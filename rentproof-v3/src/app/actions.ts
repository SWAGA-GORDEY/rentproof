"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bootstrapOwner, createAccount, currentUser, login, logout, resendVerification, requireAdmin, requireUser, verifyAccountEmail } from "@/lib/auth";
import { execute, row } from "@/lib/db";
import { setListingStatus } from "@/lib/marketplace";

function text(form: FormData, name: string, max = 500): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function registerAction(form: FormData): Promise<void> {
  const name = text(form, "name", 80);
  const email = text(form, "email", 254).toLowerCase();
  const passwordValue = form.get("password");
  const password = typeof passwordValue === "string" ? passwordValue.slice(0, 128) : "";
  const role = text(form, "role", 16);
  let failure = "";
  try {
    if (form.get("terms") !== "on") throw new Error("Нужно принять правила сервиса.");
    if (role !== "tenant" && role !== "owner") throw new Error("Выберите, как планируете пользоваться сервисом.");
    await createAccount({ name, email, password, role });
  } catch (error) {
    failure = error instanceof Error ? error.message : "Не удалось создать аккаунт.";
  }
  if (failure) redirect(`/register?error=${encodeURIComponent(failure.slice(0, 180))}`);
  redirect(`/verify-email?email=${encodeURIComponent(email)}`);
}

export async function verifyEmailAction(form: FormData): Promise<void> {
  const email = text(form, "email", 254).toLowerCase();
  let failure = "";
  try {
    await verifyAccountEmail(email, text(form, "code", 6));
  } catch (error) {
    failure = error instanceof Error ? error.message : "Не удалось подтвердить email.";
  }
  if (failure) redirect(`/verify-email?email=${encodeURIComponent(email)}&error=${encodeURIComponent(failure.slice(0, 180))}`);
  redirect(`/login?verified=1&email=${encodeURIComponent(email)}`);
}

export async function resendVerificationAction(form: FormData): Promise<void> {
  const email = text(form, "email", 254).toLowerCase();
  let failure = "";
  try {
    await resendVerification(email);
  } catch (error) {
    failure = error instanceof Error ? error.message : "Не удалось отправить код.";
  }
  if (failure) redirect(`/verify-email?email=${encodeURIComponent(email)}&error=${encodeURIComponent(failure.slice(0, 180))}`);
  redirect(`/verify-email?email=${encodeURIComponent(email)}&sent=1`);
}

export async function bootstrapOwnerAction(form: FormData): Promise<void> {
  const email = text(form, "email", 254).toLowerCase();
  let failure = "";
  try {
    const passwordValue = form.get("password");
    await bootstrapOwner({ email, name: text(form, "name", 80), password: typeof passwordValue === "string" ? passwordValue.slice(0, 128) : "", token: text(form, "token", 256) });
  } catch (error) {
    failure = error instanceof Error ? error.message : "Не удалось создать владельца.";
  }
  if (failure) redirect(`/setup?error=${encodeURIComponent(failure.slice(0, 180))}`);
  redirect("/admin");
}

export async function loginAction(form: FormData): Promise<void> {
  const email = text(form, "email", 254);
  const passwordValue = form.get("password");
  const password = typeof passwordValue === "string" ? passwordValue.slice(0, 128) : "";
  try {
    await login(email, password);
  } catch {
    redirect("/login?error=Неверный%20email%20или%20пароль.");
  }
  const next = text(form, "next", 300);
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/account");
}

export async function logoutAction(): Promise<void> {
  await logout();
  redirect("/");
}

export async function becomeOwnerAction(): Promise<void> {
  const user = await requireUser();
  if (user.role === "tenant") {
    await execute("UPDATE users SET role='owner' WHERE id=$1 AND role='tenant'", [user.id]);
  }
  revalidatePath("/account");
  redirect("/account/listings/new");
}

export async function createListingAction(form: FormData): Promise<void> {
  const user = await requireUser();
  if (user.role === "tenant") redirect("/account?error=Для%20объявлений%20нужен%20профиль%20арендодателя");
  const title = text(form, "title", 100);
  const category = text(form, "category", 40);
  const city = text(form, "city", 80);
  const description = text(form, "description", 3000);
  const price = Number(text(form, "price", 9));
  const deposit = Number(text(form, "deposit", 9) || 0);
  if (title.length < 5 || city.length < 2 || description.length < 30 || !Number.isSafeInteger(price) || price < 1 || price > 10_000_000 || !Number.isSafeInteger(deposit) || deposit < 0 || deposit > 100_000_000) {
    redirect("/account/listings/new?error=Проверьте%20название,%20описание%20и%20цены");
  }
  await execute(
    `INSERT INTO listings (id,owner_id,title,category,city,description,price_per_day,deposit,status,created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9)`,
    [randomUUID(), user.id, title, category, city, description, price, deposit, new Date().toISOString()],
  );
  revalidatePath("/account");
  revalidatePath("/account/listings");
  redirect("/account/listings?created=1");
}

export async function requestBookingAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const listingId = text(form, "listing_id", 80);
  const startDate = text(form, "start_date", 10);
  const endDate = text(form, "end_date", 10);
  const listing = await row<{ id: string; owner_id: string; price_per_day: number; status: string }>(
    "SELECT id,owner_id,price_per_day,status FROM listings WHERE id=$1", [listingId],
  );
  if (!listing || listing.status !== "published" || listing.owner_id === user.id) redirect(`/catalog/${encodeURIComponent(listingId)}?error=Это%20объявление%20нельзя%20забронировать`);
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const days = Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || !Number.isInteger(days) || days < 1 || days > 90 || start < new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z")) {
    redirect(`/catalog/${encodeURIComponent(listingId)}?error=Выберите%20корректные%20даты%20до%2090%20дней`);
  }
  const overlap = await row(
    `SELECT id FROM bookings WHERE listing_id=$1 AND status IN ('pending','confirmed')
     AND start_date < $3 AND end_date > $2 LIMIT 1`, [listing.id, startDate, endDate],
  );
  if (overlap) redirect(`/catalog/${encodeURIComponent(listingId)}?error=Эти%20даты%20уже%20запрошены`);
  await execute(
    `INSERT INTO bookings (id,listing_id,renter_id,start_date,end_date,days,total_price,status,created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8)`,
    [randomUUID(), listing.id, user.id, startDate, endDate, days, days * Number(listing.price_per_day), new Date().toISOString()],
  );
  revalidatePath("/account");
  revalidatePath("/account/bookings");
  redirect("/account/bookings?requested=1");
}

export async function moderateListingAction(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = text(form, "id", 80);
  const status = text(form, "status", 16);
  if (status !== "published" && status !== "hidden") redirect("/owner/listings");
  await setListingStatus(id, status);
  await execute("INSERT INTO audit_log (id,actor_id,action,subject_id,created_at) VALUES ($1,$2,$3,$4,$5)", [randomUUID(), admin.id, `listing.${status}`, id, new Date().toISOString()]);
  revalidatePath("/owner");
  revalidatePath("/owner/listings");
  revalidatePath("/catalog");
  redirect("/owner/listings?saved=1");
}

export async function changeBookingStatusAction(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = text(form, "id", 80);
  const status = text(form, "status", 16);
  const transitions: Record<string, string[]> = { pending: ["confirmed", "rejected"], confirmed: ["completed"] };
  const current = await row<{ status: string }>("SELECT status FROM bookings WHERE id=$1", [id]);
  if (!current || !transitions[current.status]?.includes(status)) redirect("/owner/bookings?error=Недопустимое%20изменение%20статуса");
  const changed = await execute("UPDATE bookings SET status=$1 WHERE id=$2 AND status=$3", [status, id, current.status]);
  if (!changed) redirect("/owner/bookings?error=Заявка%20уже%20обновлена");
  await execute("INSERT INTO audit_log (id,actor_id,action,subject_id,created_at) VALUES ($1,$2,$3,$4,$5)", [randomUUID(), admin.id, `booking.${status}`, id, new Date().toISOString()]);
  revalidatePath("/owner/bookings");
  revalidatePath("/account/bookings");
  redirect("/owner/bookings?saved=1");
}

export async function currentUserForLayout() {
  return currentUser();
}
