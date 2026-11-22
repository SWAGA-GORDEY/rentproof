import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { fakeConfirmAction, syncPaymentAction } from "@/app/actions/payments";
import { PageShell } from "@/components/page-shell";
import { primaryButton, secondaryButton } from "@/components/styles";
import { getCurrentUser } from "@/lib/current-user";
import { formatKopecks } from "@/lib/money";
import { getPaymentForUser, syncPayment } from "@/lib/payments";
import { pageMetadata } from "@/lib/seo";
import { readYooKassaConfig } from "@/lib/yookassa";

export const metadata = pageMetadata({
  title: "Проверка оплаты",
  description: "Сервер сверяет статус платежа с ЮKassa.",
  path: "/payments/return",
  noIndex: true,
});

type Search = { paymentId?: string; fakeProviderPaymentId?: string };

export default function PaymentReturnPage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <PageShell>
      <Suspense fallback={<p className="text-sm text-muted">Проверяем оплату…</p>}>
        <Body searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}

async function Body({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const params = await searchParams;
  const paymentId = params.paymentId?.trim();
  if (!paymentId) {
    return <p className="text-sm text-muted">Не указан идентификатор платежа.</p>;
  }

  let payment = getPaymentForUser(user.id, paymentId, user.isAdmin);
  if (!payment) {
    return <p className="text-sm text-muted">Платёж не найден или принадлежит другому аккаунту.</p>;
  }

  try {
    payment = await syncPayment(paymentId, user.id);
  } catch {
    // keep last known local status
  }

  if (payment.status === "succeeded") {
    redirect(`/payments/success?paymentId=${payment.id}`);
  }
  if (payment.status === "canceled" || payment.status === "failed") {
    redirect(`/payments/fail?paymentId=${payment.id}`);
  }

  const fake = readYooKassaConfig().fake;

  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-line bg-white p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">Ожидание подтверждения</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-navy">Оплата обрабатывается</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Браузерный возврат сам по себе не подтверждает оплату. Статус берётся с сервера ЮKassa.
      </p>
      <dl className="mt-6 space-y-2 text-sm text-ink">
        <div className="flex justify-between gap-4"><dt className="text-muted">Сумма</dt><dd>{formatKopecks(payment.amountKopecks)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-muted">Статус</dt><dd>{payment.status}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-muted">Назначение</dt><dd>{payment.purpose === "subscription" ? "Подписка" : "Аренда"}</dd></div>
      </dl>
      <div className="mt-8 flex flex-wrap gap-3">
        <form action={syncPaymentAction}>
          <input type="hidden" name="paymentId" value={payment.id} />
          <button className={primaryButton} type="submit">Обновить статус</button>
        </form>
        <Link href="/account/payments" className={secondaryButton}>Мои платежи</Link>
      </div>
      {fake ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-mist p-4">
          <p className="text-sm text-muted">Тестовый fake-провайдер (без реальных списаний).</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <form action={fakeConfirmAction}>
              <input type="hidden" name="paymentId" value={payment.id} />
              <input type="hidden" name="outcome" value="success" />
              <button className={primaryButton} type="submit">Симулировать успех</button>
            </form>
            <form action={fakeConfirmAction}>
              <input type="hidden" name="paymentId" value={payment.id} />
              <input type="hidden" name="outcome" value="fail" />
              <button className={secondaryButton} type="submit">Симулировать отказ</button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
