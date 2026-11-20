"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type FormState } from "@/app/actions/auth";
import { fieldClass, primaryButton } from "@/components/styles";

const initialState: FormState = {};

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initialState);

  return (
    <form action={action} className="grid gap-4 rounded-3xl border border-line bg-white p-6" noValidate>
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
        name={name}
        type={type}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={fieldClass}
      />
      {hint ? <span className="font-normal text-muted">{hint}</span> : null}
      {error ? (
        <span id={errorId} className="font-normal text-accent">
          {error}
        </span>
      ) : null}
    </label>
  );
}
