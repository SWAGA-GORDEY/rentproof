import Link from "next/link";
import { connection } from "next/server";
import { CatalogCard } from "@/components/catalog-card";
import { secondaryButton } from "@/components/styles";
import { categories } from "@/lib/categories";
import { searchListings } from "@/lib/listings";

export async function HomeCatalog() {
  await connection();
  const result = searchListings({
    q: "",
    category: "",
    city: "",
    minPrice: null,
    maxPrice: null,
    sort: "new",
    availableOnly: false,
    page: 1,
  });

  return (
    <section id="catalog" className="scroll-mt-24 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">Каталог</p>
        <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-navy sm:text-4xl">Объявления из базы</h2>
          <Link href="/catalog" className={secondaryButton}>
            Все объявления
          </Link>
        </div>
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((category) => (
            <li key={category.id}>
              <Link href={`/catalog?category=${category.id}`} className="block rounded-2xl border border-line bg-white px-3 py-3 text-sm font-semibold text-ink hover:border-navy/30">
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
        {result.items.length === 0 ? (
          <p className="mt-8 text-sm text-muted">В каталоге пока нет опубликованных объявлений.</p>
        ) : (
          <ul className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {result.items.slice(0, 6).map((listing) => (
              <li key={listing.id}>
                <CatalogCard listing={listing} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function HomeCatalogFallback() {
  return <section className="py-16 text-sm text-muted sm:py-20">Загружаем каталог…</section>;
}
