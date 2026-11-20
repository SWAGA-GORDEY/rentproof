import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ListingDetails } from "@/components/listing-details";
import { PageShell } from "@/components/page-shell";
import { getCurrentUser } from "@/lib/current-user";
import { isFavorite } from "@/lib/favorites";
import { listConfirmedRanges } from "@/lib/bookings";
import { getPublishedListing } from "@/lib/listings";
import { listListingReviews } from "@/lib/reviews";

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  await connection();
  const { id } = await params;
  const listing = getPublishedListing(id);
  if (!listing) {
    return { title: "Объявление — RentProof" };
  }
  return {
    title: `${listing.title} — RentProof`,
    description: listing.description.slice(0, 160),
  };
}

export default function CatalogItemPage({ params }: { params: Promise<Params> }) {
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
  const listing = getPublishedListing(id);
  if (!listing) {
    notFound();
  }
  const user = await getCurrentUser();
  return (
    <ListingDetails
      listing={listing}
      ranges={listConfirmedRanges(id)}
      reviews={listListingReviews(id)}
      user={user}
      favorite={user ? isFavorite(user.id, id) : false}
    />
  );
}
