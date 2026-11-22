import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { primaryButton, secondaryButton } from "@/components/styles";
import { getCurrentUser } from "@/lib/current-user";
import { formatKopecks } from "@/lib/money";
import { getPaymentForUser } from "@/lib/payments";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Оплата не завершена",
  description: "Платёж отменён или не подтверждён.",
  path: "/payments/fail",
  noIndex: true,
});

export default function PaymentFailPage({ searchParams }: { searchParams: Promise<{ paymentId?: string }> }) {
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
  const payment = paymentId ? getPaymentForUser(user.id, paymentId, user.isAdmin) : null;
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-line bg-white p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">Не завершено</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-navy">Оплата не прошла</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Подписка или заказ не активированы. Можно вернуться и попробовать снова в тестовом режиме.
      </p>
      {payment ? (
        <p className="mt-4 text-sm text-ink">
          {formatKopecks(payment.amountKopecks)} · статус {payment.status}
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/pricing" className={primaryButton}>К тарифам</Link>
        <Link href="/account/payments" className={secondaryButton}>Мои платежи</Link>
      </div>
    </div>
  );
}
