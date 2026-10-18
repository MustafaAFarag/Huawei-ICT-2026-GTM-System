"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { client } from "../lib/client";
import { usePrefs } from "../lib/prefs";
import { useWorkspace } from "./workspace-context";
import { Badge, Button, Panel, toneFor } from "./primitives";

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

// EXP-01: export approved drafts for the customer's own sender and bring the outcomes back.
export function ExportBatches({ focusKey = 0 }: { focusKey?: number }) {
  const { ws, data, canWrite, busy, action } = useWorkspace();
  const { t } = usePrefs();
  const [exports, setExports] = useState<ExportSummary[] | null>(null);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<Excluded[]>([]);
  const [results, setResults] = useState<Record<string, ImportResult>>({});
  const [revision, setRevision] = useState(0);
  const exportSection = useRef<HTMLElement>(null);
  const canDownload = ["owner", "operator", "reviewer"].includes(data.role);
  const approved = data.drafts.filter((d) => d.approvedVersion === d.version);
  const company = (prospectId: string) =>
    data.prospects.find((p) => p.id === prospectId)?.snapshot.company ?? "";
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    void client
      .workspace<ExportSummary[]>(ws, "/exports", { signal: controller.signal })
      .then((list) => {
        if (!controller.signal.aborted) setExports(list);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(t("Could not load exports. Try again."));
      });
    return () => controller.abort();
  }, [ws, revision, t]);
  const reload = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    if (!focusKey) return;
    exportSection.current?.scrollIntoView({ block: "start" });
    exportSection.current?.focus({ preventScroll: true });
  }, [focusKey]);
  return (
    <section
      id="approved-batch-export"
      ref={exportSection}
      tabIndex={-1}
      aria-label={t("Approved-batch export")}
    >
      <Panel
        title={t("Approved-batch export")}
        eyebrow={t("For your own sender · nothing is sent from here")}
      >
        <p className="muted small">
          {t(
            "Only approved drafts for contacts with a recorded basis are exported, each with its approval digest. Upload the sender's outcomes to see them under the batch.",
          )}
        </p>
        {error && (
          <p role="alert" className="inline-error">
            {error}
          </p>
        )}
        {canWrite && (
          <div className="stack">
            {!approved.length ? (
              <p className="muted small">{t("No approved drafts yet.")}</p>
            ) : (
              <ul className="stack" aria-label={t("Approved drafts")}>
                {approved.map((d) => (
                  <li key={d.id}>
                    <label className="check small-check">
                      <input
                        type="checkbox"
                        checked={picked.includes(d.id)}
                        onChange={(e) =>
                          setPicked((p) =>
                            e.target.checked
                              ? [...p, d.id]
                              : p.filter((id) => id !== d.id),
                          )
                        }
                      />
                      <span dir="auto">{company(d.prospectId)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <div className="button-row">
              <Button
                variant="primary"
                disabled={busy || !picked.length}
                onClick={() =>
                  void action(async () => {
                    const result = await client.workspace<{
                      export: ExportSummary | null;
                      excluded: Excluded[];
                    }>(ws, "/exports", {
                      method: "POST",
                      body: JSON.stringify({ draftIds: picked }),
                    });
                    setExcluded(result.excluded);
                    if (!result.export)
                      throw new Error(
                        t(
                          "No draft passed the export checks. See the reasons below.",
                        ),
                      );
                    setPicked([]);
                    reload();
                  }, t("Batch exported. Download the CSV below."))
                }
              >
                {t("Export approved batch")}
              </Button>
            </div>
          </div>
        )}
        {excluded.length > 0 && (
          <div>
            <p className="small">{t("Not exported")}</p>
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
        {exports && !exports.length && (
          <p className="muted small">{t("No exports yet.")}</p>
        )}
        {exports?.map((e) => (
          <div key={e.id} className="stack">
            <div className="button-row">
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
              {canDownload && (
                <a
                  className="btn btn-secondary btn-sm"
                  href={`/api/workspaces/${ws}/exports/${e.id}/file.csv`}
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
                    const file = event.target.files?.[0];
                    if (!file) return;
                    await action(async () => {
                      const form = new FormData();
                      form.append("file", file);
                      const res = await fetch(
                        `/api/workspaces/${ws}/exports/${e.id}/outcomes`,
                        { method: "POST", body: form },
                      );
                      const result = await res.json();
                      if (!res.ok) throw new Error(result.message);
                      setResults((r) => ({ ...r, [e.id]: result }));
                      reload();
                    }, t("Outcomes imported. Review the row results below."));
                    event.target.value = "";
                  }}
                />
                <span className="muted small">
                  {t("Columns: sequence_id or email, outcome, occurred_at")}
                </span>
              </div>
            )}
            {results[e.id] && (
              <div>
                <p className="small">
                  {results[e.id]!.imported} {t("imported")} ·{" "}
                  {results[e.id]!.duplicates} {t("already imported")} ·{" "}
                  {results[e.id]!.rejected} {t("rejected")}
                </p>
                <ul className="stack small">
                  {results[e.id]!.rows.map((r) => (
                    <li key={r.row}>
                      <Badge
                        tone={
                          r.status === "imported"
                            ? "ok"
                            : r.status === "duplicate"
                              ? "neutral"
                              : "warn"
                        }
                      >
                        {t("Row")} {r.row} · {r.status}
                      </Badge>{" "}
                      {t(r.message)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </Panel>
    </section>
  );
}
