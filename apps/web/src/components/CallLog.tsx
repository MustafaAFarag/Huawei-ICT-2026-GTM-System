"use client";
import { useState } from "react";
import { IconSparkles } from "@revenue/ui";
import { Button, Field, Panel, Textarea } from "./primitives";
import { VoiceButton } from "./VoiceButton";
import { useWorkspace } from "./workspace-context";
import { usePrefs } from "../lib/prefs";
import { client } from "../lib/client";
import type { Prospect } from "../lib/types";

const OUTCOMES = [
  "connected",
  "meeting-booked",
  "agreed",
  "call-back",
  "voicemail",
  "no-answer",
  "not-interested",
  "wrong-person",
  "opt-out",
] as const;
type Suggestion = {
  outcome: (typeof OUTCOMES)[number];
  nextStep: string;
  followUpDays: number | null;
  summary: string;
};

// Call outcome logging by voice (PRD GAP-08): dictate, let the assistant propose, confirm.
export function CallLog({ prospect }: { prospect: Prospect }) {
  const { ws, canWrite, busy, action } = useWorkspace();
  const { t, language } = usePrefs();
  const [note, setNote] = useState("");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  return (
    <Panel eyebrow={t("Calls")} title={t("Log a call outcome")}>
      <div className="call-log">
        <Field label={t("Call note")} hint={t("Type or dictate in English or Arabic.")}>
          <span className="note-field">
            <Textarea
              dir="auto"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("e.g. Spoke to her, asked to call back Sunday after payroll")}
            />
            <VoiceButton
              ws={ws}
              language={language === "ar" ? "ar" : "auto"}
              disabled={!canWrite}
              onError={setError}
              onText={(text) => setNote((v) => (v ? `${v} ${text}` : text))}
            />
          </span>
        </Field>
        <Button
          variant="ai"
          size="sm"
          startIcon={<IconSparkles size={14} />}
          disabled={!canWrite || working || note.trim().length < 3}
          onClick={async () => {
            setWorking(true);
            setError("");
            try {
              setSuggestion(
                await client.workspace<Suggestion>(ws, "/call-outcome/suggest", {
                  method: "POST",
                  body: JSON.stringify({ note }),
                }),
              );
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setWorking(false);
            }
          }}
        >
          {working ? t("Thinking…") : t("Suggest outcome")}
        </Button>
        {suggestion && (
          <>
            <div className="outcome-row" role="group" aria-label={t("Outcome")}>
              {OUTCOMES.map((o) => (
                <button
                  key={o}
                  type="button"
                  aria-pressed={suggestion.outcome === o}
                  onClick={() => setSuggestion({ ...suggestion, outcome: o })}
                >
                  {o.replaceAll("-", " ")}
                </button>
              ))}
            </div>
            <Field label={t("Next step")}>
              <Textarea
                dir="auto"
                rows={2}
                value={suggestion.nextStep}
                onChange={(e) => setSuggestion({ ...suggestion, nextStep: e.target.value })}
              />
            </Field>
            <Button
              variant="primary"
              size="sm"
              disabled={!canWrite || busy}
              onClick={() =>
                void action(async () => {
                  await client.workspace(ws, `/prospects/${prospect.id}/call-outcome`, {
                    method: "POST",
                    body: JSON.stringify({ ...suggestion, note }),
                  });
                  setNote("");
                  setSuggestion(null);
                }, t("Call outcome saved to the record and the CRM."))
              }
            >
              {t("Confirm and save")}
            </Button>
          </>
        )}
        {error && <p className="error-text small">{error}</p>}
      </div>
    </Panel>
  );
}
