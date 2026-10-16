"use client";
import {
  COSTS,
  PLAYS,
  type ToolName,
  type ToolRequest,
} from "@revenue/contracts";
import { IconArrowRight, IconCheck } from "@revenue/ui";
import { Badge, Button, Field, Panel, Select } from "../primitives";
import { useWorkspace } from "../workspace-context";
import { usePrefs } from "../../lib/prefs";

import { LaunchGate } from "../GtmPanels";
import { ScheduledPlays } from "../ScheduledPlays";

const STEP_HELP: Record<string, string> = {
  find_signals: "Look for a dated hiring, funding or growth signal.",
  score_accounts: "Score fit out of 100 and assign tier A, B or C.",
  enrich_contacts: "Find verified contact details, cheapest provider first.",
  draft_messages: "Write three cited touches for human review.",
  make_asset: "Make a branded one-pager or mini-audit from reviewed sources.",
  queue_sequence: "Prepare the approved sequence with a holdout group.",
  preflight: "Check mailbox, domain records and sending caps.",
  mini_audit: "Review the public website and list cited findings.",
};

export function Plays() {
  const {
    ws,
    data,
    play,
    setPlay,
    language,
    setLanguage,
    selected,
    busy,
    canWrite,
    propose,
    setTab,
  } = useWorkspace();
  const { t } = usePrefs();
  const currentPlay = PLAYS.find((p) => p.id === play)!;
  const approvedDrafts = data.drafts.filter(
    (d) => d.approvedVersion === d.version,
  );
  const selectedNames = data.prospects
    .filter((p) => selected.includes(p.id))
    .map((p) => p.snapshot.company)
    .join(", ");
  const budget = data.budgets.find((b) => !b.userId);
  const pending = data.drafts.filter((d) => d.approvedVersion !== d.version);
  const tierA = data.prospects.filter((p) => p.breakdown.tier === "A").length;
  return (
    <>
      <dl className="metric-strip">
        <div>
          <dt>{t("Accounts")}</dt>
          <dd>
            {data.prospects.length} <span>· {tierA} {t("tier A")}</span>
          </dd>
        </div>
        <div>
          <dt>{t("Awaiting review")}</dt>
          <dd>
            {pending.length} <span>· {approvedDrafts.length} {t("approved")}</span>
          </dd>
        </div>
        <div>
          <dt>{t("Deliverables")}</dt>
          <dd>
            {data.assets.length}{" "}
            <span>
              · {data.assets.filter((a) => a.approvedAt).length} {t("approved")}
            </span>
          </dd>
        </div>
        <div>
          <dt>{t("AI credits")}</dt>
          <dd>
            <bdi dir="ltr">
              {budget ? budget.used + budget.reserved : 0}
              <span> / {budget?.cap ?? 0}</span>
            </bdi>
          </dd>
        </div>
      </dl>
      <div className="plays-layout">
        <nav className="play-list" aria-label={t("Plays")}>
          {PLAYS.map((p) => (
            <button
              key={p.id}
              className={play === p.id ? "active" : ""}
              aria-pressed={play === p.id}
              onClick={() => setPlay(p.id)}
            >
              <span className="mono play-id">{p.id}</span>
              <span className="play-text">
                <strong>{t(p.name)}</strong>
                <span className="muted">{t(p.description)}</span>
              </span>
              <span className="mono muted play-steps">
                {p.steps.length}
              </span>
            </button>
          ))}
        </nav>
        <div className="play-run">
      <Panel
        eyebrow={`${currentPlay.id} · ${t("Run sheet")}`}
        title={t(currentPlay.name)}
        actions={
          <Field label={t("Content language")} className="field-inline">
            <Select
              aria-label={t("Content language")}
              value={language}
              onChange={(e) =>
                setLanguage(e.target.value as ToolRequest["language"])
              }
            >
              <option value="en">English</option>
              <option value="ar-EG">Egyptian Arabic</option>
              <option value="ar">Business Arabic</option>
              <option value="ar-Gulf">Gulf Arabic · beta</option>
            </Select>
          </Field>
        }
      >
        <div className="selection-bar">
          {selected.length ? (
            <>
              <Badge tone="info">
                {selected.length} {t("selected")}
              </Badge>
              <span className="truncate" dir="auto">
                {selectedNames}
              </span>
            </>
          ) : (
            <>
              <span className="muted">
                {t("Choose prospects in Accounts to start this play.")}
              </span>
              <Button
                variant="ghost"
                size="sm"
                endIcon={<IconArrowRight size={14} className="flip" />}
                onClick={() => setTab("Accounts")}
              >
                {t("Open accounts")}
              </Button>
            </>
          )}
        </div>
        <ol className="step-list">
          {currentPlay.steps.map((step, index) => {
            const needsSelection =
              !selected.length &&
              step !== "preflight" &&
              step !== "queue_sequence";
            return (
              <li key={step} className="step">
                <span className="step-index mono">{index + 1}</span>
                <div className="step-body">
                  <strong className="step-name">
                    {step.replaceAll("_", " ")}
                  </strong>
                  <p>
                    {step === "queue_sequence"
                      ? `${approvedDrafts.length} ${t("approved drafts · asset assignment includes a 20% holdout")}`
                      : t(
                          STEP_HELP[step] ??
                            "Review the result before the next step.",
                        )}
                  </p>
                </div>
                <span className="step-cost mono">
                  {COSTS[step as ToolName]
                    ? `${COSTS[step as ToolName]} cr / ${t("unit")}`
                    : t("free")}
                </span>
                <Button
                  disabled={busy || !canWrite || needsSelection}
                  startIcon={<IconCheck size={14} />}
                  onClick={() =>
                    void propose(
                      step as ToolName,
                      step === "queue_sequence"
                        ? approvedDrafts.map((d) => d.id)
                        : [],
                    )
                  }
                >
                  {t("Review action")}
                </Button>
              </li>
            );
          })}
        </ol>
      </Panel>
        </div>
      </div>
      <details className="disclosure">
        <summary>{t("Launch checklist")}</summary>
        <LaunchGate />
      </details>
      <details className="disclosure">
        <summary>{t("Scheduled reviews")}</summary>
        <ScheduledPlays key={ws} />
      </details>
    </>
  );
}
