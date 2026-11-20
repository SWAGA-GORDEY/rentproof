import { Suspense } from "react";
import { adminOverview } from "@/lib/admin";
import { requireAdmin } from "@/lib/current-user";
import { bookingStatusLabel } from "@/lib/bookings";
import { categories } from "@/lib/categories";
import { formatDateRu } from "@/lib/format";

export default function AdminHomePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Считаем статистику…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  await requireAdmin();
  const overview = adminOverview();
  return (
    <div className="grid gap-6">
      <h1 className="font-display text-3xl font-semibold text-navy">Обзор</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Пользователи" value={overview.stats.users} />
        <Stat label="Объявления" value={overview.stats.listings} />
        <Stat label="Опубликовано" value={overview.stats.published} />
        <Stat label="На модерации" value={overview.stats.pending} />
        <Stat label="Бронирования" value={overview.stats.bookings} />
        <Stat label="Открытые жалобы" value={overview.stats.openComplaints} />
      </div>
      <section className="rounded-3xl border border-line bg-white p-6">
        <h2 className="font-display text-xl font-semibold text-navy">Категории</h2>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {categories.map((category) => (
            <li key={category.id}>{category.name}</li>
          ))}
        </ul>
      </section>
      <section className="overflow-x-auto rounded-3xl border border-line bg-white p-6">
        <h2 className="font-display text-xl font-semibold text-navy">Последние заявки</h2>
        <table className="mt-4 w-full min-w-[36rem] text-left text-sm">
          <thead className="text-muted">
            <tr><th className="py-2">Объявление</th><th>Статус</th><th>Даты</th></tr>
          </thead>
          <tbody>
            {overview.bookings.map((booking) => (
              <tr key={booking.id} className="border-t border-line">
                <td className="py-2">{booking.listingTitle}</td>
                <td>{bookingStatusLabel(booking.status)}</td>
                <td>{booking.startDate} — {booking.endDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="rounded-3xl border border-line bg-white p-6">
        <h2 className="font-display text-xl font-semibold text-navy">События</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {overview.audit.map((entry) => (
            <li key={entry.id} className="flex justify-between gap-3 border-b border-line py-2">
              <span>{entry.action}</span>
              <span className="text-muted">{formatDateRu(entry.createdAt)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-5">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-navy">{value}</p>
    </div>
  );
}
