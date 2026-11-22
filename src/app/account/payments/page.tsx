import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/current-user";
import { formatKopecks } from "@/lib/money";
import { formatDateRu } from "@/lib/format";
import { listPaymentsForUser } from "@/lib/payments";
import { listRentalOrdersForUser } from "@/lib/rental-orders";
import { secondaryButton } from "@/components/styles";

export const metadata = { title: "Мои платежи" };

export default function AccountPaymentsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Загружаем платежи…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  const user = await requireUser();
  const payments = listPaymentsForUser(user.id);
  const orders = listRentalOrdersForUser(user.id);
  return (
    <div className="grid gap-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-navy">Мои платежи</h1>
        <p className="mt-2 text-sm text-muted">Только ваши операции. Чужие платежи недоступны.</p>
      </div>
      <section className="grid gap-3">
        <h2 className="font-display text-xl font-semibold text-navy">Платежи</h2>
        {payments.length === 0 ? (
          <p className="rounded-3xl border border-line bg-white p-6 text-sm text-muted">Пока нет платежей.</p>
        ) : (
          <ul className="grid gap-3">
            {payments.map((payment) => (
              <li key={payment.id} className="rounded-3xl border border-line bg-white p-5">
                <p className="text-xs font-semibold uppercase text-accent">{payment.status}</p>
                <p className="mt-1 font-semibold text-ink">
                  {payment.purpose === "subscription" ? `Подписка ${payment.planId?.toUpperCase() ?? ""}` : "Аренда"} ·{" "}
                  {formatKopecks(payment.amountKopecks)}
                </p>
                <p className="mt-1 text-sm text-muted">{formatDateRu(payment.createdAt)}</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link href={`/payments/return?paymentId=${payment.id}`} className={secondaryButton}>
                    Статус
                  </Link>
                  {payment.bookingId ? (
                    <Link href={`/account/bookings/${payment.bookingId}`} className={secondaryButton}>
                      Заявка
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="grid gap-3">
        <h2 className="font-display text-xl font-semibold text-navy">Заказы аренды</h2>
        {orders.length === 0 ? (
          <p className="rounded-3xl border border-line bg-white p-6 text-sm text-muted">Заказов пока нет.</p>
        ) : (
          <ul className="grid gap-3">
            {orders.map((order) => (
              <li key={order.id} className="rounded-3xl border border-line bg-white p-5 text-sm">
                <p className="text-xs font-semibold uppercase text-accent">
                  {order.paymentStatus} · {order.dealStatus}
                </p>
                <p className="mt-1 text-ink">
                  {formatKopecks(order.totalAmountKopecks)} (аренда {formatKopecks(order.rentalAmountKopecks)} + комиссия{" "}
                  {formatKopecks(order.platformFeeKopecks)})
                </p>
                <p className="mt-1 text-muted">
                  Залог {formatKopecks(order.depositAmountKopecks)} — не списывается до Безопасной сделки.
                </p>
                <Link href={`/account/bookings/${order.bookingId}`} className={`${secondaryButton} mt-3`}>
                  К заявке
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
