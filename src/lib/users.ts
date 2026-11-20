import { createHash, randomBytes, randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/session-cookie";
import type { ProfileInput, RegistrationInput, UserRole } from "@/lib/validation";

export type { UserRole };

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone: string | null;
  city: string | null;
  createdAt: string;
  isAdmin: boolean;
  plan: "free" | "plus" | "pro";
  blockedAt: string | null;
};

export class EmailTakenError extends Error {
  constructor() {
    super("Email already registered");
    this.name = "EmailTakenError";
  }
}

export class LoginLockedError extends Error {
  constructor() {
    super("Too many login attempts");
    this.name = "LoginLockedError";
  }
}

export class AccountBlockedError extends Error {
  constructor() {
    super("Account blocked");
    this.name = "AccountBlockedError";
  }
}

export const LOGIN_ATTEMPT_LIMIT = 8;
export const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  phone: string | null;
  city: string | null;
  created_at: string;
  updated_at: string;
  is_admin: number;
  blocked_at: string | null;
  plan: string;
};

let dummyHashPromise: Promise<string> | null = null;

export async function registerUser(input: RegistrationInput): Promise<PublicUser> {
  const db = getDb();
  const now = new Date().toISOString();
  const user: PublicUser = {
    id: randomUUID(),
    email: input.email,
    name: input.name,
    role: input.role,
    phone: null,
    city: null,
    createdAt: now,
    isAdmin: false,
    plan: "free",
    blockedAt: null,
  };
  const passwordHash = await hashPassword(input.password);

  try {
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, phone, city, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
    ).run(user.id, user.email, passwordHash, user.name, user.role, now, now);
  } catch (error) {
    if (isUniqueEmailError(error)) {
      throw new EmailTakenError();
    }
    throw error;
  }

  return user;
}

export async function authenticateUser(email: string, password: string): Promise<PublicUser> {
  const db = getDb();
  const normalized = email.trim().toLowerCase();
  clearOldAttempts(normalized);

  if (recentAttemptCount(normalized) >= LOGIN_ATTEMPT_LIMIT) {
    throw new LoginLockedError();
  }

  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(normalized) as UserRow | undefined;
  const hash = row?.password_hash ?? (await dummyPasswordHash());
  const matches = await verifyPassword(password, hash);

  if (!row || !matches) {
    db.prepare("INSERT INTO login_attempts (email, attempted_at) VALUES (?, ?)").run(
      normalized,
      new Date().toISOString(),
    );
    throw new InvalidCredentialsError();
  }

  if (row.blocked_at) {
    throw new AccountBlockedError();
  }

  db.prepare("DELETE FROM login_attempts WHERE email = ?").run(normalized);
  return toPublicUser(row);
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid credentials");
    this.name = "InvalidCredentialsError";
  }
}

export function createSession(userId: string): string {
  const db = getDb();
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now.toISOString());
  db.prepare(
    "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(randomUUID(), userId, hashToken(token), expires.toISOString(), now.toISOString());
  return token;
}

export function readSessionUser(token: string, nowIso: string): PublicUser | null {
  if (!token) {
    return null;
  }

  const db = getDb();
  const row = db
    .prepare(
      `SELECT users.*
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
    )
    .get(hashToken(token), nowIso) as UserRow | undefined;

  if (!row) {
    return null;
  }
  const user = toPublicUser(row);
  return user.blockedAt ? null : user;
}

export function deleteSession(token: string): void {
  if (!token) {
    return;
  }
  getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
}

export function updateUserProfile(userId: string, input: ProfileInput): PublicUser {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db
    .prepare("UPDATE users SET name = ?, phone = ?, city = ?, updated_at = ? WHERE id = ?")
    .run(input.name, input.phone, input.city, now, userId);

  if (result.changes !== 1) {
    throw new Error("Profile was not updated");
  }

  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as UserRow | undefined;
  if (!row) {
    throw new Error("Profile disappeared after update");
  }
  return toPublicUser(row);
}

export async function changePassword(userId: string, currentPassword: string, nextPassword: string): Promise<void> {
  const db = getDb();
  const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(userId) as
    | { password_hash: string }
    | undefined;
  if (!row || !(await verifyPassword(currentPassword, row.password_hash))) {
    throw new InvalidCredentialsError();
  }
  const nextHash = await hashPassword(nextPassword);
  const now = new Date().toISOString();
  db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(nextHash, now, userId);
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

export function passwordHashForEmail(email: string): string | null {
  const row = getDb().prepare("SELECT password_hash FROM users WHERE email = ?").get(email) as
    | { password_hash: string }
    | undefined;
  return row?.password_hash ?? null;
}

export function sessionTokenIsStoredRaw(token: string): boolean {
  const row = getDb().prepare("SELECT token_hash FROM sessions WHERE token_hash = ?").get(token);
  return Boolean(row);
}

function recentAttemptCount(email: string): number {
  const since = new Date(Date.now() - LOGIN_ATTEMPT_WINDOW_MS).toISOString();
  const row = getDb()
    .prepare("SELECT COUNT(*) AS count FROM login_attempts WHERE email = ? AND attempted_at > ?")
    .get(email, since) as { count: number } | undefined;
  return Number(row?.count ?? 0);
}

function clearOldAttempts(email: string): void {
  const since = new Date(Date.now() - LOGIN_ATTEMPT_WINDOW_MS).toISOString();
  getDb().prepare("DELETE FROM login_attempts WHERE email = ? AND attempted_at <= ?").run(email, since);
}

function toPublicUser(row: UserRow): PublicUser {
  if (row.role !== "landlord" && row.role !== "tenant") {
    throw new Error("Unknown role in database");
  }
  const plan = row.plan === "plus" || row.plan === "pro" ? row.plan : "free";
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    phone: row.phone,
    city: row.city,
    createdAt: row.created_at,
    isAdmin: row.is_admin === 1,
    plan,
    blockedAt: row.blocked_at,
  };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function dummyPasswordHash(): Promise<string> {
  dummyHashPromise ??= hashPassword("rentproof-dummy-password");
  return dummyHashPromise;
}

function isUniqueEmailError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("UNIQUE constraint failed: users.email");
}
