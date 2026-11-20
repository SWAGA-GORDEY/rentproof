"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { clearSession, getCurrentUser, startSession } from "@/lib/current-user";
import {
  authenticateUser,
  AccountBlockedError,
  EmailTakenError,
  InvalidCredentialsError,
  LoginLockedError,
  registerUser,
  updateUserProfile,
} from "@/lib/users";
import { writeAudit } from "@/lib/audit";
import { RateLimitError } from "@/lib/errors";
import { consumeRateLimit } from "@/lib/rate-limit";
import { parseLogin, parseProfile, parseRegistration } from "@/lib/validation";

export type FormState = {
  message?: string;
  fieldErrors?: Record<string, string>;
};

export async function registerAction(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseRegistration(formData);
  if (!parsed.ok) {
    return { fieldErrors: parsed.fieldErrors };
  }

  try {
    consumeRateLimit(`register:${parsed.value.email}`, 5, 60 * 60 * 1000);
    const user = await registerUser(parsed.value);
    writeAudit(user.id, "auth.register", "user", user.id, { role: user.role });
    await startSession(user.id);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { message: "Слишком много попыток регистрации для этого адреса. Попробуйте позже." };
    }
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
    writeAudit(user.id, "auth.login", "user", user.id, null);
    await startSession(user.id);
  } catch (error) {
    if (error instanceof LoginLockedError) {
      return { message: "Слишком много попыток входа. Подождите 15 минут и попробуйте снова." };
    }
    if (error instanceof AccountBlockedError) {
      return { message: "Аккаунт заблокирован. Вход недоступен." };
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
