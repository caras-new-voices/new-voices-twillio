import { NextResponse } from "next/server";
import twilio from "twilio";

const VoiceResponse = twilio.twiml.VoiceResponse;

export const dynamic = "force-dynamic";

/**
 * TwiML endpoint hit by Twilio for BOTH directions:
 *
 *  - Outbound: the browser calls `device.connect({ params: { To } })`, Twilio
 *    POSTs here (via the TwiML App Voice URL) with `From = client:<identity>`.
 *    We bridge the call out to the PSTN destination using our number as the
 *    caller ID.
 *
 *  - Inbound: someone dials our Twilio number, whose Voice webhook points here.
 *    We ring the registered browser client.
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const from = (form.get("From") as string) || "";
  const to = (form.get("To") as string) || "";

  const callerId = process.env.TWILIO_CALLER_ID || "";
  const identity = process.env.TWILIO_CLIENT_IDENTITY || "new_voices_dialer";

  // Optional request-authenticity check. Enable by setting
  // TWILIO_VALIDATE_SIGNATURE=true once you have confirmed the public URL.
  if (process.env.TWILIO_VALIDATE_SIGNATURE === "true") {
    const valid = validateTwilioSignature(request, form);
    if (!valid) {
      return new NextResponse("Invalid Twilio signature", { status: 403 });
    }
  }

  const response = new VoiceResponse();
  const isFromBrowser = from.startsWith("client:");

  if (isFromBrowser) {
    // Outbound call initiated from the browser dialer.
    if (!to) {
      response.say("No destination number was provided.");
    } else if (!callerId) {
      response.say(
        "The dialer is not configured with a caller ID. Set TWILIO_CALLER_ID.",
      );
    } else {
      const dial = response.dial({ callerId, answerOnBridge: true });
      // Route to another browser client if dialing client:<identity>,
      // otherwise treat as a PSTN number.
      if (to.startsWith("client:")) {
        dial.client(to.replace("client:", ""));
      } else {
        dial.number(normalizeNumber(to));
      }
    }
  } else {
    // Inbound PSTN call → ring the browser client.
    const dial = response.dial({ answerOnBridge: true });
    dial.client(identity);
  }

  return new NextResponse(response.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}

function normalizeNumber(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) return trimmed;
  const digits = trimmed.replace(/[^0-9]/g, "");
  // Assume US if a bare 10- or 11-digit number is entered.
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

function validateTwilioSignature(request: Request, form: FormData): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return false;

  const signature = request.headers.get("x-twilio-signature") || "";
  const url = request.url;
  const params: Record<string, string> = {};
  form.forEach((value, key) => {
    params[key] = value.toString();
  });

  return twilio.validateRequest(authToken, signature, url, params);
}
