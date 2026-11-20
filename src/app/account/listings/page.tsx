import { Suspense } from "react";
import Link from "next/link";
import { primaryButton } from "@/components/styles";
import { requireUser } from "@/lib/current-user";
import { formatRubles } from "@/lib/format";
import { listOwnerListings, listingStatusLabel } from "@/lib/listings";

export const metadata = { title: "Мои объявления — RentProof" };

export default function MyListingsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Загружаем объявления…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  const user = await requireUser();
  const listings = listOwnerListings(user.id);
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold text-navy">Объявления</h1>
        <Link href="/listings/create" className={primaryButton}>Создать</Link>
      </div>
      {listings.length === 0 ? <p className="rounded-3xl border border-line bg-white p-6 text-sm text-muted">У вас ещё нет объявлений.</p> : null}
      <ul className="grid gap-3">
        {listings.map((listing) => (
          <li key={listing.id} className="rounded-3xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-accent">{listingStatusLabel(listing.status)}{listing.isDemo ? " · демо" : ""}</p>
                <h2 className="mt-1 font-display text-xl font-semibold text-navy">{listing.title}</h2>
                <p className="mt-1 text-sm text-muted">{listing.city} · {formatRubles(listing.pricePerDay)} / сутки</p>
                {listing.rejectionReason ? <p className="mt-2 text-sm text-accent">{listing.rejectionReason}</p> : null}
              </div>
              <Link href={`/listings/${listing.id}/edit`} className="text-sm font-semibold text-navy">Изменить</Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
