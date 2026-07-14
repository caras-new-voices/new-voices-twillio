"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Login failed");
      }
      const from = params.get("from") || "/";
      router.push(from);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  };

  return (
    <form className="dialer" onSubmit={submit}>
      <h1>New Voices Dialer</h1>
      <div className="status">Enter password to continue</div>
      <input
        className="display"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        autoFocus
        aria-label="Password"
      />
      {error && (
        <div className="status error" style={{ marginTop: 4 }}>
          <span className="dot" />
          {error}
        </div>
      )}
      <div className="actions" style={{ marginTop: 8 }}>
        <button className="btn btn-call" type="submit" disabled={loading || !password}>
          {loading ? "Checking…" : "Unlock"}
        </button>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="page">
      <Suspense fallback={<div className="dialer">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
