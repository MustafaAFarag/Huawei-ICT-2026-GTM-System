"use client";
import { Badge, Button, Panel, toneFor } from "./primitives";
import { useWorkspace } from "./workspace-context";
import { usePrefs } from "../lib/prefs";

export function RunLog({
  activeRun,
  events,
}: {
  activeRun: string | null;
  events: { id: number; message: string; kind: string }[];
}) {
  const { data, setActiveRun } = useWorkspace();
  const { t } = usePrefs();
  if (!data.runs.length) return null;
  return (
    <Panel className="run-log" eyebrow={t("Durable jobs")} title={t("Recent runs")}>
      <ul className="run-list">
        {data.runs.slice(0, 8).map((r) => (
          <li className={`run-row ${activeRun === r.id ? "active" : ""}`} key={r.id}>
            <span className={`run-dot tone-${toneFor(r.state)}`} aria-hidden />
            <div className="run-main">
              <strong className="step-name">{r.tool.replaceAll("_", " ")}</strong>
              <p className={r.error ? "error-text" : "muted"}>
                {r.error || (
                  <span className="mono">
                    {r.actualCost} / {r.estimate} {t("credits reconciled")}
                  </span>
                )}
              </p>
              {r.nextAction && <p className="muted small">{r.nextAction}</p>}
            </div>
            <Badge tone={toneFor(r.state)}>{r.state}</Badge>
            <Button size="sm" variant="ghost" onClick={() => setActiveRun(r.id)}>
              {t("Progress")}
            </Button>
          </li>
        ))}
      </ul>
      {activeRun && (
        <div className="progress-log mono" aria-live="polite">
          {events.length ? (
            events.map((e) => (
              <p key={e.id}>
                <span className={`tone-${toneFor(e.kind)}`}>›</span> {e.message}
              </p>
            ))
          ) : (
            <p className="shimmer">{t("Waiting for progress…")}</p>
          )}
        </div>
      )}
    </Panel>
  );
}
