"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Call, Device } from "@twilio/voice-sdk";

type Phase = "loading" | "ready" | "connecting" | "on-call" | "incoming" | "error";

const KEYS = [
  { d: "1", s: "" },
  { d: "2", s: "ABC" },
  { d: "3", s: "DEF" },
  { d: "4", s: "GHI" },
  { d: "5", s: "JKL" },
  { d: "6", s: "MNO" },
  { d: "7", s: "PQRS" },
  { d: "8", s: "TUV" },
  { d: "9", s: "WXYZ" },
  { d: "*", s: "" },
  { d: "0", s: "+" },
  { d: "#", s: "" },
];

export default function Dialer() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [statusText, setStatusText] = useState("Initializing…");
  const [number, setNumber] = useState("");
  const [incomingFrom, setIncomingFrom] = useState("");

  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);
  const incomingRef = useRef<Call | null>(null);

  const fetchToken = useCallback(async (): Promise<string> => {
    const res = await fetch("/api/token", { cache: "no-store" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Token request failed (${res.status})`);
    }
    const data = await res.json();
    return data.token as string;
  }, []);

  useEffect(() => {
    let device: Device | null = null;
    let cancelled = false;

    (async () => {
      try {
        const token = await fetchToken();
        if (cancelled) return;

        device = new Device(token, { logLevel: "error" });
        deviceRef.current = device;

        device.on("registered", () => {
          setPhase("ready");
          setStatusText("Ready");
        });
        device.on("error", (err: { message?: string }) => {
          setPhase("error");
          setStatusText(err?.message || "Device error");
        });
        device.on("tokenWillExpire", async () => {
          try {
            const fresh = await fetchToken();
            device?.updateToken(fresh);
          } catch {
            /* will surface on next action */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetToReady = useCallback(() => {
    callRef.current = null;
    incomingRef.current = null;
    setIncomingFrom("");
    setPhase("ready");
    setStatusText("Ready");
  }, []);

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
    if (!device || !number.trim()) return;
    setPhase("connecting");
    setStatusText("Connecting…");
    try {
      const call = await device.connect({ params: { To: number.trim() } });
      wireActiveCall(call);
    } catch (err) {
      setPhase("error");
      setStatusText(err instanceof Error ? err.message : "Could not place call");
    }
  }, [number, wireActiveCall]);

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

  const press = (d: string) => {
    if (phase === "on-call") {
      // Send DTMF tones during an active call.
      callRef.current?.sendDigits(d);
      return;
    }
    setNumber((n) => n + d);
  };

  const statusClass =
    phase === "ready"
      ? "ready"
      : phase === "error"
        ? "error"
        : phase === "on-call" || phase === "connecting" || phase === "incoming"
          ? "busy"
          : "";

  const busy = phase === "on-call" || phase === "connecting";

  return (
    <div className="dialer">
      <h1>New Voices Dialer</h1>
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

      <input
        className="display"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        placeholder="+1 555 123 4567"
        inputMode="tel"
        aria-label="Destination number"
      />

      <div className="keypad">
        {KEYS.map((k) => (
          <button
            key={k.d}
            className="key"
            onClick={() => press(k.d)}
            aria-label={`Key ${k.d}`}
          >
            {k.d}
            {k.s && <small>{k.s}</small>}
          </button>
        ))}
      </div>

      <div className="actions">
        {busy ? (
          <button className="btn btn-hangup" onClick={hangup}>
            Hang up
          </button>
        ) : (
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setNumber((n) => n.slice(0, -1))}
              disabled={!number}
              aria-label="Delete last digit"
            >
              ⌫
            </button>
            <button
              className="btn btn-call"
              onClick={startCall}
              disabled={phase !== "ready" || !number.trim()}
            >
              Call
            </button>
          </>
        )}
      </div>

      <p className="hint">
        Allow microphone access when prompted. Outbound caller ID is your
        configured Twilio number. Enter destinations in E.164 format (e.g.
        +14155551234).
      </p>
    </div>
  );
}
