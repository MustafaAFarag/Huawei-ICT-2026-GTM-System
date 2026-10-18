"use client";
import { useEffect, useRef, useState } from "react";
import {
  IconBook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconCheck,
  IconChevronDown,
  IconCoin,
  IconCopy,
  IconFileText,
  IconMail,
  IconRefresh,
  IconThumbDown,
  IconThumbDownFilled,
  IconThumbUp,
  IconThumbUpFilled,
} from "@revenue/ui";
import { ASSET_FORMATS, type AssetTemplate } from "@revenue/contracts";
import { usePrefs } from "../../lib/prefs";
import { assetLabel } from "../../lib/asset-label";
import type { Asset, Chat, Run } from "../../lib/types";
import { ChatMarkdown } from "../Markdown";
import { Nabil, useNabilMood } from "../nabil/Nabil";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
} from "../primitives";
import { useWorkspace } from "../workspace-context";
import { useChat, type ToolStep } from "./controller";
import type { Proposal } from "../Modals";

const STEP_LABELS: Record<string, string> = {
  workspace_overview: "Checked the workspace",
  search_accounts: "Searched accounts",
  get_account: "Read an account",
  review_queue: "Checked the review queue",
  get_draft: "Read a saved draft",
  list_assets: "Listed deliverables",
  get_asset: "Read a deliverable",
  recent_runs: "Checked recent runs",
  open_screen: "Opened a screen",
  navigate: "Opened a screen",
  open_account: "Opened an account",
  open_asset: "Opened a deliverable",
  select_accounts: "Selected accounts",
  find_signals: "Searching for signals",
  score_accounts: "Scoring accounts",
  enrich_contacts: "Enriching contacts",
  draft_messages: "Preparing drafts",
  make_asset: "Preparing a deliverable",
  queue_sequence: "Preparing a sequence",
  preflight: "Checking launch readiness",
  mini_audit: "Auditing the website",
  onboard: "Reading your website",
};

export const FORMAT_ICONS: Record<string, typeof IconFileText> = {
  "email-outlook": IconMail,
  "email-gmail": IconMail,
  "instagram-carousel": IconBrandInstagram,
  "linkedin-carousel": IconBrandLinkedin,
  flipbook: IconBook,
};

// Consecutive calls of one tool collapse to "Searched accounts ×2".
function groupSteps(names: string[]) {
  const groups: { name: string; count: number }[] = [];
  for (const name of names) {
    const last = groups.at(-1);
    if (last?.name === name) last.count++;
    else groups.push({ name, count: 1 });
  }
  return groups;
}

function StepRow({
  names,
  steps,
  running,
}: {
  names: string[];
  steps?: ToolStep[];
  running?: boolean;
}) {
  const { t } = usePrefs();
  const [open, setOpen] = useState(false);
  if (!names.length) return null;
  const groups = groupSteps(names);
  const summary = groups
    .map(
      (g) =>
        `${t(STEP_LABELS[g.name] ?? g.name.replaceAll("_", " "))}${g.count > 1 ? ` ×${g.count}` : ""}`,
    )
    .join(", ");
  return (
    <div className={`step-row ${running ? "running" : ""}`}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="step-summary" dir="auto">
          {summary}
        </span>
        <IconChevronDown size={14} className="step-chevron" aria-hidden />
      </button>
      {open && (
        <ol className="tool-step-list">
          {(
            steps ??
            names.map(
              (name, i): ToolStep => ({ id: String(i), name, state: "result" }),
            )
          ).map((step) => (
            <li key={step.id} className={`state-${step.state}`}>
              <span className="dot" aria-hidden />
              <span>
                {t(STEP_LABELS[step.name] ?? step.name.replaceAll("_", " "))}
              </span>
              {step.summary && (
                <code className="step-detail" dir="ltr" title={step.summary}>
                  {step.summary}
                </code>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function DeliverableCard({
  asset,
  fallbackTitle,
  template,
  onOpen,
}: {
  asset?: Asset;
  fallbackTitle: string;
  template: string;
  onOpen: () => void;
}) {
  const { t } = usePrefs();
  const Icon = FORMAT_ICONS[template] ?? IconFileText;
  return (
    <button
      type="button"
      className="deliverable-card"
      onClick={onOpen}
      disabled={!asset}
    >
      <span className="deliverable-icon" aria-hidden>
        <Icon size={18} />
      </span>
      <span className="deliverable-meta">
        <strong dir="auto">
          {asset ? assetLabel(asset, t) : fallbackTitle}
        </strong>
        <span className="muted small">
          {t(ASSET_FORMATS[template as AssetTemplate]?.label ?? template)} · v
          {asset?.version ?? 1} ·{" "}
          {asset?.approvedAt ? t("Approved") : t("Draft · needs review")}
        </span>
      </span>
      <span className="deliverable-open">{t("Open preview")}</span>
    </button>
  );
}

function MessageActions({
  message,
  canRetry,
}: {
  message: Chat;
  canRetry: boolean;
}) {
  const { t } = usePrefs();
  const chat = useChat();
  const [copied, setCopied] = useState(false);
  const feedback = message.context?.feedback ?? null;
  const persisted = !message.id.startsWith("local-");
  return (
    <div className="message-actions">
      <button
        type="button"
        className="icon-button"
        aria-label={copied ? t("Copied") : t("Copy reply")}
        title={t("Copy reply")}
        onClick={() =>
          void navigator.clipboard?.writeText(message.content).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          })
        }
      >
        {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
      </button>
      {persisted && (
        <>
          <button
            type="button"
            className="icon-button"
            aria-label={t("Good reply")}
            aria-pressed={feedback === "up"}
            onClick={() =>
              void chat.feedback(message.id, feedback === "up" ? null : "up")
            }
          >
            {feedback === "up" ? (
              <IconThumbUpFilled size={14} />
            ) : (
              <IconThumbUp size={14} />
            )}
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={t("Poor reply")}
            aria-pressed={feedback === "down"}
            onClick={() =>
              void chat.feedback(
                message.id,
                feedback === "down" ? null : "down",
              )
            }
          >
            {feedback === "down" ? (
              <IconThumbDownFilled size={14} />
            ) : (
              <IconThumbDown size={14} />
            )}
          </button>
        </>
      )}
      {canRetry && (
        <button
          type="button"
          className="icon-button"
          aria-label={t("Retry")}
          title={t("Retry")}
          disabled={chat.streaming}
          onClick={chat.retry}
        >
          <IconRefresh size={14} />
        </button>
      )}
    </div>
  );
}

function QuoteCard({
  quote,
  onReview,
}: {
  quote: Proposal;
  onReview: () => void;
}) {
  const { t } = usePrefs();
  return (
    <div className="quote-card">
      <div>
        <p className="eyebrow">{t("Needs your approval")}</p>
        <strong className="step-name">
          {quote.input.tool === "make_asset"
            ? t(
                ASSET_FORMATS[quote.input.template as AssetTemplate]?.label ??
                  "Deliverable",
              )
            : t(
                STEP_LABELS[quote.input.tool] ??
                  quote.input.tool.replaceAll("_", " "),
              )}
        </strong>
        <p className="muted small">
          {quote.quote.audience
            ? `${quote.quote.audience} ${t("selected")}`
            : t("Brand-level")}{" "}
          · <bdi>{quote.input.language}</bdi>
        </p>
      </div>
      <span className="quote-cost mono">
        <IconCoin size={14} aria-hidden /> {quote.quote.estimate}
      </span>
      <Button variant="ai" size="sm" onClick={onReview}>
        {t("Review proposed action")}
      </Button>
    </div>
  );
}

function RunProgress({ run }: { run: Run }) {
  const { t } = usePrefs();
  const active = ["queued", "running"].includes(run.state);
  const label = active
    ? "Working…"
    : run.state === "succeeded"
      ? "Completed"
      : run.state === "cancelled"
        ? "Cancelled"
        : "Could not finish";
  return (
    <details className="chat-run-progress" data-state={run.state}>
      <summary>
        <span className={`run-dot ${active ? "shimmer" : ""}`} aria-hidden />
        <span role="status">{t(label)}</span>
      </summary>
      <p>
        {t(
          active
            ? "You can keep chatting while this is prepared."
            : run.state === "succeeded"
              ? "Saved in your workspace."
              : "Try the request again after resolving the issue below.",
        )}
      </p>
      {run.error && <p className="error-text">{t(run.error)}</p>}
      {run.nextAction && <p>{t(run.nextAction)}</p>}
    </details>
  );
}

export function Conversation({
  compact = false,
  onQuote,
  onOpenAsset,
}: {
  compact?: boolean;
  onQuote: (proposal: Proposal) => void;
  onOpenAsset: (asset: Asset) => void;
}) {
  const { t } = usePrefs();
  const chat = useChat();
  const { data } = useWorkspace();
  const mood = useNabilMood(chat.activity);
  const list = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const lastAssistant = [...chat.messages]
    .reverse()
    .find((m) => m.role === "assistant");

  // Follow the stream unless the reader scrolled up to read earlier messages.
  useEffect(() => {
    const el = list.current;
    if (el && pinned.current) el.scrollTo({ top: el.scrollHeight });
  }, [
    chat.messages.length,
    chat.live?.text,
    chat.live?.tools.length,
    chat.quote,
  ]);

  return (
    <div
      className={`conversation-scroll ${compact ? "compact" : ""}`}
      ref={list}
      onScroll={(event) => {
        const el = event.currentTarget;
        pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }}
    >
      <div className="conversation-log" aria-live="polite">
        {chat.loadingMessages && !chat.messages.length && (
          <LoadingState title={t("Loading conversation…")} rows={2} />
        )}
        {chat.messagesError && (
          <ErrorState
            title={t("We couldn’t load this conversation.")}
            message={t(
              "Your saved work is safe. Try loading the conversation again.",
            )}
            onRetry={() => void chat.reload()}
          />
        )}
        {!chat.loadingMessages &&
          !chat.messagesError &&
          !chat.messages.length &&
          !chat.live && (
            <EmptyState
              title={t("Start a conversation with Nabil")}
              text={t("Ask Nabil to prepare a follow-up or company profile.")}
            />
          )}
        {chat.messages.map((message) =>
          message.role === "user" ? (
            <div className="msg msg-user" key={message.id}>
              <div className="msg-bubble" dir="auto">
                {message.content}
              </div>
            </div>
          ) : (
            <div className="msg msg-assistant" key={message.id}>
              <div className="nabil-message-head">
                <Nabil mood="idle" size={24} />
                <strong>{t("Nabil")}</strong>
                {message.context?.deliverable && (
                  <Badge tone="ok" dot={false}>
                    {t("Ready to review")}
                  </Badge>
                )}
              </div>
              <div className="msg-body">
                <StepRow names={message.context?.tools ?? []} />
                <ChatMarkdown text={message.content} />
                {message.runId &&
                  !message.context?.deliverable &&
                  data.runs.find((r) => r.id === message.runId) && (
                    <RunProgress
                      run={data.runs.find((r) => r.id === message.runId)!}
                    />
                  )}
                {message.context?.deliverable && (
                  <DeliverableCard
                    template={message.context.deliverable.template}
                    fallbackTitle={message.context.deliverable.title}
                    asset={data.assets.find(
                      (a) => a.id === message.context?.deliverable?.assetId,
                    )}
                    onOpen={() => {
                      const asset = data.assets.find(
                        (a) => a.id === message.context?.deliverable?.assetId,
                      );
                      if (asset) onOpenAsset(asset);
                    }}
                  />
                )}
                <MessageActions
                  message={message}
                  canRetry={
                    !chat.live &&
                    !message.context?.deliverable &&
                    message.id === lastAssistant?.id
                  }
                />
              </div>
            </div>
          ),
        )}
        {chat.live && (
          <div className="msg msg-assistant live">
            <div className="nabil-message-head">
              <Nabil mood={mood} size={24} />
              <strong>{t("Nabil")}</strong>
              {chat.streaming && (
                <Badge tone="warn" dot={false}>
                  {t("Working…")}
                </Badge>
              )}
            </div>
            <div className="msg-body">
              <StepRow
                names={chat.live.tools.map((tool) => tool.name)}
                steps={chat.live.tools}
                running={chat.streaming}
              />
              {chat.live.text ? (
                <ChatMarkdown
                  text={chat.live.text}
                  streaming={chat.streaming}
                />
              ) : (
                chat.streaming && (
                  <p className="shimmer muted">
                    {t(
                      mood === "searching"
                        ? "Looking through your workspace…"
                        : "Thinking…",
                    )}
                  </p>
                )
              )}
              {chat.live.error && (
                <ErrorState
                  title={t("Nabil couldn’t finish this reply.")}
                  message={chat.live.error}
                  onRetry={chat.retry}
                />
              )}
            </div>
          </div>
        )}
        {chat.quote && (
          <QuoteCard quote={chat.quote} onReview={() => onQuote(chat.quote!)} />
        )}
      </div>
    </div>
  );
}
