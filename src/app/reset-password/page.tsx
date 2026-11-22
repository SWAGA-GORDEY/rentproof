import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata = {
  title: "Новый пароль",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  return (
    <AuthShell title="Новый пароль" lede="Введите email, код из письма и новый пароль. Код действует 1 час.">
      <Suspense fallback={<p className="text-sm text-muted">Загрузка…</p>}>
        <Body searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function Body({ searchParams }: { searchParams: Promise<{ token?: string; email?: string }> }) {
  const { token = "", email = "" } = await searchParams;
  return <ResetPasswordForm email={email} token={token} />;
}
