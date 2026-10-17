"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  IconArrowUp,
  IconPlayerStopFilled,
  IconPlus,
  IconX,
} from "@revenue/ui";
import { PLAYS } from "@revenue/contracts";
import { usePrefs } from "../../lib/prefs";
import { assetLabel } from "../../lib/asset-label";
import { VoiceButton } from "../VoiceButton";
import { useWorkspace } from "../workspace-context";
import { useChat } from "./controller";

const LANGUAGES = [
  ["auto", "Auto (match my message)"],
  ["en", "English"],
  ["ar-EG", "Arabic (Egypt)"],
  ["ar-Gulf", "Arabic (Gulf)"],
] as const;

// Shared composer: hero on the home page, docked in a conversation, compact in the launcher.
export function Composer({
  variant = "dock",
  placeholder,
  autoFocus,
  prefill,
  id = "assistant-input",
}: {
  variant?: "hero" | "dock" | "compact";
  placeholder?: string;
  autoFocus?: boolean;
  prefill?: { text: string; key: number } | null;
  id?: string;
}) {
  const { t, language: uiLanguage } = usePrefs();
  const chat = useChat();
  const {
    ws,
    data,
    canWrite,
    selected,
    setSelected,
    play,
    setPlay,
    chatLanguage,
    setChatLanguage,
    activeAssetId,
  } = useWorkspace();
  const [text, setText] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const asset = data.assets.find((a) => a.id === activeAssetId);

  useEffect(() => {
    if (!prefill) return;
    setText(prefill.text);
    requestAnimationFrame(() => {
      const el = area.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(prefill.text.length, prefill.text.length);
    });
  }, [prefill]);

  // Autosize: grow with content up to the CSS max-height.
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menu.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const submit = () => {
    if (!text.trim() || chat.streaming || !canWrite) return;
    const value = text;
    setText("");
    void chat.send(value);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      submit();
    }
    if (event.key === "Escape" && menuOpen) setMenuOpen(false);
  };

  return (
    <form
      className={`composer composer-${variant}`}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {(selected.length > 0 || asset) && (
        <div className="composer-context">
          {selected.length > 0 && (
            <span className="context-chip">
              {selected.length}{" "}
              {t(selected.length === 1 ? "account" : "accounts")}
              <button
                type="button"
                aria-label={t("Clear selected accounts")}
                onClick={() => setSelected(() => [])}
              >
                <IconX size={12} />
              </button>
            </span>
          )}
          {asset && (
            <span
              className="context-chip"
              dir="auto"
              title={assetLabel(asset, t)}
            >
              {t("Editing")}: <bdi>{assetLabel(asset, t)}</bdi>
            </span>
          )}
        </div>
      )}
      <label className="sr-only" htmlFor={id}>
        {t("Message Nabil")}
      </label>
      <textarea
        id={id}
        ref={area}
        dir="auto"
        rows={variant === "hero" ? 3 : 1}
        value={text}
        autoFocus={autoFocus}
        maxLength={3000}
        disabled={!canWrite}
        placeholder={
          placeholder ??
          t(
            activeAssetId
              ? "Change the heading, layout or wording…"
              : "Ask Nabil to find, draft or create…",
          )
        }
        onChange={(event) => {
          setText(event.target.value);
          chat.setTyping();
        }}
        onKeyDown={onKeyDown}
      />
      {voiceError && <p className="error-text small">{voiceError}</p>}
      <div className="composer-bar">
        <div className="composer-tools" ref={menu}>
          <button
            type="button"
            className="icon-button"
            aria-label={t("Add context")}
            aria-expanded={menuOpen}
            aria-haspopup="true"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <IconPlus size={16} />
          </button>
          {menuOpen && (
            <div
              className="composer-menu"
              role="group"
              aria-label={t("Add context")}
            >
              <p className="eyebrow">{t("Play")}</p>
              {PLAYS.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  aria-pressed={play === p.id}
                  onClick={() => setPlay(p.id as typeof play)}
                >
                  <span className="mono">{p.id}</span>
                  <span>{t(p.name)}</span>
                </button>
              ))}
              <p className="eyebrow">{t("Content language")}</p>
              {LANGUAGES.map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={chatLanguage === value}
                  onClick={() => setChatLanguage(value)}
                >
                  <span>{t(label)}</span>
                </button>
              ))}
            </div>
          )}
          <span className="composer-meta mono">
            {play} ·{" "}
            {chatLanguage === "auto" ? t("Auto language") : chatLanguage}
          </span>
        </div>
        <div className="composer-actions">
          <VoiceButton
            ws={ws}
            language={uiLanguage === "ar" ? "ar" : "auto"}
            disabled={!canWrite || chat.streaming}
            onError={setVoiceError}
            onStateChange={(state) => chat.setRecording(state === "recording")}
            onText={(spoken) => {
              setVoiceError("");
              setText((value) => (value ? `${value} ${spoken}` : spoken));
            }}
          />
          {chat.streaming ? (
            <button
              type="button"
              className="send-button stop"
              aria-label={t("Stop")}
              onClick={chat.stop}
            >
              <IconPlayerStopFilled size={14} />
            </button>
          ) : (
            <button
              type="submit"
              className="send-button"
              aria-label={t("Send")}
              disabled={!canWrite || !text.trim()}
            >
              <IconArrowUp size={16} />
            </button>
          )}
        </div>
      </div>
      {variant !== "compact" && (
        <p className="composer-note muted">
          {data.modelFixture
            ? t("Fixture assistant · no model call is made.")
            : t(
                "Nabil proposes actions. Spending stays within your caps; nothing is sent without your approval. 1 credit per reply.",
              )}
        </p>
      )}
    </form>
  );
}
