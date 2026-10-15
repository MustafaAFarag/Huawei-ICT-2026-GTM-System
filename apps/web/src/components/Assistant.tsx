"use client";
import { useEffect, useRef, useState } from "react";
import type { ToolName } from "@revenue/contracts";
import { IconArrowUp, IconSparkles, IconX } from "@revenue/ui";
import { Badge, Button } from "./primitives";
import { useWorkspace } from "./workspace-context";
import { usePrefs } from "../lib/prefs";
import { client } from "../lib/client";
import type { Chat } from "../lib/types";

export function Assistant({
  chats,
  setChats,
  chatTool,
  setChatTool,
  onClose,
}: {
  chats: Chat[];
  setChats: (chats: Chat[]) => void;
  chatTool: ToolName | null;
  setChatTool: (tool: ToolName | null) => void;
  onClose: () => void;
}) {
  const { ws, data, play, selected, language, busy, canWrite, action, propose } =
    useWorkspace();
  const { t } = usePrefs();
  const [chatInput, setChatInput] = useState("");
  const history = useRef<HTMLDivElement>(null);
  useEffect(() => {
    history.current?.scrollTo({ top: history.current.scrollHeight });
  }, [chats.length]);
  const send = () =>
    void action(async () => {
      const result = await client.workspace<{
        tool: ToolName;
        requiresApproval?: boolean;
      }>(ws, "/chat", {
        method: "POST",
        body: JSON.stringify({
          content: chatInput,
          context: { play, prospectIds: selected },
        }),
      });
      if (result.requiresApproval) {
        await propose("assistant", [], undefined, chatInput);
        setChatTool(null);
      } else setChatTool(result.tool);
      setChatInput("");
      setChats(await client.workspace<Chat[]>(ws, "/chat"));
    });
  return (
    <>
      <header className="assistant-head">
        <span className="ai-mark" aria-hidden>
          <IconSparkles size={14} />
        </span>
        <strong>{t("Workspace assistant")}</strong>
        <button
          className="icon-button"
          aria-label={t("Close assistant")}
          onClick={onClose}
        >
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
      <div className="chat-history" ref={history}>
        {!chats.length && (
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
                ? t(
                    "Fixture assistant · structured action suggestions. Model access is pending.",
                  )
                : t(
                    "Model proposals use reviewed context. Each action needs your cost approval.",
                  )}
            </p>
          </div>
        )}
        {chats.map((c) => (
          <div className={`chat-message ${c.role}`} key={c.id}>
            <small className="eyebrow">
              {c.role === "user" ? t("You") : t("Assistant")}
            </small>
            <p dir="auto">{c.content}</p>
            {c.context?.tool && c.role === "assistant" && (
              <span className="tool-chip mono">
                {c.context.tool.replaceAll("_", " ")}
              </span>
            )}
          </div>
        ))}
        {chatTool && (
          <Button
            variant="ai"
            disabled={busy || !canWrite}
            onClick={() => void propose(chatTool)}
          >
            {t("Review proposed action")}
          </Button>
        )}
      </div>
      <form
        className="chat-compose"
        onSubmit={(e) => {
          e.preventDefault();
          send();
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
              send();
            }
          }}
          placeholder={t("Prepare a draft for these accounts…")}
          required
          maxLength={3000}
        />
        <div className="compose-bar">
          <span className="muted small mono">↵ {t("send")} · ⇧↵ {t("newline")}</span>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            aria-label={t("Send")}
            disabled={busy || !canWrite || !chatInput.trim()}
            startIcon={<IconArrowUp size={14} />}
          >
            {t("Send")}
          </Button>
        </div>
      </form>
    </>
  );
}
