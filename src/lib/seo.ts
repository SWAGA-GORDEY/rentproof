import type { Metadata } from "next";
import { categoryName } from "@/lib/categories";
import type { ListingRecord } from "@/lib/listings";
import { absoluteUrl, siteOrigin } from "@/lib/site";

export function pageMetadata(input: {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
  imagePath?: string | null;
}): Metadata {
  const url = absoluteUrl(input.path);
  const images = input.imagePath
    ? [{ url: input.imagePath.startsWith("http") ? input.imagePath : absoluteUrl(input.imagePath) }]
    : undefined;
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      siteName: "RentProof",
      locale: "ru_RU",
      type: "website",
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: input.title,
      description: input.description,
      images: images?.map((item) => item.url),
    },
    robots: input.noIndex ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export function listingMetadata(listing: ListingRecord): Metadata {
  const title = `${listing.title} — аренда в ${listing.city} | RentProof`;
  const description = trimDescription(
    `${listing.title} в категории «${categoryName(listing.categoryId)}», ${listing.city}. ${listing.description}`,
  );
  const path = `/catalog/${listing.id}`;
  const image = listing.images[0] ? absoluteUrl(`/media/${listing.images[0].id}`) : null;
  return pageMetadata({ title, description, path, imagePath: image });
}

export function listingJsonLd(listing: ListingRecord): Record<string, unknown> {
  const url = absoluteUrl(`/catalog/${listing.id}`);
  const image = listing.images[0] ? absoluteUrl(`/media/${listing.images[0].id}`) : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: trimDescription(listing.description, 500),
    category: categoryName(listing.categoryId),
    url,
    ...(image ? { image: [image] } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: "RUB",
      price: listing.pricePerDay,
      availability: listing.bookable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url,
    },
    ...(listing.reviewCount > 0 && listing.ratingAvg != null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: listing.ratingAvg,
            reviewCount: listing.reviewCount,
          },
        }
      : {}),
  };
}

export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "RentProof",
    url: siteOrigin(),
    description:
      "Платформа аренды оборудования, строительной техники и инструмента с визуальной оценкой состояния по фотографиям.",
  };
}

export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "RentProof",
    url: siteOrigin(),
    inLanguage: "ru-RU",
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/catalog")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

function trimDescription(text: string, max = 160): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= max) {
    return compact;
  }
  return `${compact.slice(0, max - 1).trimEnd()}…`;
}
