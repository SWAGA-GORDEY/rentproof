import { Suspense } from "react";
import { CatalogCard } from "@/components/catalog-card";
import { requireUser } from "@/lib/current-user";
import { listFavorites } from "@/lib/favorites";

export const metadata = { title: "Избранное — RentProof" };

export default function FavoritesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Загружаем избранное…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  const user = await requireUser();
  const listings = listFavorites(user.id);
  return (
    <div className="grid gap-6">
      <h1 className="font-display text-3xl font-semibold text-navy">Избранное</h1>
      {listings.length === 0 ? <p className="rounded-3xl border border-line bg-white p-6 text-sm text-muted">Сохранённых объявлений пока нет.</p> : null}
      <ul className="grid gap-4 md:grid-cols-2">
        {listings.map((listing) => (
          <li key={listing.id}><CatalogCard listing={listing} /></li>
        ))}
      </ul>
    </div>
  );
}
