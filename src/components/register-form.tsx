"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { registerAction, type FormState } from "@/app/actions/auth";
import { fieldClass, primaryButton } from "@/components/styles";

const initialState: FormState = {};

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initialState);
  const searchParams = useSearchParams();
  const referralCode = (searchParams.get("ref") ?? "").trim().toUpperCase();

  return (
    <form action={action} className="grid gap-4 rounded-3xl border border-line bg-white p-6" noValidate>
      {referralCode ? <input type="hidden" name="ref" value={referralCode} /> : null}
      <TextField label="Имя" name="name" autoComplete="name" error={state.fieldErrors?.name} />
      <TextField label="Электронная почта" name="email" type="email" autoComplete="email" error={state.fieldErrors?.email} />
      <TextField
        label="Пароль"
        name="password"
        type="password"
        autoComplete="new-password"
        error={state.fieldErrors?.password}
        hint="От 10 символов, с буквами и цифрой."
      />
      <TextField
        label="Повтор пароля"
        name="passwordConfirm"
        type="password"
        autoComplete="new-password"
        error={state.fieldErrors?.passwordConfirm}
      />
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium text-ink">Роль</legend>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="radio" name="role" value="landlord" />
          Арендодатель
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="radio" name="role" value="tenant" />
          Арендатор
        </label>
        {state.fieldErrors?.role ? <p className="text-sm text-accent">{state.fieldErrors.role}</p> : null}
      </fieldset>

      <fieldset className="grid gap-3 rounded-2xl border border-line bg-mist/40 p-4">
        <legend className="px-1 text-sm font-semibold text-ink">Согласия</legend>
        <Consent
          name="consentOffer"
          error={state.fieldErrors?.consentOffer}
          label={
            <>
              Принимаю{" "}
              <Link href="/documents/offer" className="font-semibold text-navy underline" target="_blank">
                публичную оферту
              </Link>{" "}
              и{" "}
              <Link href="/documents/terms" className="font-semibold text-navy underline" target="_blank">
                условия использования
              </Link>
              .
            </>
          }
        />
        <Consent
          name="consentPrivacy"
          error={state.fieldErrors?.consentPrivacy}
          label={
            <>
              Ознакомился с{" "}
              <Link href="/documents/privacy" className="font-semibold text-navy underline" target="_blank">
                политикой обработки персональных данных
              </Link>
              .
            </>
          }
        />
        <Consent
          name="consentPersonalData"
          error={state.fieldErrors?.consentPersonalData}
          label={
            <>
              Даю отдельное{" "}
              <Link href="/documents/personal-data-consent" className="font-semibold text-navy underline" target="_blank">
                согласие на обработку персональных данных
              </Link>
              .
            </>
          }
        />
        <label className="flex items-start gap-2 text-sm text-ink">
          <input type="checkbox" name="consentMarketing" className="mt-1" />
          <span>
            Согласен на{" "}
            <Link href="/documents/marketing-consent" className="font-semibold text-navy underline" target="_blank">
              рекламные рассылки
            </Link>{" "}
            (необязательно).
          </span>
        </label>
        <p className="text-xs text-muted">Документы сейчас в статусе DRAFT до утверждения владельцем сервиса.</p>
      </fieldset>

      {state.message ? (
        <p role="alert" className="text-sm text-accent">
          {state.message}
        </p>
      ) : null}
      <button type="submit" className={primaryButton} disabled={pending}>
        {pending ? "Создаём учётную запись…" : "Создать учётную запись"}
      </button>
      <p className="text-sm text-muted">
        Уже есть учётная запись?{" "}
        <Link href="/login" className="font-semibold text-navy">
          Войти
        </Link>
      </p>
    </form>
  );
}

function Consent({
  name,
  label,
  error,
}: {
  name: string;
  label: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="grid gap-1">
      <label className="flex items-start gap-2 text-sm text-ink">
        <input type="checkbox" name={name} className="mt-1" />
        <span>{label}</span>
      </label>
      {error ? <p className="text-sm text-accent">{error}</p> : null}
    </div>
  );
}

function TextField({
  label,
  name,
  type = "text",
  autoComplete,
  error,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete: string;
  error?: string;
  hint?: string;
}) {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <label className="grid gap-1.5 text-sm font-medium text-ink">
      {label}
      <input
        className={fieldClass}
        name={name}
        type={type}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        required
      />
      {hint ? <span className="text-xs font-normal text-muted">{hint}</span> : null}
      {error ? (
        <span id={errorId} className="text-sm font-normal text-accent">
          {error}
        </span>
      ) : null}
    </label>
  );
}
