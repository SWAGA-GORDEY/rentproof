import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata = {
  title: "Новый пароль",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  return (
    <AuthShell title="Новый пароль" lede="Задайте новый пароль по одноразовой ссылке из письма.">
      <Suspense fallback={<p className="text-sm text-muted">Загрузка…</p>}>
        <Body searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function Body({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) {
    return <p className="text-sm text-accent">Ссылка неполная. Запросите сброс пароля снова.</p>;
  }
  return <ResetPasswordForm token={token} />;
}
