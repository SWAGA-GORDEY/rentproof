import { moderateListingAction } from "@/app/actions";
import { allListings } from "@/lib/marketplace";
import { rubles, statusLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminListingsPage() {
  const listings = await allListings();
  return <div><p className="eyebrow">Контент</p><h1 className="section-title">Модерация объявлений</h1><p className="mt-2 text-sm text-slate-500">Проверяйте описание и условия перед публикацией.</p><div className="mt-6 grid gap-4">{listings.length ? listings.map((listing)=><article key={listing.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-black text-slate-950">{listing.title}</h2><p className="mt-1 text-xs text-slate-500">{listing.owner_name} · {listing.city} · {listing.category}</p></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold">{statusLabel(listing.status)}</span></div><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{listing.description}</p><p className="mt-3 text-sm font-extrabold text-slate-900">{rubles(Number(listing.price_per_day))}/день <span className="font-medium text-slate-500">· залог {rubles(Number(listing.deposit))}</span></p><div className="mt-4 flex flex-wrap gap-2"><form action={moderateListingAction}><input type="hidden" name="id" value={listing.id}/><input type="hidden" name="status" value="published"/><button className="button-primary" type="submit">Одобрить</button></form><form action={moderateListingAction}><input type="hidden" name="id" value={listing.id}/><input type="hidden" name="status" value="hidden"/><button className="button-secondary" type="submit">Скрыть</button></form></div></article>) : <p className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">Объявлений пока нет.</p>}</div></div>;
}
