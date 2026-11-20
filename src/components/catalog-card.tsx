import Link from "next/link";
import { ListingArt } from "@/components/listing-art";
import { UploadImage } from "@/components/upload-image";
import { PinIcon } from "@/components/icons";
import { categoryName } from "@/lib/categories";
import { formatRubles } from "@/lib/format";
import type { ListingRecord } from "@/lib/listings";

export function CatalogCard({ listing }: { listing: ListingRecord }) {
  const cover = listing.images[0];
  return (
    <article className="rise flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white transition hover:border-navy/25">
      <Link href={`/catalog/${listing.id}`} className="block">
        {cover ? (
          <UploadImage src={`/media/${cover.id}`} alt="" className="aspect-[16/10] w-full object-cover" />
        ) : (
          <ListingArt category={listing.categoryId} />
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold tracking-[0.12em] text-accent uppercase">{categoryName(listing.categoryId)}</p>
          {listing.isDemo ? (
            <span className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold tracking-wide text-graphite uppercase">
              Демо
            </span>
          ) : null}
        </div>
        <h2 className="mt-3 font-display text-xl leading-snug font-semibold text-balance text-navy">
          <Link href={`/catalog/${listing.id}`} className="hover:underline">
            {listing.title}
          </Link>
        </h2>
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-graphite">
          <PinIcon className="h-4 w-4 text-accent" />
          {listing.city}
        </p>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">{listing.description}</p>
        <div className="mt-5 flex items-end justify-between gap-3">
          <p>
            <span className="font-display text-2xl font-semibold text-navy">{formatRubles(listing.pricePerDay)}</span>
            <span className="mt-1 block text-xs text-muted">за сутки</span>
          </p>
          <p className="text-right text-sm text-muted">
            {listing.reviewCount > 0 ? `${listing.ratingAvg} · ${listing.reviewCount}` : "Пока без отзывов"}
          </p>
        </div>
      </div>
    </article>
  );
}
