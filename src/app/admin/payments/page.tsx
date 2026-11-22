import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { formatKopecks } from "@/lib/money";
import { formatDateRu } from "@/lib/format";
import { secondaryButton } from "@/components/styles";

export const metadata = { title: "Платежи" };

export default function AdminPaymentsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Загружаем платежи…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  await requireAdmin();
  const payments = getDb()
    .prepare(
      `SELECT payments.*, users.email AS email
       FROM payments JOIN users ON users.id = payments.user_id
       ORDER BY payments.created_at DESC LIMIT 100`,
    )
    .all() as Array<{
    id: string;
    email: string;
    purpose: string;
    status: string;
    amount_kopecks: number;
    created_at: string;
    provider_payment_id: string | null;
  }>;
  const refunds = getDb()
    .prepare(`SELECT * FROM refunds ORDER BY created_at DESC LIMIT 50`)
    .all() as Array<{ id: string; payment_id: string; status: string; amount_kopecks: number; created_at: string }>;
  const payouts = getDb()
    .prepare(`SELECT * FROM payouts ORDER BY created_at DESC LIMIT 50`)
    .all() as Array<{ id: string; rental_order_id: string; status: string; amount_kopecks: number; created_at: string }>;

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-navy">Платежи</h1>
        <p className="mt-2 text-sm text-muted">
          Администратор не может вручную отметить платёж успешным без подтверждения ЮKassa. Безопасная сделка и выплаты
          недоступны, пока не подключены у провайдера.
        </p>
      </div>
      <section className="grid gap-3">
        <h2 className="font-display text-xl font-semibold text-navy">Последние платежи</h2>
        <ul className="grid gap-2">
          {payments.map((payment) => (
            <li key={payment.id} className="rounded-2xl border border-line bg-white p-4 text-sm">
              <p className="font-semibold text-ink">
                {payment.status} · {payment.purpose} · {formatKopecks(payment.amount_kopecks)}
              </p>
              <p className="text-muted">{payment.email} · {formatDateRu(payment.created_at)}</p>
              <Link href={`/payments/return?paymentId=${payment.id}`} className={`${secondaryButton} mt-2`}>
                Карточка
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="grid gap-3">
        <h2 className="font-display text-xl font-semibold text-navy">Возвраты</h2>
        {refunds.length === 0 ? <p className="text-sm text-muted">Пока нет.</p> : null}
        <ul className="grid gap-2">
          {refunds.map((refund) => (
            <li key={refund.id} className="rounded-2xl border border-line bg-white p-4 text-sm">
              {refund.status} · {formatKopecks(refund.amount_kopecks)} · платёж {refund.payment_id.slice(0, 8)}
            </li>
          ))}
        </ul>
      </section>
      <section className="grid gap-3">
        <h2 className="font-display text-xl font-semibold text-navy">Выплаты</h2>
        {payouts.length === 0 ? <p className="text-sm text-muted">Пока нет.</p> : null}
        <ul className="grid gap-2">
          {payouts.map((payout) => (
            <li key={payout.id} className="rounded-2xl border border-line bg-white p-4 text-sm">
              {payout.status} · {formatKopecks(payout.amount_kopecks)} · заказ {payout.rental_order_id.slice(0, 8)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
