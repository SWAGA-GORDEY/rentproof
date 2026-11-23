"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction, type FormState } from "@/app/actions/auth";
import { fieldClass, primaryButton } from "@/components/styles";

const initialState: FormState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";

  return (
    <form action={action} className="grid gap-4 rounded-3xl border border-line bg-white p-6" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field label="Электронная почта" name="email" type="email" autoComplete="email" error={state.fieldErrors?.email} />
      <Field
        label="Пароль"
        name="password"
        type="password"
        autoComplete="current-password"
        error={state.fieldErrors?.password}
      />
      {state.message ? (
        <p role="alert" className="text-sm text-accent">
          {state.message}
        </p>
      ) : null}
      <button type="submit" className={primaryButton} disabled={pending}>
        {pending ? "Входим…" : "Войти"}
      </button>
      <p className="text-sm text-muted">
        <Link href="/forgot-password" className="font-semibold text-navy">
          Забыли пароль?
        </Link>
      </p>
      <p className="text-sm text-muted">
        Нет учётной записи?{" "}
        <Link href="/register" className="font-semibold text-navy">
          Зарегистрироваться
        </Link>
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete,
  error,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete: string;
  error?: string;
}) {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-navy">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        className={fieldClass}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        required
      />
      {error ? (
        <span id={errorId} className="text-accent">
          {error}
        </span>
      ) : null}
    </label>
  );
}
