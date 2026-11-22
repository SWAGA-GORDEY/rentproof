import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export type LegalDocType =
  | "offer"
  | "privacy"
  | "personal_data_consent"
  | "marketing_consent"
  | "terms"
  | "subscription_terms";

export type LegalDocument = {
  id: string;
  docType: LegalDocType;
  version: string;
  title: string;
  bodyMd: string;
  status: "draft" | "published" | "retired";
  createdAt: string;
  publishedAt: string | null;
};

const DRAFT_DOCS: Array<{ docType: LegalDocType; version: string; title: string; bodyMd: string }> = [
  {
    docType: "offer",
    version: "0.1.0-draft",
    title: "Публичная оферта (черновик)",
    bodyMd: draftNotice(
      "Публичная оферта",
      "Текст оферты будет опубликован после заполнения реквизитов оператора и утверждения владельцем. Статус: DRAFT.",
    ),
  },
  {
    docType: "privacy",
    version: "0.1.0-draft",
    title: "Политика обработки персональных данных (черновик)",
    bodyMd: draftNotice(
      "Политика ПДн",
      "Опишите цели, сроки, меры защиты, права субъекта и контакты оператора после заполнения конфигурации. Статус: DRAFT. Учитывайте 152-ФЗ и локализацию хранения.",
    ),
  },
  {
    docType: "personal_data_consent",
    version: "0.1.0-draft",
    title: "Согласие на обработку персональных данных (черновик)",
    bodyMd: draftNotice(
      "Согласие на обработку ПДн",
      "Отдельный документ согласия. Не объединяется с офертой и рекламой. Реквизиты оператора — из конфигурации (пока не заполнены).",
    ),
  },
  {
    docType: "marketing_consent",
    version: "0.1.0-draft",
    title: "Согласие на рекламные рассылки (черновик)",
    bodyMd: draftNotice(
      "Рекламные рассылки",
      "Необязательное согласие. Не требуется для регистрации. Можно отозвать в настройках.",
    ),
  },
  {
    docType: "terms",
    version: "0.1.0-draft",
    title: "Условия использования (черновик)",
    bodyMd: draftNotice("Условия использования", "Правила пользования сервисом RentProof. Статус: DRAFT."),
  },
  {
    docType: "subscription_terms",
    version: "0.1.0-draft",
    title: "Условия платных подписок (черновик)",
    bodyMd: draftNotice(
      "Платные подписки",
      "FREE / PLUS / PRO. Оплата подключается отдельно. Не активируйте платный тариф без подтверждённой оплаты провайдером.",
    ),
  },
];

/** Stable timestamp for seeded drafts — avoids blocking prerender on `new Date()`. */
const DRAFT_SEEDED_AT = "2026-01-01T00:00:00.000Z";

export function ensureLegalDrafts(): void {
  // Assumes getDb() already initialized (migrate + seed done).
  const insert = getDb().prepare(
    `INSERT INTO legal_documents (id, doc_type, version, title, body_md, status, created_at, published_at)
     VALUES (?, ?, ?, ?, ?, 'draft', ?, NULL)
     ON CONFLICT(doc_type, version) DO NOTHING`,
  );
  for (const doc of DRAFT_DOCS) {
    insert.run(randomUUID(), doc.docType, doc.version, doc.title, doc.bodyMd, DRAFT_SEEDED_AT);
  }
}

export function listLegalDocuments(): LegalDocument[] {
  ensureLegalDrafts();
  const rows = getDb()
    .prepare(`SELECT * FROM legal_documents ORDER BY doc_type, created_at DESC`)
    .all() as Array<{
    id: string;
    doc_type: string;
    version: string;
    title: string;
    body_md: string;
    status: string;
    created_at: string;
    published_at: string | null;
  }>;
  return rows.map(mapDoc);
}

export function getLatestLegalDocument(docType: LegalDocType): LegalDocument | null {
  ensureLegalDrafts();
  const row = getDb()
    .prepare(
      `SELECT * FROM legal_documents WHERE doc_type = ? ORDER BY created_at DESC LIMIT 1`,
    )
    .get(docType) as
    | {
        id: string;
        doc_type: string;
        version: string;
        title: string;
        body_md: string;
        status: string;
        created_at: string;
        published_at: string | null;
      }
    | undefined;
  return row ? mapDoc(row) : null;
}

export function recordConsent(
  userId: string,
  consentType: string,
  document: LegalDocument,
): void {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO user_consents (
        id, user_id, consent_type, document_id, document_version, accepted_at, revoked_at, consent_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, 'accepted', ?)`,
    )
    .run(randomUUID(), userId, consentType, document.id, document.version, now, now);
  writeAudit(userId, "consent.accept", "consent", userId, { consentType, version: document.version });
}

export function revokeConsent(userId: string, consentType: string): void {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE user_consents SET consent_status = 'revoked', revoked_at = ?
       WHERE user_id = ? AND consent_type = ? AND consent_status = 'accepted'
         AND id = (
           SELECT id FROM user_consents WHERE user_id = ? AND consent_type = ? AND consent_status = 'accepted'
           ORDER BY created_at DESC LIMIT 1
         )`,
    )
    .run(now, userId, consentType, userId, consentType);
  writeAudit(userId, "consent.revoke", "consent", userId, { consentType });
}

export function listUserConsents(userId: string) {
  return getDb()
    .prepare(
      `SELECT consent_type, document_version, consent_status, accepted_at, revoked_at
       FROM user_consents WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
    )
    .all(userId) as Array<{
    consent_type: string;
    document_version: string;
    consent_status: string;
    accepted_at: string | null;
    revoked_at: string | null;
  }>;
}

export function operatorConfigPlaceholders(): Record<string, string> {
  return {
    LEGAL_OPERATOR_NAME: process.env.LEGAL_OPERATOR_NAME?.trim() || "[не заполнено]",
    LEGAL_OPERATOR_ADDRESS: process.env.LEGAL_OPERATOR_ADDRESS?.trim() || "[не заполнено]",
    LEGAL_OPERATOR_EMAIL: process.env.LEGAL_OPERATOR_EMAIL?.trim() || "[не заполнено]",
    LEGAL_OPERATOR_INN: process.env.LEGAL_OPERATOR_INN?.trim() || "[не заполнено]",
    LEGAL_OPERATOR_OGRN: process.env.LEGAL_OPERATOR_OGRN?.trim() || "[не заполнено]",
  };
}

function draftNotice(title: string, body: string): string {
  const ops = operatorConfigPlaceholders();
  return [
    `# ${title}`,
    "",
    "> Статус документа: **DRAFT**. Не является утверждённой редакцией.",
    "",
    body,
    "",
    "## Реквизиты оператора (конфигурация)",
    "",
    `- Наименование: ${ops.LEGAL_OPERATOR_NAME}`,
    `- Адрес: ${ops.LEGAL_OPERATOR_ADDRESS}`,
    `- Email: ${ops.LEGAL_OPERATOR_EMAIL}`,
    `- ИНН: ${ops.LEGAL_OPERATOR_INN}`,
    `- ОГРН/ОГРНИП: ${ops.LEGAL_OPERATOR_OGRN}`,
    "",
    "Поля заполняются владельцем через переменные окружения. Вымышленные реквизиты не подставляются.",
  ].join("\n");
}

function mapDoc(row: {
  id: string;
  doc_type: string;
  version: string;
  title: string;
  body_md: string;
  status: string;
  created_at: string;
  published_at: string | null;
}): LegalDocument {
  return {
    id: row.id,
    docType: row.doc_type as LegalDocType,
    version: row.version,
    title: row.title,
    bodyMd: row.body_md,
    status: row.status === "published" ? "published" : row.status === "retired" ? "retired" : "draft",
    createdAt: row.created_at,
    publishedAt: row.published_at,
  };
}
