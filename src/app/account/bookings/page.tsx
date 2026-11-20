import { Suspense } from "react";
import Link from "next/link";
import { bookingDecisionAction } from "@/app/actions/bookings";
import { secondaryButton } from "@/components/styles";
import { bookingStatusLabel, listBookingsForUser } from "@/lib/bookings";
import { requireUser } from "@/lib/current-user";
import { formatDateRu, formatRubles } from "@/lib/format";
import { readPlan } from "@/lib/subscriptions";

export const metadata = { title: "Бронирования — RentProof" };

export default function BookingsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Загружаем заявки…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  const user = await requireUser();
  const plan = readPlan(user.id);
  const bookings = listBookingsForUser(user.id, plan);
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl font-semibold text-navy">Бронирования</h1>
      <p className="text-sm text-muted">История ограничена тарифом {plan.toUpperCase()}. Суммы — демонстрационный расчёт.</p>
      {bookings.length === 0 ? <p className="rounded-3xl border border-line bg-white p-6 text-sm text-muted">Заявок пока нет.</p> : null}
      <ul className="grid gap-3">
        {bookings.map((booking) => {
          const owner = booking.ownerId === user.id;
          return (
            <li key={booking.id} className="rounded-3xl border border-line bg-white p-5">
              <p className="text-xs font-semibold uppercase text-accent">{bookingStatusLabel(booking.status)} · {owner ? "входящая" : "моя заявка"}</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-navy">
                <Link href={`/account/bookings/${booking.id}`}>{booking.listingTitle}</Link>
              </h2>
              <p className="mt-1 text-sm text-muted">{formatDateRu(booking.startDate)} — {formatDateRu(booking.endDate)} · {booking.days} сут.</p>
              <p className="mt-1 text-sm text-ink">Аренда {formatRubles(booking.rentAmount)} · залог {formatRubles(booking.depositAmount)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {owner && booking.status === "pending" ? <Decision id={booking.id} decision="confirm" label="Подтвердить" /> : null}
                {owner && booking.status === "pending" ? <Decision id={booking.id} decision="reject" label="Отклонить" /> : null}
                {(booking.status === "pending" || booking.status === "confirmed") ? <Decision id={booking.id} decision="cancel" label="Отменить" /> : null}
                {booking.status === "confirmed" ? <Decision id={booking.id} decision="complete" label="Завершить" /> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Decision({ id, decision, label }: { id: string; decision: string; label: string }) {
  return (
    <form action={bookingDecisionAction}>
      <input type="hidden" name="bookingId" value={id} />
      <input type="hidden" name="decision" value={decision} />
      <input type="hidden" name="returnTo" value="/account/bookings" />
      <button className={secondaryButton} type="submit">{label}</button>
    </form>
  );
}
