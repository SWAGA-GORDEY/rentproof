import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PageShell } from "@/components/page-shell";
import { getLatestLegalDocument, type LegalDocType } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";

const SLUG_MAP: Record<string, LegalDocType> = {
  offer: "offer",
  privacy: "privacy",
  "personal-data-consent": "personal_data_consent",
  "marketing-consent": "marketing_consent",
  terms: "terms",
  "subscription-terms": "subscription_terms",
};

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const type = SLUG_MAP[slug];
  if (!type) return {};
  return pageMetadata({
    title: "Документ",
    description: "Черновик юридического документа RentProof.",
    path: `/documents/${slug}`,
  });
}

export default function DocumentPage({ params }: { params: Promise<Params> }) {
  return (
    <PageShell>
      <Suspense fallback={<p className="text-sm text-muted">Загружаем документ…</p>}>
        <Body params={params} />
      </Suspense>
    </PageShell>
  );
}

async function Body({ params }: { params: Promise<Params> }) {
  await connection();
  const { slug } = await params;
  const type = SLUG_MAP[slug];
  if (!type) notFound();
  const doc = getLatestLegalDocument(type);
  if (!doc) notFound();

  return (
    <article className="mx-auto max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">
        {doc.status.toUpperCase()} · версия {doc.version}
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold text-navy">{doc.title}</h1>
      <div className="prose prose-sm mt-8 max-w-none whitespace-pre-wrap text-graphite">{doc.bodyMd}</div>
    </article>
  );
}
