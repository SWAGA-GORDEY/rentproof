"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { clearSession, getCurrentUser, startSession } from "@/lib/current-user";
import {
  authenticateUser,
  EmailTakenError,
  InvalidCredentialsError,
  LoginLockedError,
  registerUser,
  updateUserProfile,
} from "@/lib/users";
import { parseLogin, parseProfile, parseRegistration, type FieldErrors } from "@/lib/validation";

export type FormState = {
  message?: string;
  fieldErrors?: FieldErrors;
};

export async function registerAction(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseRegistration(formData);
  if (!parsed.ok) {
    return { fieldErrors: parsed.fieldErrors };
  }

  try {
    const user = await registerUser(parsed.value);
    await startSession(user.id);
  } catch (error) {
    if (error instanceof EmailTakenError) {
      return { fieldErrors: { email: "Этот адрес уже зарегистрирован" } };
    }
    console.error("register failed");
    return { message: "Не удалось создать учётную запись. Попробуйте ещё раз." };
  }

  redirect("/account");
}

export async function loginAction(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseLogin(formData);
  if (!parsed.ok) {
    return { fieldErrors: parsed.fieldErrors };
  }

  try {
    const user = await authenticateUser(parsed.value.email, parsed.value.password);
    await startSession(user.id);
  } catch (error) {
    if (error instanceof LoginLockedError) {
      return { message: "Слишком много попыток входа. Подождите 15 минут и попробуйте снова." };
    }
    if (error instanceof InvalidCredentialsError) {
      return { message: "Неверный адрес или пароль" };
    }
    console.error("login failed");
    return { message: "Не удалось войти. Попробуйте ещё раз." };
  }

  redirect("/account");
}

export async function updateProfileAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const parsed = parseProfile(formData);
  if (!parsed.ok) {
    return { fieldErrors: parsed.fieldErrors };
  }

  try {
    updateUserProfile(user.id, parsed.value);
  } catch {
    console.error("profile update failed");
    return { message: "Не удалось сохранить профиль. Попробуйте ещё раз." };
  }

  refresh();
  return { message: "Профиль сохранён" };
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/login");
}
