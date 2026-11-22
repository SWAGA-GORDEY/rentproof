import { Suspense } from "react";
import Link from "next/link";
import { markReadAction } from "@/app/actions/social";
import { LogoutButton } from "@/components/logout-button";
import { secondaryButton } from "@/components/styles";
import { requireUser } from "@/lib/current-user";
import { listBookingsForUser } from "@/lib/bookings";
import { listNotifications, mailChannelStatus, unreadCount } from "@/lib/notifications";
import { readPlan } from "@/lib/subscriptions";
import { roleLabel } from "@/lib/validation";

export const metadata = { title: "Кабинет" };

export default function AccountPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Загружаем кабинет…</p>}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const user = await requireUser();
  const plan = readPlan(user.id);
  const notifications = listNotifications(user.id, 8);
  const unread = unreadCount(user.id);
  const bookings = listBookingsForUser(user.id, plan);
  const mail = mailChannelStatus();
  const turnover = bookings
    .filter((booking) => booking.ownerId === user.id && (booking.status === "confirmed" || booking.status === "completed"))
    .reduce((sum, booking) => sum + booking.rentAmount, 0);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-navy">Здравствуйте, {user.name}</h1>
        <p className="mt-2 text-sm text-muted">{roleLabel(user.role)} · тариф {plan.toUpperCase()} · демонстрационный режим</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Непрочитанные" value={String(unread)} />
        <Stat label="Заявки в истории" value={String(bookings.length)} />
        {plan === "pro" ? <Stat label="Расчёт аренды" value={`${turnover} ₽`} /> : <Stat label="Город" value={user.city ?? "Не указан"} />}
      </div>
      {plan === "pro" ? <p className="text-xs text-muted">Сумма — демонстрационный расчёт подтверждённых и завершённых заявок. Оплата не проводилась.</p> : null}
      <section className="rounded-3xl border border-line bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-navy">Уведомления</h2>
          {unread > 0 ? (
            <form action={markReadAction}><button className="text-sm font-semibold text-navy" type="submit">Прочитать</button></form>
          ) : null}
        </div>
        <p className="mt-2 text-xs leading-5 text-muted">{mail.note}</p>
        {notifications.length === 0 ? <p className="mt-4 text-sm text-muted">Пока нет событий.</p> : null}
        <ul className="mt-4 space-y-3">
          {notifications.map((item) => (
            <li key={item.id} className="border-b border-line pb-3 text-sm">
              <p className="font-semibold text-ink">{item.title}</p>
              <p className="mt-1 text-muted">{item.body}</p>
              {item.href ? <Link href={item.href} className="mt-1 inline-block font-semibold text-navy">Открыть</Link> : null}
            </li>
          ))}
        </ul>
      </section>
      <div className="flex flex-wrap gap-3">
        <Link href="/account/listings" className={secondaryButton}>Мои объявления</Link>
        <Link href="/account/bookings" className={secondaryButton}>Бронирования</Link>
        <Link href={user.role === "landlord" ? "/account/landlord" : "/account/tenant"} className={secondaryButton}>
          {user.role === "landlord" ? "Раздел арендодателя" : "Раздел арендатора"}
        </Link>
        <LogoutButton />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-5">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-navy">{value}</p>
    </div>
  );
}
