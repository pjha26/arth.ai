"use client";

import { useState, type FormEvent } from "react";

export function SessionForm({ mode }: { mode: "login" | "logout" }) {
  const login = mode === "login";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const body = new FormData(form);
    setPending(true);
    setError("");
    try {
      const response = await fetch(form.action, {
        method: "POST", body, redirect: "manual", referrerPolicy: "same-origin",
      });
      if (response.type === "opaqueredirect") {
        window.location.assign(login ? "/dashboard" : "/login");
        return;
      }
      setError(response.status === 401 ? "The password was not accepted."
        : response.status === 429 ? "Too many attempts. Please try again later."
        : "Team access is temporarily unavailable. Please try again.");
    } catch {
      setError("Could not reach ArthAI. Please try again.");
    }
    setPending(false);
  }

  return (
    <form method="post" action={`/api/auth/${mode}`} className={login ? "ui-form" : undefined} onSubmit={submit}>
      {login && <div className="ui-field">
        <label htmlFor="password">Team password</label>
        <input className="ui-input" id="password" name="password" type="password" autoComplete="current-password"
          required maxLength={200} aria-describedby={error ? "session-error" : undefined} />
      </div>}
      <button className={login ? "ui-button" : undefined} type="submit" disabled={pending}>
        {pending ? (login ? "Signing in…" : "Signing out…") : (login ? "Sign in" : "Sign out")}
        <span aria-hidden="true">{login ? "→" : "↗"}</span>
      </button>
      {error && <p className="ui-error" id="session-error" role="alert">{error}</p>}
    </form>
  );
}
