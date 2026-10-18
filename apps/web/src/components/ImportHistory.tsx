"use client";
import { useEffect, useRef, useState } from "react";
import type {
  ImportHistoryDetail,
  ImportHistoryEntry,
  ImportHistoryPage,
  ImportOutcome,
} from "@revenue/contracts";
import { IconFileText } from "@revenue/ui";
import { client } from "../lib/client";
import { usePrefs } from "../lib/prefs";
import { useWorkspace } from "./workspace-context";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  toneFor,
} from "./primitives";
import { RowChevron } from "./accounts/parts";

// Import history (frame Import history): one row per upload with its version, row count and date;
// opening a row shows what changed. `openId` opens that import straight away (from the results step).
export function ImportHistory({
  revision,
  openId,
  onImport,
}: {
  revision: unknown;
  openId?: string;
  onImport: () => void;
}) {
  const { ws } = useWorkspace();
  const { t, language } = usePrefs();
  const num = (value: number) =>
    value.toLocaleString(language === "ar" ? "ar-EG" : "en");
  const [page, setPage] = useState<ImportHistoryPage | null>(null);
  const [detail, setDetail] = useState<ImportHistoryDetail | null>(null);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [working, setWorking] = useState(false);
  const [filter, setFilter] = useState("all");
  const [visible, setVisible] = useState(50);
  const detailRequest = useRef<AbortController | null>(null);
  const open = async (id: string) => {
    detailRequest.current?.abort();
    const controller = new AbortController();
    detailRequest.current = controller;
    setWorking(true);
    setError("");
    try {
      const result = await client.workspace<ImportHistoryDetail>(
        ws,
        `/imports/${id}`,
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
  useEffect(() => {
    const controller = new AbortController();
    setPage(null);
    setDetail(null);
    setError("");
    setLoadFailed(false);
    setWorking(false);
    void client
      .workspace<ImportHistoryPage>(ws, "/imports", {
        signal: controller.signal,
      })
      .then((result) => {
        if (!controller.signal.aborted) setPage(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadFailed(true);
      });
    return () => {
      controller.abort();
      detailRequest.current?.abort();
    };
  }, [ws, revision, retry]);
  useEffect(() => {
    if (openId) void open(openId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);
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
  const when = (iso: string) => {
    const date = new Date(iso);
    const days = Math.floor((Date.now() - date.getTime()) / 86400000);
    return days <= 0
      ? t("Today")
      : date.toLocaleDateString(language === "ar" ? "ar-EG" : "en", {
          day: "numeric",
          month: "short",
        });
  };

  if (loadFailed)
    return (
      <ErrorState
        title={t("Import history could not load")}
        message={t("Your saved work is still there. Check your connection and try again.")}
        onRetry={() => setRetry((n) => n + 1)}
      />
    );
  if (!page) return <LoadingState title={t("Loading import history…")} rows={3} />;

  if (detail)
    return (
      <section className="acct-task" aria-label={t("Import details")}>
        <div className="acct-section-head">
          <div>
            <h2>
              {t("Import details")} · <bdi>{detail.filename ?? t("Earlier import")}</bdi>
            </h2>
            <p className="muted">
              {detail.legacy ? t("Legacy import") : `${t("Version")} ${num(detail.version)}`} ·{" "}
              {num(detail.counts.added)} {t("added")} · {num(detail.counts.changed)} {t("changed")} ·{" "}
              {num(detail.counts.unchanged)} {t("unchanged")} ·{" "}
              {num(detail.counts.duplicate + detail.counts.invalid + detail.counts.retry)}{" "}
              {t("need attention")}
            </p>
          </div>
          <Button size="sm" onClick={() => setDetail(null)}>
            {t("Close details")}
          </Button>
        </div>
        {error && (
          <p role="alert" className="inline-error">
            {error}
          </p>
        )}
        {detail.previousId && (
          <p className="muted small">
            {t(
              "Compared with the account values saved before this upload. Changed fields invalidate previous approvals.",
            )}
          </p>
        )}
        <div className="segmented" role="group" aria-label={t("Import row filter")}>
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
          <div className="acct-table-wrap">
            <table className="acct-table">
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
                    <td data-label={t("Row")}>{row.row}</td>
                    <td data-label={t("Result")}>
                      <Badge tone={toneFor(row.state)}>{t(changeLabel(row))}</Badge>
                    </td>
                    <td data-label={t("Changes / reason")}>
                      {row.changes?.length ? (
                        row.changes.map((change) => (
                          <p key={change.field} className="small">
                            <bdi>{change.field}</bdi>: <bdi>{value(change.before)}</bdi> →{" "}
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
      </section>
    );

  return (
    <section className="acct-task" aria-label={t("Import history")}>
      <div className="acct-section-head">
        <div>
          <h2>{t("Import history")}</h2>
          <p className="muted small">
            {t(
              "Versions group uploads with the same filename. Only imported records, row outcomes and file metadata are retained; the uploaded file is not stored.",
            )}
          </p>
        </div>
      </div>
      {error && (
        <p role="alert" className="inline-error">
          {error}
        </p>
      )}
      {!page.batches.length ? (
        <EmptyState
          title={t("No imports yet")}
          text={t("Import a lead file to track added, changed and unchanged rows.")}
        />
      ) : (
        <ul className="acct-list">
          {page.batches.map((entry: ImportHistoryEntry) => (
            <li key={entry.id}>
              <button
                type="button"
                className="acct-list-item"
                disabled={working}
                aria-label={`${t("View import")}: ${entry.filename ?? t("Earlier import")}`}
                onClick={() => void open(entry.id)}
              >
                <IconFileText size={18} aria-hidden />
                <span className="acct-list-text">
                  <strong dir="auto">{entry.filename ?? t("Earlier import")}</strong>
                  <span className="muted small">
                    {entry.legacy
                      ? t("Legacy import")
                      : `${t("Version")} ${num(entry.version)}`}
                    {entry.rowCount !== null ? ` · ${num(entry.rowCount)} ${t("rows")}` : ""}
                    {" · "}
                    {when(entry.createdAt)}
                    {entry.counts.duplicate + entry.counts.invalid + entry.counts.retry > 0
                      ? ` · ${num(entry.counts.duplicate + entry.counts.invalid + entry.counts.retry)} ${t("need attention")}`
                      : ""}
                  </span>
                </span>
                <Badge
                  tone={entry.status === "completed" ? "neutral" : "warn"}
                >
                  {entry.status === "completed" ? t("Completed") : t(entry.status)}
                </Badge>
                <RowChevron />
              </button>
            </li>
          ))}
        </ul>
      )}
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
                setPage({ ...next, batches: [...page.batches, ...next.batches] });
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
      <div className="button-row">
        <Button variant="primary" onClick={onImport}>
          {t("Import another file")}
        </Button>
        <Button disabled={working} onClick={() => setRetry((n) => n + 1)}>
          {t("Refresh history")}
        </Button>
      </div>
    </section>
  );
}
