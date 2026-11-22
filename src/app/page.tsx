import type { Metadata } from "next";
import { Suspense } from "react";
import { AiAssessment } from "@/components/ai-assessment";
import { AppHeader } from "@/components/app-header";
import { Benefits } from "@/components/benefits";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { HomeCatalog, HomeCatalogFallback } from "@/components/home-catalog";
import { Pricing } from "@/components/pricing";
import { SeoTopics } from "@/components/seo-topics";
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
        <SeoTopics />
      </main>
      <Footer />
    </>
  );
}
