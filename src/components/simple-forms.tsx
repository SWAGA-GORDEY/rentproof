"use client";

import { useActionState } from "react";
import { analyzeAction } from "@/app/actions/ai";
import { createReviewAction } from "@/app/actions/bookings";
import { uploadListingPhotoAction } from "@/app/actions/listings";
import { changePasswordAction, complaintAction, contactAction, evidenceAction } from "@/app/actions/social";
import type { FormState } from "@/app/actions/auth";
import { fieldClass, primaryButton, secondaryButton } from "@/components/styles";

const initial: FormState = {};

export function ContactForm() {
  const [state, action, pending] = useActionState(contactAction, initial);
  return (
    <form action={action} className="grid gap-4 rounded-3xl border border-line bg-white p-6" noValidate>
      <Text label="Имя" name="name" error={state.fieldErrors?.name} />
      <Text label="Почта" name="email" type="email" error={state.fieldErrors?.email} />
      <Area label="Сообщение" name="message" error={state.fieldErrors?.message} />
      {state.message ? <p className="text-sm text-accent">{state.message}</p> : null}
      <button className={primaryButton} disabled={pending}>{pending ? "Отправляем…" : "Отправить"}</button>
    </form>
  );
}

export function ComplaintForm({ targetType, targetId }: { targetType: "listing" | "review" | "user"; targetId: string }) {
  const [state, action, pending] = useActionState(complaintAction, initial);
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <Area label="Жалоба" name="reason" error={state.fieldErrors?.reason} />
      {state.message ? <p className="text-sm text-accent">{state.message}</p> : null}
      <button className={secondaryButton} disabled={pending}>Отправить жалобу</button>
    </form>
  );
}

export function ReviewForm({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState(createReviewAction, initial);
  return (
    <form action={action} className="grid gap-3 rounded-3xl border border-line bg-white p-6">
      <input type="hidden" name="bookingId" value={bookingId} />
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        Оценка
        <select name="rating" defaultValue="5" className={fieldClass}>
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </label>
      <Area label="Отзыв" name="body" error={state.fieldErrors?.body} />
      {state.message ? <p className="text-sm text-accent">{state.message}</p> : null}
      <button className={primaryButton} disabled={pending}>Сохранить отзыв</button>
    </form>
  );
}

export function EvidenceForm({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState(evidenceAction, initial);
  return (
    <form action={action} className="grid gap-3 rounded-3xl border border-line bg-white p-6">
      <input type="hidden" name="bookingId" value={bookingId} />
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        Этап
        <select name="phase" className={fieldClass} defaultValue="before">
          <option value="before">До аренды</option>
          <option value="after">После аренды</option>
        </select>
      </label>
      <Area label="Описание" name="description" error={state.fieldErrors?.description} />
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        Фотографии
        <input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple className={fieldClass} />
      </label>
      <p className="text-xs leading-5 text-muted">Снимки фиксируют загруженные материалы и автора. Они не являются юридическим доказательством.</p>
      {state.message ? <p className="text-sm text-accent">{state.message}</p> : null}
      <button className={primaryButton} disabled={pending}>{pending ? "Загружаем…" : "Сохранить фиксацию"}</button>
    </form>
  );
}

export function AiForm() {
  const [state, action, pending] = useActionState(analyzeAction, initial);
  return (
    <form action={action} className="grid gap-4 rounded-3xl border border-line bg-white p-6">
      <Text label="Тип объекта" name="objectType" error={state.fieldErrors?.objectType} />
      <Area label="Описание" name="description" error={state.fieldErrors?.description} />
      <Area label="Известные дефекты" name="knownDefects" error={state.fieldErrors?.knownDefects} />
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        Фотографии
        <input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple required className={fieldClass} />
      </label>
      {state.message ? <p className="text-sm text-accent">{state.message}</p> : null}
      <button className={primaryButton} disabled={pending}>{pending ? "Анализируем…" : "Запустить анализ"}</button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initial);
  return (
    <form action={action} className="grid gap-4">
      <Text label="Текущий пароль" name="currentPassword" type="password" error={state.fieldErrors?.currentPassword} />
      <Text label="Новый пароль" name="nextPassword" type="password" error={state.fieldErrors?.nextPassword} />
      <Text label="Повтор" name="passwordConfirm" type="password" error={state.fieldErrors?.passwordConfirm} />
      {state.message ? <p className="text-sm text-accent">{state.message}</p> : null}
      <button className={secondaryButton} disabled={pending}>Сменить пароль</button>
    </form>
  );
}

export function PhotoForm({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState(uploadListingPhotoAction, initial);
  return (
    <form action={action} className="grid gap-3 rounded-3xl border border-line bg-white p-6">
      <input type="hidden" name="listingId" value={listingId} />
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        Фотография
        <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" className={fieldClass} />
      </label>
      {state.message ? <p className="text-sm text-accent">{state.message}</p> : null}
      <button className={secondaryButton} disabled={pending}>{pending ? "Загружаем…" : "Добавить фото"}</button>
    </form>
  );
}

function Text({ label, name, error, type = "text" }: { label: string; name: string; error?: string; type?: string }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-ink">
      {label}
      <input name={name} type={type} className={fieldClass} />
      {error ? <span className="font-normal text-accent">{error}</span> : null}
    </label>
  );
}

function Area({ label, name, error }: { label: string; name: string; error?: string }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-ink">
      {label}
      <textarea name={name} rows={4} className={fieldClass} />
      {error ? <span className="font-normal text-accent">{error}</span> : null}
    </label>
  );
}
