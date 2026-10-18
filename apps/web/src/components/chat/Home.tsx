"use client";
import { useEffect, useState, type ReactNode } from "react";
import { IconChevronRight, IconFileText, IconShieldCheck } from "@revenue/ui";
import { usePrefs } from "../../lib/prefs";
import type { Asset } from "../../lib/types";
import { Nabil, useNabilMood } from "../nabil/Nabil";
import type { Proposal } from "../Modals";
import { Badge, Button, EmptyState } from "../primitives";
import { useWorkspace } from "../workspace-context";
import { useChat } from "./controller";
import { Composer } from "./Composer";
import { Conversation, DeliverableCard } from "./Conversation";
import "../../styles/pages/home.css";

const STARTERS = [
  {
    label: "Draft follow-ups",
    text: "Draft a three-step follow-up sequence for ",
  },
  { label: "Company profile", text: "Create a capability profile for " },
  {
    label: "Rank my accounts",
    text: "Rank my accounts by fit and explain each score.",
  },
] as const;
const FORMATS = [
  {
    label: "HTML email",
    text: "Create an HTML email (Gmail-safe) announcing ",
  },
  { label: "LinkedIn carousel", text: "Create a LinkedIn carousel about " },
  { label: "Instagram carousel", text: "Create an Instagram carousel about " },
  {
    label: "Flipbook",
    text: "Create a flipbook that walks a prospect through ",
  },
  { label: "One-pager", text: "Create an offer one-pager for " },
] as const;

export function Home({
  onQuote,
  onOpenAsset,
  canvas,
  initialPrefill,
}: {
  initialPrefill?: { text: string; key: number } | null;
  userName: string;
  onQuote: (proposal: Proposal) => void;
  onOpenAsset: (asset: Asset) => void;
  canvas?: ReactNode;
}) {
  const { t } = usePrefs();
  const { data, setTab } = useWorkspace();
  const chat = useChat();
  const mood = useNabilMood(chat.activity);
  const [prefill, setPrefill] = useState<{ text: string; key: number } | null>(
    null,
  );
  const [formatsOpen, setFormatsOpen] = useState(false);
  useEffect(() => {
    if (initialPrefill) setPrefill(initialPrefill);
  }, [initialPrefill]);
  const empty = !chat.threadId && !chat.live && !chat.messages.length;
  const recentAssets = [...data.assets]
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, 2);
  const pending = data.drafts.filter(
    (draft) => draft.approvedVersion !== draft.version,
  ).length;
  const start = (text: string) =>
    setPrefill({ text: t(text), key: Date.now() });

  if (empty)
    return (
      <section className="home-landing home-v32" aria-labelledby="home-title">
        <div className="home-hero">
          <Nabil mood={mood} size={48} className="home-avatar" />
          <h1 id="home-title">{t("What would you like to prepare?")}</h1>
          <p className="home-sub">
            {t(
              "Turn the accounts you already work into reviewed Arabic/English follow-ups and company profiles, with every outcome and every hold recorded in your CRM.",
            )}
          </p>
        </div>
        <Composer
          variant="hero"
          prefill={prefill}
          placeholder={t(
            "Draft follow-ups, prepare a company profile, or start with an idea…",
          )}
        />
        <div className="home-starters">
          <div className="starter-row" aria-label={t("Start from")}>
            {STARTERS.map(({ label, text }) => (
              <button
                key={label}
                type="button"
                className="starter"
                onClick={() => start(text)}
              >
                {t(label)}
              </button>
            ))}
            <button
              type="button"
              className="starter"
              aria-expanded={formatsOpen}
              aria-controls="home-formats"
              onClick={() => setFormatsOpen((open) => !open)}
            >
              {t("More formats")}
            </button>
          </div>
          {formatsOpen && (
            <div
              id="home-formats"
              className="home-formats"
              aria-label={t("More formats")}
            >
              {FORMATS.map(({ label, text }) => (
                <button key={label} type="button" onClick={() => start(text)}>
                  {t(label)}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="home-ranking-note">
          <IconShieldCheck size={18} aria-hidden />
          <span>
            {t(
              "Rank my accounts orders accounts you already saved, using your rubric. Ranking does not search for new companies, enrich contacts or send email.",
            )}
          </span>
        </p>
        <section className="home-resume" aria-labelledby="home-resume-title">
          <h2 id="home-resume-title">{t("Pick up where you left off")}</h2>
          {pending > 0 && (
            <button
              type="button"
              className="home-review-row"
              onClick={() => setTab("Review queue")}
            >
              <IconFileText size={20} aria-hidden />
              <span>
                <strong>{t("Review your follow-ups")}</strong>
                <span className="muted small">
                  <bdi>{pending}</bdi> {t("drafts to review")}
                </span>
              </span>
              <Badge tone="warn" dot={false}>
                {t("Needs review")}
              </Badge>
              <IconChevronRight
                className="home-directional"
                size={18}
                aria-hidden
              />
            </button>
          )}
          {recentAssets.map((asset) => (
            <DeliverableCard
              key={asset.id}
              asset={asset}
              fallbackTitle={asset.title}
              template={asset.template}
              onOpen={() => onOpenAsset(asset)}
            />
          ))}
          {!pending && !recentAssets.length && (
            <EmptyState
              title={t("Your next piece of work starts here")}
              text={t(
                "Ask Nabil to prepare a follow-up or company profile. Saved work will appear here.",
              )}
              action={
                <Button size="sm" onClick={() => start(STARTERS[0].text)}>
                  {t("Draft follow-ups")}
                </Button>
              }
            />
          )}
        </section>
        <p className="home-purpose">
          {t(
            "Caravan is an AI GTM workspace where small B2B services teams research, qualify, follow up and record named accounts in English and Arabic, with a person approving every send.",
          )}
        </p>
      </section>
    );

  return (
    <div
      className={`home-conversation home-chat-v32 ${canvas ? "with-canvas" : ""}`}
    >
      <section
        className="conversation-column"
        aria-label={t("Conversation with Nabil")}
      >
        <Conversation onQuote={onQuote} onOpenAsset={onOpenAsset} />
        <div className="conversation-dock">
          <p className="home-refine-label">{t("Refine with Nabil")}</p>
          <Composer variant="dock" />
        </div>
      </section>
      {canvas}
    </div>
  );
}
