"use client";
import { useEffect, useRef, useState } from "react";
import {
  PLAYS,
  scheduledTools,
  type ScheduledPlay,
  type ScheduledReviewItem,
} from "@revenue/contracts";
import { client } from "../lib/client";
import { usePrefs } from "../lib/prefs";
import { useWorkspace } from "./workspace-context";
import {
  Badge,
  Button,
  Empty,
  Field,
  Input,
  Panel,
  Select,
  Skeleton,
} from "./primitives";
import type { Proposal } from "./Modals";

const labels = {
  score_accounts: "Score accounts",
  find_signals: "Find signals",
  draft_messages: "Draft messages",
  mini_audit: "Mini audit",
  preflight: "Check sender readiness",
};
const localDate = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
const when = (date: string, language: string) =>
  new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));

export function ScheduledPlays() {
  const { ws, data, userId, canWrite, busy, action, play, selected, language } =
    useWorkspace();
  const { t, language: uiLanguage } = usePrefs();
  const [entries, setEntries] = useState<ScheduledPlay[] | null>(null);
  const [retry, setRetry] = useState(0),
    [error, setError] = useState("");
  const [tool, setTool] =
    useState<(typeof scheduledTools)[number]>("score_accounts");
  const [nextAt, setNextAt] = useState(() =>
    localDate(new Date(Date.now() + 15 * 60000)),
  );
  const [name, setName] = useState("");
  const available = (PLAYS.find((p) => p.id === play)?.steps ?? []).filter(
    (step) => scheduledTools.some((t) => t === step),
  );
  useEffect(() => {
    setTool((available[0] as typeof tool) ?? "score_accounts");
  }, [play]);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    void client
      .workspace<ScheduledPlay[]>(ws, "/schedules", {
        signal: controller.signal,
      })
      .then((result) => {
        if (!controller.signal.aborted) setEntries(result);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(t("Could not load schedules. Try again."));
      });
    return () => controller.abort();
  }, [ws, data, retry, t]);
  return (
    <Panel title={t("Recurring play reviews")}>
      <p className="muted">
        {t(
          "Each occurrence prepares a review. You approve its current scope and cost before work starts.",
        )}
      </p>
      {error && (
        <div role="alert">
          <p>{error}</p>
          <Button size="sm" onClick={() => setRetry((n) => n + 1)}>
            {t("Retry")}
          </Button>
        </div>
      )}
      {!entries ? (
        !error && <Skeleton rows={2} />
      ) : !entries.length ? (
        <Empty title={t("No recurring reviews yet")}>
          {t(
            "Schedule a selected play to bring its next action into the review queue.",
          )}
        </Empty>
      ) : (
        <div className="stack">
          {entries.map((entry) => (
            <div key={entry.id} className="selection-bar">
              <div>
                <strong dir="auto">{entry.name}</strong>
                <p className="small muted">
                  <bdi>{entry.play}</bdi> · {t(labels[entry.input.tool])} ·{" "}
                  {t("Every")} {entry.intervalDays} {t("days")} ·{" "}
                  <bdi>{when(entry.nextAt, uiLanguage)}</bdi>
                </p>
                {entry.lastError && (
                  <p role="alert" className="inline-error">
                    {entry.lastError}
                  </p>
                )}
              </div>
              <Badge tone={entry.enabled ? "ok" : "neutral"}>
                {t(entry.enabled ? "Active" : "Paused")}
              </Badge>
              <Button
                size="sm"
                disabled={
                  !canWrite ||
                  busy ||
                  (entry.userId !== userId && data.role !== "owner")
                }
                onClick={() =>
                  void action(
                    () =>
                      client.workspace(ws, `/schedules/${entry.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ enabled: !entry.enabled }),
                      }),
                    t("Schedule updated."),
                  )
                }
              >
                {t(entry.enabled ? "Pause schedule" : "Resume schedule")}
              </Button>
            </div>
          ))}
        </div>
      )}
      <details className="disclosure">
        <summary>{t("Schedule this play")}</summary>
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void action(async () => {
              await client.workspace(ws, "/schedules", {
                method: "POST",
                body: JSON.stringify({
                  name,
                  play,
                  tool,
                  prospectIds: tool === "preflight" ? [] : selected,
                  language,
                  nextAt: new Date(nextAt).toISOString(),
                  intervalDays: Number(form.get("intervalDays")),
                }),
              });
              setName("");
              setRetry((n) => n + 1);
            }, t("Schedule saved. Due actions will appear in Review queue."));
          }}
        >
          <div className="form-grid two">
            <Field label={t("Schedule name")}>
              <Input
                aria-label={t("Schedule name")}
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label={t("Scheduled step")}>
              <Select
                aria-label={t("Scheduled step")}
                value={tool}
                onChange={(e) => setTool(e.target.value as typeof tool)}
              >
                {available.map((step) => (
                  <option key={step} value={step}>
                    {t(labels[step as typeof tool])}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("First review (your local time)")}>
              <Input
                aria-label={t("First review (your local time)")}
                type="datetime-local"
                step={1}
                required
                value={nextAt}
                onChange={(e) => setNextAt(e.target.value)}
              />
            </Field>
            <Field label={t("Repeat every (days)")}>
              <Input
                aria-label={t("Repeat every (days)")}
                name="intervalDays"
                type="number"
                min={1}
                max={90}
                defaultValue={7}
                required
              />
            </Field>
          </div>
          <p className="small muted">
            {tool === "preflight"
              ? t("Pre-flight checks the workspace sender.")
              : `${selected.length} ${t("selected contacts. New imports are not included automatically.")}`}
          </p>
          <Button
            type="submit"
            variant="primary"
            disabled={
              !canWrite ||
              busy ||
              !name.trim() ||
              (tool !== "preflight" &&
                (!selected.length || selected.length > 100))
            }
          >
            {t("Save recurring review")}
          </Button>
        </form>
      </details>
    </Panel>
  );
}

export function ScheduledReviews() {
  const { ws, data, canWrite, busy, action, showProposal, setActiveRun } =
    useWorkspace();
  const { t, language } = usePrefs();
  const [items, setItems] = useState<ScheduledReviewItem[] | null>(null),
    [retry, setRetry] = useState(0),
    [error, setError] = useState("");
  const [working, setWorking] = useState<string | null>(null);
  const active = useRef(true),
    quoteRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      quoteRequest.current?.abort();
    };
  }, [ws]);
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    const load = async () => {
      if (pending) return;
      pending = true;
      try {
        const result = await client.workspace<ScheduledReviewItem[]>(
          ws,
          "/scheduled-reviews",
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) {
          setItems(result);
          setError("");
        }
      } catch {
        if (!controller.signal.aborted)
          setError(t("Could not load scheduled reviews. Try again."));
      } finally {
        pending = false;
      }
    };
    void load();
    const interval = setInterval(() => void load(), 15000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [ws, data, retry, t]);
  const pending = items?.filter((i) => !i.runId) ?? [];
  return (
    <Panel
      title={t("Scheduled actions ready for review")}
      actions={
        pending.length > 0 && <Badge tone="warn">{pending.length}</Badge>
      }
    >
      {error && (
        <div role="alert">
          <p>{error}</p>
          <Button size="sm" onClick={() => setRetry((n) => n + 1)}>
            {t("Retry")}
          </Button>
        </div>
      )}
      {!items ? (
        !error && <Skeleton rows={2} />
      ) : !items.length ? (
        <p className="muted">
          {t(
            "No scheduled actions are due. Set a recurring review from Plays.",
          )}
        </p>
      ) : (
        <div className="stack">
          {items.map((item) => (
            <div key={item.id} className="selection-bar">
              <div>
                <strong dir="auto">{item.name}</strong>
                <p className="small muted">
                  {t(labels[item.tool])} · {item.audience} {t("contacts")} ·{" "}
                  <bdi>{when(item.dueAt, language)}</bdi>
                </p>
              </div>
              {item.runId ? (
                <>
                  <Badge tone={item.runState === "failed" ? "danger" : "ok"}>
                    {t(item.runState ?? "started")}
                  </Badge>
                  <Button size="sm" onClick={() => setActiveRun(item.runId)}>
                    {t("View run")}
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  disabled={!canWrite || busy || Boolean(working)}
                  onClick={async () => {
                    const controller = new AbortController();
                    quoteRequest.current?.abort();
                    quoteRequest.current = controller;
                    setWorking(item.id);
                    setError("");
                    try {
                      const proposal = await client.workspace<Proposal>(
                        ws,
                        `/scheduled-reviews/${item.id}/quote`,
                        { method: "POST", signal: controller.signal },
                      );
                      if (active.current && !controller.signal.aborted)
                        showProposal(proposal);
                    } catch (e) {
                      if (active.current && !controller.signal.aborted)
                        setError((e as Error).message);
                    } finally {
                      if (active.current && !controller.signal.aborted)
                        setWorking(null);
                    }
                  }}
                >
                  {working === item.id
                    ? t("Preparing review…")
                    : t("Review scheduled action")}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                disabled={!canWrite || busy || Boolean(working)}
                onClick={() =>
                  void action(
                    () =>
                      client.workspace(
                        ws,
                        `/scheduled-reviews/${item.id}/dismiss`,
                        { method: "POST" },
                      ),
                    t("Scheduled review dismissed."),
                  )
                }
              >
                {t("Dismiss review")}
              </Button>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
