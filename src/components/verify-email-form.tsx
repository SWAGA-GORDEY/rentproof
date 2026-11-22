"use client";

import { useActionState } from "react";
import { resendVerificationAction, verifyEmailAction, type FormState } from "@/app/actions/auth";
import { fieldClass, primaryButton, secondaryButton } from "@/components/styles";

const initial: FormState = {};

export function VerifyEmailForm({ email, note }: { email: string; note: string }) {
  const [verifyState, verifyAction, verifying] = useActionState(verifyEmailAction, initial);
  const [resendState, resendAction, resending] = useActionState(
    async (_state: FormState) => resendVerificationAction(),
    initial,
  );

  return (
    <div className="grid gap-6">
      <p className="text-sm leading-6 text-muted">
        {note} Адрес: <strong className="text-ink">{email}</strong>
      </p>
      <form action={verifyAction} className="grid gap-3">
        <label className="grid gap-1.5 text-sm font-medium text-ink">
          Код из письма
          <input className={fieldClass} name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required />
        </label>
        {verifyState.fieldErrors?.code ? <p className="text-sm text-accent">{verifyState.fieldErrors.code}</p> : null}
        {verifyState.message ? <p className="text-sm text-accent">{verifyState.message}</p> : null}
        <button className={primaryButton} type="submit" disabled={verifying}>
          {verifying ? "Проверяем…" : "Подтвердить"}
        </button>
      </form>
      <form action={resendAction}>
        {resendState.message ? <p className="mb-3 text-sm text-muted">{resendState.message}</p> : null}
        <button className={secondaryButton} type="submit" disabled={resending}>
          {resending ? "Отправляем…" : "Отправить код снова"}
        </button>
      </form>
    </div>
  );
}
