import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import {
  createSession,
  deleteSession,
  readSessionUser,
  type PublicUser,
} from "@/lib/users";
import { ensureOwnerFromEnv } from "@/lib/owner";
import { loadStaffProfile, type Permission, type StaffProfile, hasPermission } from "@/lib/rbac";
import { cookieIsSecure, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session-cookie";
import { DCC_HOME, OWNER_HOME } from "@/lib/staff-access";

/**
 * Always re-run OWNER bind (idempotent). A one-shot in-memory flag previously
 * skipped bind if the account was created after the first request in the process.
 */
function bootstrapOwnerIfConfigured(): void {
  try {
    ensureOwnerFromEnv();
  } catch (err) {
    console.error("owner_bootstrap_failed", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function getSessionToken(): Promise<string | null> {
  await connection();
  bootstrapOwnerIfConfigured();
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const token = (await getSessionToken()) ?? "";
  return readSessionUser(token, new Date().toISOString());
}

export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireAdmin(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(DCC_HOME)}`);
  }
  const staff = loadStaffProfile(user.id);
  if (!staff?.isAdmin) {
    // Explicit denial page — never a fake 404.
    redirect("/staff-access-denied");
  }
  return user;
}

export async function requireStaff(permission?: Permission): Promise<{ user: PublicUser; staff: StaffProfile }> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(OWNER_HOME)}`);
  }
  const staff = loadStaffProfile(user.id);
  if (!staff?.isAdmin || !staff.emailVerified) {
    redirect("/staff-access-denied");
  }
  if (permission && !hasPermission(staff, permission)) {
    redirect(`${OWNER_HOME}?error=forbidden`);
  }
  return { user, staff };
}

export async function startSession(userId: string): Promise<void> {
  const token = createSession(userId);
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(cookieIsSecure()));
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value ?? "";
  deleteSession(token);
  store.delete(SESSION_COOKIE);
}
