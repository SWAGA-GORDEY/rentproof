import { requireUser } from "@/lib/auth";
import { myBookings } from "@/lib/marketplace";
import { dateLabel, rubles, statusLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MyBookingsPage() {
  const user = await requireUser();
  const bookings = await myBookings(user);
  return <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8"><p className="eyebrow">Кабинет</p><h1 className="section-title">Заявки и аренды</h1><p className="mt-2 text-sm text-slate-500">Здесь собраны ваши запросы и заявки на ваши объявления.</p>{bookings.length ? <div className="mt-7 grid gap-4">{bookings.map((booking)=><article key={booking.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card sm:flex sm:items-center sm:justify-between sm:gap-5"><div><p className="text-lg font-black text-slate-950">{booking.listing_title}</p><p className="mt-1 text-sm text-slate-500">{booking.renter_id === user.id ? "Ваша заявка" : `Заявка от ${booking.renter_name}`} · {dateLabel(booking.start_date)} — {dateLabel(booking.end_date)} ({booking.days} дн.)</p></div><div className="mt-4 flex items-center justify-between gap-4 sm:mt-0"><b className="text-lg text-slate-950">{rubles(Number(booking.total_price))}</b><span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-extrabold text-amber-800">{statusLabel(booking.status)}</span></div></article>)}</div> : <div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">Заявок пока нет.</div>}</div>;
}
