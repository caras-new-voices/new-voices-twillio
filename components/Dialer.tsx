"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Call, Device } from "@twilio/voice-sdk";
import Settings from "./Settings";
import { clearConfig, loadConfig, saveConfig } from "@/lib/credentials";
import { mintAccessToken, type TwilioConfig } from "@/lib/twilioToken";

type Phase =
  | "loading"
  | "setup"
  | "ready"
  | "connecting"
  | "on-call"
  | "incoming"
  | "error";

type Contact = { label: string; number: string };

// Numbers available to call. Add more entries here as they come online.
const CONTACTS: Contact[] = [
  { label: "Inter Miami demo", number: "+17542199670" },
];

const DTMF_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

function formatNumber(e164: string): string {
  const m = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  if (m) return `+1 (${m[1]}) ${m[2]}-${m[3]}`;
  return e164;
}

export default function Dialer() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [statusText, setStatusText] = useState("Initializing…");
  const [selected, setSelected] = useState(CONTACTS[0]?.number ?? "");
  const [incomingFrom, setIncomingFrom] = useState("");
  const [config, setConfig] = useState<TwilioConfig | null>(null);

  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);
  const incomingRef = useRef<Call | null>(null);
  const configRef = useRef<TwilioConfig | null>(null);

  // Load any previously saved (browser-local) credentials on mount.
  useEffect(() => {
    const saved = loadConfig();
    if (saved) {
      configRef.current = saved;
      setConfig(saved);
    } else {
      setPhase("setup");
    }
  }, []);

  const resetToReady = useCallback(() => {
    callRef.current = null;
    incomingRef.current = null;
    setIncomingFrom("");
    setPhase("ready");
    setStatusText("Ready");
  }, []);

  // (Re)initialize the Twilio Device whenever we have a config.
  useEffect(() => {
    if (!config) return;
    let device: Device | null = null;
    let cancelled = false;

    (async () => {
      setPhase("loading");
      setStatusText("Connecting to Twilio…");
      try {
        const token = await mintAccessToken(config);
        if (cancelled) return;

        device = new Device(token, { logLevel: "error" });
        deviceRef.current = device;

        device.on("registered", () => {
          setPhase("ready");
          setStatusText("Ready");
        });
        device.on("error", (err: { message?: string; code?: number }) => {
          setPhase("error");
          setStatusText(
            (err?.message || "Device error") +
              (err?.code ? ` (${err.code})` : ""),
          );
        });
        device.on("tokenWillExpire", async () => {
          try {
            const fresh = await mintAccessToken(config);
            device?.updateToken(fresh);
          } catch {
            /* surfaces on next action */
          }
        });
        device.on("incoming", (call: Call) => {
          incomingRef.current = call;
          setIncomingFrom(call.parameters.From || "Unknown");
          setPhase("incoming");
          setStatusText("Incoming call");
          call.on("cancel", () => resetToReady());
          call.on("disconnect", () => resetToReady());
          call.on("error", () => resetToReady());
        });

        await device.register();
      } catch (err) {
        if (cancelled) return;
        setPhase("error");
        setStatusText(err instanceof Error ? err.message : "Failed to start");
      }
    })();

    return () => {
      cancelled = true;
      device?.destroy();
      deviceRef.current = null;
    };
  }, [config, resetToReady]);

  const wireActiveCall = useCallback(
    (call: Call) => {
      callRef.current = call;
      call.on("accept", () => {
        setPhase("on-call");
        setStatusText("On call");
      });
      call.on("disconnect", () => resetToReady());
      call.on("cancel", () => resetToReady());
      call.on("reject", () => resetToReady());
      call.on("error", (e: { message?: string }) => {
        setPhase("error");
        setStatusText(e?.message || "Call error");
      });
    },
    [resetToReady],
  );

  const startCall = useCallback(async () => {
    const device = deviceRef.current;
    const cfg = configRef.current;
    if (!device || !cfg || !selected) return;
    setPhase("connecting");
    setStatusText("Connecting…");
    try {
      // Pass destination + caller ID to our /api/voice TwiML endpoint.
      const call = await device.connect({
        params: { To: selected, callerId: cfg.callerId },
      });
      wireActiveCall(call);
    } catch (err) {
      setPhase("error");
      setStatusText(err instanceof Error ? err.message : "Could not place call");
    }
  }, [selected, wireActiveCall]);

  const hangup = useCallback(() => {
    deviceRef.current?.disconnectAll();
    resetToReady();
  }, [resetToReady]);

  const acceptIncoming = useCallback(() => {
    const call = incomingRef.current;
    if (!call) return;
    wireActiveCall(call);
    call.accept();
    setPhase("on-call");
    setStatusText("On call");
  }, [wireActiveCall]);

  const rejectIncoming = useCallback(() => {
    incomingRef.current?.reject();
    resetToReady();
  }, [resetToReady]);

  const handleSave = useCallback((cfg: TwilioConfig) => {
    saveConfig(cfg);
    configRef.current = cfg;
    setConfig(cfg); // triggers device (re)init
  }, []);

  const openSettings = useCallback(() => {
    deviceRef.current?.destroy();
    deviceRef.current = null;
    setPhase("setup");
  }, []);

  const forgetCredentials = useCallback(() => {
    deviceRef.current?.destroy();
    deviceRef.current = null;
    clearConfig();
    configRef.current = null;
    setConfig(null);
    setPhase("setup");
  }, []);

  if (phase === "setup") {
    return (
      <Settings
        initial={configRef.current}
        onSave={handleSave}
        onCancel={configRef.current ? () => setConfig(configRef.current) : undefined}
      />
    );
  }

  const statusClass =
    phase === "ready"
      ? "ready"
      : phase === "error"
        ? "error"
        : phase === "on-call" || phase === "connecting" || phase === "incoming"
          ? "busy"
          : "";

  const busy = phase === "on-call" || phase === "connecting";
  const selectedContact = CONTACTS.find((c) => c.number === selected);

  return (
    <div className="dialer">
      <div className="header-row">
        <h1>New Voices Dialer</h1>
        <button
          className="gear"
          onClick={openSettings}
          title="Twilio credentials"
          aria-label="Settings"
        >
          ⚙
        </button>
      </div>
      <div className={`status ${statusClass}`}>
        <span className="dot" />
        {statusText}
      </div>

      {phase === "incoming" && (
        <div className="incoming">
          <p>
            Incoming call from
            <br />
            <strong>{incomingFrom}</strong>
          </p>
          <div className="actions">
            <button className="btn btn-call" onClick={acceptIncoming}>
              Accept
            </button>
            <button className="btn btn-hangup" onClick={rejectIncoming}>
              Reject
            </button>
          </div>
        </div>
      )}

      {busy ? (
        <>
          <div className="callee">
            {selectedContact ? (
              <>
                <strong>{selectedContact.label}</strong>
                <span>{formatNumber(selectedContact.number)}</span>
              </>
            ) : (
              <strong>{formatNumber(selected)}</strong>
            )}
          </div>

          <div className="keypad">
            {DTMF_KEYS.map((d) => (
              <button
                key={d}
                className="key"
                onClick={() => callRef.current?.sendDigits(d)}
                aria-label={`Send tone ${d}`}
                disabled={phase !== "on-call"}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="actions">
            <button className="btn btn-hangup" onClick={hangup}>
              Hang up
            </button>
          </div>
        </>
      ) : (
        <>
          <label className="field-label" htmlFor="contact">
            Number to call
          </label>
          <select
            id="contact"
            className="display select"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            aria-label="Number to call"
          >
            {CONTACTS.map((c) => (
              <option key={c.number} value={c.number}>
                {c.label} — {formatNumber(c.number)}
              </option>
            ))}
          </select>

          <div className="actions">
            <button
              className="btn btn-call"
              onClick={startCall}
              disabled={phase !== "ready" || !selected}
            >
              Call
            </button>
          </div>

          {phase === "error" && (
            <button className="link-btn" onClick={openSettings}>
              Check / update credentials
            </button>
          )}
        </>
      )}

      <div className="footer-row">
        <button className="link-btn" onClick={forgetCredentials}>
          Forget credentials
        </button>
      </div>

      <p className="hint">
        Allow microphone access when prompted. Calls place with your Twilio
        number as the caller ID. Credentials stay in this browser only.
      </p>
    </div>
  );
}
