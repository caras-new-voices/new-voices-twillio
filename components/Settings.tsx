"use client";

import { useState } from "react";
import type { TwilioConfig } from "@/lib/twilioToken";
import { DEFAULTS, isComplete } from "@/lib/credentials";

type Props = {
  initial: Partial<TwilioConfig> | null;
  onSave: (config: TwilioConfig) => void;
  onCancel?: () => void;
};

const FIELDS: {
  key: keyof TwilioConfig;
  label: string;
  placeholder: string;
  hint?: string;
  secret?: boolean;
}[] = [
  {
    key: "accountSid",
    label: "Account SID",
    placeholder: "AC…",
    hint: "Twilio Console → Account Info",
  },
  {
    key: "apiKeySid",
    label: "API Key SID",
    placeholder: "SK…",
    hint: "Console → API keys & tokens → Create key",
  },
  {
    key: "apiKeySecret",
    label: "API Key Secret",
    placeholder: "shown once when the key is created",
    secret: true,
  },
  {
    key: "twimlAppSid",
    label: "TwiML App SID",
    placeholder: "AP…",
    hint: "Voice URL must point to this site's /api/voice",
  },
  {
    key: "callerId",
    label: "Caller ID (your Twilio number)",
    placeholder: "+19729475590",
  },
];

export default function Settings({ initial, onSave, onCancel }: Props) {
  const [values, setValues] = useState<Partial<TwilioConfig>>({
    identity: DEFAULTS.identity,
    ...(initial || {}),
  });
  const [error, setError] = useState("");

  const set = (key: keyof TwilioConfig, v: string) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed: Partial<TwilioConfig> = {};
    (Object.keys(values) as (keyof TwilioConfig)[]).forEach((k) => {
      const v = values[k];
      if (typeof v === "string") trimmed[k] = v.trim();
    });
    if (!isComplete(trimmed)) {
      setError("Please fill in all fields.");
      return;
    }
    if (!/^\+\d{6,15}$/.test(trimmed.callerId!)) {
      setError("Caller ID must be E.164, e.g. +19729475590");
      return;
    }
    onSave({
      accountSid: trimmed.accountSid!,
      apiKeySid: trimmed.apiKeySid!,
      apiKeySecret: trimmed.apiKeySecret!,
      twimlAppSid: trimmed.twimlAppSid!,
      callerId: trimmed.callerId!,
      identity: trimmed.identity || DEFAULTS.identity,
    });
  };

  return (
    <form className="dialer" onSubmit={submit}>
      <h1>Twilio credentials</h1>
      <div className="status">Stored only in this browser</div>

      {FIELDS.map((f) => (
        <div className="form-row" key={f.key}>
          <label className="field-label" htmlFor={f.key}>
            {f.label}
          </label>
          <input
            id={f.key}
            className="input"
            type={f.secret ? "password" : "text"}
            value={(values[f.key] as string) || ""}
            onChange={(e) => set(f.key, e.target.value)}
            placeholder={f.placeholder}
            autoComplete="off"
            spellCheck={false}
          />
          {f.hint && <span className="field-hint">{f.hint}</span>}
        </div>
      ))}

      {error && (
        <div className="status error">
          <span className="dot" />
          {error}
        </div>
      )}

      <div className="actions">
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-call">
          Save &amp; connect
        </button>
      </div>

      <p className="hint">
        These credentials are kept only in this browser (localStorage) and are
        used to sign your Twilio access token locally. They are never sent to or
        stored on this website&apos;s server.
      </p>
    </form>
  );
}
