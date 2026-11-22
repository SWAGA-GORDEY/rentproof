"use client";

import { useActionState } from "react";
import { completePasswordResetAction, type FormState } from "@/app/actions/auth";
import { fieldClass, primaryButton } from "@/components/styles";

const initialState: FormState = {};

export function ResetPasswordForm({ email = "", token = "" }: { email?: string; token?: string }) {
  const [state, action, pending] = useActionState(completePasswordResetAction, initialState);

  return (
    <form action={action} className="grid gap-4 rounded-3xl border border-line bg-white p-6" noValidate>
      {token ? <input type="hidden" name="token" value={token} /> : null}
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        Электронная почта
        <input
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={email}
          className={fieldClass}
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
        {state.fieldErrors?.email ? <span className="font-normal text-accent">{state.fieldErrors.email}</span> : null}
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        Код из письма
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          className={fieldClass}
          placeholder="6 цифр"
        />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        Новый пароль
        <input name="password" type="password" autoComplete="new-password" className={fieldClass} />
        {state.fieldErrors?.password ? <span className="font-normal text-accent">{state.fieldErrors.password}</span> : null}
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        Повтор пароля
        <input name="passwordConfirm" type="password" autoComplete="new-password" className={fieldClass} />
        {state.fieldErrors?.passwordConfirm ? (
          <span className="font-normal text-accent">{state.fieldErrors.passwordConfirm}</span>
        ) : null}
      </label>
      {state.message ? (
        <p role="alert" className="text-sm text-accent">
          {state.message}
        </p>
      ) : null}
      <button type="submit" className={primaryButton} disabled={pending}>
        {pending ? "Сохраняем…" : "Сохранить пароль"}
      </button>
    </form>
  );
}
