// Local-only persistence for the pasted Twilio credentials.
//
// Storage is the browser's localStorage — on the user's own device, never
// transmitted to or stored on our server. Provide clear/forget so the user
// can wipe them.

import type { TwilioConfig } from "./twilioToken";

const KEY = "nv_twilio_config_v1";
const DEFAULT_IDENTITY = "new_voices_dialer";

export function loadConfig(): TwilioConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TwilioConfig>;
    if (!isComplete(parsed)) return null;
    return {
      accountSid: parsed.accountSid!.trim(),
      apiKeySid: parsed.apiKeySid!.trim(),
      apiKeySecret: parsed.apiKeySecret!.trim(),
      twimlAppSid: parsed.twimlAppSid!.trim(),
      callerId: parsed.callerId!.trim(),
      identity: (parsed.identity || DEFAULT_IDENTITY).trim(),
    };
  } catch {
    return null;
  }
}

export function saveConfig(config: TwilioConfig): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(config));
}

export function clearConfig(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function isComplete(c: Partial<TwilioConfig>): boolean {
  return Boolean(
    c.accountSid &&
      c.apiKeySid &&
      c.apiKeySecret &&
      c.twimlAppSid &&
      c.callerId,
  );
}

export const DEFAULTS = { identity: DEFAULT_IDENTITY };
