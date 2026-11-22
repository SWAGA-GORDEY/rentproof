import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { VerifyEmailForm } from "@/components/verify-email-form";
import { getCurrentUser } from "@/lib/current-user";
import { verificationMailNote } from "@/lib/email-verification";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Подтверждение email",
  description: "Введите код из письма, чтобы активировать аккаунт RentProof.",
  path: "/verify-email",
  noIndex: true,
});

export default function VerifyEmailPage() {
  return (
    <PageShell>
      <Suspense fallback={<p className="text-sm text-muted">Загружаем…</p>}>
        <Body />
      </Suspense>
    </PageShell>
  );
}

async function Body() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.emailVerified) redirect("/account");

  return (
    <div className="mx-auto grid max-w-lg gap-6 rounded-3xl border border-line bg-white p-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Активация</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-navy">Подтвердите email</h1>
        <p className="mt-3 text-sm leading-6 text-muted">Аккаунт создан, но ещё не активирован.</p>
      </div>
      <VerifyEmailForm email={user.email} note={verificationMailNote()} />
    </div>
  );
}
