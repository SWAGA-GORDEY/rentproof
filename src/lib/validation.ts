export type UserRole = "landlord" | "tenant";

export type RegistrationInput = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

export type ProfileInput = {
  name: string;
  phone: string | null;
  city: string | null;
};

export type FieldErrors = Partial<Record<"name" | "email" | "password" | "passwordConfirm" | "role" | "phone" | "city", string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_PATTERN = /^[\p{L}\s.'-]{2,80}$/u;
const CITY_PATTERN = /^[\p{L}\s.'-]{2,40}$/u;
const PHONE_PATTERN = /^[0-9+()\-\s]{7,20}$/;

export function parseRegistration(formData: FormData): { ok: true; value: RegistrationInput } | { ok: false; fieldErrors: FieldErrors } {
  const name = readText(formData, "name");
  const email = readText(formData, "email").toLowerCase();
  const password = readText(formData, "password");
  const passwordConfirm = readText(formData, "passwordConfirm");
  const role = readText(formData, "role");
  const fieldErrors: FieldErrors = {};

  if (!NAME_PATTERN.test(name)) {
    fieldErrors.name = "Укажите имя: от 2 до 80 букв";
  }
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    fieldErrors.email = "Укажите корректный адрес почты";
  }
  const passwordError = passwordProblem(password);
  if (passwordError) {
    fieldErrors.password = passwordError;
  } else if (password === email) {
    fieldErrors.password = "Пароль не должен совпадать с почтой";
  }
  if (password !== passwordConfirm) {
    fieldErrors.passwordConfirm = "Пароли не совпадают";
  }
  if (!isRole(role)) {
    fieldErrors.role = "Выберите роль: арендодатель или арендатор";
  }

  if (Object.keys(fieldErrors).length > 0 || !isRole(role)) {
    return { ok: false, fieldErrors };
  }

  return { ok: true, value: { name, email, password, role } };
}

export function parseLogin(formData: FormData): { ok: true; value: { email: string; password: string } } | { ok: false; fieldErrors: FieldErrors } {
  const email = readText(formData, "email").toLowerCase();
  const password = readText(formData, "password");
  const fieldErrors: FieldErrors = {};

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    fieldErrors.email = "Укажите корректный адрес почты";
  }
  if (password.length < 1 || password.length > 128) {
    fieldErrors.password = "Введите пароль";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return { ok: true, value: { email, password } };
}

export function parseProfile(formData: FormData): { ok: true; value: ProfileInput } | { ok: false; fieldErrors: FieldErrors } {
  const name = readText(formData, "name");
  const phone = readText(formData, "phone");
  const city = readText(formData, "city");
  const fieldErrors: FieldErrors = {};

  if (!NAME_PATTERN.test(name)) {
    fieldErrors.name = "Укажите имя: от 2 до 80 букв";
  }
  if (phone.length > 0 && (!PHONE_PATTERN.test(phone) || phone.replace(/\D/g, "").length < 7)) {
    fieldErrors.phone = "Телефон: от 7 цифр, можно добавить +, пробелы и скобки";
  }
  if (city.length > 0 && !CITY_PATTERN.test(city)) {
    fieldErrors.city = "Город: от 2 до 40 букв";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    value: {
      name,
      phone: phone.length > 0 ? phone : null,
      city: city.length > 0 ? city : null,
    },
  };
}

export function isRole(value: string): value is UserRole {
  return value === "landlord" || value === "tenant";
}

export function roleLabel(role: UserRole): string {
  return role === "landlord" ? "Арендодатель" : "Арендатор";
}

export function parseNewPassword(formData: FormData): { ok: true; value: string } | { ok: false; fieldErrors: FieldErrors } {
  const password = readText(formData, "password");
  const passwordConfirm = readText(formData, "passwordConfirm");
  const fieldErrors: FieldErrors = {};
  const passwordError = passwordProblem(password);
  if (passwordError) {
    fieldErrors.password = passwordError;
  }
  if (password !== passwordConfirm) {
    fieldErrors.passwordConfirm = "Пароли не совпадают";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  return { ok: true, value: password };
}

export function parseEmailOnly(formData: FormData): { ok: true; value: string } | { ok: false; fieldErrors: FieldErrors } {
  const email = readText(formData, "email").toLowerCase();
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return { ok: false, fieldErrors: { email: "Укажите корректный адрес почты" } };
  }
  return { ok: true, value: email };
}

function passwordProblem(password: string): string | null {
  if (password.length < 10 || password.length > 128) {
    return "Пароль: от 10 до 128 символов";
  }
  if (!/\p{L}/u.test(password) || !/\d/.test(password)) {
    return "В пароле нужны буквы и хотя бы одна цифра";
  }
  return null;
}

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
