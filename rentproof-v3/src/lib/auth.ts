import { createHash, randomBytes, randomInt, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { execute, row } from "@/lib/db";
import { sendVerificationCode } from "@/lib/mail";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "rentproof_session";
const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "tenant" | "owner" | "admin";
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${key.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, salt, hash] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !hash || !/^[a-f0-9]{128}$/i.test(hash)) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function createAccount(input: { name: string; email: string; password: string; role: "tenant" | "owner" }): Promise<void> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim().slice(0, 80);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Введите корректный email.");
  if (name.length < 2) throw new Error("Укажите имя от двух символов.");
  if (input.password.length < 10 || input.password.length > 128) throw new Error("Пароль должен содержать от 10 до 128 символов.");
  const existing = await row("SELECT id FROM users WHERE email = $1", [email]);
  if (existing) throw new Error("Этот email уже зарегистрирован.");
  const id = randomUUID();
  await execute(
    "INSERT INTO users (id,email,name,password_hash,role,email_verified,created_at) VALUES ($1,$2,$3,$4,$5,0,$6)",
    [id, email, name, await hashPassword(input.password), input.role, new Date().toISOString()],
  );
  await issueVerificationCode(id, email, name);
}

export async function login(emailInput: string, password: string): Promise<SessionUser> {
  const email = emailInput.trim().toLowerCase();
  const now = new Date();
  const attempt = await row<{ window_start: string; attempts: number }>("SELECT window_start,attempts FROM login_attempts WHERE email=$1", [email]);
  const withinWindow = attempt && now.getTime() - Date.parse(attempt.window_start) < 15 * 60_000;
  if (withinWindow && Number(attempt.attempts) >= 10) throw new Error("Слишком много попыток. Подождите 15 минут.");
  const userRow = await row<SessionUser & { password_hash: string; email_verified: number }>(
    "SELECT id,email,name,role,password_hash,email_verified FROM users WHERE email = $1",
    [email],
  );
  const valid = userRow ? await verifyPassword(password, userRow.password_hash) : await verifyPassword(password, "scrypt$invalid$" + "0".repeat(128));
  if (!userRow || !valid || Number(userRow.email_verified) !== 1) {
    const stamp = now.toISOString();
    if (withinWindow) await execute("UPDATE login_attempts SET attempts=attempts+1 WHERE email=$1", [email]);
    else await execute("INSERT INTO login_attempts(email,window_start,attempts) VALUES($1,$2,1) ON CONFLICT(email) DO UPDATE SET window_start=excluded.window_start,attempts=1", [email, stamp]);
    throw new Error("Неверный email или пароль. Если вы только зарегистрировались, подтвердите email из письма.");
  }
  await execute("DELETE FROM login_attempts WHERE email=$1", [email]);
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(now.getTime() + SESSION_DAYS * 86400_000);
  await execute(
    "INSERT INTO sessions (token_hash,user_id,expires_at,created_at) VALUES ($1,$2,$3,$4)",
    [hashToken(token), userRow.id, expires.toISOString(), now.toISOString()],
  );
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
  return { id: userRow.id, email: userRow.email, name: userRow.name, role: userRow.role };
}

export async function verifyAccountEmail(emailInput: string, codeInput: string): Promise<void> {
  const email = emailInput.trim().toLowerCase();
  const code = codeInput.trim();
  if (!/^\d{6}$/.test(code)) throw new Error("Введите шестизначный код из письма.");
  const user = await row<{ id: string; email_verified: number }>("SELECT id,email_verified FROM users WHERE email=$1", [email]);
  if (!user) throw new Error("Аккаунт не найден. Создайте его заново.");
  if (Number(user.email_verified) === 1) return;
  const record = await row<{ id: string; code_hash: string; salt: string; attempts: number; expires_at: string }>(
    "SELECT id,code_hash,salt,attempts,expires_at FROM email_verifications WHERE user_id=$1 AND used_at IS NULL ORDER BY created_at DESC LIMIT 1",
    [user.id],
  );
  if (!record || Number(record.attempts) >= 5 || record.expires_at <= new Date().toISOString()) throw new Error("Код истёк. Запросите новый код.");
  const actual = (await scrypt(code, record.salt, 32)) as Buffer;
  const expected = Buffer.from(record.code_hash, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    await execute("UPDATE email_verifications SET attempts=attempts+1 WHERE id=$1", [record.id]);
    throw new Error("Код неверный. Проверьте письмо и попробуйте ещё раз.");
  }
  const changed = await execute("UPDATE email_verifications SET used_at=$1 WHERE id=$2 AND used_at IS NULL AND attempts<5", [new Date().toISOString(), record.id]);
  if (!changed) throw new Error("Код уже использован. Запросите новый.");
  await execute("UPDATE users SET email_verified=1 WHERE id=$1", [user.id]);
}

export async function resendVerification(emailInput: string): Promise<void> {
  const email = emailInput.trim().toLowerCase();
  const user = await row<{ id: string; name: string; email_verified: number }>("SELECT id,name,email_verified FROM users WHERE email=$1", [email]);
  if (!user || Number(user.email_verified) === 1) return;
  const since = new Date(Date.now() - 60 * 60_000).toISOString();
  const recent = await row<{ count: number }>("SELECT COUNT(*) AS count FROM email_verifications WHERE user_id=$1 AND created_at>$2", [user.id, since]);
  if (Number(recent?.count ?? 0) >= 3) throw new Error("Запрошено слишком много кодов. Попробуйте через час.");
  await issueVerificationCode(user.id, email, user.name);
}

async function issueVerificationCode(userId: string, email: string, name: string): Promise<void> {
  const now = new Date();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(code, salt, 32)) as Buffer;
  await execute("UPDATE email_verifications SET used_at=$1 WHERE user_id=$2 AND used_at IS NULL", [now.toISOString(), userId]);
  await execute(
    "INSERT INTO email_verifications(id,user_id,code_hash,salt,attempts,expires_at,created_at) VALUES($1,$2,$3,$4,0,$5,$6)",
    [randomUUID(), userId, hash.toString("hex"), salt, new Date(now.getTime() + 15 * 60_000).toISOString(), now.toISOString()],
  );
  await sendVerificationCode(email, name, code);
}

export async function bootstrapOwner(input: { email: string; name: string; password: string; token: string }): Promise<SessionUser> {
  const configuredEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const configuredToken = process.env.OWNER_BOOTSTRAP_TOKEN?.trim() ?? "";
  const submittedToken = input.token.trim();
  if (!configuredEmail || configuredToken.length < 24 || input.email.trim().toLowerCase() !== configuredEmail) throw new Error("Проверка владельца не настроена или данные не совпадают.");
  const tokenMatches = Buffer.byteLength(configuredToken) === Buffer.byteLength(submittedToken) && timingSafeEqual(Buffer.from(configuredToken), Buffer.from(submittedToken));
  if (!tokenMatches) throw new Error("Проверка владельца не пройдена.");
  const admin = await row("SELECT id FROM users WHERE role='admin' LIMIT 1");
  if (admin) throw new Error("Администратор уже создан.");
  const email = configuredEmail;
  const existing = await row<{ id: string; password_hash: string }>("SELECT id,password_hash FROM users WHERE email=$1", [email]);
  if (existing) {
    if (!(await verifyPassword(input.password, existing.password_hash))) throw new Error("Неверный пароль.");
    await execute("UPDATE users SET role='admin',email_verified=1 WHERE id=$1", [existing.id]);
  } else {
    const name = input.name.trim().slice(0, 80);
    if (name.length < 2 || input.password.length < 10 || input.password.length > 128) throw new Error("Проверьте имя и пароль (не менее 10 символов).");
    await execute("INSERT INTO users(id,email,name,password_hash,role,email_verified,created_at) VALUES($1,$2,$3,$4,'admin',1,$5)", [randomUUID(), email, name, await hashPassword(input.password), new Date().toISOString()]);
  }
  return login(email, input.password);
}

export async function currentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await row<SessionUser & { expires_at: string }>(
    `SELECT u.id,u.email,u.name,u.role,s.expires_at
     FROM sessions s JOIN users u ON u.id=s.user_id
     WHERE s.token_hash=$1 AND s.expires_at>$2`,
    [hashToken(token), new Date().toISOString()],
  );
  return session ? { id: session.id, email: session.email, name: session.name, role: session.role } : null;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect("/login?next=%2Faccount");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user || user.role !== "admin") redirect("/login?next=%2Fowner");
  return user;
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await execute("DELETE FROM sessions WHERE token_hash=$1", [hashToken(token)]);
  jar.delete(SESSION_COOKIE);
}

export async function createRegistrationSession(email: string, password: string): Promise<SessionUser> {
  return login(email, password);
}
