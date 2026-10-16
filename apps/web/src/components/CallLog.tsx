"use client";
import { useEffect, useRef, useState } from "react";
import { AI_COSTS } from "@revenue/contracts";
import { IconSparkles } from "@revenue/ui";
import { Button, Field, Input, Panel, Textarea } from "./primitives";
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
  referenceDate?: string;
  timeZone?: string;
};

// Call outcome logging by voice (PRD GAP-08): dictate, let the assistant propose, confirm.
export function CallLog({ prospect }: { prospect: Prospect }) {
  const { ws, data, canWrite, busy, action } = useWorkspace();
  const { t, language } = usePrefs();
  const [note, setNote] = useState("");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [syncWarning, setSyncWarning] = useState("");
  const currentNote = useRef("");
  const generation = useRef(0);
  useEffect(() => {
    generation.current++;
    currentNote.current = "";
    setNote("");
    setSuggestion(null);
    setError("");
    setWorking(false);
    setSyncWarning("");
    return () => {
      generation.current++;
    };
  }, [ws, prospect.id]);
  const editNote = (value: string) => {
    generation.current++;
    currentNote.current = value;
    setNote(value);
    setSuggestion(null);
    setWorking(false);
    setSyncWarning("");
  };
  return (
    <Panel eyebrow={t("Calls")} title={t("Log a call outcome")}>
      <div className="call-log">
        <Field
          label={t("Call note")}
          hint={t("Type or dictate in English or Arabic.")}
        >
          <span className="note-field">
            <Textarea
              dir="auto"
              rows={3}
              maxLength={3000}
              readOnly={busy}
              value={note}
              onChange={(e) => editNote(e.target.value)}
              placeholder={t(
                "e.g. Spoke to her, asked to call back Sunday after payroll",
              )}
            />
            <VoiceButton
              ws={ws}
              language={language === "ar" ? "ar" : "auto"}
              disabled={!canWrite || busy}
              onError={setError}
              onText={(text) =>
                editNote(
                  currentNote.current ? `${currentNote.current} ${text}` : text,
                )
              }
            />
          </span>
        </Field>
        <Button
          variant="ai"
          size="sm"
          startIcon={<IconSparkles size={14} />}
          disabled={!canWrite || busy || working || note.trim().length < 3}
          onClick={async () => {
            const request = ++generation.current;
            setWorking(true);
            setSuggestion(null);
            setError("");
            try {
              const result = await client.workspace<Suggestion>(
                ws,
                "/call-outcome/suggest",
                {
                  method: "POST",
                  body: JSON.stringify({ note }),
                },
              );
              if (generation.current === request) setSuggestion(result);
            } catch (e) {
              if (generation.current === request)
                setError((e as Error).message);
            } finally {
              if (generation.current === request) setWorking(false);
            }
          }}
        >
          {working ? t("Thinking…") : t("Suggest outcome")}
        </Button>
        <Button
          size="sm"
          disabled={!canWrite || busy || note.trim().length < 3}
          onClick={() => {
            generation.current++;
            setWorking(false);
            setError("");
            setSuggestion({
              outcome: "connected",
              nextStep: "",
              followUpDays: null,
              summary: note.slice(0, 500),
            });
          }}
        >
          {t("Log manually")}
        </Button>
        <p className="muted small">
          {data.modelFixture
            ? t("Simulated classification")
            : `${AI_COSTS.chat_turn} ${t("AI credit per suggestion")}`}{" "}
          · {t("Nothing is saved until you confirm.")}
        </p>
        {suggestion && (
          <>
            <div className="outcome-row" role="group" aria-label={t("Outcome")}>
              {OUTCOMES.map((o) => (
                <button
                  key={o}
                  type="button"
                  disabled={!canWrite || busy}
                  aria-pressed={suggestion.outcome === o}
                  onClick={() =>
                    setSuggestion({
                      ...suggestion,
                      outcome: o,
                      ...(o === "opt-out" ? { followUpDays: null } : {}),
                    })
                  }
                >
                  {t(o.replaceAll("-", " "))}
                </button>
              ))}
            </div>
            <Field label={t("Next step")}>
              <Textarea
                dir="auto"
                rows={2}
                maxLength={300}
                readOnly={busy}
                value={suggestion.nextStep}
                onChange={(e) =>
                  setSuggestion({ ...suggestion, nextStep: e.target.value })
                }
              />
            </Field>
            {suggestion.referenceDate && (
              <p className="muted small">
                {t("Date reference")}:{" "}
                <bdi>
                  {suggestion.referenceDate} · {suggestion.timeZone}
                </bdi>
              </p>
            )}
            <Field label={t("Call summary")}>
              <Textarea
                aria-label={t("Call summary")}
                dir="auto"
                rows={2}
                maxLength={500}
                readOnly={busy}
                value={suggestion.summary}
                onChange={(e) =>
                  setSuggestion({ ...suggestion, summary: e.target.value })
                }
              />
            </Field>
            <Field
              label={t("Follow-up after (days)")}
              hint={t(
                "Leave blank when timing is unknown. This records the delay; it does not schedule a reminder.",
              )}
            >
              <Input
                aria-label={t("Follow-up after (days)")}
                type="number"
                min={0}
                max={90}
                disabled={busy || suggestion.outcome === "opt-out"}
                value={suggestion.followUpDays ?? ""}
                onChange={(e) =>
                  setSuggestion({
                    ...suggestion,
                    followUpDays:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </Field>
            <Button
              variant="primary"
              size="sm"
              disabled={
                !canWrite ||
                busy ||
                (suggestion.followUpDays !== null &&
                  (!Number.isInteger(suggestion.followUpDays) ||
                    suggestion.followUpDays < 0 ||
                    suggestion.followUpDays > 90))
              }
              onClick={() => {
                const request = ++generation.current;
                setWorking(false);
                void action(async () => {
                  const result = await client.workspace<{
                    crmError: string | null;
                  }>(ws, `/prospects/${prospect.id}/call-outcome`, {
                    method: "POST",
                    body: JSON.stringify({ ...suggestion, note }),
                  });
                  if (generation.current !== request) return;
                  setSyncWarning(
                    result.crmError
                      ? t(
                          "Saved to this workspace. CRM sync needs attention; check the connection.",
                        )
                      : "",
                  );
                  setNote("");
                  currentNote.current = "";
                  setSuggestion(null);
                }, t("Call outcome saved to this workspace."));
              }}
            >
              {t("Confirm and save")}
            </Button>
          </>
        )}
        {error && <p className="error-text small">{error}</p>}
        {syncWarning && (
          <p role="alert" className="small">
            {syncWarning}
          </p>
        )}
      </div>
    </Panel>
  );
}
