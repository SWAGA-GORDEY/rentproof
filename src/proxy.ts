import { NextResponse, type NextRequest } from "next/server";

/** Normalize accidental casing so /Admin is not a raw 404 (and not a redirect loop). */
function normalizeAdminCasing(request: NextRequest): NextResponse | null {
  const { pathname, search } = request.nextUrl;
  const lower = pathname.toLowerCase();
  if (lower === "/admin" || lower.startsWith("/admin/")) {
    if (pathname !== lower) {
      const url = request.nextUrl.clone();
      url.pathname = lower;
      return NextResponse.redirect(url);
    }
    return null;
  }
  if (lower === "/owner" || lower.startsWith("/owner/")) {
    if (pathname !== lower) {
      const url = request.nextUrl.clone();
      url.pathname = lower;
      return NextResponse.redirect(url);
    }
    return null;
  }
  if (lower === "/control-center" || lower.startsWith("/control-center/")) {
    if (pathname !== lower) {
      const url = request.nextUrl.clone();
      url.pathname = lower;
      return NextResponse.redirect(url);
    }
    return null;
  }
  void search;
  return null;
}

export function proxy(request: NextRequest) {
  const casing = normalizeAdminCasing(request);
  if (casing) return casing;

  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    return NextResponse.next();
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return NextResponse.next();
  }

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    if (!host || new URL(origin).host !== host) {
      return new NextResponse("Недопустимый источник запроса", { status: 403 });
    }
  } catch {
    return new NextResponse("Недопустимый источник запроса", { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
