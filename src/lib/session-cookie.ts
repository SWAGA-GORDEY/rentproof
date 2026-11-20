export const SESSION_COOKIE = "rentproof_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export type SessionCookieOptions = {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
};

export function cookieIsSecure(): boolean {
  if (process.env.RENTPROOF_COOKIE_SECURE === "1") {
    return true;
  }
  if (process.env.RENTPROOF_COOKIE_SECURE === "0") {
    return false;
  }
  return process.env.NODE_ENV === "production";
}

export function sessionCookieOptions(secure: boolean): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
