import { isCategoryId, type CategoryId } from "@/lib/categories";
import { isIsoDate } from "@/lib/format";
import type { SpecItem } from "@/lib/listings";
import { isPlanId, type PlanId } from "@/lib/plans";

export type FieldErrors = Record<string, string>;

const NAME_PATTERN = /^[\p{L}\s.'-]{2,80}$/u;
const CITY_PATTERN = /^[\p{L}\s.'-]{2,40}$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ListingFormValue = {
  title: string;
  categoryId: CategoryId;
  city: string;
  description: string;
  pricePerDay: number;
  deposit: number;
  minDays: number;
  conditionScore: number | null;
  conditionNotes: string | null;
  specs: SpecItem[];
  availableFrom: string | null;
  availableTo: string | null;
  bookable: boolean;
  intent: "draft" | "submit";
};

export function parseListingForm(formData: FormData): { ok: true; value: ListingFormValue } | { ok: false; fieldErrors: FieldErrors } {
  const title = readText(formData, "title");
  const categoryId = readText(formData, "categoryId");
  const city = readText(formData, "city");
  const description = readText(formData, "description");
  const pricePerDay = readInt(readText(formData, "pricePerDay"));
  const deposit = readInt(readText(formData, "deposit"));
  const minDays = readInt(readText(formData, "minDays"));
  const conditionRaw = readText(formData, "conditionScore");
  const conditionNotes = readText(formData, "conditionNotes");
  const availableFrom = readText(formData, "availableFrom");
  const availableTo = readText(formData, "availableTo");
  const intent = readText(formData, "intent");
  const fieldErrors: FieldErrors = {};

  if (title.length < 4 || title.length > 120) {
    fieldErrors.title = "Название: от 4 до 120 символов";
  }
  if (!isCategoryId(categoryId)) {
    fieldErrors.categoryId = "Выберите категорию";
  }
  if (!CITY_PATTERN.test(city)) {
    fieldErrors.city = "Город: от 2 до 40 букв";
  }
  if (description.length < 20 || description.length > 4000) {
    fieldErrors.description = "Описание: от 20 до 4000 символов";
  }
  if (pricePerDay === null || pricePerDay < 1 || pricePerDay > 10_000_000) {
    fieldErrors.pricePerDay = "Цена за сутки: целое число от 1 до 10 000 000";
  }
  if (deposit === null || deposit < 0 || deposit > 50_000_000) {
    fieldErrors.deposit = "Залог: целое число от 0 до 50 000 000";
  }
  if (minDays === null || minDays < 1 || minDays > 30) {
    fieldErrors.minDays = "Минимальный срок: от 1 до 30 суток";
  }
  let conditionScore: number | null = null;
  if (conditionRaw.length > 0) {
    const parsed = readInt(conditionRaw);
    if (parsed === null || parsed < 0 || parsed > 100) {
      fieldErrors.conditionScore = "Оценка владельца: целое число от 0 до 100 или пусто";
    } else {
      conditionScore = parsed;
    }
  }
  if (conditionNotes.length > 500) {
    fieldErrors.conditionNotes = "Заметки о состоянии: до 500 символов";
  }
  if (availableFrom && !isIsoDate(availableFrom)) {
    fieldErrors.availableFrom = "Дата начала доступности некорректна";
  }
  if (availableTo && !isIsoDate(availableTo)) {
    fieldErrors.availableTo = "Дата конца доступности некорректна";
  }
  if (availableFrom && availableTo && availableTo < availableFrom) {
    fieldErrors.availableTo = "Конец доступности не раньше начала";
  }
  if (intent !== "draft" && intent !== "submit") {
    fieldErrors.intent = "Выберите сохранение черновика или отправку на модерацию";
  }
  const specs = parseSpecs(readText(formData, "specs"));
  if (specs === null) {
    fieldErrors.specs = "Характеристики: до 12 строк в виде «Название: значение»";
  }

  if (Object.keys(fieldErrors).length > 0 || !isCategoryId(categoryId) || pricePerDay === null || deposit === null || minDays === null || specs === null || (intent !== "draft" && intent !== "submit")) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    value: {
      title,
      categoryId,
      city,
      description,
      pricePerDay,
      deposit,
      minDays,
      conditionScore,
      conditionNotes: conditionNotes || null,
      specs,
      availableFrom: availableFrom || null,
      availableTo: availableTo || null,
      bookable: formData.get("bookable") === "on",
      intent,
    },
  };
}

export function parseBookingForm(formData: FormData): { ok: true; value: { listingId: string; startDate: string; endDate: string; note: string | null } } | { ok: false; fieldErrors: FieldErrors } {
  const listingId = readText(formData, "listingId");
  const startDate = readText(formData, "startDate");
  const endDate = readText(formData, "endDate");
  const note = readText(formData, "note");
  const fieldErrors: FieldErrors = {};
  if (!/^[0-9a-z-]{8,80}$/i.test(listingId)) {
    fieldErrors.listingId = "Объявление не выбрано";
  }
  if (!isIsoDate(startDate)) {
    fieldErrors.startDate = "Укажите дату начала";
  }
  if (!isIsoDate(endDate)) {
    fieldErrors.endDate = "Укажите дату окончания";
  }
  if (note.length > 500) {
    fieldErrors.note = "Комментарий: до 500 символов";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  return { ok: true, value: { listingId, startDate, endDate, note: note || null } };
}

export function parseReviewForm(formData: FormData): { ok: true; value: { bookingId: string; rating: number; body: string } } | { ok: false; fieldErrors: FieldErrors } {
  const bookingId = readText(formData, "bookingId");
  const rating = readInt(readText(formData, "rating"));
  const body = readText(formData, "body");
  const fieldErrors: FieldErrors = {};
  if (!/^[0-9a-z-]{8,80}$/i.test(bookingId)) {
    fieldErrors.bookingId = "Бронирование не выбрано";
  }
  if (rating === null || rating < 1 || rating > 5) {
    fieldErrors.rating = "Оценка: от 1 до 5";
  }
  if (body.length < 10 || body.length > 2000) {
    fieldErrors.body = "Отзыв: от 10 до 2000 символов";
  }
  if (Object.keys(fieldErrors).length > 0 || rating === null) {
    return { ok: false, fieldErrors };
  }
  return { ok: true, value: { bookingId, rating, body } };
}

export function parseComplaintForm(formData: FormData): { ok: true; value: { targetType: "listing" | "review" | "user"; targetId: string; reason: string } } | { ok: false; fieldErrors: FieldErrors } {
  const targetType = readText(formData, "targetType");
  const targetId = readText(formData, "targetId");
  const reason = readText(formData, "reason");
  const fieldErrors: FieldErrors = {};
  if (targetType !== "listing" && targetType !== "review" && targetType !== "user") {
    fieldErrors.targetType = "Неизвестный тип жалобы";
  }
  if (!/^[0-9a-z-]{8,80}$/i.test(targetId)) {
    fieldErrors.targetId = "Объект не выбран";
  }
  if (reason.length < 10 || reason.length > 1000) {
    fieldErrors.reason = "Опишите причину: от 10 до 1000 символов";
  }
  if (Object.keys(fieldErrors).length > 0 || (targetType !== "listing" && targetType !== "review" && targetType !== "user")) {
    return { ok: false, fieldErrors };
  }
  return { ok: true, value: { targetType, targetId, reason } };
}

export function parseContactForm(formData: FormData): { ok: true; value: { name: string; email: string; message: string } } | { ok: false; fieldErrors: FieldErrors } {
  const name = readText(formData, "name");
  const email = readText(formData, "email").toLowerCase();
  const message = readText(formData, "message");
  const fieldErrors: FieldErrors = {};
  if (!NAME_PATTERN.test(name)) {
    fieldErrors.name = "Укажите имя";
  }
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    fieldErrors.email = "Укажите почту";
  }
  if (message.length < 10 || message.length > 2000) {
    fieldErrors.message = "Сообщение: от 10 до 2000 символов";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  return { ok: true, value: { name, email, message } };
}

export function parseAiForm(formData: FormData): { ok: true; value: { objectType: string; description: string; knownDefects: string | null } } | { ok: false; fieldErrors: FieldErrors } {
  const objectType = readText(formData, "objectType");
  const description = readText(formData, "description");
  const knownDefects = readText(formData, "knownDefects");
  const fieldErrors: FieldErrors = {};
  if (objectType.length < 2 || objectType.length > 80) {
    fieldErrors.objectType = "Укажите тип объекта";
  }
  if (description.length < 10 || description.length > 2000) {
    fieldErrors.description = "Описание: от 10 до 2000 символов";
  }
  if (knownDefects.length > 1000) {
    fieldErrors.knownDefects = "Известные дефекты: до 1000 символов";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  return { ok: true, value: { objectType, description, knownDefects: knownDefects || null } };
}

export function parsePasswordForm(formData: FormData): { ok: true; value: { currentPassword: string; nextPassword: string } } | { ok: false; fieldErrors: FieldErrors } {
  const currentPassword = readText(formData, "currentPassword");
  const nextPassword = readText(formData, "nextPassword");
  const confirm = readText(formData, "passwordConfirm");
  const fieldErrors: FieldErrors = {};
  if (currentPassword.length < 1 || currentPassword.length > 128) {
    fieldErrors.currentPassword = "Введите текущий пароль";
  }
  if (nextPassword.length < 10 || nextPassword.length > 128 || !/\p{L}/u.test(nextPassword) || !/\d/.test(nextPassword)) {
    fieldErrors.nextPassword = "Новый пароль: 10–128 символов, буквы и цифра";
  }
  if (nextPassword !== confirm) {
    fieldErrors.passwordConfirm = "Пароли не совпадают";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  return { ok: true, value: { currentPassword, nextPassword } };
}

export function parsePlanForm(formData: FormData): PlanId | null {
  const plan = readText(formData, "plan");
  return isPlanId(plan) ? plan : null;
}

export function safePath(value: FormDataEntryValue | null, fallback: string): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("\n")) {
    return fallback;
  }
  return value;
}

export function readUpload(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }
  return value;
}

export function readUploads(formData: FormData, key: string): File[] {
  return formData.getAll(key).flatMap((value) => (value instanceof File && value.size > 0 ? [value] : []));
}

function parseSpecs(value: string): SpecItem[] | null {
  if (!value.trim()) {
    return [];
  }
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 12) {
    return null;
  }
  const specs: SpecItem[] = [];
  for (const line of lines) {
    const index = line.indexOf(":");
    if (index < 1) {
      return null;
    }
    const label = line.slice(0, index).trim();
    const itemValue = line.slice(index + 1).trim();
    if (label.length < 1 || label.length > 40 || itemValue.length < 1 || itemValue.length > 80) {
      return null;
    }
    specs.push({ label, value: itemValue });
  }
  return specs;
}

function readInt(value: string): number | null {
  if (!/^\d{1,8}$/.test(value)) {
    return null;
  }
  return Number(value);
}

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
