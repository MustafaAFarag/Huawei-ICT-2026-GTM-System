"use client";
import { useState } from "react";
import { Button, Field, Input } from "./primitives";
import { Logo } from "./brand/Logo";
import { usePrefs } from "../lib/prefs";
import { client } from "../lib/client";

const HIGHLIGHTS = [
  ["Plays", "Ready workflows from list to reviewed sequence."],
  ["Assistant", "Proposes the next step and shows the cost first."],
  ["Asset Studio", "Branded one-pagers and audits in English and Arabic."],
] as const;

export function SignIn({ onSignedIn }: { onSignedIn: () => Promise<void> }) {
  const { t } = usePrefs();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <main className="signin">
      <section className="signin-hero" aria-hidden>
        <Logo variant="wordmark" animated />
        <div className="signin-copy">
          <p className="eyebrow">{t("Go-to-market command center")}</p>
          <p className="signin-display">
            {t("Move a good idea")}
            <br />
            {t("toward a conversation.")}
          </p>
          <ul className="signin-points">
            {HIGHLIGHTS.map(([title, text]) => (
              <li key={title}>
                <span className="mono">{t(title)}</span>
                <span>{t(text)}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="mono muted small">
          v0.2 · EN / العربية · {t("governed AI")}
        </p>
      </section>
      <section className="signin-panel">
        <div className="signin-card">
          <h1>{t("Sign in")}</h1>
          <p className="muted">{t("Sign in to your team’s workspace.")}</p>
          <form
            className="stack"
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setError("");
              const fields = new FormData(event.currentTarget);
              try {
                await client.request("/auth/sign-in/email", {
                  method: "POST",
                  body: JSON.stringify({
                    email: fields.get("email"),
                    password: fields.get("password"),
                  }),
                });
                await onSignedIn();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label={t("Email")}>
              <Input
                name="email"
                type="email"
                autoComplete="username"
                required
              />
            </Field>
            <Field label={t("Password")}>
              <Input
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>
            {error && (
              <p role="alert" className="error-text">
                {error}
              </p>
            )}
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? t("Signing in…") : t("Sign in")}
            </Button>
          </form>
          <p className="muted small">
            {t("Demo accounts are provisioned by the workspace owner.")}
          </p>
        </div>
      </section>
    </main>
  );
}
