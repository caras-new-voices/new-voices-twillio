import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, safeEqual, sitePassword, tokenForPassword } from "@/lib/auth";

// Paths that must remain public:
//  - /login + /api/login: the gate itself
//  - /api/voice: called by Twilio's servers (no cookie); protected by
//    Twilio signature validation instead.
const PUBLIC_PATHS = ["/login", "/api/login", "/api/voice"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(AUTH_COOKIE)?.value || "";
  const expected = await tokenForPassword(sitePassword());

  if (cookie && safeEqual(cookie, expected)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run on everything except Next internals and static asset files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
