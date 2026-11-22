import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { siteOrigin } from "@/lib/site";

const DISALLOW = [
  "/account",
  "/account/",
  "/admin",
  "/admin/",
  "/login",
  "/register",
  "/api/",
  "/listings/",
  "/ai-assessment",
  "/ai-assessment/",
  "/payments",
  "/payments/",
  // User uploads under /media/ stay private to crawlers; brand assets live at site root
  // (/favicon.*, /og-image.png, /apple-touch-icon.png) and remain allowed via Allow: /
  "/media/",
];

export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection();
  const base = siteOrigin();
  const host = base.replace(/^https?:\/\//, "");
  const rule = {
    userAgent: "*" as const,
    allow: "/",
    disallow: DISALLOW,
  };
  return {
    rules: [
      rule,
      { ...rule, userAgent: "Yandex" },
      { ...rule, userAgent: "Googlebot" },
    ],
    sitemap: `${base}/sitemap.xml`,
    host,
  };
}
