"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { assistantUiAction, type AssistantUiAction } from "@revenue/contracts";
import { client } from "../../lib/client";
import type { Chat, Thread } from "../../lib/types";
import type { Proposal } from "../Modals";
import type { ChatActivity } from "../nabil/Nabil";

// One Nabil conversation state for the whole shell, so the home page and the floating
// launcher show the same thread and a stream keeps going when the user changes screen.

export type ToolStep = {
  id: string;
  name: string;
  state: string;
  summary?: string;
};
export type LiveTurn = { text: string; tools: ToolStep[]; error?: string };
export type TurnContext = {
  play: "P1" | "P2" | "P3" | "P4";
  prospectIds: string[];
  language?: "en" | "ar-EG" | "ar-Gulf" | "ar";
  uiLanguage?: "en" | "ar";
  screen?: string;
  activeProspectId?: string;
  activeAssetId?: string;
};
type StreamEvent =
  | { type: "thread"; id: string; title: string }
  | { type: "meta"; model: string; live: boolean }
  | { type: "text"; delta: string }
  | { type: "tool"; id: string; name: string; state: string; summary?: string }
  | { type: "quote"; input: Proposal["input"]; quote: Proposal["quote"] }
  | { type: "run"; runId: string }
  | { type: "navigate"; screen: string }
  | { type: "ui_action"; action: AssistantUiAction }
  | { type: "error"; message: string }
  | { type: "done"; messageId: string; credits: number; steps: number };

export type ChatController = {
  threads: Thread[];
  threadId: string | null;
  thread: Thread | undefined;
  messages: Chat[];
  loadingMessages: boolean;
  messagesError: boolean;
  live: LiveTurn | null;
  streaming: boolean;
  quote: Proposal | null;
  meta: { model: string; live: boolean } | null;
  activity: ChatActivity;
  send: (content: string, context?: TurnContext) => Promise<void>;
  stop: () => void;
  retry: () => void;
  newChat: () => void;
  openThread: (id: string | null) => void;
  archive: (id: string) => Promise<void>;
  rename: (id: string, title: string) => Promise<void>;
  feedback: (messageId: string, value: "up" | "down" | null) => Promise<void>;
  reload: () => Promise<void>;
  setTyping: () => void;
  setRecording: (recording: boolean) => void;
  celebrate: () => void;
};

export function useChatController({
  ws,
  enabled,
  context,
  runActive,
  onQuote,
  onRun,
  onUiAction,
  onNavigate,
  onSettled,
  t,
}: {
  ws: string;
  enabled: boolean;
  context: () => TurnContext;
  runActive: boolean;
  onQuote: (proposal: Proposal) => void;
  onRun: (id: string) => void;
  onUiAction: (action: AssistantUiAction) => Promise<void>;
  onNavigate: (screen: string) => void;
  onSettled: () => void;
  t: (text: string) => string;
}): ChatController {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Chat[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState(false);
  const [live, setLive] = useState<LiveTurn | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [quote, setQuote] = useState<Proposal | null>(null);
  const [meta, setMeta] = useState<{ model: string; live: boolean } | null>(
    null,
  );
  const [typingAt, setTypingAt] = useState(0);
  const [recording, setRecording] = useState(false);
  const [celebratedAt, setCelebratedAt] = useState(0);
  const [lastActiveAt, setLastActiveAt] = useState(() => Date.now());
  const activeRequest = useRef<{
    controller: AbortController;
    workspaceId: string;
  } | null>(null);
  const threadRef = useRef<string | null>(null);
  const wsRef = useRef(ws);
  wsRef.current = ws;
  const handlers = useRef({
    context,
    onQuote,
    onRun,
    onUiAction,
    onNavigate,
    onSettled,
    t,
  });
  handlers.current = {
    context,
    onQuote,
    onRun,
    onUiAction,
    onNavigate,
    onSettled,
    t,
  };
  const lastSent = useRef<{
    text: string;
    workspaceId: string;
    context: TurnContext;
  } | null>(null);

  useEffect(() => {
    threadRef.current = threadId;
  }, [threadId]);

  const loadThreads = useCallback(async () => {
    if (!ws) return;
    const rows = await client.workspace<Thread[]>(ws, "/threads");
    if (wsRef.current === ws) setThreads(rows);
  }, [ws]);

  const loadMessages = useCallback(
    async (id: string | null) => {
      if (!ws || !id) {
        setMessages([]);
        return;
      }
      const rows = await client.workspace<Chat[]>(
        ws,
        `/threads/${id}/messages`,
      );
      if (wsRef.current === ws && threadRef.current === id) setMessages(rows);
    },
    [ws],
  );

  // A workspace change resets every conversation view.
  useEffect(() => {
    wsRef.current = ws;
    activeRequest.current?.controller.abort();
    activeRequest.current = null;
    lastSent.current = null;
    threadRef.current = null;
    setThreadId(null);
    setThreads([]);
    setMessages([]);
    setMessagesError(false);
    setLoadingMessages(false);
    setLive(null);
    setQuote(null);
    setStreaming(false);
    if (!enabled || !ws) return;
    void loadThreads().catch(() => {});
  }, [ws, enabled, loadThreads]);

  const openThread = useCallback(
    (id: string | null) => {
      if (id === threadRef.current && id !== null) return;
      activeRequest.current?.controller.abort();
      activeRequest.current = null;
      setStreaming(false);
      threadRef.current = id;
      setThreadId(id);
      setLive(null);
      setQuote(null);
      setMessages([]);
      setMessagesError(false);
      setLoadingMessages(false);
      if (!id) return;
      setLoadingMessages(true);
      void loadMessages(id)
        .catch(() => {
          if (threadRef.current === id) setMessagesError(true);
        })
        .finally(() => {
          if (threadRef.current === id) setLoadingMessages(false);
        });
    },
    [loadMessages],
  );

  const reload = useCallback(async () => {
    const id = threadRef.current;
    setMessagesError(false);
    if (id) setLoadingMessages(true);
    await Promise.all([
      loadThreads().catch(() => {}),
      loadMessages(id).catch(() => {
        if (threadRef.current === id) setMessagesError(true);
      }),
    ]);
    if (threadRef.current === id) setLoadingMessages(false);
  }, [loadThreads, loadMessages]);

  const send = useCallback(
    async (content: string, contextSnapshot?: TurnContext) => {
      const text = content.trim();
      if (!text || activeRequest.current || !ws) return;
      const controller = new AbortController();
      const request = { controller, workspaceId: ws };
      activeRequest.current = request;
      const providedContext = contextSnapshot ?? handlers.current.context();
      const sentContext: TurnContext = {
        ...providedContext,
        prospectIds: [...providedContext.prospectIds],
      };
      lastSent.current = { text, workspaceId: ws, context: sentContext };
      setLastActiveAt(Date.now());
      setStreaming(true);
      setQuote(null);
      setLive({ text: "", tools: [] });
      setMessages((rows) => [
        ...rows,
        { id: `local-${Date.now()}`, role: "user", content: text },
      ]);
      const startedIn = ws;
      try {
        const response = await fetch(`/api/workspaces/${ws}/chat/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: text,
            threadId: threadRef.current ?? undefined,
            context: sentContext,
          }),
          signal: controller.signal,
        });
        if (!response.ok || !response.body) {
          const body = await response.json().catch(() => ({}));
          throw new Error(
            body.message ??
              handlers.current.t("Nabil is unavailable. Try again."),
          );
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
            const event = JSON.parse(line.slice(6)) as StreamEvent;
            if (
              wsRef.current !== startedIn ||
              activeRequest.current !== request
            )
              return;
            if (event.type === "thread") {
              if (threadRef.current !== event.id) {
                threadRef.current = event.id;
                setThreadId(event.id);
                setThreads((rows) =>
                  rows.some((r) => r.id === event.id)
                    ? rows
                    : [
                        {
                          id: event.id,
                          title: event.title,
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                        },
                        ...rows,
                      ],
                );
              }
            } else if (event.type === "meta")
              setMeta({ model: event.model, live: event.live });
            else if (event.type === "text")
              setLive((l) => (l ? { ...l, text: l.text + event.delta } : l));
            else if (event.type === "tool")
              setLive((l) =>
                l
                  ? {
                      ...l,
                      tools: [
                        ...l.tools.filter((c) => c.id !== event.id),
                        {
                          id: event.id,
                          name: event.name,
                          state: event.state,
                          summary: event.summary,
                        },
                      ],
                    }
                  : l,
              );
            else if (event.type === "quote")
              setQuote({ input: event.input, quote: event.quote });
            else if (event.type === "run") {
              handlers.current.onRun(event.runId);
              handlers.current.onSettled();
            } else if (event.type === "ui_action") {
              const parsed = assistantUiAction.safeParse(event.action);
              if (parsed.success)
                await handlers.current.onUiAction(parsed.data).catch(() => {});
            } else if (event.type === "navigate")
              handlers.current.onNavigate(event.screen);
            else if (event.type === "error")
              setLive((l) => (l ? { ...l, error: event.message } : l));
          }
        }
      } catch (error) {
        if (
          activeRequest.current === request &&
          (error as Error).name !== "AbortError"
        )
          setLive((l) => ({
            text: l?.text ?? "",
            tools: l?.tools ?? [],
            error: (error as Error).message,
          }));
      } finally {
        if (
          activeRequest.current === request &&
          wsRef.current === startedIn &&
          request.workspaceId === startedIn
        ) {
          try {
            await Promise.all([loadMessages(threadRef.current), loadThreads()]);
            if (activeRequest.current !== request) return;
            setLive((l) =>
              l?.error ? { text: "", tools: [], error: l.error } : null,
            );
          } catch {
            /* keep the streamed text if history cannot reload */
          }
          if (activeRequest.current !== request) return;
          handlers.current.onSettled();
        }
        if (
          activeRequest.current === request &&
          wsRef.current === startedIn
        ) {
          activeRequest.current = null;
          setStreaming(false);
          setLastActiveAt(Date.now());
        }
      }
    },
    [ws, loadMessages, loadThreads],
  );

  const stop = useCallback(() => {
    const request = activeRequest.current;
    if (!request) return;
    activeRequest.current = null;
    request.controller.abort();
    setStreaming(false);
    setLive((turn) =>
      turn && (turn.text || turn.tools.length) ? turn : null,
    );
    setLastActiveAt(Date.now());
    handlers.current.onSettled();
  }, []);
  const retry = useCallback(() => {
    const previous = lastSent.current;
    if (previous?.workspaceId === ws)
      void send(previous.text, previous.context);
  }, [send, ws]);
  const newChat = useCallback(() => openThread(null), [openThread]);

  const archive = useCallback(
    async (id: string) => {
      await client.workspace(ws, `/threads/${id}`, { method: "DELETE" });
      setThreads((rows) => rows.filter((r) => r.id !== id));
      if (threadRef.current === id) openThread(null);
    },
    [ws, openThread],
  );
  const rename = useCallback(
    async (id: string, title: string) => {
      const row = await client.workspace<Thread>(ws, `/threads/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      });
      setThreads((rows) => rows.map((r) => (r.id === id ? row : r)));
    },
    [ws],
  );
  const feedback = useCallback(
    async (messageId: string, value: "up" | "down" | null) => {
      setMessages((rows) =>
        rows.map((m) =>
          m.id === messageId
            ? { ...m, context: { ...m.context, feedback: value } }
            : m,
        ),
      );
      await client.workspace(ws, `/chat/${messageId}/feedback`, {
        method: "PATCH",
        body: JSON.stringify({ value }),
      });
    },
    [ws],
  );

  const activity = useMemo<ChatActivity>(
    () => ({
      streaming,
      hasText: Boolean(live?.text),
      tools: live?.tools ?? [],
      recording,
      typingAt,
      runActive,
      celebratedAt,
      lastActiveAt,
    }),
    [
      streaming,
      live,
      recording,
      typingAt,
      runActive,
      celebratedAt,
      lastActiveAt,
    ],
  );

  return {
    threads,
    threadId,
    thread: threads.find((r) => r.id === threadId),
    messages,
    loadingMessages,
    messagesError,
    live,
    streaming,
    quote,
    meta,
    activity,
    send,
    stop,
    retry,
    newChat,
    openThread,
    archive,
    rename,
    feedback,
    reload,
    setTyping: useCallback(() => {
      const now = Date.now();
      setTypingAt(now);
      setLastActiveAt(now);
    }, []),
    setRecording,
    celebrate: useCallback(() => setCelebratedAt(Date.now()), []),
  };
}

const ChatContext = createContext<ChatController | null>(null);
export const ChatProvider = ChatContext.Provider;
export function useChat() {
  const value = useContext(ChatContext);
  if (!value) throw new Error("useChat must be used inside the shell");
  return value;
}
