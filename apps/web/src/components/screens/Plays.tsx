"use client";
import {
  COSTS,
  PLAYS,
  type ToolName,
  type ToolRequest,
} from "@revenue/contracts";
import { IconArrowRight, IconCheck } from "@revenue/ui";
import { Badge, Button, Field, Select } from "../primitives";
import { useWorkspace } from "../workspace-context";
import { usePrefs } from "../../lib/prefs";
import { ListRow } from "../campaigns/parts";
import "../../styles/pages/campaigns.css";

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
    .map((p) => p.snapshot.company);
  const budget = data.budgets.find((b) => !b.userId);
  const pending = data.drafts.filter((d) => d.approvedVersion !== d.version);
  const tierA = data.prospects.filter((p) => p.breakdown.tier === "A").length;
  return (
    <div className="cmp-page">
      <dl className="cmp-metrics">
        <div>
          <dt>{t("Accounts")}</dt>
          <dd>
            {data.prospects.length}{" "}
            <span>
              · {tierA} {t("tier A")}
            </span>
          </dd>
        </div>
        <div>
          <dt>{t("Awaiting review")}</dt>
          <dd>
            {pending.length}{" "}
            <span>
              · {approvedDrafts.length} {t("approved")}
            </span>
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

      <section className="cmp-section" aria-labelledby="cmp-plays-title">
        <h2 id="cmp-plays-title" className="cmp-heading">
          {t("Choose a play")}
        </h2>
        <nav className="cmp-list" aria-label={t("Plays")}>
          {PLAYS.map((p) => (
            <ListRow
              key={p.id}
              prefix={<span className="mono">{p.id}</span>}
              title={t(p.name)}
              sub={t(p.description)}
              trail={
                play === p.id ? (
                  <Badge tone="info" dot={false}>
                    {t("Selected")}
                  </Badge>
                ) : (
                  <span className="cmp-chip">{t("Start")}</span>
                )
              }
              selected={play === p.id}
              pressed={play === p.id}
              onOpen={() => setPlay(p.id)}
            />
          ))}
        </nav>
      </section>

      <section className="cmp-section" aria-labelledby="cmp-run-title">
        <div className="cmp-section-head">
          <div>
            <p className="eyebrow">
              {currentPlay.id} · {t("Run sheet")}
            </p>
            <h2 id="cmp-run-title" className="cmp-heading">
              {t(currentPlay.name)}
            </h2>
          </div>
        </div>
        <div className="cmp-run">
          <ol className="cmp-steps">
            {currentPlay.steps.map((step, index) => {
              const needsSelection =
                !selected.length &&
                step !== "preflight" &&
                step !== "queue_sequence";
              return (
                <li key={step} className="step cmp-step">
                  <span className="cmp-step-index mono">{index + 1}</span>
                  <div className="cmp-step-body">
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
                    <span className="cmp-step-cost mono">
                      {COSTS[step as ToolName]
                        ? `${COSTS[step as ToolName]} cr / ${t("unit")}`
                        : t("free")}
                    </span>
                  </div>
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
          <aside className="cmp-card cmp-run-side">
            {selected.length ? (
              <>
                <h3>
                  {selected.length} {t("selected")}
                </h3>
                <p className="muted small" dir="auto">
                  {selectedNames.slice(0, 3).join(", ")}
                  {selectedNames.length > 3 &&
                    ` ${t("and")} ${selectedNames.length - 3} ${t("more")}`}
                </p>
                <Button size="sm" onClick={() => setTab("Accounts")}>
                  {t("Change selection")}
                </Button>
              </>
            ) : (
              <>
                <h3>{t("No accounts selected")}</h3>
                <p className="muted small">
                  {t("Choose prospects in Accounts to start this play.")}
                </p>
                <Button
                  size="sm"
                  endIcon={<IconArrowRight size={14} className="flip-rtl" />}
                  onClick={() => setTab("Accounts")}
                >
                  {t("Open accounts")}
                </Button>
              </>
            )}
            <Field label={t("Content language")}>
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
            <p className="muted small">
              {t(
                "Each action shows its cost before it runs. Nothing is sent from here.",
              )}
            </p>
          </aside>
        </div>
      </section>

      <details className="disclosure cmp-disclosure">
        <summary>{t("Launch checklist")}</summary>
        <LaunchGate />
      </details>
      <details className="disclosure cmp-disclosure">
        <summary>{t("Scheduled reviews")}</summary>
        <ScheduledPlays key={ws} />
      </details>
    </div>
  );
}
