// Shared auth helpers. Runs on both the Edge (middleware) and Node runtimes,
// so it relies only on the Web Crypto API.

export const AUTH_COOKIE = "nv_auth";

/** Password required to access the dialer. Overridable via env; default "caras". */
export function sitePassword(): string {
  return process.env.SITE_PASSWORD || "caras";
}

/** Deterministic cookie token derived from the password (never store plaintext). */
export async function tokenForPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`new-voices:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time-ish comparison of two hex strings of equal expected length. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
