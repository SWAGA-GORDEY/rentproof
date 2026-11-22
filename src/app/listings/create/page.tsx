import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { ListingForm } from "@/components/listing-form";
import { requireUser } from "@/lib/current-user";

export const metadata = {
  title: "Новое объявление",
  alternates: { canonical: "/listings/create" },
  robots: { index: false, follow: false },
};

export default function CreateListingPage() {
  return (
    <PageShell>
      <Suspense fallback={<p className="text-sm text-muted">Проверяем доступ…</p>}>
        <Body />
      </Suspense>
    </PageShell>
  );
}

async function Body() {
  await requireUser();
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-navy">Новое объявление</h1>
        <p className="mt-3 text-sm leading-6 text-muted">Черновик виден только вам. Публикация появляется после модерации.</p>
      </div>
      <ListingForm />
    </div>
  );
}
