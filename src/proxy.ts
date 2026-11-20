import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
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
