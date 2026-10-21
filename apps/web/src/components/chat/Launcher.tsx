"use client";
import { useEffect, useRef } from "react";
import { IconArrowsMaximize, IconEdit, IconX } from "@revenue/ui";
import { usePrefs } from "../../lib/prefs";
import type { Asset } from "../../lib/types";
import { Nabil, useNabilMood } from "../nabil/Nabil";
import type { Proposal } from "../Modals";
import { Button } from "../primitives";
import { useWorkspace } from "../workspace-context";
import { useChat } from "./controller";
import { Composer } from "./Composer";
import { Conversation } from "./Conversation";

// Floating Nabil on every screen except home: a bubble pinned to the inline end, and a
// popover bound to the same thread. "Expand" moves the conversation to the home page.
export function Launcher({
  open,
  onOpenChange,
  onExpand,
  onQuote,
  onOpenAsset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExpand: () => void;
  onQuote: (proposal: Proposal) => void;
  onOpenAsset: (asset: Asset) => void;
}) {
  const { t } = usePrefs();
  const workspace = useWorkspace();
  const chat = useChat();
  const mood = useNabilMood(chat.activity, !open);
  const bubble = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(open);
  const contextualAccountIds = Array.from(
    new Set([
      ...(workspace.activeProspectId ? [workspace.activeProspectId] : []),
      ...workspace.selected,
    ]),
  );
  const contextualAccounts = workspace.data.prospects.filter((prospect) =>
    contextualAccountIds.includes(prospect.id),
  );

  useEffect(() => {
    if (open)
      requestAnimationFrame(() =>
        panel.current?.querySelector("textarea")?.focus(),
      );
    else if (wasOpen.current) bubble.current?.focus();
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !document.querySelector('[role="dialog"]')
      ) {
        event.preventDefault();
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <div className="launcher nabil-launcher">
      {open && (
        <div
          className="launcher-panel"
          ref={panel}
          role="region"
          aria-label={t("Nabil assistant")}
        >
          <header className="launcher-head">
            <Nabil mood={mood} size={26} />
            <div className="launcher-title">
              <strong>{t("Nabil")}</strong>
              <span className="muted small truncate" dir="auto">
                {chat.thread?.title ?? t("New chat")}
              </span>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label={t("New chat")}
              title={t("New chat")}
              onClick={chat.newChat}
            >
              <IconEdit size={16} />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label={t("Open full conversation")}
              title={t("Open full conversation")}
              onClick={onExpand}
            >
              <IconArrowsMaximize size={16} />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label={t("Close Nabil")}
              onClick={() => onOpenChange(false)}
            >
              <IconX size={16} />
            </button>
          </header>
          {chat.threadId || chat.live || chat.messages.length ? (
            <Conversation compact onQuote={onQuote} onOpenAsset={onOpenAsset} />
          ) : (
            <div className="launcher-empty">
              <div className="launcher-empty-content">
                <p dir="auto">
                  {t("Ask about this screen, or tell me what to prepare.")}
                </p>
              </div>
            </div>
          )}
          {contextualAccounts.length > 0 && (
            <div className="launcher-contextual-actions">
              <Button
                type="button"
                variant="ai"
                className="launcher-quick-action"
                disabled={
                  !workspace.canWrite ||
                  chat.streaming ||
                  chat.loadingMessages
                }
                onClick={() => {
                  const prospectIds = contextualAccounts.map(
                    (prospect) => prospect.id,
                  );
                  const companies = contextualAccounts.map(
                    (prospect) => prospect.snapshot.company,
                  );
                  workspace.startNabil({
                    prompt: `${t("Draft a follow-up for")} ${companies.join(", ")}.`,
                    surface: "launcher",
                    context: {
                      prospectIds,
                      activeProspectId:
                        workspace.activeProspectId ?? prospectIds[0],
                    },
                  });
                }}
              >
                {t("Draft follow-up")}
              </Button>
            </div>
          )}
          <div className="launcher-dock">
            <Composer variant="compact" id="launcher-input" />
          </div>
        </div>
      )}
      <button
        ref={bubble}
        type="button"
        className={`launcher-bubble ${open ? "open" : ""}`}
        aria-label={open ? t("Close Nabil") : t("Ask Nabil")}
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        <Nabil mood={mood} size={26} />
        <span className="launcher-label">
          {open ? t("Close Nabil") : t("Ask Nabil")}
        </span>
        {chat.streaming && !open && (
          <span className="launcher-pulse" aria-hidden />
        )}
      </button>
    </div>
  );
}
