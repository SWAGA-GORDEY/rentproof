"use client";

import { useActionState } from "react";
import { saveListingAction } from "@/app/actions/listings";
import type { FormState } from "@/app/actions/auth";
import { fieldClass, primaryButton, secondaryButton } from "@/components/styles";
import { categories } from "@/lib/categories";

type ListingDefaults = {
  id?: string;
  title: string;
  categoryId: string;
  city: string;
  description: string;
  pricePerDay: number;
  deposit: number;
  minDays: number;
  conditionScore: number | null;
  conditionNotes: string | null;
  specs: Array<{ label: string; value: string }>;
  availableFrom: string | null;
  availableTo: string | null;
  bookable: boolean;
};

const initial: FormState = {};

export function ListingForm({ listing }: { listing?: ListingDefaults }) {
  const [state, action, pending] = useActionState(saveListingAction, initial);
  const specs = listing?.specs.map((item) => `${item.label}: ${item.value}`).join("\n") ?? "";

  return (
    <form action={action} className="grid gap-4 rounded-3xl border border-line bg-white p-6" noValidate>
      {listing?.id ? <input type="hidden" name="listingId" value={listing.id} /> : null}
      <Field label="Название" name="title" defaultValue={listing?.title} error={state.fieldErrors?.title} />
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        Категория
        <select name="categoryId" defaultValue={listing?.categoryId ?? ""} className={fieldClass}>
          <option value="">Выберите</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {state.fieldErrors?.categoryId ? <span className="font-normal text-accent">{state.fieldErrors.categoryId}</span> : null}
      </label>
      <Field label="Город" name="city" defaultValue={listing?.city} error={state.fieldErrors?.city} />
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        Описание
        <textarea name="description" defaultValue={listing?.description} rows={5} className={fieldClass} />
        {state.fieldErrors?.description ? <span className="font-normal text-accent">{state.fieldErrors.description}</span> : null}
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Цена за сутки, ₽" name="pricePerDay" defaultValue={listing ? String(listing.pricePerDay) : ""} error={state.fieldErrors?.pricePerDay} inputMode="numeric" />
        <Field label="Залог, ₽" name="deposit" defaultValue={listing ? String(listing.deposit) : "0"} error={state.fieldErrors?.deposit} inputMode="numeric" />
        <Field label="Минимум, суток" name="minDays" defaultValue={listing ? String(listing.minDays) : "1"} error={state.fieldErrors?.minDays} inputMode="numeric" />
      </div>
      <Field label="Оценка владельца, 0–100" name="conditionScore" defaultValue={listing?.conditionScore?.toString() ?? ""} error={state.fieldErrors?.conditionScore} inputMode="numeric" />
      <p className="-mt-2 text-xs leading-5 text-muted">Это заявление владельца, не результат AI и не экспертиза.</p>
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        Заметки о состоянии
        <textarea name="conditionNotes" defaultValue={listing?.conditionNotes ?? ""} rows={3} className={fieldClass} />
        {state.fieldErrors?.conditionNotes ? <span className="font-normal text-accent">{state.fieldErrors.conditionNotes}</span> : null}
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        Характеристики
        <textarea name="specs" defaultValue={specs} rows={4} placeholder={"Мощность: 2 кВт\nВес: 12 кг"} className={fieldClass} />
        {state.fieldErrors?.specs ? <span className="font-normal text-accent">{state.fieldErrors.specs}</span> : null}
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Доступно с" name="availableFrom" type="date" defaultValue={listing?.availableFrom ?? ""} error={state.fieldErrors?.availableFrom} />
        <Field label="Доступно по" name="availableTo" type="date" defaultValue={listing?.availableTo ?? ""} error={state.fieldErrors?.availableTo} />
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="bookable" defaultChecked={listing?.bookable ?? true} />
        Принимать заявки
      </label>
      {state.message ? <p className="text-sm text-accent">{state.message}</p> : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" name="intent" value="draft" className={secondaryButton} disabled={pending}>
          Сохранить черновик
        </button>
        <button type="submit" name="intent" value="submit" className={primaryButton} disabled={pending}>
          {pending ? "Сохраняем…" : "Отправить на модерацию"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  error,
  type = "text",
  inputMode,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  error?: string;
  type?: string;
  inputMode?: "numeric" | "text";
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-ink">
      {label}
      <input name={name} type={type} defaultValue={defaultValue} inputMode={inputMode} className={fieldClass} />
      {error ? <span className="font-normal text-accent">{error}</span> : null}
    </label>
  );
}
