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
  openGraph: {
    title: "RentProof — аренда оборудования и техники",
    description:
      "Каталог аренды имущества с фото, залогом и визуальной оценкой состояния. Платежи в демо-режиме не списываются.",
    url: siteUrl,
    siteName: "RentProof",
    locale: "ru_RU",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "RentProof — аренда оборудования и техники",
    description: "Каталог аренды, заявки и визуальная оценка состояния по фотографиям.",
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
