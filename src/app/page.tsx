import { Suspense } from "react";
import { AiAssessment } from "@/components/ai-assessment";
import { AppHeader } from "@/components/app-header";
import { Benefits } from "@/components/benefits";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { HomeCatalog, HomeCatalogFallback } from "@/components/home-catalog";
import { Pricing } from "@/components/pricing";

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
      </main>
      <Footer />
    </>
  );
}
