import { Suspense } from "react";
import Link from "next/link";
import { dccSaveLegalDraftAction } from "@/app/actions/dcc";
import { fieldClass, primaryButton } from "@/components/styles";
import { requireStaff } from "@/lib/current-user";
import { formatDateRu } from "@/lib/format";
import { listLegalDocuments, type LegalDocType } from "@/lib/legal";
import { hasPermission } from "@/lib/rbac";

export default function AdminLegalPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Legal…</p>}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  const { staff } = await requireStaff("legal.view");
  const docs = listLegalDocuments();
  const latestByType = new Map<string, (typeof docs)[number]>();
  for (const doc of docs) {
    if (!latestByType.has(doc.docType)) latestByType.set(doc.docType, doc);
  }

  return (
    <div className="grid gap-6">
      <h1 className="font-display text-3xl font-semibold text-navy">Legal Center</h1>
      <p className="text-sm text-muted">Все документы остаются DRAFT. Публикация только после вашего подтверждения.</p>
      <ul className="grid gap-3">
        {[...latestByType.values()].map((doc) => (
          <li key={doc.id} className="rounded-3xl border border-line bg-white p-5">
            <p className="text-xs uppercase text-accent">
              {doc.status} · v{doc.version}
            </p>
            <p className="mt-1 font-display text-xl font-semibold text-navy">{doc.title}</p>
            <p className="mt-1 text-xs text-muted">{formatDateRu(doc.createdAt)}</p>
            <Link className="mt-2 inline-block text-sm font-semibold text-navy underline" href={`/documents/${slugFor(doc.docType)}`}>
              Публичный просмотр
            </Link>
            {hasPermission(staff, "legal.manage") ? (
              <form action={dccSaveLegalDraftAction} className="mt-4 grid gap-3">
                <input type="hidden" name="docType" value={doc.docType} />
                <input name="title" defaultValue={doc.title} className={fieldClass} />
                <input name="version" placeholder="новая версия, напр. 0.1.1-draft" className={fieldClass} />
                <textarea name="body" defaultValue={doc.bodyMd} rows={8} className={fieldClass} />
                <button type="submit" className={primaryButton}>
                  Сохранить новый DRAFT
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function slugFor(docType: LegalDocType): string {
  const map: Record<LegalDocType, string> = {
    offer: "offer",
    privacy: "privacy",
    personal_data_consent: "personal-data-consent",
    marketing_consent: "marketing-consent",
    terms: "terms",
    subscription_terms: "subscription-terms",
  };
  return map[docType];
}
