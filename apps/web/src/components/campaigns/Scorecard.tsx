"use client";
import { useEffect, useState } from "react";
import { IconTargetArrow } from "@revenue/ui";
import { client } from "../../lib/client";
import { usePrefs } from "../../lib/prefs";
import { useWorkspace } from "../workspace-context";
import {
  Badge,
  Button,
  Check,
  Empty,
  ErrorState,
  Field,
  Input,
  LoadingState,
  Select,
} from "../primitives";

type Group = {
  sequences: number;
  delivered: number;
  replied: number;
  replyRate: number | null;
};
type Scorecard = {
  stages: { stage: string; count: number }[];
  asset: Group;
  holdout: Group;
  minimumSample: number;
  calls: number;
  positive: number;
  replyLabels: { positive: number; neutral: number; negative: number };
  batches: {
    batchId: string;
    createdAt: string;
    sequences: number;
    simulated: number;
    playVersionId: string | null;
    play: string | null;
  }[];
  caravan: {
    batches: number;
    simulatedBatches: number;
    activated: boolean;
    repeatBatch: boolean;
  };
};
type Discovery = {
  segment: string;
  interviews: number;
  averageMaturity: number;
  pains: Record<string, number>;
};
// The dashboard rows carry more than the shared type declares.
type SequenceRow = {
  id: string;
  prospectId: string;
  state: string;
  batchId?: string | null;
};
type Label = "positive" | "neutral" | "negative";

const percent = (value: number, base: number) =>
  base > 0 ? `${Math.round((value / base) * 100)}%` : "0%";

// Results: a batch scorecard that counts distinct prospects per stage (A4). Simulated activity
// stays out unless the person asks for it, and a positive reply is something a person confirms.
export function Scorecard({ initialBatch = "" }: { initialBatch?: string }) {
  const { ws, data, canApprove, busy, action, setTab } = useWorkspace();
  const { t } = usePrefs();
  const [results, setResults] = useState<{
    scorecard: Scorecard;
    discovery: Discovery[];
  } | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [batch, setBatch] = useState(initialBatch);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [includeSimulated, setIncludeSimulated] = useState(false);
  const [labelled, setLabelled] = useState<Record<string, Label>>({});
  // Another workspace starts from a clean view; a filter change keeps the controls mounted.
  useEffect(() => {
    setResults(null);
    setBatch(initialBatch);
    setLabelled({});
  }, [ws, initialBatch]);
  useEffect(() => {
    let active = true;
    setError(false);
    const query = new URLSearchParams();
    if (batch) query.set("batch", batch);
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    if (includeSimulated) query.set("includeSimulated", "true");
    void Promise.all([
      client.workspace<Scorecard>(
        ws,
        `/scorecard${query.size ? `?${query}` : ""}`,
      ),
      client.workspace<Discovery[]>(ws, "/discovery"),
    ])
      .then(([scorecard, discovery]) => {
        if (active) setResults({ scorecard, discovery });
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [ws, data, retry, batch, from, to, includeSimulated]);

  if (error)
    return (
      <ErrorState
        title={t("We couldn’t load the results.")}
        message={t("Could not load results. Try again.")}
        onRetry={() => setRetry((v) => v + 1)}
        retryLabel={t("Retry")}
      />
    );
  if (!results)
    return (
      <LoadingState
        title={t("Loading results…")}
        caption={t("Keep the same layout while content loads.")}
      />
    );

  const { scorecard, discovery } = results;
  const prepared = scorecard.stages[0]?.count ?? 0;
  const replied = scorecard.stages.find((s) => s.stage === "replied")?.count ?? 0;
  const labelCount =
    scorecard.replyLabels.positive +
    scorecard.replyLabels.neutral +
    scorecard.replyLabels.negative;
  const toConfirm = Math.max(replied - labelCount, 0);
  const noRun = prepared === 0 && scorecard.batches.length === 0;
  const simulatedHidden = scorecard.batches.reduce(
    (sum, b) => sum + b.simulated,
    0,
  );
  const enough =
    scorecard.asset.delivered >= scorecard.minimumSample &&
    scorecard.holdout.delivered >= scorecard.minimumSample;
  const rate = (g: Group) =>
    g.replyRate === null ? "—" : `${(g.replyRate * 100).toFixed(1)}%`;

  // Replied contacts a person can label. Labelling again replaces the earlier label.
  const repliable = new Map<string, SequenceRow>();
  for (const s of data.sequences as SequenceRow[]) {
    if (!s.state.endsWith("replied")) continue;
    if (!includeSimulated && s.state.startsWith("simulated")) continue;
    if (batch && s.batchId !== batch) continue;
    if (!repliable.has(s.prospectId)) repliable.set(s.prospectId, s);
  }
  const provenance = (state: string) =>
    state.startsWith("simulated")
      ? "Simulated"
      : state.startsWith("imported")
        ? "Imported"
        : "Live";
  const label = (row: SequenceRow, value: Label) =>
    void action(
      () =>
        client.workspace(ws, `/prospects/${row.prospectId}/reply-label`, {
          method: "POST",
          body: JSON.stringify({ label: value, sequenceId: row.id }),
        }),
      t("Reply label saved. The scorecard counts only labels a person confirmed."),
    ).then(() => setLabelled((l) => ({ ...l, [row.prospectId]: value })));

  return (
    <div className="cmp-page">
      <div className="cmp-filters">
        <Field label={t("Batch")}>
          <Select value={batch} onChange={(e) => setBatch(e.target.value)}>
            <option value="">{t("All batches")}</option>
            {scorecard.batches.map((b) => (
              <option key={b.batchId} value={b.batchId}>
                {`${b.createdAt.slice(0, 10)} · ${b.play ?? b.batchId.slice(0, 8)} · ${b.sequences}`}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("From")}>
          <Input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
          />
        </Field>
        <Field label={t("To")}>
          <Input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
          />
        </Field>
        <Check
          label={t("Include simulated")}
          checked={includeSimulated}
          onChange={(e) => setIncludeSimulated(e.target.checked)}
        />
      </div>

      <div className="cmp-score">
        <div className="cmp-score-main">
          <section className="cmp-card" aria-labelledby="cmp-funnel-title">
            <div className="cmp-card-head">
              <div>
                <h2 id="cmp-funnel-title">{t("Funnel and discovery")}</h2>
                <p className="muted small">
                  {t("Each stage counts distinct prospects from the event log.")}
                </p>
              </div>
              {(data.fixture || includeSimulated) && (
                <Badge tone="info">{t("Simulated")}</Badge>
              )}
            </div>
            {noRun ? (
              <div className="cmp-empty-flow">
                <h3>{t("Results will appear after a campaign runs.")}</h3>
                <p className="muted">
                  {t(
                    "This workspace has no completed campaign yet. Start with reviewed messages and a ready sender.",
                  )}
                </p>
                <p className="cmp-flow">
                  {t("Prepared → Reviewed → Sent → Replied → Meeting")}
                </p>
                <Button variant="primary" onClick={() => setTab("Plays")}>
                  {t("Continue campaign preparation")}
                </Button>
              </div>
            ) : (
              <ul className="cmp-stages">
                {scorecard.stages.flatMap(({ stage, count }) => [
                  <li key={stage}>
                    <span className="cmp-stage-name">{t(stage)}</span>
                    <span className="cmp-bar" aria-hidden>
                      <span
                        style={{
                          inlineSize: percent(count, prepared),
                        }}
                      />
                    </span>
                    <span className="mono cmp-stage-count">{count}</span>
                    <span className="cmp-stage-note muted">
                      {percent(count, prepared)}
                    </span>
                  </li>,
                  ...(stage === "replied"
                    ? [
                        <li key="positive">
                          <span className="cmp-stage-name">
                            {t("Positive reply (confirmed)")}
                          </span>
                          <span className="cmp-bar" aria-hidden>
                            <span
                              style={{
                                inlineSize: percent(scorecard.positive, prepared),
                              }}
                            />
                          </span>
                          <span className="mono cmp-stage-count">
                            {scorecard.positive}
                          </span>
                          <span className="cmp-stage-note muted">
                            {percent(scorecard.positive, prepared)}
                            {toConfirm > 0 &&
                              ` · ${toConfirm} ${t("to confirm")}`}
                          </span>
                        </li>,
                      ]
                    : []),
                ])}
              </ul>
            )}
            {!noRun && (
              <p className="muted small">
                {t(
                  "Counts describe recorded events. No lift claim before 100 delivered contacts per group.",
                )}
              </p>
            )}
          </section>

          {repliable.size > 0 && (
            <section className="cmp-card" aria-labelledby="cmp-confirm-title">
              <div className="cmp-card-head">
                <h2 id="cmp-confirm-title">
                  {t("Confirm positive replies")} · {toConfirm}
                </h2>
              </div>
              <p className="muted small">
                {t("A reply counts as positive only after a person confirms it.")}
              </p>
              <ul className="cmp-confirm">
                {[...repliable.values()].map((row) => {
                  const prospect = data.prospects.find(
                    (p) => p.id === row.prospectId,
                  );
                  const chosen = labelled[row.prospectId];
                  return (
                    <li key={row.prospectId}>
                      <div className="cmp-confirm-who">
                        <strong dir="auto">
                          {prospect?.snapshot.company ?? row.prospectId.slice(0, 8)}
                        </strong>
                        <span className="muted small" dir="auto">
                          {prospect
                            ? `${prospect.snapshot.firstName} ${prospect.snapshot.lastName}`
                            : ""}{" "}
                          · {t(provenance(row.state))}
                        </span>
                      </div>
                      <div className="cmp-confirm-actions" role="group" aria-label={t("Reply label")}>
                        {(
                          [
                            ["positive", "Positive"],
                            ["neutral", "Neutral"],
                            ["negative", "Not positive"],
                          ] as const
                        ).map(([value, text]) => (
                          <Button
                            key={value}
                            size="sm"
                            variant={chosen === value ? "primary" : "secondary"}
                            aria-pressed={chosen === value}
                            disabled={!canApprove || busy}
                            onClick={() => label(row, value)}
                          >
                            {t(text)}
                          </Button>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {!canApprove && (
                <p className="muted small">
                  {t("Only reviewers and owners can confirm a reply.")}
                </p>
              )}
            </section>
          )}

          {!noRun && (
            <section className="cmp-card" aria-label={t("With asset")}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t("Group")}</th>
                      <th>{t("delivered")}</th>
                      <th>{t("replied")}</th>
                      <th>{t("Reply rate")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(["asset", "holdout"] as const).map((key) => {
                      const group = scorecard[key];
                      return (
                        <tr key={key}>
                          <td>{t(key === "asset" ? "With asset" : "Holdout")}</td>
                          <td className="mono">{group.delivered}</td>
                          <td className="mono">{group.replied}</td>
                          <td className="mono">
                            <bdi>{rate(group)}</bdi>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="cmp-card" aria-labelledby="cmp-discovery-title">
            <div className="cmp-card-head">
              <h2 id="cmp-discovery-title">{t("Discovery by segment")}</h2>
            </div>
            {!discovery.length ? (
              <Empty
                title={t("No discovery interviews yet")}
                icon={<IconTargetArrow size={18} />}
              >
                {t(
                  "Open an account to capture an interview and compare segment pain scores.",
                )}
              </Empty>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t("Segment")}</th>
                      <th>{t("Interviews")}</th>
                      <th>{t("Maturity")}</th>
                      <th>{t("Pain scores")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {discovery.map((row) => (
                      <tr key={row.segment}>
                        <td>
                          <bdi>{row.segment}</bdi>
                        </td>
                        <td>{row.interviews}</td>
                        <td>{row.averageMaturity} / 4</td>
                        <td>
                          {Object.entries(row.pains)
                            .map(([pain, score]) => `${t(pain)}: ${score}`)
                            .join(" · ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="cmp-card cmp-measures" aria-labelledby="cmp-measures-title">
          <h2 id="cmp-measures-title">{t("Caravan measures")}</h2>
          <dl>
            <div>
              <dt>
                {t("Activation")}
                <Badge tone={scorecard.caravan.activated ? "ok" : "warn"} dot={false}>
                  {t(scorecard.caravan.activated ? "Reached" : "Open")}
                </Badge>
              </dt>
              <dd>
                <strong>
                  {t(
                    scorecard.caravan.activated
                      ? "A first batch has run"
                      : "No batch has run yet",
                  )}
                </strong>
                <span className="muted small">
                  {t("A batch counts once it holds a non-simulated sequence.")}
                </span>
              </dd>
            </div>
            <div>
              <dt>
                {t("Repeat batch")}
                <Badge tone={scorecard.caravan.repeatBatch ? "ok" : "warn"} dot={false}>
                  {t(scorecard.caravan.repeatBatch ? "Reached" : "Open")}
                </Badge>
              </dt>
              <dd>
                <strong>
                  {scorecard.caravan.batches} {t("batches with live or imported activity")}
                </strong>
              </dd>
            </div>
            <div>
              <dt>
                {t("Holdout · asset vs no asset")}
                <Badge tone={enough ? "ok" : "neutral"} dot={false}>
                  {t(enough ? "Enough sample" : "Running")}
                </Badge>
              </dt>
              <dd>
                <strong className="mono">
                  <bdi>
                    {scorecard.asset.delivered} {t("vs")} {scorecard.holdout.delivered}
                  </bdi>{" "}
                  <span className="cmp-unit">{t("delivered")}</span>
                </strong>
                <span className="muted small">
                  {enough
                    ? `${t("Reply rate")}: ${rate(scorecard.asset)} ${t("vs")} ${rate(scorecard.holdout)}`
                    : t("Below the minimum sample. No lift is shown.")}
                </span>
              </dd>
            </div>
            <div>
              <dt>{t("Event sources")}</dt>
              <dd>
                <span className="muted small">
                  {simulatedHidden} {t("simulated sequences")} ·{" "}
                  {includeSimulated ? t("shown") : t("hidden by default")}
                </span>
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
