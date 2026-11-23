import { loadStaffProfile } from "@/lib/rbac";
import type { PublicUser } from "@/lib/users";

/** Primary Control Center URL for OWNER bookmarks and post-login. */
export const OWNER_HOME = "/owner";

/** Canonical app path that hosts the DCC UI. */
export const DCC_HOME = "/admin";

const ALLOWED_NEXT = [/^\/owner(?:\/|$)/, /^\/admin(?:\/|$)/, /^\/control-center(?:\/|$)/, /^\/account(?:\/|$)/];

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
