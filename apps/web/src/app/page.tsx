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
import type {
  Asset,
  Chat,
  Dashboard,
  Membership,
  Prospect,
  Run,
} from "../lib/types";
import {
  Badge,
  Button,
  Empty,
  ErrorPanel,
  Skeleton,
} from "../components/primitives";
import { Sidebar, Topbar } from "../components/Shell";
import { CommandPalette } from "../components/CommandPalette";
import { Assistant } from "../components/Assistant";
import { RunLog } from "../components/RunLog";
import { AssetEditor, CostModal, type Proposal } from "../components/Modals";
import { SignIn } from "../components/SignIn";
import {
  TABS,
  WorkspaceProvider,
  type Tab,
  type WorkspaceValue,
} from "../components/workspace-context";
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
  "Asset Studio": "Reviewed sources, a useful idea, and your brand.",
  Sequences: "Prepared touches, holdouts and recorded outcomes.",
  "Company context": "The brand, offer and customer every play draws on.",
  Settings: "Spending, quotas, connectors and the audit trail.",
};

export default function Page() {
  const { t } = usePrefs();
  const [memberships, setMemberships] = useState<Membership[]>([]),
    [userName, setUserName] = useState(""),
    [userId, setUserId] = useState(""),
    [ws, setWs] = useState("");
  const [authState, setAuthState] = useState<"loading" | "signin" | "ready">(
    "loading",
  );
  const [data, setData] = useState<Dashboard | null>(null),
    [tab, setTabState] = useState<Tab>("Plays"),
    [play, setPlay] = useState<ToolRequest["play"]>("P1");
  const [selected, setSelected] = useState<string[]>([]),
    [language, setLanguage] = useState<ToolRequest["language"]>("en");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [chatOpen, setChatOpen] = useState(true),
    [paletteOpen, setPaletteOpen] = useState(false);
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
  const [activeRun, setActiveRun] = useState<string | null>(null),
    [events, setEvents] = useState<
      { id: number; message: string; kind: string }[]
    >([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [preview, setPreview] = useState<Asset | null>(null),
    [prospect, setProspect] = useState<Prospect | null>(null);
  const activeWorkspace = useRef(ws);
  useEffect(() => {
    activeWorkspace.current = ws;
  }, [ws]);
  const refresh = useCallback(async () => {
    if (!ws) return;
    const result = await client.workspace<Dashboard>(ws);
    if (activeWorkspace.current === ws) setData(result);
  }, [ws]);
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
    // On narrow screens the assistant overlays content, so it starts closed.
    if (matchMedia("(max-width: 1099px)").matches) setChatOpen(false);
  }, []);
  useEffect(() => {
    setData(null);
    setSelected([]);
    setProspect(null);
    setProposal(null);
    setPreview(null);
    setChats([]);
    setActiveRun(null);
    setError("");
    if (ws) {
      sessionStorage.setItem("revenue-workspace", ws);
      void refresh().catch((e) => {
        if (activeWorkspace.current === ws) setError(e.message);
      });
      void client
        .workspace<Chat[]>(ws, "/chat")
        .then((history) => {
          if (activeWorkspace.current === ws) setChats(history);
        })
        .catch((e) => {
          if (activeWorkspace.current === ws) setError(e.message);
        });
    }
  }, [ws, refresh]);
  useEffect(() => {
    if (!activeRun || !ws) return;
    setEvents([]);
    const stream = new EventSource(
      `/api/workspaces/${ws}/runs/${activeRun}/events`,
    );
    stream.onmessage = (event) => {
      const row = JSON.parse(event.data);
      setEvents((previous) =>
        previous.some((e) => e.id === row.id) ? previous : [...previous, row],
      );
      if (["succeeded", "failed"].includes(row.kind)) {
        stream.close();
        void refresh();
        void client
          .workspace<Chat[]>(ws, "/chat")
          .then((history) => {
            if (activeWorkspace.current === ws) setChats(history);
          })
          .catch(() => {});
      }
    };
    stream.onerror = () => {
      stream.close();
      void refresh();
    };
    return () => stream.close();
  }, [activeRun, ws, refresh]);
  useEffect(() => {
    if (!data?.runs.some((r) => ["queued", "running"].includes(r.state)))
      return;
    const timer = setInterval(
      () => void refresh().catch((e) => setError(e.message)),
      3000,
    );
    return () => clearInterval(timer);
  }, [data?.runs, refresh]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  const setTab = useCallback((next: Tab) => {
    setTabState(next);
    setProspect(null);
    setPreview(null);
  }, []);
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
      setTabState("Asset Studio");
      setProspect(null);
      setPreview(result);
    }
  }, [data, activeRun]);
  const assistantAction = async (ui: AssistantUiAction) => {
    if (!data || activeWorkspace.current !== ws) return;
    let target = "";
    let label = "";
    if (ui.kind === "navigate") {
      target = `screen:${ui.screen}`;
      label = t(ui.screen);
      setTab(ui.screen);
    } else if (ui.kind === "open_account") {
      const record = data.prospects.find((p) => p.id === ui.prospectId);
      if (!record)
        throw new Error(t("Account not found. Reload the workspace."));
      setTab("Accounts");
      setProspect(record);
      setSelected([record.id]);
      target = "account-detail";
      label = record.snapshot.company;
    } else if (ui.kind === "open_asset") {
      const asset = data.assets.find((a) => a.id === ui.assetId);
      if (!asset) throw new Error(t("Asset not found. Reload the workspace."));
      setTab("Asset Studio");
      setPreview(asset);
      setSelected([asset.prospectId]);
      target = "asset-preview";
      label = t("Preview");
    } else {
      if (ui.prospectIds.some((id) => !data.prospects.some((p) => p.id === id)))
        throw new Error(t("Account not found. Reload the workspace."));
      setSelected(ui.prospectIds);
      target = `screen:${tab}`;
      label = t("Accounts selected");
    }
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    if (activeWorkspace.current !== ws) return;
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
  const value = useMemo<WorkspaceValue | null>(
    () =>
      data
        ? {
            ws,
            screen: tab,
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
            selected,
            setSelected: (update) => setSelected(update),
            setTab,
            setProspect,
            setActiveRun,
            showProposal: setProposal,
            action,
            propose,
          }
        : null,
    [
      ws,
      tab,
      prospect?.id,
      preview?.id,
      userId,
      data,
      busy,
      play,
      language,
      selected,
      setTab,
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
  const heading = prospect ? prospect.snapshot.company : t(tab);
  return (
    <div className={`shell ${chatOpen ? "" : "chat-closed"}`}>
      <aside className="sidebar" inert={modalOpen}>
        <Sidebar
          tabs={TABS}
          tab={tab}
          onTab={setTab}
          memberships={memberships}
          ws={ws}
          onWorkspace={setWs}
          data={data}
          userName={userName}
          onPalette={() => setPaletteOpen(true)}
          onSignOut={async () => {
            await client.request("/auth/sign-out", { method: "POST" });
            setAuthState("signin");
            setWs("");
            setData(null);
          }}
        />
      </aside>
      <main className="main" inert={modalOpen}>
        <Topbar
          workspaceName={data?.workspace.name}
          section={t(tab)}
          chatOpen={chatOpen}
          onToggleChat={() => setChatOpen(!chatOpen)}
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
        <div className="content">
          {error && (
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
          )}
          {!data || !value ? (
            error ? (
              <Empty title={t("Workspace could not load")}>
                {t("Use Retry loading above to reconnect.")}
              </Empty>
            ) : (
              <div className="loading-page" aria-busy="true">
                <p role="status" className="shimmer">
                  {t("Loading workspace…")}
                </p>
                <div className="stat-row">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="stat">
                      <Skeleton rows={2} />
                    </div>
                  ))}
                </div>
                <div className="panel">
                  <Skeleton rows={5} />
                </div>
              </div>
            )
          ) : (
            <WorkspaceProvider value={value}>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">{t("Your revenue workspace")}</p>
                  <h1 dir="auto">{heading}</h1>
                  <p className="muted">{t(DESCRIPTIONS[tab])}</p>
                </div>
                <Badge>
                  <bdi>{data.workspace.plan}</bdi> {t("plan")}
                </Badge>
              </div>
              <div key={ws} className="screen">
                {preview ? (
                  <AssetEditor
                    ws={ws}
                    asset={
                      data.assets.find((asset) => asset.id === preview.id) ??
                      preview
                    }
                    onClose={() => setPreview(null)}
                    onEdit={() => {
                      setChatOpen(true);
                      requestAnimationFrame(() =>
                        document.getElementById("assistant-input")?.focus(),
                      );
                    }}
                  />
                ) : prospect ? (
                  <ProspectReview prospect={prospect} />
                ) : (
                  <>
                    {tab === "Plays" && <Plays />}
                    {tab === "Accounts" && <Accounts />}
                    {tab === "Review queue" && <ReviewQueue />}
                    {tab === "Asset Studio" && (
                      <AssetStudio
                        onPreview={(asset) => {
                          setPreview(asset);
                          setSelected([asset.prospectId]);
                        }}
                      />
                    )}
                    {tab === "Sequences" && <Sequences />}
                    {tab === "Company context" && (
                      <ContextForm key={ws + data.workspace.name} />
                    )}
                    {tab === "Settings" && <Settings />}
                  </>
                )}
                <RunLog activeRun={activeRun} events={events} />
              </div>
            </WorkspaceProvider>
          )}
        </div>
      </main>
      {chatOpen && value && (
        <aside className="assistant" inert={modalOpen}>
          <WorkspaceProvider value={value}>
            <Assistant
              key={ws}
              chats={chats}
              setChats={setChats}
              onQuote={setProposal}
              onNavigate={setTab}
              onUiAction={assistantAction}
              onClose={() => setChatOpen(false)}
            />
          </WorkspaceProvider>
        </aside>
      )}
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
          setTabState("Accounts");
          setProspect(p);
        }}
        onToggleChat={() => setChatOpen(true)}
        data={data}
      />
    </div>
  );
}
