"use client";

import { useActionState } from "react";
import { updateProfileAction, type FormState } from "@/app/actions/auth";
import { fieldClass, primaryButton } from "@/components/styles";
import type { PublicUser } from "@/lib/users";

const initialState: FormState = {};

export function ProfileForm({ user }: { user: PublicUser }) {
  const [state, action, pending] = useActionState(updateProfileAction, initialState);

  return (
    <form action={action} className="grid gap-4" noValidate>
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        Имя
        <input
          name="name"
          defaultValue={user.name}
          autoComplete="name"
          aria-invalid={Boolean(state.fieldErrors?.name)}
          className={fieldClass}
        />
        {state.fieldErrors?.name ? <span className="font-normal text-accent">{state.fieldErrors.name}</span> : null}
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        Телефон
        <input
          name="phone"
          defaultValue={user.phone ?? ""}
          autoComplete="tel"
          aria-invalid={Boolean(state.fieldErrors?.phone)}
          className={fieldClass}
        />
        {state.fieldErrors?.phone ? <span className="font-normal text-accent">{state.fieldErrors.phone}</span> : null}
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        Город
        <input
          name="city"
          defaultValue={user.city ?? ""}
          autoComplete="address-level2"
          aria-invalid={Boolean(state.fieldErrors?.city)}
          className={fieldClass}
        />
        {state.fieldErrors?.city ? <span className="font-normal text-accent">{state.fieldErrors.city}</span> : null}
      </label>
      {state.message ? (
        <p role="status" className="text-sm text-graphite">
          {state.message}
        </p>
      ) : null}
      <button type="submit" className={primaryButton} disabled={pending}>
        {pending ? "Сохраняем…" : "Сохранить профиль"}
      </button>
    </form>
  );
}
