"use client";
import { useCallback, useEffect, useState } from "react";
import {
  IconAlertTriangle,
  IconDownload,
  IconShieldCheck,
  IconUpload,
} from "@revenue/ui";
import { client } from "../lib/client";
import { usePrefs } from "../lib/prefs";
import { useWorkspace } from "./workspace-context";
import {
  Badge,
  Button,
  Check,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Skeleton,
  toneFor,
} from "./primitives";
import "../styles/pages/campaigns.css";

type ExportSummary = {
  id: string;
  digest: string;
  createdAt: string;
  count: number;
  outcomes: Record<string, number>;
};
type Excluded = { draftId: string; reasons: string[] };
type RowResult = {
  row: number;
  status: "imported" | "duplicate" | "unmatched" | "invalid";
  message: string;
};
type ImportResult = {
  total: number;
  imported: number;
  duplicates: number;
  rejected: number;
  rows: RowResult[];
};
type PreviewRow = {
  email: string;
  company: string;
  subject: string;
  digest: string;
};

// Minimal RFC 4180 reader for the exported file (quoted cells, doubled quotes, CRLF).
function readCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^﻿/, "");
  for (let i = 0; i < source.length; i++) {
    const char = source[i]!;
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

// One row per contact: the file has one row per email touch, so keep the first of each sequence.
function previewOf(text: string): PreviewRow[] {
  const [header, ...body] = readCsv(text);
  if (!header) return [];
  const col = (name: string) => header.indexOf(name);
  const seen = new Set<string>();
  const out: PreviewRow[] = [];
  for (const row of body) {
    const key = row[col("sequence_id")] ?? "";
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      email: row[col("email")] ?? "",
      company: row[col("company")] ?? "",
      subject: row[col("subject")] ?? "",
      digest: row[col("approval_digest")] ?? "",
    });
  }
  return out;
}

const attentionOf = (result: ImportResult) =>
  result.rows.filter((r) => r.status === "unmatched" || r.status === "invalid")
    .length;

// EXP-01: export approved drafts for the customer's own sender and bring the outcomes back.
export function ExportBatches({
  onOpenScorecard,
}: {
  onOpenScorecard?: (batchId: string) => void;
}) {
  const { ws, data, canWrite, busy, action, setTab } = useWorkspace();
  const { t } = usePrefs();
  const [exports, setExports] = useState<ExportSummary[] | null>(null);
  const [error, setError] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [holdout, setHoldout] = useState("0");
  const [excluded, setExcluded] = useState<Excluded[]>([]);
  const [latest, setLatest] = useState<{
    id: string;
    count: number;
    preview: PreviewRow[] | null;
  } | null>(null);
  const [results, setResults] = useState<
    Record<string, ImportResult & { file: string }>
  >({});
  const [revision, setRevision] = useState(0);
  const canDownload = ["owner", "operator", "reviewer"].includes(data.role);
  const approved = data.drafts.filter((d) => d.approvedVersion === d.version);
  const waiting = data.drafts.length - approved.length;
  const company = (prospectId: string) =>
    data.prospects.find((p) => p.id === prospectId)?.snapshot.company ?? "";
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    void client
      .workspace<ExportSummary[]>(ws, "/exports", { signal: controller.signal })
      .then((list) => {
        if (!controller.signal.aborted) setExports(list);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [ws, revision]);
  const reload = useCallback(() => setRevision((n) => n + 1), []);
  const fileUrl = (id: string) => `/api/workspaces/${ws}/exports/${id}/file.csv`;

  const createExport = () =>
    void action(async () => {
      const result = await client.workspace<{
        export: { id: string; count: number } | null;
        excluded: Excluded[];
      }>(ws, "/exports", {
        method: "POST",
        body: JSON.stringify({
          draftIds: picked,
          holdoutPercent: Math.min(100, Math.max(0, Math.round(Number(holdout) || 0))),
        }),
      });
      setExcluded(result.excluded);
      if (!result.export) {
        setLatest(null);
        throw new Error(
          t("No draft passed the export checks. See the reasons below."),
        );
      }
      const created = result.export;
      setPicked([]);
      setLatest({ id: created.id, count: created.count, preview: null });
      reload();
      if (canDownload)
        void fetch(fileUrl(created.id))
          .then((res) => (res.ok ? res.text() : Promise.reject()))
          .then((text) =>
            setLatest((l) =>
              l?.id === created.id ? { ...l, preview: previewOf(text) } : l,
            ),
          )
          .catch(() => undefined);
    }, t("Batch exported. Download the CSV below."));

  const importOutcomes = (batch: ExportSummary, file: File) =>
    action(async () => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/workspaces/${ws}/exports/${batch.id}/outcomes`, {
        method: "POST",
        body: form,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      setResults((r) => ({ ...r, [batch.id]: { ...result, file: file.name } }));
      reload();
    }, t("Outcomes imported. Review the row results below."));

  const rowReport = (batchId: string, result: ImportResult) => {
    const cell = (v: string | number) =>
      /[",\r\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
    const lines = [
      "row,status,message",
      ...result.rows.map((r) => [r.row, r.status, r.message].map(cell).join(",")),
    ];
    const url = URL.createObjectURL(
      new Blob([`﻿${lines.join("\r\n")}\r\n`], { type: "text/csv" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `outcome-rows-${batchId.slice(0, 8)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const noticeRow = (
    <div className="cmp-notice warn">
      <IconAlertTriangle size={18} aria-hidden />
      <div>
        <strong>
          {t("Caravan does not send. Upload this file to your sender.")}
        </strong>
        <p>
          {t(
            "Sending, unsubscribes and bounces happen in your sender. Bring results back with the outcomes upload so they attach to the batch.",
          )}
        </p>
      </div>
    </div>
  );

  return (
    <div className="cmp-page">
      <section className="cmp-card" aria-labelledby="cmp-export-title">
        <div className="cmp-card-head">
          <div>
            <p className="eyebrow">
              {t("For your own sender · nothing is sent from here")}
            </p>
            <h2 id="cmp-export-title">{t("Approved-batch export")}</h2>
          </div>
        </div>
        <p className="muted small">
          {t(
            "Only approved drafts for contacts with a recorded basis are exported, each with its approval digest. Upload the sender's outcomes to see them under the batch.",
          )}
        </p>

        {!approved.length ? (
          <div className="cmp-blocked">
            <span className="cmp-blocked-icon" aria-hidden>
              <IconShieldCheck size={20} />
            </span>
            <h3>{t("Nothing to export yet")}</h3>
            <p className="muted">
              {approved.length} {t("approved")} · {waiting}{" "}
              {t("ready and waiting for review")}
            </p>
            <div className="button-row">
              <Button disabled>{t("Download CSV")}</Button>
              <Button variant="primary" onClick={() => setTab("Review queue")}>
                {t("Open review queue")}
              </Button>
            </div>
            <p className="cmp-note small">
              {t(
                "Export unlocks when at least one draft is approved for sending. Caravan does not send; the file goes to your own sender.",
              )}
            </p>
          </div>
        ) : (
          canWrite && (
            <div className="cmp-export-form">
              <div className="cmp-export-head">
                <Check
                  label={t("Select all approved drafts")}
                  checked={picked.length === approved.length}
                  onChange={(e) =>
                    setPicked(e.target.checked ? approved.map((d) => d.id) : [])
                  }
                />
                <span className="muted small">
                  {picked.length} / {approved.length} {t("selected")}
                </span>
              </div>
              <ul className="cmp-picklist" aria-label={t("Approved drafts")}>
                {approved.map((d) => (
                  <li key={d.id}>
                    <Check
                      label={<span dir="auto">{company(d.prospectId)}</span>}
                      checked={picked.includes(d.id)}
                      onChange={(e) =>
                        setPicked((p) =>
                          e.target.checked
                            ? [...p, d.id]
                            : p.filter((id) => id !== d.id),
                        )
                      }
                    />
                  </li>
                ))}
              </ul>
              <div className="cmp-export-actions">
                <Field
                  label={t("Holdout group (%)")}
                  hint={t("Contacts in the holdout get the sequence without the asset.")}
                  className="cmp-holdout"
                >
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    value={holdout}
                    onChange={(e) => setHoldout(e.target.value)}
                  />
                </Field>
                <Button
                  variant="primary"
                  disabled={busy || !picked.length}
                  onClick={createExport}
                >
                  {t("Export approved batch")}
                </Button>
              </div>
            </div>
          )
        )}
      </section>

      {(latest || excluded.length > 0) && (
        <section className="cmp-card" aria-labelledby="cmp-export-result">
          {latest && (
            <>
              <div className="cmp-card-head">
                <h2 id="cmp-export-result">
                  {latest.count} {t("approved, basis-cleared")}
                </h2>
                {canDownload && (
                  <a
                    className="btn btn-primary btn-md"
                    href={fileUrl(latest.id)}
                    download
                  >
                    <span className="btn-icon">
                      <IconDownload size={14} />
                    </span>
                    {t("Download CSV")}
                  </a>
                )}
              </div>
              <div className="cmp-chips">
                <Badge tone="ok" dot={false}>
                  {latest.count} {t("approved drafts")}
                </Badge>
                {excluded.length > 0 && (
                  <Badge tone="warn" dot={false}>
                    {excluded.length} {t("held · excluded")}
                  </Badge>
                )}
                {waiting > 0 && (
                  <span className="muted small">
                    {waiting} {t("awaiting review · not included")}
                  </span>
                )}
              </div>
              {latest.preview && latest.preview.length > 0 && (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{t("Email")}</th>
                        <th>{t("Company")}</th>
                        <th>{t("Subject")}</th>
                        <th>approval_digest</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latest.preview.slice(0, 4).map((row, i) => (
                        <tr key={i}>
                          <td>
                            <bdi>{row.email}</bdi>
                          </td>
                          <td dir="auto">{row.company}</td>
                          <td dir="auto">{row.subject}</td>
                          <td className="mono">
                            <bdi>{row.digest.slice(0, 8)}…</bdi>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="muted small">
                {t(
                  "Every row carries its approval digest. On re-import, rows whose digest does not match are not attached.",
                )}
              </p>
              {noticeRow}
            </>
          )}
          {excluded.length > 0 && (
            <div className="cmp-excluded">
              <h3>{t("Excluded automatically")}</h3>
              <ul className="stack small">
                {excluded.map((x) => (
                  <li key={x.draftId}>
                    <Badge tone="warn">
                      <span dir="auto">
                        {company(
                          data.drafts.find((d) => d.id === x.draftId)
                            ?.prospectId ?? "",
                        ) || x.draftId.slice(0, 8)}
                      </span>
                    </Badge>{" "}
                    {x.reasons.map((r) => t(r)).join("; ")}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="cmp-card" aria-labelledby="cmp-batches-title">
        <div className="cmp-card-head">
          <h2 id="cmp-batches-title">{t("Exported batches")}</h2>
        </div>
        {error ? (
          <ErrorState
            title={t("We couldn’t load the exports.")}
            message={t("Could not load exports. Try again.")}
            onRetry={reload}
            retryLabel={t("Retry")}
          />
        ) : !exports ? (
          <Skeleton rows={2} />
        ) : !exports.length ? (
          <EmptyState
            icon={<IconUpload size={18} />}
            title={t("No exports yet.")}
            text={t("An exported batch appears here with its outcomes.")}
          />
        ) : (
          <ul className="cmp-batches">
            {exports.map((e) => {
              const result = results[e.id];
              return (
                <li key={e.id} className="cmp-batch">
                  <div className="cmp-batch-head">
                    <strong className="mono">{e.id.slice(0, 8)}</strong>
                    <span className="muted small">
                      {new Date(e.createdAt).toLocaleString()} · {e.count}{" "}
                      {t("drafts")}
                    </span>
                    {Object.entries(e.outcomes).map(([kind, n]) => (
                      <Badge key={kind} tone={toneFor(kind)}>
                        {kind} · {n}
                      </Badge>
                    ))}
                    <span className="cmp-spacer" />
                    {onOpenScorecard && (
                      <Button size="sm" onClick={() => onOpenScorecard(e.id)}>
                        {t("Open batch scorecard")}
                      </Button>
                    )}
                    {canDownload && (
                      <a
                        className="btn btn-secondary btn-sm"
                        href={fileUrl(e.id)}
                        download
                      >
                        {t("Download CSV")}
                      </a>
                    )}
                  </div>
                  {canWrite && (
                    <div className="import-row">
                      <input
                        className="file-input"
                        aria-label={t("Outcomes CSV")}
                        type="file"
                        accept=".csv"
                        onChange={async (event) => {
                          const input = event.target;
                          const file = input.files?.[0];
                          if (!file) return;
                          await importOutcomes(e, file);
                          input.value = "";
                        }}
                      />
                      <span className="muted small">
                        {t("Columns: sequence_id or email, outcome, occurred_at")}
                      </span>
                    </div>
                  )}
                  {result && (
                    <div className="cmp-import">
                      <h3>
                        {attentionOf(result) > 0
                          ? `${t("Import results")} · ${attentionOf(result)} ${t("rows need attention")}`
                          : t("Import results")}
                      </h3>
                      <p className="muted small">
                        <bdi>{result.file}</bdi> · {result.total} {t("rows")} ·{" "}
                        {result.imported} {t("imported")} · {result.duplicates}{" "}
                        {t("already imported")} · {result.rejected}{" "}
                        {t("rejected")}
                      </p>
                      <div className="table-wrap cmp-rows">
                        <table>
                          <thead>
                            <tr>
                              <th>{t("Row")}</th>
                              <th>{t("Outcome")}</th>
                              <th>{t("Status")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.rows.map((r) => (
                              <tr key={r.row}>
                                <td className="mono">{r.row}</td>
                                <td dir="auto">{t(r.message)}</td>
                                <td>
                                  <Badge
                                    tone={
                                      r.status === "imported"
                                        ? "ok"
                                        : r.status === "duplicate"
                                          ? "neutral"
                                          : "warn"
                                    }
                                    dot={false}
                                  >
                                    {t(
                                      r.status === "unmatched"
                                        ? "Not attached"
                                        : r.status === "invalid"
                                          ? "Needs a fix"
                                          : r.status === "duplicate"
                                            ? "Already imported"
                                            : "Imported",
                                    )}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {attentionOf(result) > 0 && (
                        <div className="cmp-notice warn">
                          <IconAlertTriangle size={18} aria-hidden />
                          <p>
                            {t(
                              "Rows are matched by approval digest or email. A row that does not match the export is never attached.",
                            )}
                          </p>
                        </div>
                      )}
                      <div className="button-row">
                        <Button size="sm" onClick={() => rowReport(e.id, result)}>
                          {t("Download row report")}
                        </Button>
                        {onOpenScorecard && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => onOpenScorecard(e.id)}
                          >
                            {t("Open batch scorecard")}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
