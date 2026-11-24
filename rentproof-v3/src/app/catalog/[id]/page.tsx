import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requestBookingAction } from "@/app/actions";
import { listingById } from "@/lib/marketplace";
import { currentUser } from "@/lib/auth";
import { rubles } from "@/lib/format";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const listing = await listingById(id);
  return { title: listing?.title ?? "Объявление" };
}

export default async function ListingPage({ params, searchParams }: Props) {
  const { id } = await params;
  const [listing, user, query] = await Promise.all([listingById(id), currentUser(), searchParams]);
  if (!listing) notFound();
  const error = typeof query.error === "string" ? query.error : "";
  const minimumStart = new Date().toISOString().slice(0, 10);
  const minimumEnd = new Date(new Date().getTime() + 86_400_000).toISOString().slice(0, 10);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <Link href="/catalog" className="text-sm font-bold text-slate-500 hover:text-teal-700">← Назад в каталог</Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div>
          <div className="relative flex min-h-64 items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#d5e9de] via-[#eff5e7] to-[#dce8f5] sm:min-h-[24rem]"><div className="absolute size-72 rounded-full border-[2rem] border-white/30"/><div className="absolute size-44 rotate-12 rounded-[3rem] border border-white/70 bg-white/20"/><span className="relative text-8xl">{listing.category === "Инструмент" ? "🧰" : listing.category === "Техника" ? "🚜" : listing.category === "Для дома" ? "🏡" : "✳️"}</span><span className="absolute left-5 top-5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-extrabold text-teal-800">Сведения владельца</span></div>
          <div className="mt-7"><p className="eyebrow">{listing.category} · {listing.city}</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{listing.title}</h1><p className="mt-3 text-sm font-semibold text-slate-500">Владелец: {listing.owner_name}</p><div className="mt-7 rounded-[1.4rem] border border-slate-200 bg-white p-5 sm:p-6"><h2 className="text-base font-black text-slate-950">Описание и условия</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{listing.description}</p></div><p className="mt-4 text-xs leading-5 text-slate-400">Проверьте комплектность и зафиксируйте состояние предмета при передаче. Оплата согласуется с владельцем напрямую.</p></div>
        </div>
        <aside className="h-fit rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-card sm:p-6 lg:sticky lg:top-24"><p className="text-xs font-extrabold tracking-[.15em] text-slate-400 uppercase">Стоимость</p><p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{rubles(Number(listing.price_per_day))}<span className="text-sm font-bold text-slate-400"> / день</span></p><div className="mt-4 flex items-center justify-between border-y border-slate-100 py-4 text-sm"><span className="text-slate-500">Залог</span><b className="text-slate-900">{rubles(Number(listing.deposit))}</b></div>
          {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p>}
          {!user ? <div className="mt-5 grid gap-3"><p className="text-sm leading-6 text-slate-500">Войдите, чтобы отправить заявку владельцу.</p><Link className="button-primary w-full" href={`/login?next=${encodeURIComponent(`/catalog/${listing.id}`)}`}>Войти и запросить</Link></div> : user.id === listing.owner_id ? <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">Это ваше объявление. Управление доступно в кабинете.</p> : <form action={requestBookingAction} className="mt-5 grid gap-3"><input type="hidden" name="listing_id" value={listing.id}/><label className="grid gap-2 text-xs font-extrabold text-slate-600">Начало аренды<input className="field" required type="date" name="start_date" min={minimumStart}/></label><label className="grid gap-2 text-xs font-extrabold text-slate-600">Возврат<input className="field" required type="date" name="end_date" min={minimumEnd}/></label><button className="button-primary mt-1 w-full" type="submit">Отправить заявку <span aria-hidden="true">→</span></button><p className="text-center text-[11px] leading-5 text-slate-400">Заявка бесплатная. Владелец подтвердит даты и детали.</p></form>}
        </aside>
      </div>
    </div>
  );
}
