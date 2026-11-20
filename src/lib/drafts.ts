import { isCategoryId, type Listing } from "@/lib/catalog";

export const DRAFT_STORAGE_KEY = "rentproof.drafts.v1";
const DRAFT_EVENT = "rentproof-drafts";

export function subscribeDrafts(onStoreChange: () => void) {
  window.addEventListener(DRAFT_EVENT, onStoreChange);
  return () => window.removeEventListener(DRAFT_EVENT, onStoreChange);
}

export function readDraftSnapshot() {
  try {
    return window.sessionStorage.getItem(DRAFT_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeDrafts(drafts: Listing[]) {
  window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
  window.dispatchEvent(new Event(DRAFT_EVENT));
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function parseDraft(value: unknown): Listing | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Partial<Listing>;
  if (
    typeof item.id !== "string" ||
    !item.id.startsWith("draft-") ||
    typeof item.title !== "string" ||
    !isCategoryId(item.category) ||
    typeof item.city !== "string" ||
    typeof item.pricePerDay !== "number" ||
    typeof item.summary !== "string" ||
    item.draft !== true
  ) {
    return null;
  }

  return {
    id: item.id,
    title: item.title,
    category: item.category,
    city: item.city,
    pricePerDay: item.pricePerDay,
    deposit: typeof item.deposit === "number" ? item.deposit : 0,
    minDays: typeof item.minDays === "number" ? item.minDays : 1,
    condition: typeof item.condition === "number" ? item.condition : 0,
    summary: item.summary,
    terms: isStringArray(item.terms)
      ? item.terms
      : ["Черновик сохранён в этой вкладке"],
    draft: true,
  };
}

export function parseDrafts(raw: string | null): Listing[] {
  if (!raw) {
    return [];
  }

  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) {
      return [];
    }
    return data.flatMap((item) => {
      const draft = parseDraft(item);
      return draft ? [draft] : [];
    });
  } catch {
    return [];
  }
}
