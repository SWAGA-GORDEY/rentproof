import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { PageShell } from "@/components/page-shell";
import { listLegalDocuments, operatorConfigPlaceholders } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Документы",
  description: "Юридические документы RentProof. Черновики до утверждения владельцем.",
  path: "/documents",
});

const LINKS = [
  { href: "/documents/offer", type: "offer" },
  { href: "/documents/privacy", type: "privacy" },
  { href: "/documents/personal-data-consent", type: "personal_data_consent" },
  { href: "/documents/marketing-consent", type: "marketing_consent" },
  { href: "/documents/terms", type: "terms" },
  { href: "/documents/subscription-terms", type: "subscription_terms" },
] as const;

export default function DocumentsIndexPage() {
  return (
    <PageShell>
      <Suspense fallback={<p className="text-sm text-muted">Загружаем документы…</p>}>
        <Body />
      </Suspense>
    </PageShell>
  );
}

async function Body() {
  await connection();
  const docs = listLegalDocuments();
  const ops = operatorConfigPlaceholders();
  return (
    <div className="grid gap-8">
      <div>
        <h1 className="font-display text-4xl font-semibold text-navy">Документы</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
          Все тексты сейчас в статусе DRAFT. Реквизиты оператора не выдуманы — заполняются через конфигурацию.
        </p>
      </div>
      <ul className="grid gap-3">
        {LINKS.map((link) => {
          const doc = docs.find((item) => item.docType === link.type);
          return (
            <li key={link.href}>
              <Link href={link.href} className="block rounded-3xl border border-line bg-white p-5 transition hover:border-navy/30">
                <p className="text-xs font-semibold uppercase text-accent">
                  {doc?.status ?? "draft"} · v{doc?.version ?? "—"}
                </p>
                <p className="mt-1 font-display text-xl font-semibold text-navy">{doc?.title ?? link.type}</p>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="rounded-3xl border border-dashed border-line bg-mist/50 p-5 text-sm text-muted">
        <p className="font-semibold text-ink">Конфигурация оператора</p>
        <ul className="mt-2 space-y-1">
          <li>Наименование: {ops.LEGAL_OPERATOR_NAME}</li>
          <li>Адрес: {ops.LEGAL_OPERATOR_ADDRESS}</li>
          <li>Email: {ops.LEGAL_OPERATOR_EMAIL}</li>
          <li>ИНН: {ops.LEGAL_OPERATOR_INN}</li>
          <li>ОГРН: {ops.LEGAL_OPERATOR_OGRN}</li>
        </ul>
      </div>
    </div>
  );
}
