import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { deleteListingPhotoAction, listingStatusAction } from "@/app/actions/listings";
import { ListingForm } from "@/components/listing-form";
import { UploadImage } from "@/components/upload-image";
import { PageShell } from "@/components/page-shell";
import { PhotoForm } from "@/components/simple-forms";
import { secondaryButton } from "@/components/styles";
import { requireUser } from "@/lib/current-user";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { getOwnedListing, listingStatusLabel } from "@/lib/listings";

type Params = { id: string };

export const metadata = { title: "Редактирование — RentProof" };

export default function EditListingPage({ params }: { params: Promise<Params> }) {
  return (
    <PageShell>
      <Suspense fallback={<p className="text-sm text-muted">Загружаем объявление…</p>}>
        <Body params={params} />
      </Suspense>
    </PageShell>
  );
}

async function Body({ params }: { params: Promise<Params> }) {
  const user = await requireUser();
  const { id } = await params;
  let listing;
  try {
    listing = getOwnedListing(user.id, id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    if (error instanceof ForbiddenError) {
      redirect("/account/listings?error=forbidden");
    }
    throw error;
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] text-accent uppercase">{listingStatusLabel(listing.status)}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-navy">Редактирование</h1>
        {listing.rejectionReason ? <p className="mt-3 text-sm text-accent">Причина отклонения: {listing.rejectionReason}</p> : null}
        {listing.isDemo ? <p className="mt-3 text-sm text-muted">Это демонстрационное объявление.</p> : null}
      </div>
      <ListingForm listing={listing} />
      <PhotoForm listingId={listing.id} />
      {listing.images.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {listing.images.map((image) => (
            <li key={image.id} className="rounded-2xl border border-line bg-white p-2">
              <UploadImage src={`/media/${image.id}`} alt="" className="aspect-square w-full rounded-xl object-cover" />
              <form action={deleteListingPhotoAction} className="mt-2">
                <input type="hidden" name="listingId" value={listing.id} />
                <input type="hidden" name="imageId" value={image.id} />
                <button className="text-sm font-semibold text-navy" type="submit">Удалить</button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Фотографий пока нет.</p>
      )}
      <div className="flex flex-wrap gap-3">
        {listing.status !== "archived" ? (
          <form action={listingStatusAction}>
            <input type="hidden" name="listingId" value={listing.id} />
            <input type="hidden" name="status" value="archived" />
            <button className={secondaryButton} type="submit">В архив</button>
          </form>
        ) : null}
        {listing.status === "published" || listing.status === "pending" ? (
          <form action={listingStatusAction}>
            <input type="hidden" name="listingId" value={listing.id} />
            <input type="hidden" name="status" value="draft" />
            <button className={secondaryButton} type="submit">Скрыть</button>
          </form>
        ) : null}
        <Link href={`/listings/${listing.id}`} className={secondaryButton}>Открыть карточку</Link>
      </div>
    </div>
  );
}
