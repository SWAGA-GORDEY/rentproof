import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/current-user";

export const metadata = {
  title: "Вход — RentProof",
};

export default function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  return (
    <AuthShell title="Вход" lede="Войдите в учётную запись, чтобы открыть личный кабинет.">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
        <LoginNotice searchParams={searchParams} />
      </Suspense>
      <LoginForm />
    </AuthShell>
  );
}

async function LoginNotice({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  if (reason === "blocked") {
    return <p className="mb-4 text-sm text-accent">Аккаунт заблокирован. Вход недоступен.</p>;
  }
  if (reason === "password") {
    return <p className="mb-4 text-sm text-muted">Пароль изменён. Войдите снова.</p>;
  }
  return null;
}

async function RedirectIfSignedIn() {
  if (await getCurrentUser()) {
    redirect("/account");
  }
  return null;
}
