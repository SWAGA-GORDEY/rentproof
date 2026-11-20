"use client";

import { useActionState, useState } from "react";
import { createBookingAction } from "@/app/actions/bookings";
import type { FormState } from "@/app/actions/auth";
import { fieldClass, primaryButton } from "@/components/styles";
import { formatDays, formatRubles, inclusiveDays } from "@/lib/format";

const initial: FormState = {};

export function BookingForm({
  listingId,
  pricePerDay,
  deposit,
  minDays,
}: {
  listingId: string;
  pricePerDay: number;
  deposit: number;
  minDays: number;
}) {
  const [state, action, pending] = useActionState(createBookingAction, initial);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const days = inclusiveDays(startDate, endDate);

  return (
    <form action={action} className="grid gap-4 rounded-3xl border border-line bg-white p-6">
      <input type="hidden" name="listingId" value={listingId} />
      <h2 className="font-display text-xl font-semibold text-navy">Заявка на аренду</h2>
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        Начало
        <input type="date" name="startDate" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={fieldClass} required />
        {state.fieldErrors?.startDate ? <span className="font-normal text-accent">{state.fieldErrors.startDate}</span> : null}
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        Окончание
        <input type="date" name="endDate" value={endDate} onChange={(event) => setEndDate(event.target.value)} className={fieldClass} required />
        {state.fieldErrors?.endDate ? <span className="font-normal text-accent">{state.fieldErrors.endDate}</span> : null}
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        Комментарий
        <textarea name="note" rows={3} className={fieldClass} />
      </label>
      <div className="rounded-2xl bg-mist px-4 py-3 text-sm leading-6 text-graphite">
        {days ? (
          <>
            <p>{formatDays(days)}. Минимум по объявлению: {formatDays(minDays)}.</p>
            <p>Аренда: {formatRubles(days * pricePerDay)}</p>
            <p>Залог: {formatRubles(deposit)}</p>
          </>
        ) : (
          <p>Выберите обе даты, чтобы увидеть расчёт.</p>
        )}
        <p className="mt-2 text-xs text-muted">Демонстрационный расчёт. Деньги не списываются и платёж не создаётся.</p>
      </div>
      {state.message ? <p className="text-sm text-accent">{state.message}</p> : null}
      <button type="submit" className={primaryButton} disabled={pending}>
        {pending ? "Отправляем…" : "Отправить заявку"}
      </button>
    </form>
  );
}
