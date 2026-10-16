"use client";
import { useEffect, useState, type ReactNode } from "react";
import {
  IconBook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconFileText,
  IconMail,
  IconSearch,
  IconSend,
} from "@revenue/ui";
import { usePrefs } from "../../lib/prefs";
import type { Asset } from "../../lib/types";
import { Nabil, useNabilMood } from "../nabil/Nabil";
import type { Proposal } from "../Modals";
import { useChat } from "./controller";
import { Composer } from "./Composer";
import { Conversation } from "./Conversation";

const STARTERS = [
  { label: "Find accounts", icon: IconSearch, text: "Find the best accounts to contact this week and explain why." },
  { label: "Draft outreach", icon: IconSend, text: "Draft a three-step outreach sequence for " },
  { label: "One-pager", icon: IconFileText, text: "Create an offer one-pager for " },
  { label: "HTML email", icon: IconMail, text: "Create an HTML email (Gmail-safe) announcing " },
  { label: "Instagram carousel", icon: IconBrandInstagram, text: "Create an Instagram carousel about " },
  { label: "LinkedIn carousel", icon: IconBrandLinkedin, text: "Create a LinkedIn carousel about " },
  { label: "Flipbook", icon: IconBook, text: "Create a flipbook that walks a prospect through " },
] as const;

function greeting(name: string, t: (text: string) => string, arabic: boolean) {
  const hour = new Date().getHours();
  const first = name.split(/\s+/)[0] ?? "";
  const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return first ? `${t(part)}${arabic ? "، " : ", "}${first}` : t(part);
}

// Chat-first home (Jakob's Law: the same pattern as Claude and ChatGPT). With no thread open
// it is a centred composer; once a thread exists it becomes the conversation, optionally
// split with a deliverable canvas.
export function Home({
  userName,
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
  const { t, language } = usePrefs();
  const chat = useChat();
  const mood = useNabilMood(chat.activity);
  const [prefill, setPrefill] = useState<{ text: string; key: number } | null>(null);
  useEffect(() => {
    if (initialPrefill) setPrefill(initialPrefill);
  }, [initialPrefill]);
  const empty = !chat.threadId && !chat.live && !chat.messages.length;

  if (empty)
    return (
      <section className="home-landing" aria-labelledby="home-title">
        <div className="home-hero">
          <Nabil mood={mood} size={72} className="home-avatar" />
          <h1 id="home-title" dir="auto">
            {greeting(userName, t, language === "ar")}
          </h1>
          <p className="home-sub">{t("What should Nabil prepare for you today?")}</p>
        </div>
        <Composer variant="hero" autoFocus prefill={prefill} />
        <div className="starter-row" role="list" aria-label={t("Start from")}>
          {STARTERS.map(({ label, icon: Icon, text }) => (
            <button
              key={label}
              type="button"
              role="listitem"
              className="starter"
              onClick={() => setPrefill({ text: t(text), key: Date.now() })}
            >
              <Icon size={15} aria-hidden />
              <span>{t(label)}</span>
            </button>
          ))}
        </div>
      </section>
    );

  return (
    <div className={`home-conversation ${canvas ? "with-canvas" : ""}`}>
      <section className="conversation-column" aria-label={t("Conversation with Nabil")}>
        <Conversation onQuote={onQuote} onOpenAsset={onOpenAsset} />
        <div className="conversation-dock">
          <Composer variant="dock" />
        </div>
      </section>
      {canvas}
    </div>
  );
}
