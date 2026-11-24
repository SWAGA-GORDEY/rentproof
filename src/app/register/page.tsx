import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "@/components/register-form";
import { getCurrentUser } from "@/lib/current-user";

export const metadata = {
  title: "Регистрация",
  alternates: { canonical: "/register" },
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Регистрация"
      lede="Создайте учётную запись и выберите роль. Пароль хранится только в виде хеша."
    >
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}

async function RedirectIfSignedIn() {
  if (await getCurrentUser()) {
    redirect("/account");
  }
  return null;
}
