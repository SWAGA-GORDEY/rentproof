import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { CatalogCard } from "@/components/catalog-card";
import { PageShell } from "@/components/page-shell";
import { fieldClass, primaryButton, secondaryButton } from "@/components/styles";
import { categories, isCategoryId } from "@/lib/categories";
import { listCities, searchListings, type CatalogFilters } from "@/lib/listings";

export const metadata = {
  title: "Каталог — RentProof",
  description: "Поиск объявлений аренды по категории, городу, цене и доступности.",
};

type Query = Record<string, string | string[] | undefined>;

export default function CatalogPage({ searchParams }: { searchParams: Promise<Query> }) {
  return (
    <PageShell>
      <Suspense fallback={<p className="text-sm text-muted">Загружаем каталог…</p>}>
        <CatalogBody searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}

async function CatalogBody({ searchParams }: { searchParams: Promise<Query> }) {
  await connection();
  const params = await searchParams;
  const filters = readFilters(params);
  const result = searchListings(filters);
  const cities = listCities();
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-navy sm:text-4xl">Каталог</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted">Опубликованные объявления из базы. Демонстрационные карточки отмечены.</p>
      </div>
      <form method="get" action="/catalog" className="grid gap-3 rounded-3xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-1 text-sm font-medium text-ink">
          Поиск
          <input name="q" defaultValue={filters.q} className={fieldClass} />
        </label>
        <label className="grid gap-1 text-sm font-medium text-ink">
          Категория
          <select name="category" defaultValue={filters.category} className={fieldClass}>
            <option value="">Все</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-ink">
          Город
          <input name="city" list="cities" defaultValue={filters.city} className={fieldClass} />
          <datalist id="cities">
            {cities.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
        </label>
        <label className="grid gap-1 text-sm font-medium text-ink">
          Сортировка
          <select name="sort" defaultValue={filters.sort} className={fieldClass}>
            <option value="new">Сначала новые</option>
            <option value="price_asc">Цена по возрастанию</option>
            <option value="price_desc">Цена по убыванию</option>
            <option value="rating">По оценке отзывов</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-ink">
          Цена от
          <input name="min" inputMode="numeric" defaultValue={filters.minPrice ?? ""} className={fieldClass} />
        </label>
        <label className="grid gap-1 text-sm font-medium text-ink">
          Цена до
          <input name="max" inputMode="numeric" defaultValue={filters.maxPrice ?? ""} className={fieldClass} />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input type="checkbox" name="available" value="1" defaultChecked={filters.availableOnly} />
          Только доступные
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button className={primaryButton} type="submit">Найти</button>
          <Link href="/catalog" className={secondaryButton}>Сбросить</Link>
        </div>
      </form>
      <p className="text-sm text-muted">Найдено: {result.total}</p>
      {result.items.length === 0 ? (
        <p className="rounded-3xl border border-line bg-white p-6 text-sm text-muted">Ничего не найдено. Измените фильтры или сбросьте их.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {result.items.map((listing) => (
            <li key={listing.id}><CatalogCard listing={listing} /></li>
          ))}
        </ul>
      )}
      {pages > 1 ? (
        <nav aria-label="Страницы" className="flex flex-wrap gap-2">
          {Array.from({ length: pages }, (_, index) => {
            const page = index + 1;
            const href = catalogHref(filters, page);
            return (
              <Link key={page} href={href} aria-current={page === filters.page ? "page" : undefined} className={page === filters.page ? primaryButton : secondaryButton}>
                {page}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}

function readFilters(params: Query): CatalogFilters {
  const text = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : "";
  };
  const money = (key: string) => {
    const value = text(key);
    if (!/^\d{1,8}$/.test(value)) {
      return null;
    }
    return Number(value);
  };
  const sort = text("sort");
  const page = Number(text("page"));
  return {
    q: text("q").slice(0, 80),
    category: isCategoryId(text("category")) ? text("category") : "",
    city: text("city").slice(0, 40),
    minPrice: money("min"),
    maxPrice: money("max"),
    sort: sort === "price_asc" || sort === "price_desc" || sort === "rating" ? sort : "new",
    availableOnly: text("available") === "1",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

function catalogHref(filters: CatalogFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.city) params.set("city", filters.city);
  if (filters.minPrice !== null) params.set("min", String(filters.minPrice));
  if (filters.maxPrice !== null) params.set("max", String(filters.maxPrice));
  if (filters.sort !== "new") params.set("sort", filters.sort);
  if (filters.availableOnly) params.set("available", "1");
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/catalog?${search}` : "/catalog";
}
