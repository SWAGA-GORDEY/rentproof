"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction, type FormState } from "@/app/actions/auth";
import { fieldClass, primaryButton } from "@/components/styles";

const initialState: FormState = {};

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, initialState);

  return (
    <form action={action} className="grid gap-4 rounded-3xl border border-line bg-white p-6" noValidate>
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        Электронная почта
        <input name="email" type="email" autoComplete="email" className={fieldClass} aria-invalid={Boolean(state.fieldErrors?.email)} />
        {state.fieldErrors?.email ? <span className="font-normal text-accent">{state.fieldErrors.email}</span> : null}
      </label>
      {state.message ? <p className="text-sm text-muted">{state.message}</p> : null}
      <button type="submit" className={primaryButton} disabled={pending}>
        {pending ? "Отправляем…" : "Отправить код"}
      </button>
      <p className="text-sm text-muted">
        Придёт письмо с одноразовым кодом. Затем откройте{" "}
        <Link href="/reset-password" className="font-semibold text-navy">
          страницу сброса пароля
        </Link>
        .
      </p>
      <p className="text-sm text-muted">
        <Link href="/login" className="font-semibold text-navy">
          Вернуться ко входу
        </Link>
      </p>
    </form>
  );
}
