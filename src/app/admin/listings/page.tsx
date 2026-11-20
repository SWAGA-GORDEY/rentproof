import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { moderateListingAction } from "@/app/actions/admin";
import { fieldClass, secondaryButton } from "@/components/styles";
import { getDb } from "@/lib/db";
import { listingStatusLabel, type ListingStatus } from "@/lib/listings";

export default function AdminListingsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Загружаем объявления…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  await connection();
  const rows = getDb()
    .prepare(
      `SELECT listings.id, listings.title, listings.status, listings.city, users.email
       FROM listings JOIN users ON users.id = listings.owner_id
       ORDER BY listings.updated_at DESC LIMIT 100`,
    )
    .all() as Array<{ id: string; title: string; status: ListingStatus; city: string; email: string }>;
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl font-semibold text-navy">Модерация объявлений</h1>
      <ul className="grid gap-3">
        {rows.map((listing) => (
          <li key={listing.id} className="rounded-3xl border border-line bg-white p-5">
            <p className="text-xs font-semibold uppercase text-accent">{listingStatusLabel(listing.status)} · {listing.city}</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-navy">{listing.title}</h2>
            <p className="text-sm text-muted">{listing.email}</p>
            <Link href={`/listings/${listing.id}`} className="mt-2 inline-block text-sm font-semibold text-navy">Открыть</Link>
            <form action={moderateListingAction} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
              <input type="hidden" name="listingId" value={listing.id} />
              <input name="reason" placeholder="Причина, если отклоняете" className={fieldClass} />
              <button name="decision" value="published" className={secondaryButton} type="submit">Опубликовать</button>
              <button name="decision" value="rejected" className={secondaryButton} type="submit">Отклонить</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
