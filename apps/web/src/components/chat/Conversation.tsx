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
import { usePrefs } from "../../lib/prefs";
import { assetLabel } from "../../lib/asset-label";
import type { Asset, Chat } from "../../lib/types";
import { ChatMarkdown } from "../Markdown";
import { Nabil, useNabilMood } from "../nabil/Nabil";
import { Button } from "../primitives";
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
  find_signals: "Proposed a signal search",
  score_accounts: "Proposed scoring",
  enrich_contacts: "Proposed enrichment",
  draft_messages: "Proposed drafts",
  make_asset: "Proposed a deliverable",
  queue_sequence: "Proposed a sequence",
  preflight: "Proposed a pre-flight check",
  mini_audit: "Proposed a website audit",
  onboard: "Proposed reading your website",
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
    .map((g) => `${t(STEP_LABELS[g.name] ?? g.name.replaceAll("_", " "))}${g.count > 1 ? ` ×${g.count}` : ""}`)
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
        <ol className="step-list">
          {(
            steps ??
            names.map((name, i): ToolStep => ({ id: String(i), name, state: "result" }))
          ).map(
            (step) => (
              <li key={step.id} className={`state-${step.state}`}>
                <span className="dot" aria-hidden />
                <span>{t(STEP_LABELS[step.name] ?? step.name.replaceAll("_", " "))}</span>
                {step.summary && (
                  <code className="step-detail" dir="ltr" title={step.summary}>
                    {step.summary}
                  </code>
                )}
              </li>
            ),
          )}
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
    <button type="button" className="deliverable-card" onClick={onOpen}>
      <span className="deliverable-icon" aria-hidden>
        <Icon size={18} />
      </span>
      <span className="deliverable-meta">
        <strong dir="auto">{asset ? assetLabel(asset, t) : fallbackTitle}</strong>
        <span className="muted small">
          {t(template)} · v{asset?.version ?? 1} ·{" "}
          {asset?.approvedAt ? t("Approved") : t("Draft · needs review")}
        </span>
      </span>
      <span className="deliverable-open">{t("Open")}</span>
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
            {feedback === "up" ? <IconThumbUpFilled size={14} /> : <IconThumbUp size={14} />}
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={t("Poor reply")}
            aria-pressed={feedback === "down"}
            onClick={() =>
              void chat.feedback(message.id, feedback === "down" ? null : "down")
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

function QuoteCard({ quote, onReview }: { quote: Proposal; onReview: () => void }) {
  const { t } = usePrefs();
  return (
    <div className="quote-card">
      <div>
        <p className="eyebrow">{t("Needs your approval")}</p>
        <strong className="step-name">
          {t(STEP_LABELS[quote.input.tool] ?? quote.input.tool.replaceAll("_", " "))}
        </strong>
        <p className="muted small">
          {quote.quote.audience || t("Workspace")} {t("selected")} ·{" "}
          <bdi>{quote.input.language}</bdi>
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
  const lastAssistant = [...chat.messages].reverse().find((m) => m.role === "assistant");

  // Follow the stream unless the reader scrolled up to read earlier messages.
  useEffect(() => {
    const el = list.current;
    if (el && pinned.current) el.scrollTo({ top: el.scrollHeight });
  }, [chat.messages.length, chat.live?.text, chat.live?.tools.length, chat.quote]);

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
          <p className="shimmer muted">{t("Loading conversation…")}</p>
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
              <span className="nabil-mark" aria-hidden />
              <div className="msg-body">
                <StepRow names={message.context?.tools ?? []} />
                <ChatMarkdown text={message.content} />
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
                  canRetry={!chat.live && message.id === lastAssistant?.id}
                />
              </div>
            </div>
          ),
        )}
        {chat.live && (
          <div className="msg msg-assistant live">
            <Nabil mood={mood} size={24} className="msg-avatar" />
            <div className="msg-body">
              <StepRow
                names={chat.live.tools.map((tool) => tool.name)}
                steps={chat.live.tools}
                running={chat.streaming}
              />
              {chat.live.text ? (
                <ChatMarkdown text={chat.live.text} streaming={chat.streaming} />
              ) : (
                chat.streaming && (
                  <p className="shimmer muted">
                    {t(mood === "searching" ? "Looking through your workspace…" : "Thinking…")}
                  </p>
                )
              )}
              {chat.live.error && <p className="error-text">{chat.live.error}</p>}
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
