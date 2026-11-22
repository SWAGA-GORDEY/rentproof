/** Canonical public site origin used in metadata, sitemap and robots. */

export function siteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  if (process.env.RENDER_EXTERNAL_URL?.trim()) {
    return process.env.RENDER_EXTERNAL_URL.trim().replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

export function absoluteUrl(path = "/"): string {
  const origin = siteOrigin();
  if (!path || path === "/") {
    return `${origin}/`;
  }
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function searchVerification(): {
  google?: string | string[];
  yandex?: string | string[];
  other?: Record<string, string | number | (string | number)[]>;
} | undefined {
  const google = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  const yandex = process.env.YANDEX_VERIFICATION?.trim();
  if (!google && !yandex) {
    return undefined;
  }
  return {
    ...(google ? { google } : {}),
    ...(yandex ? { yandex } : {}),
  };
}
