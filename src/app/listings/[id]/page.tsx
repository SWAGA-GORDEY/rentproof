import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ListingDetails } from "@/components/listing-details";
import { PageShell } from "@/components/page-shell";
import { listConfirmedRanges } from "@/lib/bookings";
import { getCurrentUser } from "@/lib/current-user";
import { isFavorite } from "@/lib/favorites";
import { getManageableListing } from "@/lib/listings";
import { listListingReviews } from "@/lib/reviews";

type Params = { id: string };

export const metadata = { title: "Объявление — RentProof" };

export default function ListingPage({ params }: { params: Promise<Params> }) {
  return (
    <PageShell>
      <Suspense fallback={<p className="text-sm text-muted">Загружаем объявление…</p>}>
        <Body params={params} />
      </Suspense>
    </PageShell>
  );
}

async function Body({ params }: { params: Promise<Params> }) {
  await connection();
  const { id } = await params;
  const user = await getCurrentUser();
  const listing = getManageableListing(user?.id ?? "", Boolean(user?.isAdmin), id);
  if (!listing) {
    notFound();
  }
  return (
    <ListingDetails
      listing={listing}
      ranges={listConfirmedRanges(id)}
      reviews={listListingReviews(id)}
      user={user}
      favorite={user ? isFavorite(user.id, id) : false}
      preview
    />
  );
}
