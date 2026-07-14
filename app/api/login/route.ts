import { NextResponse } from "next/server";
import { AUTH_COOKIE, safeEqual, sitePassword, tokenForPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  const expected = sitePassword();
  // Compare via the derived token so we never branch on raw password length.
  const ok = safeEqual(
    await tokenForPassword(password),
    await tokenForPassword(expected),
  );

  if (!ok) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await tokenForPassword(expected), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
