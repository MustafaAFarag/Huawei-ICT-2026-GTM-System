"use client";
import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Check,
  Empty,
  Field,
  Input,
  Panel,
  Select,
  Skeleton,
} from "./primitives";
import { useWorkspace } from "./workspace-context";
import { usePrefs } from "../lib/prefs";
import { client } from "../lib/client";

type Gate = {
  ready: boolean;
  items: { id: string; label: string; ok: boolean; detail?: string }[];
};

export function LaunchGate() {
  const { ws, data } = useWorkspace();
  const { t } = usePrefs();
  const [gate, setGate] = useState<Gate | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setGate(null);
    setError(false);
    void client
      .workspace<Gate>(ws, "/launch-gate", {
        method: "POST",
        body: JSON.stringify({
          draftIds: data.drafts
            .filter((d) => d.approvedVersion === d.version)
            .map((d) => d.id),
        }),
      })
      .then((result) => {
        if (active) setGate(result);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [ws, data, retry]);
  return (
    <Panel
      title={t("Launch checklist")}
      actions={
        gate && (
          <Badge tone={gate.ready ? "ok" : "warn"}>
            {t(gate.ready ? "Ready" : "Needs attention")}
          </Badge>
        )
      }
    >
      <p className="muted small">
        {t(
          "Checks all approved drafts. The server checks again before preparing sequences.",
        )}
      </p>
      {error ? (
        <div role="alert">
          <p>{t("Could not load the checklist. Try again.")}</p>
          <Button onClick={() => setRetry((v) => v + 1)}>{t("Retry")}</Button>
        </div>
      ) : !gate ? (
        <Skeleton rows={3} />
      ) : (
        <ul className="check-list">
          {gate.items.map((item) => (
            <li key={item.id}>
              <Badge tone={item.ok ? "ok" : "warn"}>
                {t(item.ok ? "Passed" : "Blocked")}
              </Badge>
              <div>
                <span dir="auto">{t(item.label)}</span>
                {item.detail && (
                  <p className="muted small" dir="auto">
                    {item.detail}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

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
  batches: {
    batchId: string;
    createdAt: string;
    sequences: number;
    play: string | null;
  }[];
};
type Discovery = {
  segment: string;
  interviews: number;
  averageMaturity: number;
  pains: Record<string, number>;
};

export function ResultsPanel() {
  const { ws, data } = useWorkspace();
  const { t } = usePrefs();
  const [results, setResults] = useState<{
    scorecard: Scorecard;
    discovery: Discovery[];
  } | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  // A4: simulated activity stays out of the funnel unless the person asks for it.
  const [batch, setBatch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [includeSimulated, setIncludeSimulated] = useState(false);
  // Another workspace starts from a clean view; a filter change keeps the controls mounted.
  useEffect(() => {
    setResults(null);
    setBatch("");
  }, [ws]);
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
  return (
    <Panel
      title={t("Funnel and discovery")}
      actions={data.fixture && <Badge tone="info">{t("Simulated")}</Badge>}
    >
      {error ? (
        <div role="alert">
          <p>{t("Could not load results. Try again.")}</p>
          <Button onClick={() => setRetry((v) => v + 1)}>{t("Retry")}</Button>
        </div>
      ) : !results ? (
        <Skeleton rows={4} />
      ) : (
        <div className="stack">
          <div className="toolbar">
            <Field label={t("Batch")}>
              <Select value={batch} onChange={(e) => setBatch(e.target.value)}>
                <option value="">{t("All batches")}</option>
                {results.scorecard.batches.map((b) => (
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
          <dl className="funnel-stages">
            {results.scorecard.stages.flatMap(({ stage, count }) => [
              <div key={stage}>
                <dt>{t(stage)}</dt>
                <dd className="mono">{count}</dd>
              </div>,
              ...(stage === "replied"
                ? [
                    <div key="positive">
                      <dt>{t("Positive reply (confirmed)")}</dt>
                      <dd className="mono">{results.scorecard.positive}</dd>
                    </div>,
                  ]
                : []),
            ])}
          </dl>
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
                  const group = results.scorecard[key];
                  return (
                    <tr key={key}>
                      <td>{t(key === "asset" ? "With asset" : "Holdout")}</td>
                      <td className="mono">{group.delivered}</td>
                      <td className="mono">{group.replied}</td>
                      <td className="mono">
                        <bdi>
                          {group.replyRate === null
                            ? "—"
                            : `${(group.replyRate * 100).toFixed(1)}%`}
                        </bdi>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="muted small">
            {t(
              "Counts describe recorded events. No lift claim before 100 delivered contacts per group.",
            )}
          </p>
          {!results.discovery.length ? (
            <Empty title={t("No discovery interviews yet")}>
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
                  {results.discovery.map((row) => (
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
        </div>
      )}
    </Panel>
  );
}
