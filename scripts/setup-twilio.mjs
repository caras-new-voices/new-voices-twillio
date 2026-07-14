#!/usr/bin/env node
/**
 * One-time Twilio provisioning for the browser dialer.
 *
 * Creates (or reuses) the API Key + TwiML App the app needs, and points the
 * TwiML App's Voice URL — and your phone number's Voice webhook — at your
 * deployment's /api/voice endpoint.
 *
 * Usage:
 *   TWILIO_ACCOUNT_SID=AC... TWILIO_AUTH_TOKEN=... \
 *     node scripts/setup-twilio.mjs https://your-app.vercel.app
 *
 * Or put the credentials in .env.local (this script reads it) and run:
 *   npm run setup:twilio -- https://your-app.vercel.app
 *
 * It prints the env vars you then paste into Vercel (and .env.local).
 * The API Key secret is shown ONLY once — copy it immediately.
 */
import fs from "node:fs";
import path from "node:path";
import twilio from "twilio";

loadEnvLocal();

const baseUrl = (process.argv[2] || process.env.PUBLIC_BASE_URL || "").replace(
  /\/$/,
  "",
);
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const callerId = process.env.TWILIO_CALLER_ID || "+19729475590";

if (!accountSid || !authToken) {
  fail(
    "Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN. Set them in the environment or .env.local.",
  );
}
if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
  fail(
    "Provide your deployment base URL, e.g.\n  node scripts/setup-twilio.mjs https://your-app.vercel.app",
  );
}

const voiceUrl = `${baseUrl}/api/voice`;
const client = twilio(accountSid, authToken);

console.log(`\nProvisioning Twilio for: ${baseUrl}`);
console.log(`Voice webhook target:    ${voiceUrl}\n`);

// 1. API Key (signs browser access tokens).
const apiKey = await client.newKeys.create({ friendlyName: "new-voices-dialer" });
console.log("✓ Created API Key:", apiKey.sid);

// 2. TwiML App (routes outbound browser calls to our voice endpoint).
const appName = "new-voices-dialer";
const existingApps = await client.applications.list({
  friendlyName: appName,
  limit: 1,
});
let app;
if (existingApps.length) {
  app = await client
    .applications(existingApps[0].sid)
    .update({ voiceUrl, voiceMethod: "POST" });
  console.log("✓ Updated TwiML App:", app.sid);
} else {
  app = await client.applications.create({
    friendlyName: appName,
    voiceUrl,
    voiceMethod: "POST",
  });
  console.log("✓ Created TwiML App:", app.sid);
}

// 3. Point the phone number's inbound Voice webhook at the same endpoint.
const numbers = await client.incomingPhoneNumbers.list({
  phoneNumber: callerId,
  limit: 1,
});
if (numbers.length) {
  await client
    .incomingPhoneNumbers(numbers[0].sid)
    .update({ voiceUrl, voiceMethod: "POST" });
  console.log(`✓ Set inbound Voice webhook on ${callerId}`);
} else {
  console.log(
    `! Number ${callerId} not found on this account — skipping inbound webhook.`,
  );
}

console.log("\n────────────────────────────────────────────────────────");
console.log("Add these environment variables (Vercel + .env.local):\n");
console.log(`TWILIO_ACCOUNT_SID=${accountSid}`);
console.log(`TWILIO_API_KEY_SID=${apiKey.sid}`);
console.log(`TWILIO_API_KEY_SECRET=${apiKey.secret}`);
console.log(`TWILIO_TWIML_APP_SID=${app.sid}`);
console.log(`TWILIO_CALLER_ID=${callerId}`);
console.log(`TWILIO_CLIENT_IDENTITY=${process.env.TWILIO_CLIENT_IDENTITY || "new_voices_dialer"}`);
console.log("────────────────────────────────────────────────────────");
console.log(
  "\n⚠  The API Key secret above is shown only once. Copy it now.\n",
);

function loadEnvLocal() {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

function fail(msg) {
  console.error("\n✗ " + msg + "\n");
  process.exit(1);
}
