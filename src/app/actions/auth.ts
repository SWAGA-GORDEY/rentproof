"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { clearSession, getCurrentUser, getSessionToken, startSession } from "@/lib/current-user";
import {
  authenticateUser,
  AccountBlockedError,
  beginEmailChange,
  deleteUserAccount,
  EmailTakenError,
  InvalidCredentialsError,
  LoginLockedError,
  registerUser,
  updateUserProfile,
} from "@/lib/users";
import { writeAudit } from "@/lib/audit";
import { RateLimitError } from "@/lib/errors";
import { issueEmailVerification, verifyEmailCode, verificationMailNote } from "@/lib/email-verification";
import { getLatestLegalDocument, recordConsent, revokeConsent } from "@/lib/legal";
import { completePasswordReset, requestPasswordReset } from "@/lib/password-reset";
import { consumeRateLimit } from "@/lib/rate-limit";
import { revokeOtherSessions, revokeSession } from "@/lib/sessions";
import {
  parseEmailOnly,
  parseLogin,
  parseNewPassword,
  parseProfile,
  parseRegistration,
} from "@/lib/validation";

export type FormState = {
  message?: string;
  fieldErrors?: Record<string, string>;
};

export async function registerAction(_state: FormState, formData: FormData): Promise<FormState> {
  const offer = formData.get("consentOffer") === "on";
  const privacy = formData.get("consentPrivacy") === "on";
  const personalData = formData.get("consentPersonalData") === "on";
  const marketing = formData.get("consentMarketing") === "on";

  const fieldErrors: Record<string, string> = {};
  if (!offer) fieldErrors.consentOffer = "Нужно принять оферту и условия использования";
  if (!privacy) fieldErrors.consentPrivacy = "Нужно подтвердить ознакомление с политикой";
  if (!personalData) fieldErrors.consentPersonalData = "Нужно отдельное согласие на обработку персональных данных";
  if (Object.keys(fieldErrors).length) {
    return { fieldErrors };
  }

  const parsed = parseRegistration(formData);
  if (!parsed.ok) {
    return { fieldErrors: parsed.fieldErrors };
  }

  try {
    consumeRateLimit(`register:${parsed.value.email}`, 5, 60 * 60 * 1000);
    const user = await registerUser(parsed.value);
    const offerDoc = getLatestLegalDocument("offer");
    const termsDoc = getLatestLegalDocument("terms");
    const privacyDoc = getLatestLegalDocument("privacy");
    const pdDoc = getLatestLegalDocument("personal_data_consent");
    const marketingDoc = getLatestLegalDocument("marketing_consent");
    if (offerDoc) recordConsent(user.id, "offer", offerDoc);
    if (termsDoc) recordConsent(user.id, "terms", termsDoc);
    if (privacyDoc) recordConsent(user.id, "privacy", privacyDoc);
    if (pdDoc) recordConsent(user.id, "personal_data", pdDoc);
    if (marketing && marketingDoc) recordConsent(user.id, "marketing", marketingDoc);

    writeAudit(user.id, "auth.register", "user", user.id, { role: user.role });
    await issueEmailVerification(user.id, user.email, user.name);
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

  redirect("/verify-email");
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
    if (!user.emailVerified) {
      redirect("/verify-email");
    }
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

export async function verifyEmailAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const code = String(formData.get("code") ?? "");
  if (!/^\d{6}$/.test(code.trim())) {
    return { fieldErrors: { code: "Введите 6-значный код" } };
  }
  try {
    const result = verifyEmailCode(user.id, code);
    if (!result.ok) {
      const messages: Record<string, string> = {
        invalid: "Неверный код",
        expired: "Срок действия кода истёк — запросите новый",
        attempts: "Слишком много попыток — запросите новый код",
        missing: "Код не найден — запросите новый",
      };
      return { message: messages[result.reason] ?? "Не удалось подтвердить email" };
    }
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { message: "Слишком много попыток. Подождите немного." };
    }
    return { message: "Не удалось проверить код." };
  }
  redirect("/account?verified=1");
}

export async function resendVerificationAction(): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.emailVerified) {
    redirect("/account");
  }
  try {
    await issueEmailVerification(user.id, user.email, user.name);
    return { message: verificationMailNote() };
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { message: "Повторная отправка пока недоступна. Подождите несколько минут." };
    }
    return { message: "Не удалось отправить код." };
  }
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
  redirect("/");
}

export async function requestPasswordResetAction(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseEmailOnly(formData);
  if (!parsed.ok) {
    return { fieldErrors: parsed.fieldErrors };
  }
  try {
    const result = await requestPasswordReset(parsed.value);
    return { message: result.note };
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { message: "Слишком много запросов. Подождите несколько минут." };
    }
    return { message: "Не удалось обработать запрос. Попробуйте позже." };
  }
}

export async function completePasswordResetAction(_state: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const code = String(formData.get("code") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim();
  const secret = code || token;
  if (!secret) {
    return { message: "Введите код из письма." };
  }
  if (code && !email) {
    return { fieldErrors: { email: "Укажите email" } };
  }
  const parsed = parseNewPassword(formData);
  if (!parsed.ok) {
    return { fieldErrors: parsed.fieldErrors };
  }
  try {
    const result = await completePasswordReset(secret, parsed.value, email || undefined);
    if (!result.ok) {
      const messages: Record<string, string> = {
        invalid: "Код или ссылка недействительны",
        used: "Код уже использован",
        expired: "Срок действия кода истёк",
      };
      return { message: messages[result.reason] ?? "Не удалось сбросить пароль" };
    }
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { message: "Слишком много попыток. Подождите." };
    }
    return { message: "Не удалось сохранить новый пароль." };
  }
  redirect("/login?reason=password");
}

export async function changeEmailAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const parsed = parseEmailOnly(formData);
  if (!parsed.ok) {
    redirect("/account/security?error=email");
  }
  if (parsed.value === user.email) {
    redirect("/account/security");
  }
  try {
    await beginEmailChange(user.id, parsed.value);
    await issueEmailVerification(user.id, parsed.value);
  } catch {
    redirect("/account/security?error=email");
  }
  redirect("/verify-email");
}

export async function deleteAccountAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "").trim();
  if (confirm !== "УДАЛИТЬ" || !password) {
    redirect("/account/security?error=delete");
  }
  try {
    writeAudit(user.id, "account.delete.requested", "user", user.id, null);
    await deleteUserAccount(user.id, password);
    await clearSession();
  } catch {
    redirect("/account/security?error=delete");
  }
  redirect("/?deleted=1");
}

export async function revokeSessionAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const sessionId = String(formData.get("sessionId") ?? "");
  const token = await getSessionToken();
  try {
    revokeSession(user.id, sessionId, token);
  } catch {
    // ignore current-session revoke attempts
  }
  refresh();
}

export async function revokeOtherSessionsAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const token = await getSessionToken();
  revokeOtherSessions(user.id, token);
  refresh();
}

export async function revokeConsentAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const consentType = String(formData.get("consentType") ?? "").trim();
  if (!consentType) {
    redirect("/account/security");
  }
  revokeConsent(user.id, consentType);
  refresh();
}
