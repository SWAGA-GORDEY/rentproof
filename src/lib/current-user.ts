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

let ownerBootstrapped = false;

function bootstrapOwnerIfConfigured(): void {
  if (ownerBootstrapped) return;
  ensureOwnerFromEnv();
  ownerBootstrapped = true;
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
  const user = await requireUser();
  const staff = loadStaffProfile(user.id);
  if (!staff?.isAdmin) {
    redirect("/account");
  }
  return user;
}

export async function requireStaff(permission?: Permission): Promise<{ user: PublicUser; staff: StaffProfile }> {
  const user = await requireUser();
  const staff = loadStaffProfile(user.id);
  if (!staff?.isAdmin || !staff.emailVerified) {
    redirect("/account");
  }
  if (permission && !hasPermission(staff, permission)) {
    redirect("/admin?error=forbidden");
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
