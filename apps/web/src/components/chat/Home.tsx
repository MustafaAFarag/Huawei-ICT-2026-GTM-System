"use client";
import { useEffect, useState, type ReactNode } from "react";
import { usePrefs } from "../../lib/prefs";
import type { Asset } from "../../lib/types";
import { Nabil, useNabilMood } from "../nabil/Nabil";
import type { Proposal } from "../Modals";
import { useChat } from "./controller";
import { Composer } from "./Composer";
import { Conversation } from "./Conversation";
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
  const start = (text: string) =>
    setPrefill({ text: t(text), key: Date.now() });

  if (empty)
    return (
      <section className="home-landing home-v32" aria-labelledby="home-title">
        <div className="home-hero">
          <Nabil mood={mood} size={48} className="home-avatar" />
          <h1 id="home-title">{t("What would you like to prepare?")}</h1>
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
