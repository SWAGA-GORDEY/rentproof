import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AccessDeniedError, assertRole } from "@/lib/access";
import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { sessionCookieOptions } from "@/lib/session-cookie";
import {
  EmailTakenError,
  InvalidCredentialsError,
  LOGIN_ATTEMPT_LIMIT,
  LoginLockedError,
  authenticateUser,
  createSession,
  passwordHashForEmail,
  readSessionUser,
  registerUser,
  sessionTokenIsStoredRaw,
  updateUserProfile,
} from "@/lib/users";
import { parseLogin, parseProfile, parseRegistration } from "@/lib/validation";

const password = "Correct-horse-9";

describe("registration and passwords", () => {
  it("stores a scrypt hash and returns a profile without the secret", async () => {
    const email = uniqueEmail("reg");
    const user = await registerUser({
      name: "Мария Иванова",
      email,
      password,
      role: "tenant",
    });

    assert.equal(user.email, email);
    assert.equal(user.role, "tenant");
    assert.equal("password" in user, false);
    assert.equal("passwordHash" in user, false);

    const stored = passwordHashForEmail(email);
    assert.ok(stored);
    assert.equal(stored.includes(password), false);
    assert.match(stored, /^scrypt\$32768\$8\$1\$/);
    assert.equal(await verifyPassword(password, stored), true);
    assert.equal(await verifyPassword("wrong-password-1", stored), false);
  });

  it("rejects a duplicate email", async () => {
    const email = uniqueEmail("dup");
    await registerUser({ name: "Иван Петров", email, password, role: "landlord" });
    await assert.rejects(
      () => registerUser({ name: "Иван Петров", email, password, role: "tenant" }),
      EmailTakenError,
    );
  });

  it("rejects an unknown role in the database", () => {
    assert.throws(() => {
      getDb()
        .prepare(
          `INSERT INTO users (id, email, password_hash, name, role, phone, city, created_at, updated_at)
           VALUES ('bad-role', ?, 'hash', 'Имя', 'admin', NULL, NULL, ?, ?)`,
        )
        .run(uniqueEmail("role"), new Date().toISOString(), new Date().toISOString());
    });
  });
});

describe("sessions", () => {
  it("stores only the token hash and expires old sessions", async () => {
    const user = await registerUser({
      name: "Анна Сергеева",
      email: uniqueEmail("session"),
      password,
      role: "landlord",
    });
    const token = createSession(user.id);

    assert.equal(sessionTokenIsStoredRaw(token), false);
    assert.deepEqual(readSessionUser(token, new Date().toISOString())?.id, user.id);

    getDb().prepare("UPDATE sessions SET expires_at = ? WHERE user_id = ?").run("2000-01-01T00:00:00.000Z", user.id);
    assert.equal(readSessionUser(token, new Date().toISOString()), null);
  });

  it("keeps the session cookie inaccessible to scripts", () => {
    const options = sessionCookieOptions(true);
    assert.equal(options.httpOnly, true);
    assert.equal(options.sameSite, "lax");
    assert.equal(options.secure, true);
    assert.equal(options.path, "/");
    assert.ok(options.maxAge >= 60 * 60 * 24);
    assert.equal(sessionCookieOptions(false).secure, false);
  });
});

describe("login", () => {
  it("accepts the right password and rejects the wrong one without revealing the account", async () => {
    const email = uniqueEmail("login");
    await registerUser({ name: "Олег Смирнов", email, password, role: "tenant" });

    const user = await authenticateUser(email, password);
    assert.equal(user.email, email);

    await assert.rejects(() => authenticateUser(email, "wrong-password-1"), InvalidCredentialsError);
    await assert.rejects(() => authenticateUser(uniqueEmail("missing"), password), InvalidCredentialsError);
  });

  it("locks the address after repeated failures", async () => {
    const email = uniqueEmail("lock");
    await registerUser({ name: "Павел Орлов", email, password, role: "landlord" });

    for (let attempt = 0; attempt < LOGIN_ATTEMPT_LIMIT; attempt += 1) {
      await assert.rejects(() => authenticateUser(email, `wrong-password-${attempt}`), InvalidCredentialsError);
    }

    await assert.rejects(() => authenticateUser(email, password), LoginLockedError);
  });
});

describe("profiles and access", () => {
  it("updates name, phone and city from the server record and keeps role", async () => {
    const email = uniqueEmail("profile");
    const user = await registerUser({
      name: "Елена Кузнецова",
      email,
      password,
      role: "tenant",
    });

    const updated = updateUserProfile(user.id, {
      name: "Елена К",
      phone: "+7 900 000 00 00",
      city: "Самара",
    });

    assert.equal(updated.name, "Елена К");
    assert.equal(updated.phone, "+7 900 000 00 00");
    assert.equal(updated.city, "Самара");
    assert.equal(updated.email, email);
    assert.equal(updated.role, "tenant");
    assert.equal(readSessionUser(createSession(updated.id), new Date().toISOString())?.city, "Самара");
  });

  it("denies the other role", async () => {
    const tenant = await registerUser({
      name: "Кирилл Носов",
      email: uniqueEmail("access"),
      password,
      role: "tenant",
    });
    assert.throws(() => assertRole(tenant, "landlord"), AccessDeniedError);
    assert.doesNotThrow(() => assertRole(tenant, "tenant"));
  });
});

describe("form validation", () => {
  it("requires a matching password and a role", () => {
    const missing = parseRegistration(
      form({
        name: "А",
        email: "not-an-email",
        password: "short",
        passwordConfirm: "other",
        role: "admin",
      }),
    );
    assert.equal(missing.ok, false);

    const accepted = parseRegistration(
      form({
        name: "Мария Иванова",
        email: "Maria@Example.com",
        password,
        passwordConfirm: password,
        role: "landlord",
      }),
    );
    assert.equal(accepted.ok, true);
    if (accepted.ok) {
      assert.equal(accepted.value.email, "maria@example.com");
      assert.equal(accepted.value.role, "landlord");
    }
  });

  it("does not accept an empty login or an invalid profile phone", () => {
    const login = parseLogin(form({ email: "user@example.com", password: "" }));
    assert.equal(login.ok, false);

    const profile = parseProfile(form({ name: "Мария", phone: "12", city: "Самара" }));
    assert.equal(profile.ok, false);
  });
});

function uniqueEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }
  return data;
}
