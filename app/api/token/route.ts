import { NextResponse } from "next/server";
import twilio from "twilio";

const { AccessToken } = twilio.jwt;
const { VoiceGrant } = AccessToken;

// Access tokens are short-lived; the browser refreshes before expiry.
const TOKEN_TTL_SECONDS = 3600;

export const dynamic = "force-dynamic";

export async function GET() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;
  const identity = process.env.TWILIO_CLIENT_IDENTITY || "new_voices_dialer";

  if (!accountSid || !apiKeySid || !apiKeySecret || !twimlAppSid) {
    return NextResponse.json(
      {
        error:
          "Missing Twilio configuration. Required: TWILIO_ACCOUNT_SID, " +
          "TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, TWILIO_TWIML_APP_SID.",
      },
      { status: 500 },
    );
  }

  const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
    identity,
    ttl: TOKEN_TTL_SECONDS,
  });

  token.addGrant(
    new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true, // allow this identity to receive inbound calls
    }),
  );

  return NextResponse.json({ identity, token: token.toJwt() });
}
