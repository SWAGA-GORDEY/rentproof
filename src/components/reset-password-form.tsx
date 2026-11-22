"use client";

import { useActionState } from "react";
import { completePasswordResetAction, type FormState } from "@/app/actions/auth";
import { fieldClass, primaryButton } from "@/components/styles";

const initialState: FormState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(completePasswordResetAction, initialState);

  return (
    <form action={action} className="grid gap-4 rounded-3xl border border-line bg-white p-6" noValidate>
      <input type="hidden" name="token" value={token} />
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
