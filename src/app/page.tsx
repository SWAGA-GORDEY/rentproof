import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AiAssessment } from "@/components/ai-assessment";
import { AppHeader } from "@/components/app-header";
import { Benefits } from "@/components/benefits";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { HomeCatalog, HomeCatalogFallback } from "@/components/home-catalog";
import { Pricing } from "@/components/pricing";
import { SeoTopics } from "@/components/seo-topics";
import { secondaryButton } from "@/components/styles";
import { pageMetadata } from "@/lib/seo";

const home = pageMetadata({
  title: "RentProof — аренда оборудования и техники",
  description:
    "Каталог аренды оборудования, строительной техники и инструмента. Цена, залог, фото и визуальная оценка состояния.",
  path: "/",
});

export const metadata: Metadata = {
  ...home,
  title: { absolute: "RentProof — аренда оборудования и техники" },
};

export default function Home() {
  return (
    <>
      <a
        href="#catalog"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-2"
      >
        Перейти к каталогу
      </a>
      <AppHeader />
      <main className="flex-1">
        <Hero />
        <Suspense fallback={<HomeCatalogFallback />}>
          <HomeCatalog />
        </Suspense>
        <Benefits />
        <AiAssessment />
        <Pricing />
        <section className="border-t border-line bg-mist/50 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">FAQ</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
              Частые вопросы
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Оплата, модерация объявлений, визуальная оценка и почта — кратко на отдельной странице.
            </p>
            <Link href="/faq" className={`${secondaryButton} mt-6`}>
              Открыть FAQ
            </Link>
          </div>
        </section>
        <SeoTopics />
      </main>
      <Footer />
    </>
  );
}
