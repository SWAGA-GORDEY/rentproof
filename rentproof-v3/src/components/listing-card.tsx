import Link from "next/link";
import type { Listing } from "@/lib/marketplace";
import { rubles } from "@/lib/format";

const colors: Record<string, string> = {
  "Инструмент": "from-amber-100 via-orange-50 to-rose-100",
  "Техника": "from-sky-100 via-blue-50 to-indigo-100",
  "Для дома": "from-teal-100 via-emerald-50 to-lime-100",
  "Другое": "from-violet-100 via-fuchsia-50 to-pink-100",
};

export function ListingCard({ listing }: { listing: Listing }) {
  const bg = colors[listing.category] ?? colors.Другое;
  return (
    <article className="group overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-lift">
      <Link href={`/catalog/${listing.id}`} className="block">
        <div className={`relative flex h-48 items-end overflow-hidden bg-gradient-to-br ${bg} p-5`}>
          <div className="absolute -right-4 -top-8 size-44 rounded-full border-[22px] border-white/30 transition duration-500 group-hover:scale-110" />
          <div className="absolute right-9 top-8 size-20 rounded-[2rem] rotate-12 border border-white/60 bg-white/35 shadow-sm backdrop-blur-sm" />
          <span className="relative rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-700">{listing.category}</span>
          <span className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-600">RentProof · проверено</span>
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div><h3 className="line-clamp-1 text-lg font-extrabold tracking-tight text-slate-950">{listing.title}</h3><p className="mt-1 text-sm text-slate-500">{listing.city} · от {listing.owner_name}</p></div>
            <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 transition group-hover:bg-teal-600 group-hover:text-white">↗</span>
          </div>
          <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4">
            <span className="text-xs font-medium text-slate-500">Залог {rubles(Number(listing.deposit))}</span>
            <span className="text-lg font-extrabold text-slate-950">{rubles(Number(listing.price_per_day))}<span className="text-xs font-semibold text-slate-400"> / день</span></span>
          </div>
        </div>
      </Link>
    </article>
  );
}
