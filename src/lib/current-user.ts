import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import {
  createSession,
  deleteSession,
  readSessionUser,
  type PublicUser,
} from "@/lib/users";
import { cookieIsSecure, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session-cookie";

export async function getCurrentUser(): Promise<PublicUser | null> {
  await connection();
  const token = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
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
  if (!user.isAdmin) {
    redirect("/account");
  }
  return user;
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
