import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/current-user";

export const metadata = {
  title: "Вход — RentProof",
};

export default function LoginPage() {
  return (
    <AuthShell title="Вход" lede="Войдите в учётную запись, чтобы открыть личный кабинет.">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <LoginForm />
    </AuthShell>
  );
}

async function RedirectIfSignedIn() {
  if (await getCurrentUser()) {
    redirect("/account");
  }
  return null;
}
