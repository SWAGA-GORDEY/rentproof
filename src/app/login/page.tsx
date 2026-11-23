import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/current-user";

export const metadata = {
  title: "Вход",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: false },
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; next?: string; error?: string }>;
}) {
  return (
    <AuthShell title="Вход" lede="Войдите в учётную запись, чтобы открыть личный кабинет или Control Center.">
      <Suspense fallback={null}>
        <RedirectIfSignedIn searchParams={searchParams} />
        <LoginNotice searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}

async function LoginNotice({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; error?: string }>;
}) {
  const { reason, error } = await searchParams;
  if (reason === "blocked" || error === "blocked") {
    return <p className="mb-4 text-sm text-accent">Аккаунт заблокирован. Вход недоступен.</p>;
  }
  if (reason === "password") {
    return <p className="mb-4 text-sm text-muted">Пароль изменён. Войдите снова.</p>;
  }
  if (error === "staff_required") {
    return (
      <p className="mb-4 text-sm text-accent">
        Для Control Center нужен аккаунт OWNER/STAFF. Обычный пользователь сюда не попадает.
      </p>
    );
  }
  return null;
}

async function RedirectIfSignedIn({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { postLoginPath, safeStaffNext } = await import("@/lib/staff-access");
  const params = await searchParams;
  redirect(params.next ? safeStaffNext(params.next, postLoginPath(user)) : postLoginPath(user));
}
