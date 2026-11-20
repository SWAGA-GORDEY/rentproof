import type { MetadataRoute } from "next";

const PATHS = ["", "/catalog", "/pricing", "/about", "/how-it-works", "/contacts", "/faq", "/login", "/register", "/ai-assessment"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return PATHS.map((path) => ({
    url: `${base}${path || "/"}`,
    lastModified: "2026-11-20",
  }));
}
