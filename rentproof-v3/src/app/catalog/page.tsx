import type { Metadata } from "next";
import Link from "next/link";
import { ListingCard } from "@/components/listing-card";
import { publicListings } from "@/lib/marketplace";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Каталог аренды" };
type Search = { q?: string | string[]; category?: string | string[] };

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  const category = typeof params.category === "string" ? params.category : "";
  const listings = await publicListings(q, category);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Найдите рядом</p><h1 className="section-title">Каталог аренды</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Условия аренды и залог видны до заявки. Выбирайте вещь, задавайте даты — решение за владельцем.</p></div><Link href="/account/listings/new" className="button-primary">+ Разместить объявление</Link></div>
      <form action="/catalog" className="mt-8 grid gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-card sm:grid-cols-[1fr_14rem_auto_auto] sm:items-end sm:p-5">
        <label className="grid gap-2 text-xs font-extrabold text-slate-600">Поиск<input className="field" name="q" defaultValue={q} placeholder="Название, категория или город" /></label>
        <label className="grid gap-2 text-xs font-extrabold text-slate-600">Категория<select className="field" name="category" defaultValue={category}><option value="">Все категории</option><option>Инструмент</option><option>Техника</option><option>Для дома</option><option>Другое</option></select></label>
        <button className="button-primary" type="submit">Найти</button><Link className="button-secondary" href="/catalog">Сбросить</Link>
      </form>
      <div className="mt-5 flex items-center justify-between"><p className="text-sm font-semibold text-slate-500">{listings.length} {listings.length === 1 ? "объявление" : "объявлений"}</p>{category && <Link href="/catalog" className="text-xs font-bold text-teal-700">Сбросить категорию ×</Link>}</div>
      {listings.length ? <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div> : <div className="mt-6 rounded-[1.6rem] border border-dashed border-slate-300 bg-white p-8 text-center sm:p-12"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-teal-50 text-2xl">⌕</span><h2 className="mt-4 text-xl font-black text-slate-950">Пока ничего не найдено</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Попробуйте изменить запрос или станьте первым, кто добавит вещь в эту категорию.</p><Link href="/account/listings/new" className="button-primary mt-5">Разместить объявление <span aria-hidden="true">→</span></Link></div>}
    </div>
  );
}
