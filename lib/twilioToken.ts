// Client-side Twilio Access Token minting.
//
// The Twilio Voice SDK needs a short-lived JWT (an "Access Token") signed with
// the account's API Key Secret. Normally that signing happens on a server so
// the secret never reaches the browser. Here we do the opposite ON PURPOSE:
// the user pastes their own credentials, we sign entirely in the browser using
// the Web Crypto API, and nothing is ever sent to our backend. The credentials
// live only in this browser (see lib/credentials.ts).

export type TwilioConfig = {
  accountSid: string;
  apiKeySid: string;
  apiKeySecret: string;
  twimlAppSid: string;
  callerId: string;
  identity: string;
};

const TTL_SECONDS = 3600;

function base64UrlFromString(input: string): string {
  return base64UrlFromBytes(new TextEncoder().encode(input));
}

function base64UrlFromBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Build and HS256-sign a Twilio Voice Access Token in the browser.
 * Mirrors the exact structure Twilio's server SDK produces.
 */
export async function mintAccessToken(config: TwilioConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "HS256", typ: "JWT", cty: "twilio-fpa;v=1" };
  const payload = {
    jti: `${config.apiKeySid}-${now}`,
    grants: {
      identity: config.identity,
      voice: {
        incoming: { allow: true },
        outgoing: { application_sid: config.twimlAppSid },
      },
    },
    iat: now,
    exp: now + TTL_SECONDS,
    iss: config.apiKeySid,
    sub: config.accountSid,
  };

  const signingInput = `${base64UrlFromString(
    JSON.stringify(header),
  )}.${base64UrlFromString(JSON.stringify(payload))}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(config.apiKeySecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signingInput),
  );

  return `${signingInput}.${base64UrlFromBytes(new Uint8Array(signature))}`;
}
