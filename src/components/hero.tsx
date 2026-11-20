import Link from "next/link";
import { Suspense } from "react";
import { PlaceListingLink } from "@/components/place-listing-link";
import { SearchBar } from "@/components/search-bar";
import { secondaryButton } from "@/components/styles";
import {
  categoryName,
  featuredListing,
  formatDays,
  formatRubles,
} from "@/lib/catalog";

export function Hero() {
  const featured = featuredListing;

  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="blueprint absolute inset-0" />
      <div className="relative mx-auto grid max-w-6xl items-start gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(20rem,0.88fr)] lg:gap-16 lg:py-20">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">
            Платформа аренды имущества
          </p>
          <h1 className="mt-4 max-w-xl font-display text-[2.35rem] leading-[1.08] font-semibold tracking-tight text-balance text-navy sm:text-5xl lg:text-[3.35rem]">
            Аренда без риска. Доверие в каждой сделке
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-graphite sm:text-lg">
            Сравнивайте технику, оборудование и площади до сделки: в карточке
            видны состояние, залог и минимальный срок.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <PlaceListingLink className="inline-flex items-center justify-center rounded-xl bg-navy px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#16365d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy" />
            <a href="#benefits" className={secondaryButton}>
              Смотреть преимущества
            </a>
          </div>
          <div className="mt-8">
            <Suspense fallback={<SearchFallback />}>
              <SearchBar />
            </Suspense>
            <p className="mt-3 text-sm leading-6 text-muted">
              Кнопка «Найти» оставляет подходящие карточки в каталоге.
            </p>
          </div>
        </div>
        <aside className="relative rounded-3xl border border-line bg-white p-6 shadow-[0_24px_50px_-32px_rgba(12,35,64,0.6)] sm:p-7">
          <span className="absolute top-3 left-3 h-3 w-3 border-t border-l border-navy/40" />
          <span className="absolute top-3 right-3 h-3 w-3 border-t border-r border-navy/40" />
          <span className="absolute bottom-3 left-3 h-3 w-3 border-b border-l border-navy/40" />
          <span className="absolute right-3 bottom-3 h-3 w-3 border-r border-b border-navy/40" />
          <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">
            Образец досье
          </p>
          <h2 className="mt-3 font-display text-2xl leading-tight font-semibold text-navy">
            {featured.title}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {featured.city} · {categoryName(featured.category)}
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-mist px-4 py-3">
              <dt className="text-xs text-muted">Состояние</dt>
              <dd className="mt-1 font-display text-2xl font-semibold text-navy">
                {featured.condition}
              </dd>
            </div>
            <div className="rounded-2xl bg-mist px-4 py-3">
              <dt className="text-xs text-muted">За сутки</dt>
              <dd className="mt-1 font-display text-2xl font-semibold text-navy">
                {formatRubles(featured.pricePerDay)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Залог</dt>
              <dd className="mt-1 text-sm font-semibold text-ink">
                {formatRubles(featured.deposit)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Минимум</dt>
              <dd className="mt-1 text-sm font-semibold text-ink">
                {formatDays(featured.minDays)}
              </dd>
            </div>
          </dl>
          <p className="mt-5 text-sm leading-6 text-graphite">{featured.summary}</p>
          <Link
            href={`/?category=${featured.category}&q=${encodeURIComponent(featured.title.split(" ")[0] ?? featured.title)}#catalog`}
            className={`${secondaryButton} mt-6 w-full`}
          >
            Показать эту технику в каталоге
          </Link>
        </aside>
      </div>
    </section>
  );
}

function SearchFallback() {
  return (
    <div
      aria-hidden="true"
      className="h-[5.5rem] rounded-2xl border border-line bg-white"
    />
  );
}
