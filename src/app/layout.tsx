import type { Metadata } from "next";
import { Manrope, Unbounded } from "next/font/google";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { searchVerification, siteOrigin } from "@/lib/site";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const siteUrl = siteOrigin();
const verification = searchVerification();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "RentProof — аренда оборудования и техники",
    template: "%s | RentProof",
  },
  description:
    "Аренда оборудования, строительной техники и инструмента. В карточке — цена, залог, фото и визуальная оценка состояния с помощью ИИ.",
  applicationName: "RentProof",
  keywords: [
    "аренда оборудования",
    "аренда строительной техники",
    "аренда инструмента",
    "аренда имущества",
    "проверка состояния оборудования",
    "оценка повреждений ИИ",
  ],
  authors: [{ name: "RentProof" }],
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-120x120.png", sizes: "120x120", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  openGraph: {
    title: "RentProof — аренда оборудования и техники",
    description:
      "Каталог аренды имущества с фото, залогом и визуальной оценкой состояния. Платежи в демо-режиме не списываются.",
    url: siteUrl,
    siteName: "RentProof",
    locale: "ru_RU",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "RentProof — аренда без риска",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RentProof — аренда оборудования и техники",
    description: "Каталог аренды, заявки и визуальная оценка состояния по фотографиям.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  ...(verification ? { verification } : {}),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const org = organizationJsonLd();
  const website = websiteJsonLd();
  return (
    <html
      lang="ru"
      className={`${manrope.variable} ${unbounded.variable} h-full antialiased`}
    >
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
