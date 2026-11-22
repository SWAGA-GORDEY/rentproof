import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { getCurrentUser } from "@/lib/current-user";

export const metadata = {
  title: "Восстановление пароля",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Сброс пароля"
      lede="Укажите email — если аккаунт существует, отправим одноразовую ссылку для нового пароля."
    >
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <ForgotPasswordForm />
    </AuthShell>
  );
}

async function RedirectIfSignedIn() {
  if (await getCurrentUser()) {
    redirect("/account");
  }
  return null;
}
