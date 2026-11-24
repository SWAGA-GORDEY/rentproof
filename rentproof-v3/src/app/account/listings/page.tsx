import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { myListings } from "@/lib/marketplace";
import { statusLabel, rubles } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MyListingsPage() {
  const user = await requireUser();
  const listings = await myListings(user.id);
  return <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Кабинет</p><h1 className="section-title">Мои объявления</h1></div>{user.role !== "tenant" && <Link href="/account/listings/new" className="button-primary">+ Новое объявление</Link>}</div>{listings.length ? <div className="mt-7 grid gap-4">{listings.map((listing)=><article key={listing.id} className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between"><div><p className="text-lg font-black text-slate-950">{listing.title}</p><p className="mt-1 text-sm text-slate-500">{listing.city} · {listing.category} · {rubles(Number(listing.price_per_day))} в день · залог {rubles(Number(listing.deposit))}</p></div><span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">{statusLabel(listing.status)}</span></article>)}</div> : <div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center"><p className="font-black text-slate-950">Список пока пуст</p><p className="mt-2 text-sm text-slate-500">Когда вы добавите вещь, её статус и цена появятся здесь.</p>{user.role !== "tenant" && <Link className="button-primary mt-5" href="/account/listings/new">Создать объявление</Link>}</div>}</div>;
}
