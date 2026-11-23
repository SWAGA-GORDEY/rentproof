import { loadStaffProfile } from "@/lib/rbac";
import type { PublicUser } from "@/lib/users";

/** Primary Control Center URL (rewritten to /admin/* in next.config). */
export const OWNER_HOME = "/owner";

/** Physical App Router tree that hosts the DCC UI. */
export const DCC_HOME = "/admin";

const ALLOWED_NEXT = [/^\/owner(?:\/|$)/, /^\/admin(?:\/|$)/, /^\/control-center(?:\/|$)/, /^\/account(?:\/|$)/];

/**
 * Build a Control Center href under /owner (primary) while /admin remains a
 * compatible physical alias via the same page tree.
 */
export function dccHref(path = ""): string {
  if (!path || path === "/") return OWNER_HOME;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/admin" || normalized.startsWith("/admin/")) {
    return `${OWNER_HOME}${normalized.slice("/admin".length)}` || OWNER_HOME;
  }
  if (normalized.startsWith("/owner")) return normalized;
  return `${OWNER_HOME}${normalized}`;
}

export function safeStaffNext(raw: string | null | undefined, fallback = OWNER_HOME): string {
  const value = (raw ?? "").trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }
  if (!ALLOWED_NEXT.some((re) => re.test(value))) {
    return fallback;
  }
  return value;
}

/** Where a signed-in user should land after login / when already signed in on /login. */
export function postLoginPath(user: PublicUser): string {
  const staff = loadStaffProfile(user.id);
  if (staff?.isAdmin && staff.emailVerified) {
    return OWNER_HOME;
  }
  return "/account";
}
