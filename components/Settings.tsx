"use client";

import { useMemo, useState } from "react";
import type { TwilioConfig } from "@/lib/twilioToken";
import { DEFAULTS, isComplete } from "@/lib/credentials";

type Props = {
  initial: TwilioConfig | null;
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

const ALL_KEYS: (keyof TwilioConfig)[] = [
  "accountSid",
  "apiKeySid",
  "apiKeySecret",
  "twimlAppSid",
  "callerId",
  "identity",
];

function normalize(values: Partial<TwilioConfig>): TwilioConfig {
  return {
    accountSid: (values.accountSid || "").trim(),
    apiKeySid: (values.apiKeySid || "").trim(),
    apiKeySecret: (values.apiKeySecret || "").trim(),
    twimlAppSid: (values.twimlAppSid || "").trim(),
    callerId: (values.callerId || "").trim(),
    identity: (values.identity || DEFAULTS.identity).trim(),
  };
}

export default function Settings({ initial, onSave, onCancel }: Props) {
  const hasSaved = Boolean(initial && isComplete(initial));

  const [values, setValues] = useState<Partial<TwilioConfig>>(
    initial ? { ...initial } : { identity: DEFAULTS.identity },
  );
  const [error, setError] = useState("");

  const set = (key: keyof TwilioConfig, v: string) => {
    setError("");
    setValues((prev) => ({ ...prev, [key]: v }));
  };

  // Does the form differ from the last saved copy?
  const isDirty = useMemo(() => {
    if (!initial) return true;
    const current = normalize(values);
    return ALL_KEYS.some((k) => current[k] !== initial[k]);
  }, [values, initial]);

  const complete = isComplete(normalize(values));

  const commit = (e: React.FormEvent) => {
    e.preventDefault();
    const cfg = normalize(values);
    if (!isComplete(cfg)) {
      setError("Please fill in all fields.");
      return;
    }
    if (!/^\+\d{6,15}$/.test(cfg.callerId)) {
      setError("Caller ID must be E.164, e.g. +19729475590");
      return;
    }
    onSave(cfg); // persists to localStorage in the parent, then connects
  };

  const restore = () => {
    setError("");
    if (initial) setValues({ ...initial });
  };

  const statusLabel = !hasSaved
    ? "Not yet saved on this device"
    : isDirty
      ? "Unsaved changes"
      : "Saved on this device";
  const statusClass = !hasSaved ? "" : isDirty ? "busy" : "ready";

  return (
    <form className="dialer" onSubmit={commit}>
      <h1>Twilio credentials</h1>
      <div className={`status ${statusClass}`}>
        <span className="dot" />
        {statusLabel}
      </div>

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
        {/* Secondary action */}
        {hasSaved && isDirty && (
          <button type="button" className="btn btn-secondary" onClick={restore}>
            Restore to saved
          </button>
        )}
        {hasSaved && !isDirty && onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}

        {/* Primary action */}
        {!hasSaved && (
          <button type="submit" className="btn btn-call" disabled={!complete}>
            Save &amp; connect
          </button>
        )}
        {hasSaved && isDirty && (
          <button type="submit" className="btn btn-call" disabled={!complete}>
            Update
          </button>
        )}
        {hasSaved && !isDirty && (
          <button
            type="button"
            className="btn btn-call"
            onClick={() => (onCancel ? onCancel() : onSave(normalize(values)))}
          >
            Connect
          </button>
        )}
      </div>

      <p className="hint">
        Saved with <strong>Save</strong> / <strong>Update</strong> to this
        browser only (localStorage) and auto-filled next time you open the site.
        The API Key Secret is used to sign your access token locally and is
        never sent to this website&apos;s server.
      </p>
    </form>
  );
}
