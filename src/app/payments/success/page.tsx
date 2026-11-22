import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { primaryButton, secondaryButton } from "@/components/styles";
import { getCurrentUser } from "@/lib/current-user";
import { formatKopecks } from "@/lib/money";
import { getPaymentForUser, syncPayment } from "@/lib/payments";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Оплата прошла",
  description: "Платёж подтверждён сервером через ЮKassa.",
  path: "/payments/success",
  noIndex: true,
});

export default function PaymentSuccessPage({ searchParams }: { searchParams: Promise<{ paymentId?: string }> }) {
  return (
    <PageShell>
      <Suspense fallback={<p className="text-sm text-muted">Загружаем результат…</p>}>
        <Body searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}

async function Body({ searchParams }: { searchParams: Promise<{ paymentId?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { paymentId } = await searchParams;
  if (!paymentId) redirect("/account/payments");
  let payment = getPaymentForUser(user.id, paymentId, user.isAdmin);
  if (!payment) redirect("/account/payments");
  try {
    payment = await syncPayment(paymentId, user.id);
  } catch {
    /* keep */
  }
  if (payment.status !== "succeeded") {
    redirect(`/payments/return?paymentId=${payment.id}`);
  }
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-line bg-white p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">Успех</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-navy">Оплата подтверждена</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Статус получен от ЮKassa на сервере. Это тестовый режим — реальных списаний с боевых карт нет.
      </p>
      <p className="mt-4 text-lg font-semibold text-ink">{formatKopecks(payment.amountKopecks)}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        {payment.purpose === "subscription" ? (
          <Link href="/account/subscription" className={primaryButton}>Моя подписка</Link>
        ) : (
          <Link href={payment.bookingId ? `/account/bookings/${payment.bookingId}` : "/account/bookings"} className={primaryButton}>
            К заявке
          </Link>
        )}
        <Link href="/account/payments" className={secondaryButton}>История платежей</Link>
      </div>
    </div>
  );
}
