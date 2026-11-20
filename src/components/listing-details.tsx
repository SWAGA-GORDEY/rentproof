import Link from "next/link";
import { BookingForm } from "@/components/booking-form";
import { ComplaintForm } from "@/components/simple-forms";
import { ListingArt } from "@/components/listing-art";
import { UploadImage } from "@/components/upload-image";
import { toggleFavoriteAction } from "@/app/actions/social";
import { secondaryButton } from "@/components/styles";
import { categoryName } from "@/lib/categories";
import { formatDateRu, formatRubles } from "@/lib/format";
import { listingStatusLabel, type ListingRecord } from "@/lib/listings";
import type { DateRange } from "@/lib/bookings";
import type { ReviewRecord } from "@/lib/reviews";
import type { PublicUser } from "@/lib/users";

export function ListingDetails({
  listing,
  ranges,
  reviews,
  user,
  favorite,
  preview = false,
}: {
  listing: ListingRecord;
  ranges: DateRange[];
  reviews: ReviewRecord[];
  user: PublicUser | null;
  favorite: boolean;
  preview?: boolean;
}) {
  const ownerView = user?.id === listing.ownerId;
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
      <div className="grid gap-6">
        <div className="overflow-hidden rounded-3xl border border-line bg-white">
          {listing.images[0] ? (
            <UploadImage src={`/media/${listing.images[0].id}`} alt={listing.title} priority className="aspect-[16/10] w-full object-cover" />
          ) : (
            <ListingArt category={listing.categoryId} />
          )}
          {listing.images.length > 1 ? (
            <ul className="grid grid-cols-4 gap-2 p-3">
              {listing.images.slice(1).map((image) => (
                <li key={image.id}>
                  <UploadImage src={`/media/${image.id}`} alt="" className="aspect-square w-full rounded-xl object-cover" />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {!listing.images.length ? (
          <p className="text-xs text-muted">Иллюстрация категории, не фотография предмета.</p>
        ) : null}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold tracking-[0.14em] text-accent uppercase">{categoryName(listing.categoryId)}</p>
            {listing.isDemo ? <span className="rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold uppercase text-graphite">Демонстрационное объявление</span> : null}
            {preview ? <span className="rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold uppercase text-graphite">{listingStatusLabel(listing.status)}</span> : null}
          </div>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-navy sm:text-4xl">{listing.title}</h1>
          <p className="mt-3 text-sm text-graphite">{listing.city}</p>
          <p className="mt-5 max-w-3xl text-base leading-7 text-graphite">{listing.description}</p>
        </div>
        <section className="rounded-3xl border border-line bg-white p-6">
          <h2 className="font-display text-xl font-semibold text-navy">Условия</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Row label="Цена" value={`${formatRubles(listing.pricePerDay)} за сутки`} />
            <Row label="Залог" value={formatRubles(listing.deposit)} />
            <Row label="Минимум" value={`${listing.minDays} сут.`} />
            <Row label="Заявки" value={listing.bookable ? "Открыты" : "Закрыты"} />
            <Row label="Доступно с" value={listing.availableFrom ? formatDateRu(listing.availableFrom) : "Без ограничения"} />
            <Row label="Доступно по" value={listing.availableTo ? formatDateRu(listing.availableTo) : "Без ограничения"} />
            <Row label="Оценка владельца" value={listing.conditionScore === null ? "Не указана" : `${listing.conditionScore} из 100`} />
          </dl>
          {listing.conditionNotes ? <p className="mt-4 text-sm leading-6 text-muted">{listing.conditionNotes}</p> : null}
          <p className="mt-3 text-xs leading-5 text-muted">Оценка владельца — это его описание, а не техническая экспертиза и не балл AI.</p>
        </section>
        {listing.specs.length > 0 ? (
          <section className="rounded-3xl border border-line bg-white p-6">
            <h2 className="font-display text-xl font-semibold text-navy">Характеристики</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              {listing.specs.map((spec) => (
                <Row key={`${spec.label}-${spec.value}`} label={spec.label} value={spec.value} />
              ))}
            </dl>
          </section>
        ) : null}
        <section className="rounded-3xl border border-line bg-white p-6">
          <h2 className="font-display text-xl font-semibold text-navy">Арендодатель</h2>
          <p className="mt-3 text-sm text-ink">{listing.ownerName}</p>
          <p className="mt-1 text-sm text-muted">{listing.ownerCity ?? "Город не указан"}</p>
          <p className="mt-3 text-sm text-muted">
            {listing.reviewCount > 0 ? `Оценка ${listing.ratingAvg} из 5, отзывов: ${listing.reviewCount}` : "Отзывов по объявлению пока нет"}
          </p>
        </section>
        <section className="rounded-3xl border border-line bg-white p-6">
          <h2 className="font-display text-xl font-semibold text-navy">Занятые даты</h2>
          {ranges.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Подтверждённых бронирований нет.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-ink">
              {ranges.map((range) => (
                <li key={`${range.startDate}-${range.endDate}`}>{formatDateRu(range.startDate)} — {formatDateRu(range.endDate)}</li>
              ))}
            </ul>
          )}
        </section>
        <section className="grid gap-4">
          <h2 className="font-display text-xl font-semibold text-navy">Отзывы</h2>
          {reviews.length === 0 ? <p className="text-sm text-muted">Отзывы появятся после завершённых аренд.</p> : null}
          {reviews.map((review) => (
            <article key={review.id} className="rounded-3xl border border-line bg-white p-5">
              <p className="text-sm font-semibold text-ink">{review.authorName} · {review.rating} из 5</p>
              <p className="mt-2 text-sm leading-6 text-graphite">{review.body}</p>
              <p className="mt-2 text-xs text-muted">{formatDateRu(review.createdAt)}</p>
            </article>
          ))}
        </section>
      </div>
      <aside className="grid content-start gap-4">
        {user && !ownerView && listing.status === "published" && listing.bookable ? (
          <BookingForm listingId={listing.id} pricePerDay={listing.pricePerDay} deposit={listing.deposit} minDays={listing.minDays} />
        ) : (
          <div className="rounded-3xl border border-line bg-white p-6 text-sm leading-6 text-muted">
            {ownerView ? "Своё объявление бронировать нельзя." : user ? "Сейчас заявки не принимаются." : <Link href="/login" className="font-semibold text-navy">Войдите</Link>}
            {!user ? ", чтобы отправить заявку." : null}
          </div>
        )}
        {user ? (
          <form action={toggleFavoriteAction}>
            <input type="hidden" name="listingId" value={listing.id} />
            <input type="hidden" name="returnTo" value={`/catalog/${listing.id}`} />
            <button className={`${secondaryButton} w-full`} type="submit">{favorite ? "Убрать из избранного" : "В избранное"}</button>
          </form>
        ) : null}
        {ownerView ? (
          <Link href={`/listings/${listing.id}/edit`} className={secondaryButton}>Редактировать</Link>
        ) : null}
        {user && !ownerView ? <ComplaintForm targetType="listing" targetId={listing.id} /> : null}
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line pb-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
