"use client";
import { useEffect, useRef, useState } from "react";
import { IconArrowUp, IconCoin, IconSparkles, IconX } from "@revenue/ui";
import { Badge, Button } from "./primitives";
import { VoiceButton } from "./VoiceButton";
import { TABS, useWorkspace, type Tab } from "./workspace-context";
import type { Proposal } from "./Modals";
import { usePrefs } from "../lib/prefs";
import { client } from "../lib/client";
import type { Chat } from "../lib/types";

type ToolChip = { id: string; name: string; state: string; summary?: string };
type Live = { text: string; tools: ToolChip[]; error?: string };
type Event =
  | { type: "meta"; model: string; live: boolean; prompts: Record<string, string> }
  | { type: "text"; delta: string }
  | { type: "tool"; id: string; name: string; state: string; summary?: string }
  | { type: "quote"; input: Proposal["input"]; quote: Proposal["quote"] }
  | { type: "navigate"; screen: string }
  | { type: "error"; message: string }
  | { type: "done"; credits: number; steps: number };

const SUGGESTIONS = [
  "Which tier A accounts have a hiring signal?",
  "Draft messages for the selected accounts",
  "What is waiting in my review queue?",
  "اقترح أول ٣ حسابات نبدأ بيها",
];

export function Assistant({
  chats,
  setChats,
  onQuote,
  onNavigate,
  onClose,
}: {
  chats: Chat[];
  setChats: (chats: Chat[]) => void;
  onQuote: (proposal: Proposal) => void;
  onNavigate: (tab: Tab) => void;
  onClose: () => void;
}) {
  const { ws, data, play, selected, language, canWrite, action } = useWorkspace();
  const { t, language: uiLanguage } = usePrefs();
  const [chatInput, setChatInput] = useState("");
  const [live, setLive] = useState<Live | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [meta, setMeta] = useState<{ model: string; live: boolean } | null>(null);
  const [quote, setQuote] = useState<Proposal | null>(null);
  const [voiceError, setVoiceError] = useState("");
  const history = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    history.current?.scrollTo({ top: history.current.scrollHeight });
  }, [chats.length, live?.text, live?.tools.length]);
  useEffect(() => () => abort.current?.abort(), []);
  const send = async (content: string) => {
    if (!content.trim() || streaming) return;
    setStreaming(true);
    setQuote(null);
    setLive({ text: "", tools: [] });
    setChatInput("");
    setChats([
      ...chats,
      { id: `local-${Date.now()}`, role: "user", content },
    ]);
    abort.current = new AbortController();
    try {
      const response = await fetch(`/api/workspaces/${ws}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          context: { play, prospectIds: selected, language, uiLanguage },
        }),
        signal: abort.current.signal,
      });
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? t("The assistant is unavailable. Try again."));
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const line = frame.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          const event = JSON.parse(line.slice(6)) as Event;
          if (event.type === "meta") setMeta({ model: event.model, live: event.live });
          else if (event.type === "text")
            setLive((l) => (l ? { ...l, text: l.text + event.delta } : l));
          else if (event.type === "tool")
            setLive((l) =>
              l
                ? {
                    ...l,
                    tools: [
                      ...l.tools.filter((c) => c.id !== event.id),
                      { id: event.id, name: event.name, state: event.state, summary: event.summary },
                    ],
                  }
                : l,
            );
          else if (event.type === "quote") setQuote({ input: event.input, quote: event.quote });
          else if (event.type === "navigate" && TABS.includes(event.screen as Tab))
            onNavigate(event.screen as Tab);
          else if (event.type === "error")
            setLive((l) => (l ? { ...l, error: event.message } : l));
        }
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError")
        setLive((l) => ({
          text: l?.text ?? "",
          tools: l?.tools ?? [],
          error: (error as Error).message,
        }));
    } finally {
      setStreaming(false);
      try {
        setChats(await client.workspace<Chat[]>(ws, "/chat"));
        setLive((l) => (l?.error ? { text: "", tools: [], error: l.error } : null));
      } catch {
        /* keep the streamed text if history cannot reload */
      }
      void action(async () => {});
    }
  };
  return (
    <>
      <header className="assistant-head">
        <span className="ai-mark" aria-hidden>
          <IconSparkles size={14} />
        </span>
        <strong>{t("Workspace assistant")}</strong>
        {meta && (
          <span className="mono muted small" title={t("Model")}>
            {meta.live ? meta.model : "fixture"}
          </span>
        )}
        <button className="icon-button" aria-label={t("Close assistant")} onClick={onClose}>
          <IconX size={16} />
        </button>
      </header>
      <div className="assistant-context">
        <Badge tone="ai">{play}</Badge>
        <Badge>
          {selected.length} {t("selected")}
        </Badge>
        <Badge>{language}</Badge>
      </div>
      <div className="chat-history" ref={history} aria-live="polite">
        {!chats.length && !live && (
          <div className="assistant-welcome">
            <span className="ai-orb" aria-hidden />
            <h2>{t("A useful next step.")}</h2>
            <p>
              {t(
                "Tell me what you want to prepare. I’ll propose a workspace action for you to review.",
              )}
            </p>
            <p className="muted small">
              {data.modelFixture
                ? t("Fixture assistant · structured action suggestions. Model access is pending.")
                : t("Model proposals use reviewed context. Each action needs your cost approval.")}
            </p>
            <div className="suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} dir="auto" disabled={!canWrite} onClick={() => void send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {chats.map((c) => (
          <div className={`chat-message ${c.role}`} key={c.id}>
            <small className="eyebrow">{c.role === "user" ? t("You") : t("Assistant")}</small>
            <p dir="auto">{c.content}</p>
            {c.role === "assistant" && c.context?.tools?.length ? (
              <div className="tool-chips">
                {c.context.tools.map((name, i) => (
                  <span key={i} className="tool-chip mono">
                    {name.replaceAll("_", " ")}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {live && (
          <div className="chat-message assistant streaming">
            <small className="eyebrow">{t("Assistant")}</small>
            {live.tools.length > 0 && (
              <div className="tool-chips">
                {live.tools.map((tool) => (
                  <span
                    key={tool.id}
                    className={`tool-chip mono state-${tool.state}`}
                    title={tool.summary}
                  >
                    {tool.name.replaceAll("_", " ")}
                    {tool.state === "called" && " …"}
                  </span>
                ))}
              </div>
            )}
            {live.text ? (
              <p dir="auto">
                {live.text}
                {streaming && <span className="caret" aria-hidden />}
              </p>
            ) : (
              streaming && <p className="shimmer">{t("Thinking…")}</p>
            )}
            {live.error && <p className="error-text">{live.error}</p>}
          </div>
        )}
        {quote && (
          <div className="quote-card">
            <div>
              <p className="eyebrow">{t("Proposed action")}</p>
              <strong className="step-name">{quote.input.tool.replaceAll("_", " ")}</strong>
              <p className="muted small">
                {quote.quote.audience || t("Workspace")} {t("selected")} · {quote.input.language}
              </p>
            </div>
            <span className="quote-cost mono">
              <IconCoin size={14} aria-hidden /> {quote.quote.estimate}
            </span>
            <Button variant="ai" size="sm" onClick={() => onQuote(quote)}>
              {t("Review proposed action")}
            </Button>
          </div>
        )}
      </div>
      <form
        className="chat-compose"
        onSubmit={(e) => {
          e.preventDefault();
          void send(chatInput);
        }}
      >
        <label className="sr-only" htmlFor="assistant-input">
          {t("Message assistant")}
        </label>
        <textarea
          id="assistant-input"
          dir="auto"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && chatInput.trim()) {
              e.preventDefault();
              void send(chatInput);
            }
          }}
          placeholder={t("Prepare a draft for these accounts…")}
          required
          maxLength={3000}
        />
        {voiceError && <p className="error-text small">{voiceError}</p>}
        <div className="compose-bar">
          <span className="muted small mono">
            {data.modelFixture ? "↵ " + t("send") : `${t("1 credit per message")} · ↵`}
          </span>
          <div className="compose-actions">
            <VoiceButton
              ws={ws}
              language={uiLanguage === "ar" ? "ar" : "auto"}
              disabled={!canWrite || streaming}
              onError={setVoiceError}
              onText={(text) => {
                setVoiceError("");
                setChatInput((value) => (value ? `${value} ${text}` : text));
              }}
            />
            {streaming ? (
              <Button size="sm" onClick={() => abort.current?.abort()}>
                {t("Stop")}
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                size="sm"
                aria-label={t("Send")}
                disabled={!canWrite || !chatInput.trim()}
                startIcon={<IconArrowUp size={14} />}
              >
                {t("Send")}
              </Button>
            )}
          </div>
        </div>
      </form>
    </>
  );
}
