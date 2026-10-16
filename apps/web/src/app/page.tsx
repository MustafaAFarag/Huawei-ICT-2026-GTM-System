"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AssistantUiAction,
  ToolName,
  ToolRequest,
} from "@revenue/contracts";
import { IconShieldCheck, IconX } from "@revenue/ui";
import { client } from "../lib/client";
import { usePrefs } from "../lib/prefs";
import type { Asset, Dashboard, Membership, Prospect, Run } from "../lib/types";
import { Button, Empty, ErrorPanel, Skeleton } from "../components/primitives";
import { Sidebar, Topbar } from "../components/Shell";
import { CommandPalette } from "../components/CommandPalette";
import { CostModal, type Proposal } from "../components/Modals";
import { ArtifactCanvas } from "../components/ArtifactCanvas";
import { SignIn } from "../components/SignIn";
import {
  TABS,
  TAB_LABELS,
  WorkspaceProvider,
  type Tab,
  type View,
  type WorkspaceValue,
} from "../components/workspace-context";
import { ChatProvider, useChatController } from "../components/chat/controller";
import { Home } from "../components/chat/Home";
import { Launcher } from "../components/chat/Launcher";
import { Plays } from "../components/screens/Plays";
import { Accounts } from "../components/screens/Accounts";
import { ProspectReview } from "../components/screens/ProspectReview";
import { ReviewQueue } from "../components/screens/ReviewQueue";
import { AssetStudio } from "../components/screens/AssetStudio";
import { Sequences } from "../components/screens/Sequences";
import { ContextForm } from "../components/screens/ContextForm";
import { Settings } from "../components/screens/Settings";

const DESCRIPTIONS: Record<Tab, string> = {
  Plays: "Start with a goal. Review each step before moving forward.",
  Accounts: "Source facts, score fit, and choose who to approach.",
  "Review queue":
    "Every message is approved by a person before it can be sent.",
  "Asset Studio":
    "Every document, email and carousel Nabil prepared, filed by account.",
  Sequences: "Prepared touches, holdouts and recorded outcomes.",
  "Company context": "The brand, offer and customer every play draws on.",
  Settings: "Spending, quotas, connectors and the audit trail.",
};

// URL state: ?s=<screen> (absent on home) and ?c=<conversation>. Back and refresh restore both.
function readUrl(): { view: View; thread: string | null } {
  const params = new URLSearchParams(location.search);
  const s = params.get("s");
  return {
    view: TABS.includes(s as Tab) ? (s as Tab) : "Home",
    thread: params.get("c"),
  };
}
function urlFor(view: View, thread: string | null) {
  const params = new URLSearchParams();
  if (view !== "Home") params.set("s", view);
  if (thread) params.set("c", thread);
  const query = params.toString();
  return query ? `?${query}` : location.pathname;
}

export default function Page() {
  const { t, language: uiLanguage } = usePrefs();
  const [memberships, setMemberships] = useState<Membership[]>([]),
    [userName, setUserName] = useState(""),
    [userId, setUserId] = useState(""),
    [ws, setWs] = useState("");
  const [authState, setAuthState] = useState<"loading" | "signin" | "ready">(
    "loading",
  );
  const [data, setData] = useState<Dashboard | null>(null),
    [view, setViewState] = useState<View>("Home"),
    [play, setPlay] = useState<ToolRequest["play"]>("P1");
  const [selected, setSelected] = useState<string[]>([]),
    [language, setLanguage] = useState<ToolRequest["language"]>("en"),
    [chatLanguage, setChatLanguage] = useState<
      "auto" | ToolRequest["language"]
    >("auto");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [launcherOpen, setLauncherOpen] = useState(false),
    [paletteOpen, setPaletteOpen] = useState(false),
    [collapsed, setCollapsed] = useState(false),
    [navOpen, setNavOpen] = useState(false);
  const [aiCursor, setAiCursor] = useState<{
    x: number;
    y: number;
    label: string;
  } | null>(null);
  const cursorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (cursorTimer.current) clearTimeout(cursorTimer.current);
    },
    [],
  );
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [activeRun, setActiveRun] = useState<string | null>(null);
  const [homePrefill, setHomePrefill] = useState<{
    text: string;
    key: number;
  } | null>(null);
  const [preview, setPreview] = useState<Asset | null>(null),
    [prospect, setProspect] = useState<Prospect | null>(null);
  const activeWorkspace = useRef(ws);
  useEffect(() => {
    activeWorkspace.current = ws;
  }, [ws]);
  const viewRef = useRef(view);
  viewRef.current = view;
  const refresh = useCallback(async () => {
    if (!ws) return;
    const result = await client.workspace<Dashboard>(ws);
    if (activeWorkspace.current === ws) setData(result);
  }, [ws]);

  const setView = useCallback((next: View) => {
    setViewState(next);
    setProspect(null);
    setPreview(null);
    setNavOpen(false);
  }, []);
  const setTab = useCallback((next: Tab) => setView(next), [setView]);

  const openAsset = useCallback((asset: Asset) => {
    if (viewRef.current !== "Home") setViewState("Asset Studio");
    setProspect(null);
    setPreview(asset);
    if (asset.prospectId) setSelected([asset.prospectId]);
  }, []);

  const runActive = Boolean(
    data?.runs.some((r) => ["queued", "running"].includes(r.state)),
  );
  const contextRef = useRef({
    play,
    selected,
    chatLanguage,
    view,
    prospect,
    preview,
  });
  contextRef.current = {
    play,
    selected,
    chatLanguage,
    view,
    prospect,
    preview,
  };

  // Assistant UI actions: allowlisted product navigation with a brief visible cursor.
  const assistantAction = async (ui: AssistantUiAction) => {
    if (!data || activeWorkspace.current !== ws) return;
    const fromHome = viewRef.current === "Home";
    let target = "";
    let label = "";
    if (ui.kind === "navigate") {
      target = `screen:${ui.screen}`;
      label = t(TAB_LABELS[ui.screen]);
      setView(ui.screen);
    } else if (ui.kind === "open_account") {
      const record = data.prospects.find((p) => p.id === ui.prospectId);
      if (!record)
        throw new Error(t("Account not found. Reload the workspace."));
      setView("Accounts");
      setProspect(record);
      setSelected([record.id]);
      target = "account-detail";
      label = record.snapshot.company;
    } else if (ui.kind === "open_asset") {
      const asset = data.assets.find((a) => a.id === ui.assetId);
      if (!asset) throw new Error(t("Asset not found. Reload the workspace."));
      openAsset(asset);
      target = "asset-preview";
      label = t("Preview");
    } else {
      if (ui.prospectIds.some((id) => !data.prospects.some((p) => p.id === id)))
        throw new Error(t("Account not found. Reload the workspace."));
      setSelected(ui.prospectIds);
      target = fromHome ? "" : `screen:${viewRef.current}`;
      label = t("Accounts selected");
    }
    // Leaving home keeps the conversation visible in the launcher.
    if (fromHome && ui.kind !== "open_asset" && ui.kind !== "select_accounts")
      setLauncherOpen(true);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    if (activeWorkspace.current !== ws || !target) return;
    const element = document.querySelector<HTMLElement>(
      `[data-ai-target="${CSS.escape(target)}"]`,
    );
    if (element) {
      if (ui.kind !== "select_accounts")
        document.querySelector(".main")?.scrollTo({ top: 0 });
      element.classList.add("ai-target-active");
      const box = element.getBoundingClientRect();
      setAiCursor({
        x: Math.min(innerWidth - 140, Math.max(12, box.x + box.width / 2)),
        y: Math.min(innerHeight - 48, Math.max(12, box.y + 20)),
        label,
      });
      if (cursorTimer.current) clearTimeout(cursorTimer.current);
      cursorTimer.current = setTimeout(() => {
        setAiCursor(null);
        document
          .querySelectorAll(".ai-target-active")
          .forEach((e) => e.classList.remove("ai-target-active"));
      }, 1000);
    }
  };
  const assistantActionRef = useRef(assistantAction);
  assistantActionRef.current = assistantAction;

  const chat = useChatController({
    ws,
    enabled: authState === "ready",
    runActive,
    t,
    context: () => {
      const c = contextRef.current;
      return {
        play: c.play,
        prospectIds: c.selected,
        // Omitted on auto: the API detects the language and dialect from the request.
        language: c.chatLanguage === "auto" ? undefined : c.chatLanguage,
        uiLanguage,
        screen: c.view,
        activeProspectId: c.prospect?.id,
        activeAssetId: c.preview?.id,
      };
    },
    onQuote: setProposal,
    onRun: setActiveRun,
    onUiAction: (ui) => assistantActionRef.current(ui),
    onNavigate: (screen) => {
      if (TABS.includes(screen as Tab)) setView(screen as Tab);
    },
    onSettled: () => void refresh().catch(() => {}),
  });

  const loadMe = async () => {
    try {
      const me = await client.request<{
        user: { id: string; name: string };
        workspaces: Membership[];
      }>("/me");
      setMemberships(me.workspaces);
      setUserName(me.user.name);
      setUserId(me.user.id);
      const previous = sessionStorage.getItem("revenue-workspace");
      setWs(
        me.workspaces.find((m) => m.workspace.id === previous)?.workspace.id ??
          me.workspaces[0]?.workspace.id ??
          "",
      );
      setAuthState("ready");
    } catch {
      setAuthState("signin");
    }
  };
  useEffect(() => {
    void loadMe();
    setCollapsed(localStorage.getItem("revenue-sidebar") === "collapsed");
    setViewState(readUrl().view);
  }, []);

  // The first workspace load restores the conversation from the URL; later switches keep the
  // current screen and start a fresh conversation.
  const urlRestored = useRef(false);
  useEffect(() => {
    setData(null);
    setSelected([]);
    setProspect(null);
    setProposal(null);
    setPreview(null);
    setActiveRun(null);
    setError("");
    if (!ws) return;
    sessionStorage.setItem("revenue-workspace", ws);
    void refresh().catch((e) => {
      if (activeWorkspace.current === ws) setError(e.message);
    });
    if (!urlRestored.current) {
      urlRestored.current = true;
      const thread = readUrl().thread;
      if (thread) chat.openThread(thread);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws, refresh]);

  // Keep the address bar in step with the view and thread; popstate restores them.
  const fromHistory = useRef(false);
  useEffect(() => {
    if (authState !== "ready") return;
    const next = urlFor(view, chat.threadId);
    const current = location.search || location.pathname;
    if (fromHistory.current) {
      fromHistory.current = false;
      return;
    }
    if (next !== current && !(next === location.pathname && !location.search))
      history.pushState(null, "", next);
  }, [view, chat.threadId, authState]);
  useEffect(() => {
    const onPop = () => {
      const state = readUrl();
      fromHistory.current = true;
      setView(state.view);
      chat.openThread(state.thread);
    };
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, [setView, chat.openThread]);

  useEffect(() => {
    if (!activeRun || !ws) return;
    const stream = new EventSource(
      `/api/workspaces/${ws}/runs/${activeRun}/events`,
    );
    stream.onmessage = (event) => {
      const row = JSON.parse(event.data);
      if (["succeeded", "failed"].includes(row.kind)) {
        stream.close();
        if (row.kind === "succeeded") chat.celebrate();
        void refresh();
        void chat.reload();
      }
    };
    stream.onerror = () => {
      stream.close();
      void refresh();
    };
    return () => stream.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRun, ws, refresh]);
  useEffect(() => {
    if (!runActive) return;
    const timer = setInterval(() => {
      void refresh().catch((e) => setError(e.message));
      void chat.reload();
    }, 3000);
    return () => clearInterval(timer);
  }, [runActive, refresh, chat.reload]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  // ⌘K / Ctrl+K opens the palette; "g" then a digit jumps to a screen.
  useEffect(() => {
    let pendingG = 0;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      const target = event.target as HTMLElement;
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
        target.isContentEditable ||
        document.querySelector('[role="dialog"]')
      )
        return;
      if (event.key === "g") {
        pendingG = Date.now();
        return;
      }
      const index = Number(event.key) - 1;
      if (Date.now() - pendingG < 900 && TABS[index]) {
        setTab(TABS[index]);
        pendingG = 0;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setTab]);
  const action = useCallback(
    async (fn: () => Promise<unknown>, success?: string) => {
      setBusy(true);
      setError("");
      setNotice("");
      try {
        await fn();
        await refresh();
        if (success) setNotice(success);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "The action failed. Try again.",
        );
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );
  const propose = useCallback(
    async (
      tool: ToolName,
      draftIds: string[] = [],
      website?: string,
      message?: string,
    ) =>
      action(async () => {
        const input: ToolRequest = {
          tool,
          requestKey: crypto.randomUUID(),
          prospectIds: ["preflight", "onboard", "queue_sequence"].includes(tool)
            ? []
            : selected,
          draftIds,
          play,
          language,
          template: play === "P4" ? "mini-audit" : "offer-one-pager",
          approvedSpend: false,
          holdoutPercent: 20,
          website,
          message,
        };
        const quote = await client.workspace<Proposal["quote"]>(ws, "/quotes", {
          method: "POST",
          body: JSON.stringify(input),
        });
        setProposal({ input, quote });
      }),
    [action, selected, play, language, ws],
  );
  const launch = () =>
    action(async () => {
      if (!proposal) return;
      await client.workspace(ws, `/quotes/${proposal.quote.id}/approve`, {
        method: "POST",
      });
      const run = await client.workspace<Run>(ws, "/runs", {
        method: "POST",
        body: JSON.stringify({
          ...proposal.input,
          spendApprovalId: proposal.quote.id,
        }),
      });
      setActiveRun(run.id);
      setProposal(null);
    }, t("Action queued. Progress is saved if you leave this page."));
  // A finished deliverable opens in the canvas: beside the chat on home, full width elsewhere.
  const shownAssetRun = useRef<string | null>(null);
  useEffect(() => {
    const run = data?.runs.find(
      (r) =>
        r.id === activeRun &&
        r.tool === "make_asset" &&
        r.state === "succeeded",
    );
    if (!run || shownAssetRun.current === run.id) return;
    const output = run.output as { result?: { id?: string } }[] | null;
    const result = data?.assets.find((a) => a.id === output?.[0]?.result?.id);
    if (result) {
      shownAssetRun.current = run.id;
      openAsset(result);
    }
  }, [data, activeRun, openAsset]);
  const value = useMemo<WorkspaceValue | null>(
    () =>
      data
        ? {
            ws,
            screen: view,
            activeProspectId: prospect?.id,
            activeAssetId: preview?.id,
            userId,
            data,
            busy,
            canWrite: ["owner", "operator"].includes(data.role),
            canApprove: ["owner", "reviewer"].includes(data.role),
            play,
            setPlay,
            language,
            setLanguage,
            chatLanguage,
            setChatLanguage,
            selected,
            setSelected: (update) => setSelected(update),
            setTab,
            openAsset,
            askNabil: (text) => {
              setView("Home");
              chat.newChat();
              setHomePrefill({ text, key: Date.now() });
            },
            setProspect,
            setActiveRun,
            showProposal: setProposal,
            action,
            propose,
          }
        : null,
    [
      ws,
      view,
      prospect?.id,
      preview?.id,
      userId,
      data,
      busy,
      play,
      language,
      chatLanguage,
      selected,
      setTab,
      openAsset,
      setView,
      chat.newChat,
      action,
      propose,
    ],
  );
  if (authState === "loading")
    return (
      <main className="boot">
        <p role="status" className="shimmer">
          {t("Loading your workspace…")}
        </p>
      </main>
    );
  if (authState === "signin") return <SignIn onSignedIn={loadMe} />;
  const modalOpen = Boolean(proposal || paletteOpen);
  const currentAsset = preview
    ? (data?.assets.find((asset) => asset.id === preview.id) ?? preview)
    : null;
  const focusComposer = () => {
    if (viewRef.current === "Home")
      requestAnimationFrame(() =>
        document.getElementById("assistant-input")?.focus(),
      );
    else setLauncherOpen(true);
  };
  const canvas = currentAsset ? (
    <ArtifactCanvas
      ws={ws}
      asset={currentAsset}
      onClose={() => setPreview(null)}
      onEdit={focusComposer}
      onSelectVersion={(asset) => setPreview(asset)}
    />
  ) : null;
  const section =
    view === "Home"
      ? (chat.thread?.title ?? t("New chat"))
      : prospect
        ? prospect.snapshot.company
        : t(TAB_LABELS[view]);
  return (
    <ChatProvider value={chat}>
      <div
        className={`shell ${collapsed ? "sidebar-collapsed" : ""} ${navOpen ? "nav-open" : ""} ${view === "Home" ? "is-home" : ""}`}
      >
        <aside className="sidebar" inert={modalOpen}>
          <Sidebar
            view={view}
            onTab={setTab}
            onHome={() => setView("Home")}
            memberships={memberships}
            ws={ws}
            onWorkspace={setWs}
            data={data}
            userName={userName}
            onPalette={() => setPaletteOpen(true)}
            threads={chat.threads}
            threadId={chat.threadId}
            onThread={(id) => {
              setView("Home");
              chat.openThread(id);
            }}
            onNewChat={() => {
              setView("Home");
              chat.newChat();
              requestAnimationFrame(() =>
                document.getElementById("assistant-input")?.focus(),
              );
            }}
            onArchive={(id) =>
              void chat.archive(id).catch((e) => setError(e.message))
            }
            collapsed={collapsed}
            onToggleCollapsed={() => {
              const next = !collapsed;
              setCollapsed(next);
              localStorage.setItem(
                "revenue-sidebar",
                next ? "collapsed" : "open",
              );
            }}
            onSignOut={async () => {
              await client.request("/auth/sign-out", { method: "POST" });
              setAuthState("signin");
              setWs("");
              setData(null);
            }}
          />
        </aside>
        {navOpen && (
          <button
            type="button"
            className="nav-scrim"
            aria-label={t("Close navigation")}
            onClick={() => setNavOpen(false)}
          />
        )}
        <main className="main" inert={modalOpen}>
          <Topbar
            workspaceName={data?.workspace.name}
            section={section}
            onMenu={() => setNavOpen(true)}
          />
          {data?.fixture && (
            <div className="fixture-banner">
              <IconShieldCheck size={14} aria-hidden />
              <span>
                {t(
                  "Fixture demo · provider results and sequences are simulated. No live outreach.",
                )}
              </span>
            </div>
          )}
          {error && (
            <div className="content-alert">
              <ErrorPanel
                title={t("Action needs attention")}
                actions={
                  <>
                    <Button
                      size="sm"
                      onClick={() =>
                        void refresh().catch((e) => setError(e.message))
                      }
                    >
                      {t("Retry loading")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setError("")}
                    >
                      {t("Dismiss")}
                    </Button>
                  </>
                }
              >
                {error}
              </ErrorPanel>
            </div>
          )}
          {!data || !value ? (
            error ? (
              <div className="content">
                <Empty title={t("Workspace could not load")}>
                  {t("Use Retry loading above to reconnect.")}
                </Empty>
              </div>
            ) : (
              <div className="content loading-page" aria-busy="true">
                <p role="status" className="shimmer">
                  {t("Loading workspace…")}
                </p>
                <div className="panel">
                  <Skeleton rows={5} />
                </div>
              </div>
            )
          ) : (
            <WorkspaceProvider value={value}>
              {view === "Home" ? (
                <Home
                  key={ws}
                  userName={userName}
                  onQuote={setProposal}
                  onOpenAsset={openAsset}
                  canvas={canvas}
                  initialPrefill={homePrefill}
                />
              ) : null}
              {view !== "Home" ? (
                <div className="content">
                  {!preview && (
                    <div className="page-heading">
                      <div>
                        <h1 dir="auto">{section}</h1>
                        {!prospect && (
                          <p className="muted">{t(DESCRIPTIONS[view])}</p>
                        )}
                      </div>
                    </div>
                  )}
                  <div key={ws} className="screen">
                    {canvas ? (
                      canvas
                    ) : prospect ? (
                      <ProspectReview prospect={prospect} />
                    ) : (
                      <>
                        {view === "Plays" && <Plays />}
                        {view === "Accounts" && <Accounts />}
                        {view === "Review queue" && <ReviewQueue />}
                        {view === "Asset Studio" && (
                          <AssetStudio onPreview={openAsset} />
                        )}
                        {view === "Sequences" && <Sequences />}
                        {view === "Company context" && (
                          <ContextForm key={ws + data.workspace.name} />
                        )}
                        {view === "Settings" && <Settings />}
                      </>
                    )}
                  </div>
                </div>
              ) : null}
              {view !== "Home" && (
                <div inert={modalOpen}>
                  <Launcher
                    open={launcherOpen}
                    onOpenChange={setLauncherOpen}
                    onExpand={() => {
                      setLauncherOpen(false);
                      setView("Home");
                    }}
                    onQuote={setProposal}
                    onOpenAsset={openAsset}
                  />
                </div>
              )}
            </WorkspaceProvider>
          )}
        </main>
        {aiCursor && (
          <div
            className="ai-cursor"
            role="status"
            style={{ left: aiCursor.x, top: aiCursor.y }}
          >
            <svg width="22" height="26" viewBox="0 0 22 26" aria-hidden="true">
              <path
                d="M2 2v20l6-6 5 8 4-2-5-8h8Z"
                fill="currentColor"
                stroke="var(--surface)"
                strokeWidth="2"
              />
            </svg>
            <span>{aiCursor.label}</span>
          </div>
        )}
        {notice && (
          <div className="toast" role="status">
            <span className="dot tone-ok" aria-hidden />
            <span>{notice}</span>
            <button
              className="icon-button"
              aria-label={t("Dismiss")}
              onClick={() => setNotice("")}
            >
              <IconX size={14} />
            </button>
          </div>
        )}
        {proposal && (
          <CostModal
            proposal={proposal}
            busy={busy}
            error={error}
            onCancel={() => setProposal(null)}
            onApprove={() => void launch()}
          />
        )}
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          tabs={TABS}
          onTab={setTab}
          onPlay={(id) => {
            setPlay(id);
            setTab("Plays");
          }}
          onProspect={(p) => {
            setViewState("Accounts");
            setPreview(null);
            setProspect(p);
          }}
          onToggleChat={() => {
            if (viewRef.current === "Home") focusComposer();
            else setLauncherOpen(true);
          }}
          data={data}
        />
      </div>
    </ChatProvider>
  );
}
