import Link from "next/link";
import { becomeOwnerAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { myBookings, myListings } from "@/lib/marketplace";
import { dateLabel, rubles, statusLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser();
  const [listings, bookings] = await Promise.all([myListings(user.id), myBookings(user)]);
  const incoming = bookings.filter((booking) => booking.owner_id === user.id);
  const tenant = bookings.filter((booking) => booking.renter_id === user.id);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Личный кабинет</p><h1 className="section-title">Здравствуйте, {user.name.split(" ")[0]}</h1><p className="mt-2 text-sm text-slate-500">{user.role === "owner" ? "Кабинет арендодателя" : user.role === "admin" ? "Администратор" : "Кабинет арендатора"}</p></div>{user.role === "admin" && <Link className="button-primary" href="/owner">Открыть админ-панель →</Link>}</div>
      {user.role === "tenant" && <div className="mt-7 flex flex-col gap-4 rounded-3xl border border-teal-100 bg-teal-50 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-slate-950">Есть вещи, которыми готовы поделиться?</p><p className="mt-1 text-sm text-slate-600">Включите режим арендодателя и добавьте первое объявление.</p></div><form action={becomeOwnerAction}><button className="button-secondary" type="submit">Стать арендодателем <span aria-hidden="true">→</span></button></form></div>}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">{[{label:"Мои объявления",value:listings.length,icon:"▤"},{label:"Заявки на мои вещи",value:incoming.length,icon:"↙"},{label:"Мои аренды",value:tenant.length,icon:"⌕"}].map((stat)=><article key={stat.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card"><div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-500">{stat.label}</span><span className="grid size-10 place-items-center rounded-2xl bg-teal-50 text-lg text-teal-700">{stat.icon}</span></div><p className="mt-4 text-3xl font-black text-slate-950">{stat.value}</p></article>)}</div>
      <div className="mt-9 grid gap-6 lg:grid-cols-2">
        <section className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-card sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black text-slate-950">Объявления</h2>{user.role !== "tenant" && <Link className="text-sm font-extrabold text-teal-700" href="/account/listings/new">+ Добавить</Link>}</div>{listings.length ? <div className="mt-4 divide-y divide-slate-100">{listings.slice(0,5).map((listing)=><div className="flex items-center justify-between gap-3 py-3" key={listing.id}><div className="min-w-0"><p className="truncate text-sm font-extrabold text-slate-900">{listing.title}</p><p className="mt-1 text-xs text-slate-500">{listing.city} · {rubles(Number(listing.price_per_day))}/день</p></div><span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">{statusLabel(listing.status)}</span></div>)}</div> : <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Объявлений пока нет.</p>}<Link href="/account/listings" className="mt-4 inline-flex text-sm font-bold text-slate-600">Все объявления →</Link></section>
        <section className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-card sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black text-slate-950">Последние заявки</h2><Link className="text-sm font-extrabold text-teal-700" href="/account/bookings">Все заявки →</Link></div>{bookings.length ? <div className="mt-4 divide-y divide-slate-100">{bookings.slice(0,5).map((booking)=><div className="flex items-center justify-between gap-3 py-3" key={booking.id}><div className="min-w-0"><p className="truncate text-sm font-extrabold text-slate-900">{booking.listing_title}</p><p className="mt-1 text-xs text-slate-500">{dateLabel(booking.start_date)} — {dateLabel(booking.end_date)} · {rubles(Number(booking.total_price))}</p></div><span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800">{statusLabel(booking.status)}</span></div>)}</div> : <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Заявок пока нет — найдите что-нибудь в каталоге.</p>}</section>
      </div>
    </div>
  );
}
