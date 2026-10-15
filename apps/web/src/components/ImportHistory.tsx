"use client";
import { useEffect, useRef, useState } from "react";
import type {
  ImportHistoryDetail,
  ImportHistoryEntry,
  ImportHistoryPage,
  ImportOutcome,
} from "@revenue/contracts";
import { client } from "../lib/client";
import { usePrefs } from "../lib/prefs";
import { useWorkspace } from "./workspace-context";
import { Badge, Button, Empty, Panel, Skeleton, toneFor } from "./primitives";

export function ImportHistory({ revision }: { revision: unknown }) {
  const { ws } = useWorkspace();
  const { t } = usePrefs();
  const [page, setPage] = useState<ImportHistoryPage | null>(null);
  const [detail, setDetail] = useState<ImportHistoryDetail | null>(null);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [filter, setFilter] = useState("all");
  const [visible, setVisible] = useState(50);
  const detailRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setPage(null);
    setDetail(null);
    setError("");
    setWorking(false);
    void client
      .workspace<ImportHistoryPage>(ws, "/imports", {
        signal: controller.signal,
      })
      .then((result) => {
        if (!controller.signal.aborted) setPage(result);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(t("Could not load import history. Try again."));
      });
    return () => {
      controller.abort();
      detailRequest.current?.abort();
    };
  }, [ws, revision, retry, t]);
  const open = async (entry: ImportHistoryEntry) => {
    detailRequest.current?.abort();
    const controller = new AbortController();
    detailRequest.current = controller;
    setWorking(true);
    setError("");
    try {
      const result = await client.workspace<ImportHistoryDetail>(
        ws,
        `/imports/${entry.id}`,
        { signal: controller.signal },
      );
      if (!controller.signal.aborted) {
        setDetail(result);
        setFilter("all");
        setVisible(50);
      }
    } catch {
      if (!controller.signal.aborted)
        setError(t("Could not load import history. Try again."));
    } finally {
      if (!controller.signal.aborted) setWorking(false);
    }
  };
  const rows =
    detail?.outcomes.filter(
      (row) =>
        filter === "all" ||
        (filter === "changed"
          ? row.change === "changed" ||
            row.message === "Updated from the new file"
          : row.state !== "imported"),
    ) ?? [];
  const changeLabel = (row: ImportOutcome) =>
    row.change ??
    (row.state === "imported"
      ? row.message === "Updated from the new file"
        ? "changed"
        : row.message === "Unchanged"
          ? "unchanged"
          : "added"
      : row.state);
  const value = (v: unknown) =>
    v === null || v === undefined || v === "" ? "—" : String(v);
  return (
    <Panel
      title={t("Import history")}
      actions={
        <Button
          size="sm"
          disabled={working}
          onClick={() => setRetry((n) => n + 1)}
        >
          {t("Refresh history")}
        </Button>
      }
    >
      <p className="muted small">
        {t(
          "Versions group uploads with the same filename. Only imported records, row outcomes and file metadata are retained; the uploaded file is not stored.",
        )}
      </p>
      <details className="disclosure">
        <summary>{t("Show import history")}</summary>
        {error && (
          <p role="alert" className="inline-error">
            {error}
          </p>
        )}
        {!page ? (
          error ? null : (
            <Skeleton rows={3} />
          )
        ) : !page.batches.length ? (
          <Empty title={t("No imports yet")}>
            {t(
              "Import a lead file above to track added, changed and unchanged rows.",
            )}
          </Empty>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t("File / version")}</th>
                    <th>{t("Date")}</th>
                    <th>{t("Added")}</th>
                    <th>{t("Changed")}</th>
                    <th>{t("Unchanged")}</th>
                    <th>{t("Needs attention")}</th>
                    <th>{t("Details")}</th>
                  </tr>
                </thead>
                <tbody>
                  {page.batches.map((entry) => (
                    <tr key={entry.id} aria-selected={detail?.id === entry.id}>
                      <td>
                        <strong dir="auto">
                          {entry.filename ?? t("Earlier import")}
                        </strong>
                        <p className="small muted">
                          {entry.legacy
                            ? t("Legacy import")
                            : `${t("Version")} ${entry.version}`}{" "}
                          ·{" "}
                          {entry.status !== "completed" && (
                            <Badge tone="warn">{t(entry.status)}</Badge>
                          )}
                        </p>
                      </td>
                      <td>
                        <bdi>
                          {entry.createdAt.slice(0, 16).replace("T", " ")}
                        </bdi>
                      </td>
                      <td>{entry.counts.added}</td>
                      <td>{entry.counts.changed}</td>
                      <td>{entry.counts.unchanged}</td>
                      <td>
                        {entry.counts.duplicate +
                          entry.counts.invalid +
                          entry.counts.retry}
                      </td>
                      <td>
                        <Button
                          size="sm"
                          disabled={working}
                          onClick={() => void open(entry)}
                        >
                          {t("View import")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {page.nextCursor && (
              <Button
                disabled={working}
                onClick={async () => {
                  setWorking(true);
                  setError("");
                  const controller = new AbortController();
                  detailRequest.current?.abort();
                  detailRequest.current = controller;
                  try {
                    const next = await client.workspace<ImportHistoryPage>(
                      ws,
                      `/imports?cursor=${page.nextCursor}`,
                      { signal: controller.signal },
                    );
                    if (!controller.signal.aborted)
                      setPage({
                        ...next,
                        batches: [...page.batches, ...next.batches],
                      });
                  } catch {
                    if (!controller.signal.aborted)
                      setError(t("Could not load import history. Try again."));
                  } finally {
                    if (!controller.signal.aborted) setWorking(false);
                  }
                }}
              >
                {t("Load older imports")}
              </Button>
            )}
            {detail && (
              <div className="stack" aria-label={t("Import details")}>
                <div className="section-heading">
                  <h3>
                    {t("Import details")} ·{" "}
                    <bdi>{detail.filename ?? t("Earlier import")}</bdi>
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDetail(null)}
                  >
                    {t("Close details")}
                  </Button>
                </div>
                {detail.previousId && (
                  <p className="muted small">
                    {t(
                      "Compared with the account values saved before this upload. Changed fields invalidate previous approvals.",
                    )}
                  </p>
                )}
                <div
                  className="segmented"
                  role="group"
                  aria-label={t("Import row filter")}
                >
                  {[
                    ["all", "All rows"],
                    ["changed", "Changed rows"],
                    ["attention", "Needs attention"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={filter === key}
                      onClick={() => {
                        setFilter(key!);
                        setVisible(50);
                      }}
                    >
                      {t(label!)}
                    </button>
                  ))}
                </div>
                {!rows.length ? (
                  <p className="muted">{t("No rows match this filter.")}</p>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>{t("Row")}</th>
                          <th>{t("Result")}</th>
                          <th>{t("Changes / reason")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, visible).map((row) => (
                          <tr key={row.row}>
                            <td>{row.row}</td>
                            <td>
                              <Badge tone={toneFor(row.state)}>
                                {t(changeLabel(row))}
                              </Badge>
                            </td>
                            <td>
                              {row.changes?.length ? (
                                row.changes.map((change) => (
                                  <p key={change.field} className="small">
                                    <bdi>{change.field}</bdi>:{" "}
                                    <bdi>{value(change.before)}</bdi> →{" "}
                                    <bdi>{value(change.after)}</bdi>
                                  </p>
                                ))
                              ) : (
                                <span dir="auto">
                                  {t(
                                    row.message ??
                                      (row.state === "imported"
                                        ? "New record"
                                        : "Review this row before retrying."),
                                  )}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {rows.length > visible && (
                  <Button onClick={() => setVisible((n) => n + 50)}>
                    {t("Show more rows")}
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </details>
    </Panel>
  );
}
