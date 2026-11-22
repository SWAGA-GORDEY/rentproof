import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { categories } from "@/lib/categories";
import { listPublishedListingSitemapEntries } from "@/lib/listings";
import { absoluteUrl } from "@/lib/site";

const STATIC_PATHS: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }> = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/catalog", changeFrequency: "daily", priority: 0.9 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.6 },
  { path: "/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/how-it-works", changeFrequency: "monthly", priority: 0.7 },
  { path: "/contacts", changeFrequency: "monthly", priority: 0.5 },
  { path: "/support", changeFrequency: "monthly", priority: 0.5 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.5 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((item) => ({
    url: absoluteUrl(item.path),
    lastModified: now,
    changeFrequency: item.changeFrequency,
    priority: item.priority,
  }));

  const categoryEntries: MetadataRoute.Sitemap = categories.map((category) => ({
    url: absoluteUrl(`/categories/${category.id}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  let listingEntries: MetadataRoute.Sitemap = [];
  try {
    listingEntries = listPublishedListingSitemapEntries().map((listing) => ({
      url: absoluteUrl(`/catalog/${listing.id}`),
      lastModified: new Date(listing.updatedAt),
      changeFrequency: "weekly",
      priority: 0.7,
    }));
  } catch {
    listingEntries = [];
  }

  return [...staticEntries, ...categoryEntries, ...listingEntries];
}
