"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Button,
  Input,
  IconBuilding,
  IconUsers,
  IconPlayerPlay,
  IconFileText,
  IconMessageCircle,
  IconSettings,
  IconClock,
  IconCheck,
  IconShieldCheck,
} from "@revenue/ui";
import {
  RevenueClient,
  PLAYS,
  type Evidence,
  type ProspectSnapshot,
  type ToolName,
  type ToolRequest,
  type Touch,
} from "@revenue/contracts";

const client = new RevenueClient();
type Prospect = {
  id: string;
  snapshot: ProspectSnapshot;
  score: number | null;
  breakdown: {
    tier?: string;
    breakdown?: { rule: string; points: number; state: string }[];
  };
  evidence: Evidence[];
  country: string;
  lawfulBasis: string | null;
  consentAt: string | null;
  excluded: boolean;
  crmPersonId: string | null;
};
type Draft = {
  id: string;
  prospectId: string;
  version: number;
  content: Touch[];
  approvedVersion: number | null;
  assetId: string | null;
};
type Asset = {
  id: string;
  prospectId: string;
  title: string;
  language: string;
  template: string;
  approvedAt: string | null;
};
type Run = {
  id: string;
  tool: string;
  state: string;
  error: string | null;
  nextAction: string | null;
  output: unknown;
  estimate: number;
  actualCost: number;
};
type Dashboard = {
  role: string;
  fixture: boolean;
  modelFixture: boolean;
  quotas: { kind: string; used: number; reserved: number; cap: number }[];
  members: {
    userId: string;
    role: string;
    creditCap: number | null;
    user: { name: string; email: string };
  }[];
  workspace: {
    id: string;
    name: string;
    plan: string;
    planLimits: Record<string, number>;
    company: { description: string; icp: string; marketingLicence: boolean };
    brand: { name: string; website: string; primary: string; accent: string };
    offers: { id: string; text: string; approved: boolean }[];
    preflight: Record<string, unknown>;
  };
  prospects: Prospect[];
  drafts: Draft[];
  assets: Asset[];
  runs: Run[];
  sequences: {
    id: string;
    prospectId: string;
    state: string;
    holdout: boolean;
    steps: { channel: string; body: string; state: string }[];
  }[];
  connectors: {
    provider: string;
    status: string;
    mode: string;
    lastError: string | null;
  }[];
  budgets: {
    id: string;
    userId: string | null;
    cap: number;
    used: number;
    reserved: number;
  }[];
  audit: { id: number; action: string; createdAt: string }[];
  plans: Record<
    string,
    {
      price: number;
      aiCredits: number;
      records: number;
      enrichmentCredits: number;
      sends: number;
      exports: number;
    }
  >;
};
type Membership = { role: string; workspace: { id: string; name: string } };
type Chat = {
  id: string;
  role: string;
  content: string;
  context?: { tool?: ToolName };
};
const tabs = [
  { name: "Plays", icon: IconPlayerPlay },
  { name: "Accounts", icon: IconUsers },
  { name: "Review queue", icon: IconCheck },
  { name: "Asset Studio", icon: IconFileText },
  { name: "Sequences", icon: IconClock },
  { name: "Company context", icon: IconBuilding },
  { name: "Settings", icon: IconSettings },
] as const;
function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function Tag({
  children,
  good = false,
}: {
  children: ReactNode;
  good?: boolean;
}) {
  return <span className={`tag ${good ? "good" : ""}`}>{children}</span>;
}

export default function Page() {
  const [memberships, setMemberships] = useState<Membership[]>([]),
    [userName, setUserName] = useState(""),
    [ws, setWs] = useState("");
  const [authState, setAuthState] = useState<"loading" | "signin" | "ready">(
    "loading",
  );
  const [data, setData] = useState<Dashboard | null>(null),
    [tab, setTab] = useState<string>("Plays"),
    [play, setPlay] = useState<ToolRequest["play"]>("P1");
  const [selected, setSelected] = useState<string[]>([]),
    [language, setLanguage] = useState<ToolRequest["language"]>("en");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [chatOpen, setChatOpen] = useState(true);
  const [proposal, setProposal] = useState<{
    input: ToolRequest;
    quote: {
      id: string;
      estimate: number;
      audience: number;
      expiresAt: string;
    };
  } | null>(null);
  const [activeRun, setActiveRun] = useState<string | null>(null),
    [events, setEvents] = useState<
      { id: number; message: string; kind: string }[]
    >([]);
  const [chats, setChats] = useState<Chat[]>([]),
    [chatInput, setChatInput] = useState(""),
    [chatTool, setChatTool] = useState<ToolName | null>(null);
  const [preview, setPreview] = useState<Asset | null>(null),
    [prospect, setProspect] = useState<Prospect | null>(null);
  const [importKey, setImportKey] = useState(""),
    [outcomes, setOutcomes] = useState<
      { row: number; state: string; message?: string }[]
    >([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>(
    {},
  );
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
        user: { name: string };
        workspaces: Membership[];
      }>("/me");
      setMemberships(me.workspaces);
      setUserName(me.user.name);
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
  }, []);
  useEffect(() => {
    setData(null);
    setSelected([]);
    setProspect(null);
    setProposal(null);
    setPreview(null);
    setChats([]);
    setChatTool(null);
    setOutcomes([]);
    setActiveRun(null);
    setError("");
    setImportKey(crypto.randomUUID());
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
            if (activeWorkspace.current !== ws) return;
            setChats(history);
            const last = history.at(-1);
            if (last?.role === "assistant")
              setChatTool(last.context?.tool ?? null);
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
  const action = async (fn: () => Promise<unknown>, success?: string) => {
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
  };
  const propose = async (
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
      const quote = await client.workspace<{
        id: string;
        estimate: number;
        audience: number;
        expiresAt: string;
      }>(ws, "/quotes", { method: "POST", body: JSON.stringify(input) });
      setProposal({ input, quote });
    });
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
    }, "Action queued. Progress is saved if you leave this page.");
  useEffect(() => {
    if (!proposal && !preview) return;
    const previous = document.activeElement as HTMLElement | null;
    const modal = document.querySelector<HTMLElement>('[role="dialog"]');
    const controls = () =>
      Array.from(
        modal?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], iframe",
        ) ?? [],
      );
    controls()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        setProposal(null);
        setPreview(null);
      }
      if (event.key !== "Tab") return;
      const list = controls();
      if (!list.length) return;
      if (event.shiftKey && document.activeElement === list[0]) {
        event.preventDefault();
        list.at(-1)?.focus();
      } else if (!event.shiftKey && document.activeElement === list.at(-1)) {
        event.preventDefault();
        list[0]?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previous?.isConnected) previous.focus();
    };
  }, [Boolean(proposal), Boolean(preview), busy]);
  const currentPlay = PLAYS.find((p) => p.id === play)!;
  const approvedDrafts =
    data?.drafts.filter((d) => d.approvedVersion === d.version) ?? [];
  const canWrite = ["owner", "operator"].includes(data?.role ?? ""),
    canApprove = ["owner", "reviewer"].includes(data?.role ?? "");
  const selectedNames = data?.prospects
    .filter((p) => selected.includes(p.id))
    .map((p) => p.snapshot.company)
    .join(", ");
  if (authState === "loading")
    return (
      <main className="signin">
        <p role="status">Loading your workspace…</p>
      </main>
    );
  if (authState === "signin")
    return (
      <main className="signin">
        <div className="wordmark">
          <span>r</span> Revenue Workspace
        </div>
        <h1>
          Move a good idea
          <br />
          toward a conversation.
        </h1>
        <p>Sign in to your team’s workspace.</p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            const fields = new FormData(event.currentTarget);
            try {
              await client.request("/auth/sign-in/email", {
                method: "POST",
                body: JSON.stringify({
                  email: fields.get("email"),
                  password: fields.get("password"),
                }),
              });
              await loadMe();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Email
            <Input name="email" type="email" autoComplete="username" required />
          </label>
          <label>
            Password
            <Input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="muted">
          Demo accounts are provisioned by the workspace owner.
        </p>
      </main>
    );
  return (
    <div className={`shell ${chatOpen ? "" : "chat-closed"}`}>
      <aside className="sidebar" inert={Boolean(proposal || preview)}>
        <div className="wordmark">
          <span>r</span> Revenue Workspace
        </div>
        <label className="workspace-picker">
          Workspace
          <select
            aria-label="Workspace"
            value={ws}
            onChange={(e) => setWs(e.target.value)}
          >
            {memberships.map((m) => (
              <option key={m.workspace.id} value={m.workspace.id}>
                {m.workspace.name}
              </option>
            ))}
          </select>
        </label>
        <nav aria-label="Main navigation">
          {tabs.map((t) => (
            <button
              key={t.name}
              aria-label={t.name}
              className={tab === t.name ? "active" : ""}
              onClick={() => {
                setTab(t.name);
                setProspect(null);
              }}
            >
              <t.icon size={18} />
              {t.name}
              {t.name === "Review queue" && data && (
                <span>
                  {
                    data.drafts.filter((d) => d.approvedVersion !== d.version)
                      .length
                  }
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Tag>{data?.role ?? "Loading"}</Tag>
          <p>{userName}</p>
          <button
            onClick={async () => {
              await client.request("/auth/sign-out", { method: "POST" });
              setAuthState("signin");
              setWs("");
              setData(null);
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="main" inert={Boolean(proposal || preview)}>
        <header className="topbar">
          <span>
            {data?.workspace.name ?? "Loading workspace…"}{" "}
            <span className="slash">/</span> {tab}
          </span>
          <Button
            onClick={() => setChatOpen(!chatOpen)}
            startIcon={<IconMessageCircle size={16} />}
          >
            {chatOpen ? "Hide assistant" : "Assistant"}
          </Button>
        </header>
        {data?.fixture && (
          <div className="fixture-banner">
            <IconShieldCheck size={16} />
            <span>
              Fixture demo · provider results and sequences are simulated. No
              live outreach.
            </span>
          </div>
        )}
        <div className="content">
          {error && (
            <div role="alert" className="error">
              <strong>Action needs attention</strong>
              <p>{error}</p>
              <button
                onClick={() => void refresh().catch((e) => setError(e.message))}
              >
                Retry loading
              </button>
              <button onClick={() => setError("")}>Dismiss</button>
            </div>
          )}
          {notice && (
            <p role="status" className="success">
              {notice}
            </p>
          )}
          {!data ? (
            <Empty
              title={error ? "Workspace could not load" : "Loading workspace…"}
            >
              {error
                ? "Use Retry loading above to reconnect."
                : "Fetching your saved records and progress."}
            </Empty>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">YOUR REVENUE WORKSPACE</p>
                  <h1>{prospect ? prospect.snapshot.company : tab}</h1>
                  <p className="muted">
                    {tab === "Plays"
                      ? "Start with a goal. Review each step before moving forward."
                      : tab === "Accounts"
                        ? "Source facts, score fit, and choose who to approach."
                        : tab === "Asset Studio"
                          ? "Reviewed sources, a useful idea, and your brand."
                          : "Your work stays saved and scoped to this workspace."}
                  </p>
                </div>
                <Tag good>{data.workspace.plan} plan</Tag>
              </div>
              {tab === "Plays" && (
                <>
                  <div className="play-grid">
                    {PLAYS.map((p) => (
                      <button
                        key={p.id}
                        className={`play-card ${play === p.id ? "chosen" : ""}`}
                        onClick={() => setPlay(p.id)}
                      >
                        <span className="eyebrow">{p.id}</span>
                        <h2>{p.name}</h2>
                        <p>{p.description}</p>
                        <span className="play-foot">
                          {play === p.id ? "Selected play" : "Choose play"}{" "}
                          <IconPlayerPlay size={15} />
                        </span>
                      </button>
                    ))}
                  </div>
                  <section className="panel">
                    <div className="section-title">
                      <h2>{currentPlay.name}</h2>
                      <label>
                        Content language
                        <select
                          aria-label="Content language"
                          value={language}
                          onChange={(e) =>
                            setLanguage(
                              e.target.value as ToolRequest["language"],
                            )
                          }
                        >
                          <option value="en">English</option>
                          <option value="ar-EG">Egyptian Arabic</option>
                          <option value="ar">Business Arabic</option>
                          <option value="ar-Gulf">Gulf Arabic · beta</option>
                        </select>
                      </label>
                    </div>
                    <p>
                      {selected.length
                        ? `${selected.length} selected: ${selectedNames}`
                        : "Choose prospects in Accounts to start this play."}
                    </p>
                    <div className="step-list">
                      {currentPlay.steps.map((step, index) => (
                        <div key={step} className="step">
                          <span>{index + 1}</span>
                          <div>
                            <strong>{step.replaceAll("_", " ")}</strong>
                            <p>
                              {step === "queue_sequence"
                                ? `${approvedDrafts.length} approved drafts · asset assignment includes a 20% holdout`
                                : "Review the result before the next step."}
                            </p>
                          </div>
                          <Button
                            disabled={
                              busy ||
                              !canWrite ||
                              (!selected.length &&
                                step !== "preflight" &&
                                step !== "queue_sequence")
                            }
                            onClick={() =>
                              void propose(
                                step as ToolName,
                                step === "queue_sequence"
                                  ? approvedDrafts.map((d) => d.id)
                                  : [],
                              )
                            }
                          >
                            Review action
                          </Button>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}
              {tab === "Accounts" && !prospect && (
                <>
                  <section className="panel">
                    <div className="section-title">
                      <h2>Import a lead list</h2>
                      <Tag>CSV / XLSX</Tag>
                    </div>
                    <p className="muted">
                      Columns: firstName, lastName, email, company, website,
                      title, employees. Imports retain reviewed evidence and
                      suppression.
                    </p>
                    <input
                      ref={fileRef}
                      aria-label="Lead file"
                      type="file"
                      accept=".csv,.xlsx"
                      onChange={() => setImportKey(crypto.randomUUID())}
                    />
                    <details>
                      <summary>Map differently named columns</summary>
                      <p>
                        Enter the exact column heading from your file. Leave
                        blank to use the standard heading.
                      </p>
                      <div className="form-grid">
                        {[
                          "firstName",
                          "lastName",
                          "email",
                          "company",
                          "website",
                          "title",
                          "employees",
                        ].map((target) => (
                          <label key={target}>
                            File column for {target}
                            <Input
                              value={columnMapping[target] ?? ""}
                              onChange={(e) => {
                                setColumnMapping((previous) => ({
                                  ...previous,
                                  [target]: e.target.value,
                                }));
                                setImportKey(crypto.randomUUID());
                              }}
                            />
                          </label>
                        ))}
                      </div>
                    </details>
                    <Button
                      disabled={busy || !canWrite}
                      onClick={() =>
                        void action(async () => {
                          const file = fileRef.current?.files?.[0];
                          if (!file)
                            throw new Error("Choose a CSV or XLSX file first.");
                          const form = new FormData();
                          form.append("file", file);
                          form.append("requestKey", importKey);
                          form.append(
                            "mapping",
                            JSON.stringify(
                              Object.fromEntries(
                                Object.entries(columnMapping).filter(
                                  ([, source]) => source.trim(),
                                ),
                              ),
                            ),
                          );
                          const res = await fetch(
                            `/api/workspaces/${ws}/imports`,
                            { method: "POST", body: form },
                          );
                          const result = await res.json();
                          if (!res.ok) throw new Error(result.message);
                          setOutcomes(result.outcomes);
                        }, "Import processed. Review the row outcomes below.")
                      }
                    >
                      {busy ? "Importing…" : "Import list"}
                    </Button>
                    {outcomes.length > 0 && (
                      <div className="import-results">
                        {outcomes.map((o) => (
                          <p key={o.row}>
                            Row {o.row}:{" "}
                            <Tag good={o.state === "imported"}>{o.state}</Tag>{" "}
                            {o.message}
                          </p>
                        ))}
                      </div>
                    )}
                  </section>
                  {!data.prospects.length ? (
                    <Empty title="Your first accounts belong here">
                      Import a consented or synthetic lead list, then review its
                      sources.
                    </Empty>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Select</th>
                            <th>Person / company</th>
                            <th>Role</th>
                            <th>Fit</th>
                            <th>Evidence</th>
                            <th>Review</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.prospects.map((p) => (
                            <tr key={p.id}>
                              <td>
                                <input
                                  aria-label={`Select ${p.snapshot.firstName}`}
                                  type="checkbox"
                                  checked={selected.includes(p.id)}
                                  onChange={(e) =>
                                    setSelected((old) =>
                                      e.target.checked
                                        ? [...old, p.id]
                                        : old.filter((id) => id !== p.id),
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <strong>
                                  {p.snapshot.firstName} {p.snapshot.lastName}
                                </strong>
                                <p>{p.snapshot.company}</p>
                              </td>
                              <td>{p.snapshot.title}</td>
                              <td>
                                {p.score === null
                                  ? "Not scored"
                                  : `${p.score} · ${p.breakdown.tier}`}
                              </td>
                              <td>
                                <Tag good={p.evidence.some((e) => e.approved)}>
                                  {p.evidence.filter((e) => e.approved).length}{" "}
                                  reviewed
                                </Tag>
                              </td>
                              <td>
                                <Button onClick={() => setProspect(p)}>
                                  Open
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
              {prospect && (
                <ProspectReview
                  prospect={prospect}
                  canApprove={canApprove}
                  onBack={() => setProspect(null)}
                  onSave={(value) =>
                    action(async () => {
                      const updated = await client.workspace<Prospect>(
                        ws,
                        `/prospects/${prospect.id}`,
                        { method: "PATCH", body: JSON.stringify(value) },
                      );
                      setProspect(updated);
                    }, "Evidence saved. Previous copy approvals were invalidated.")
                  }
                />
              )}
              {tab === "Review queue" && (
                <>
                  {!data.drafts.length ? (
                    <Empty title="No drafts waiting for review">
                      Approve a source and an offer, then prepare messages from
                      a play.
                    </Empty>
                  ) : (
                    data.drafts.map((d) => (
                      <DraftReview
                        key={`${d.id}:${d.version}`}
                        draft={d}
                        name={
                          data.prospects.find((p) => p.id === d.prospectId)
                            ?.snapshot.company ?? "Prospect"
                        }
                        canWrite={canWrite}
                        canApprove={canApprove}
                        busy={busy}
                        assets={data.assets.filter(
                          (a) => a.prospectId === d.prospectId && a.approvedAt,
                        )}
                        onAttach={(assetId) =>
                          action(
                            () =>
                              client.workspace(ws, `/drafts/${d.id}/asset`, {
                                method: "POST",
                                body: JSON.stringify({
                                  version: d.version,
                                  assetId,
                                }),
                              }),
                            "Asset assignment saved. Review and approve the new copy version.",
                          )
                        }
                        onSave={(content) =>
                          action(
                            () =>
                              client.workspace(ws, `/drafts/${d.id}`, {
                                method: "PATCH",
                                body: JSON.stringify({
                                  version: d.version,
                                  content,
                                }),
                              }),
                            "Draft saved. Review its new version before approval.",
                          )
                        }
                        onApprove={() =>
                          action(
                            () =>
                              client.workspace(ws, `/drafts/${d.id}/approve`, {
                                method: "POST",
                                body: JSON.stringify({ version: d.version }),
                              }),
                            "Current draft approved.",
                          )
                        }
                      />
                    ))
                  )}
                </>
              )}
              {tab === "Asset Studio" && (
                <>
                  {!data.assets.length ? (
                    <Empty title="Make something useful for the conversation">
                      Select a prospect, review its sources, and choose Make
                      asset in a play. P1/P3 produce an offer one-pager; P4
                      produces a mini-audit.
                    </Empty>
                  ) : (
                    <div className="asset-grid">
                      {data.assets.map((a) => (
                        <article className="panel asset-card" key={a.id}>
                          <div className="paper-icon">
                            <IconFileText size={48} />
                          </div>
                          <Tag>{a.language}</Tag>
                          <h2>{a.title}</h2>
                          <p>
                            {a.approvedAt
                              ? "Reviewed and approved"
                              : "Awaiting human review"}
                          </p>
                          <div className="button-row">
                            <Button onClick={() => setPreview(a)}>
                              Preview
                            </Button>
                            {!a.approvedAt && (
                              <Button
                                disabled={!canApprove || busy}
                                onClick={() =>
                                  void action(
                                    () =>
                                      client.workspace(
                                        ws,
                                        `/assets/${a.id}/approve`,
                                        { method: "POST" },
                                      ),
                                    "Asset approved for PDF export.",
                                  )
                                }
                              >
                                Approve
                              </Button>
                            )}
                            {a.approvedAt && (
                              <a
                                className="link-button"
                                href={`/api/workspaces/${ws}/assets/${a.id}/pdf`}
                              >
                                Download PDF
                              </a>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}
              {tab === "Sequences" && (
                <>
                  {!data.sequences.length ? (
                    <Empty title="No sequences prepared yet">
                      Approve every touch, run sender pre-flight, and resolve
                      country and consent holds before preparing a sequence.
                    </Empty>
                  ) : (
                    data.sequences.map((s) => (
                      <section key={s.id} className="panel">
                        <div className="section-title">
                          <h2>
                            {
                              data.prospects.find((p) => p.id === s.prospectId)
                                ?.snapshot.company
                            }
                          </h2>
                          <Tag>{s.state}</Tag>
                        </div>
                        <p>
                          {s.holdout
                            ? "No asset · holdout assignment"
                            : "Asset group assignment"}
                        </p>
                        {s.steps.map((step, i) => (
                          <div key={i} className="sequence-touch">
                            <Tag>
                              {step.channel} · {step.state}
                            </Tag>
                            <p dir="auto">{step.body}</p>
                          </div>
                        ))}
                        {data.fixture && (
                          <Button
                            disabled={
                              !canWrite || busy || s.state === "cancelled"
                            }
                            onClick={() =>
                              void action(
                                () =>
                                  client.workspace(ws, "/events/simulate", {
                                    method: "POST",
                                    body: JSON.stringify({
                                      id: crypto.randomUUID(),
                                      sequenceId: s.id,
                                      kind: "replied",
                                      occurredAt: new Date().toISOString(),
                                    }),
                                  }),
                                "Simulated reply recorded. Remaining touches across plays are cancelled.",
                              )
                            }
                          >
                            Record simulated reply
                          </Button>
                        )}
                        <Button
                          disabled={!canWrite || busy}
                          onClick={() =>
                            void action(
                              () =>
                                client.workspace(ws, "/suppressions", {
                                  method: "POST",
                                  body: JSON.stringify({
                                    identity: data.prospects.find(
                                      (p) => p.id === s.prospectId,
                                    )?.snapshot.email,
                                    reason: "User-recorded opt-out",
                                  }),
                                }),
                              "Contact suppressed. Future touches across plays are cancelled.",
                            )
                          }
                        >
                          Record opt-out
                        </Button>
                      </section>
                    ))
                  )}
                </>
              )}
              {tab === "Company context" && (
                <ContextForm
                  key={ws + data.workspace.name}
                  data={data}
                  busy={busy}
                  onSave={(value) =>
                    action(
                      () =>
                        client.workspace(ws, "", {
                          method: "PATCH",
                          body: JSON.stringify(value),
                        }),
                      "Company context saved. Existing approvals were invalidated.",
                    )
                  }
                  onOnboard={(url) => propose("onboard", [], url)}
                />
              )}
              {tab === "Settings" && (
                <>
                  <section className="panel">
                    <h2>Spending and plan</h2>
                    {data.budgets
                      .filter((b) => !b.userId)
                      .map((b) => (
                        <div key={b.id}>
                          <p>
                            <strong>{b.used}</strong> credits used ·{" "}
                            {b.reserved} reserved · {b.cap} cap
                          </p>
                          <form
                            className="inline-form"
                            onSubmit={(e) => {
                              e.preventDefault();
                              const f = new FormData(e.currentTarget);
                              void action(
                                () =>
                                  client.workspace(ws, "", {
                                    method: "PATCH",
                                    body: JSON.stringify({
                                      cap: Number(f.get("cap")),
                                    }),
                                  }),
                                "Spending cap saved.",
                              );
                            }}
                          >
                            <label>
                              Monthly cap
                              <Input
                                type="number"
                                name="cap"
                                min={0}
                                defaultValue={b.cap}
                              />
                            </label>
                            <Button
                              type="submit"
                              disabled={data.role !== "owner" || busy}
                            >
                              Save cap
                            </Button>
                          </form>
                        </div>
                      ))}
                    <div className="plan-grid">
                      {Object.entries(data.plans).map(([name, plan]) => (
                        <div key={name}>
                          <h3>{name}</h3>
                          <p>${plan.price} / month</p>
                          <small>
                            {plan.aiCredits.toLocaleString()} AI credits
                          </small>
                          <Button
                            disabled={data.role !== "owner" || busy}
                            onClick={() =>
                              void action(
                                () =>
                                  client.workspace(ws, "", {
                                    method: "PATCH",
                                    body: JSON.stringify({ plan: name }),
                                  }),
                                `Mock checkout: ${name} selected. No payment was collected.`,
                              )
                            }
                          >
                            Mock checkout
                          </Button>
                        </div>
                      ))}
                    </div>
                  </section>
                  <QuotaSettings
                    data={data}
                    busy={busy}
                    onSave={(value) =>
                      action(
                        () =>
                          client.workspace(ws, "", {
                            method: "PATCH",
                            body: JSON.stringify(value),
                          }),
                        "Workspace quotas and member caps saved.",
                      )
                    }
                  />
                  <section className="panel">
                    <h2>Connectors</h2>
                    <p className="muted">
                      Secrets are encrypted server-side. Saving credentials does
                      not enable live sending.
                    </p>
                    <div className="connector">
                      <span>Twenty CRM</span>
                      <Button
                        disabled={data.role !== "owner" || busy}
                        onClick={() =>
                          void action(
                            () =>
                              client.workspace(ws, "/connectors/crm/check", {
                                method: "POST",
                              }),
                            "Twenty CRM connection verified.",
                          )
                        }
                      >
                        Check connection
                      </Button>
                    </div>
                    {data.connectors.map((c) => (
                      <div key={c.provider} className="connector">
                        <div>
                          <strong>{c.provider}</strong>
                          <p>
                            {c.mode} · {c.status}
                          </p>
                          {c.lastError && <p>{c.lastError}</p>}
                        </div>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const f = new FormData(e.currentTarget);
                            const form = e.currentTarget;
                            void action(async () => {
                              await client.workspace(
                                ws,
                                `/connectors/${c.provider}`,
                                {
                                  method: "POST",
                                  body: JSON.stringify({
                                    secret: f.get("secret"),
                                  }),
                                },
                              );
                              form.reset();
                            }, "Sandbox credential saved for validation.");
                          }}
                        >
                          <Input
                            aria-label={`${c.provider} secret`}
                            name="secret"
                            type="password"
                            placeholder={
                              c.provider === "predictleads"
                                ? "JSON with key and token"
                                : "API key"
                            }
                            autoComplete="off"
                            required
                          />
                          <Button
                            type="submit"
                            disabled={data.role !== "owner" || busy}
                          >
                            Save
                          </Button>
                        </form>
                      </div>
                    ))}
                  </section>
                  <section className="panel">
                    <h2>Sender pre-flight</h2>
                    {Object.keys(data.workspace.preflight).length ? (
                      <dl className="preflight">
                        {Object.entries(data.workspace.preflight).map(
                          ([key, value]) => (
                            <div key={key}>
                              <dt>{key}</dt>
                              <dd>{String(value)}</dd>
                            </div>
                          ),
                        )}
                      </dl>
                    ) : (
                      <p>No sender check yet. Start P2.</p>
                    )}
                    <Button
                      disabled={!canWrite || busy}
                      onClick={() => void propose("preflight")}
                    >
                      Review sender check
                    </Button>
                  </section>
                  <section className="panel">
                    <h2>Audit history</h2>
                    {data.audit.length ? (
                      data.audit.map((a) => (
                        <p key={a.id}>
                          {a.action}{" "}
                          <time className="muted">
                            {new Date(a.createdAt).toLocaleString()}
                          </time>
                        </p>
                      ))
                    ) : (
                      <p>Actions will appear here as you work.</p>
                    )}
                  </section>
                </>
              )}
              {data.runs.length > 0 && (
                <section className="panel run-log">
                  <h2>Recent runs</h2>
                  {data.runs.slice(0, 8).map((r) => (
                    <div className="run-row" key={r.id}>
                      <div>
                        <strong>{r.tool.replaceAll("_", " ")}</strong>
                        <p>
                          {r.error ||
                            `${r.actualCost} / ${r.estimate} credits reconciled`}
                        </p>
                        {r.nextAction && <p>{r.nextAction}</p>}
                      </div>
                      <Tag good={r.state === "succeeded"}>{r.state}</Tag>
                      <Button onClick={() => setActiveRun(r.id)}>
                        Progress
                      </Button>
                    </div>
                  ))}
                  {activeRun && (
                    <div className="progress-log" aria-live="polite">
                      {events.map((e) => (
                        <p key={e.id}>{e.message}</p>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </main>
      {chatOpen && (
        <aside className="assistant" inert={Boolean(proposal || preview)}>
          <header>
            <IconMessageCircle size={18} />
            <strong>Workspace assistant</strong>
            <button
              aria-label="Close assistant"
              onClick={() => setChatOpen(false)}
            >
              ×
            </button>
          </header>
          <div className="assistant-context">
            <Tag>{play}</Tag>
            <span>{selected.length} selected</span>
            <span>{language}</span>
          </div>
          <div className="chat-history">
            {!chats.length && (
              <div className="assistant-welcome">
                <h2>A useful next step.</h2>
                <p>
                  Tell me what you want to prepare. I’ll propose a workspace
                  action for you to review.
                </p>
                <p className="muted">
                  {data?.modelFixture
                    ? "Fixture assistant · structured action suggestions. Model access is pending."
                    : "Model proposals use reviewed context. Each action needs your cost approval."}
                </p>
              </div>
            )}
            {chats.map((c) => (
              <div className={`chat-message ${c.role}`} key={c.id}>
                <small>{c.role === "user" ? "You" : "Assistant"}</small>
                <p dir="auto">{c.content}</p>
              </div>
            ))}
            {chatTool && (
              <Button
                disabled={busy || !canWrite}
                onClick={() => void propose(chatTool)}
              >
                Review proposed action
              </Button>
            )}
          </div>
          <form
            className="chat-compose"
            onSubmit={(e) => {
              e.preventDefault();
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
            }}
          >
            <label className="sr-only" htmlFor="assistant-input">
              Message assistant
            </label>
            <textarea
              id="assistant-input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Prepare a draft for these accounts…"
              required
              maxLength={3000}
            />
            <Button
              type="submit"
              disabled={busy || !canWrite || !chatInput.trim()}
            >
              Send
            </Button>
          </form>
        </aside>
      )}
      {proposal && (
        <div className="modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="cost-title"
            className="modal"
          >
            <p className="eyebrow">REVIEW BEFORE RUNNING</p>
            <h2 id="cost-title">{proposal.input.tool.replaceAll("_", " ")}</h2>
            <p>
              {proposal.quote.audience || "Workspace"} selected ·{" "}
              {proposal.input.language} · {proposal.input.play}
            </p>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <div className="cost">
              <strong>{proposal.quote.estimate}</strong> credits maximum
            </div>
            <p>
              Audience, evidence, copy and sender settings are bound to this
              approval. It expires in 15 minutes. Unused credits are released
              after the run.
            </p>
            {proposal.input.tool === "queue_sequence" && (
              <p>
                Each contact must pass current copy approval, suppression,
                country policy and sender checks. Sequences are simulated.
              </p>
            )}
            <div className="button-row">
              <Button disabled={busy} onClick={() => setProposal(null)}>
                Cancel
              </Button>
              <Button disabled={busy} onClick={() => void launch()}>
                {busy ? "Queuing…" : "Approve cost and run"}
              </Button>
            </div>
          </section>
        </div>
      )}
      {preview && (
        <div className="modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="asset-title"
            className="modal asset-preview"
          >
            <div className="section-title">
              <h2 id="asset-title">{preview.title}</h2>
              <Button onClick={() => setPreview(null)}>Close preview</Button>
            </div>
            <iframe
              title="Sandboxed asset preview"
              sandbox=""
              src={`/api/workspaces/${ws}/assets/${preview.id}/html`}
            />
          </section>
        </div>
      )}
    </div>
  );
}

function ProspectReview({
  prospect,
  canApprove,
  onBack,
  onSave,
}: {
  prospect: Prospect;
  canApprove: boolean;
  onBack: () => void;
  onSave: (value: unknown) => Promise<void>;
}) {
  const [evidence, setEvidence] = useState(prospect.evidence);
  useEffect(() => setEvidence(prospect.evidence), [prospect]);
  return (
    <section className="panel">
      <Button onClick={onBack}>Back to accounts</Button>
      <h2>
        {prospect.snapshot.firstName} {prospect.snapshot.lastName}
      </h2>
      <p>
        {prospect.snapshot.title} · <bdi>{prospect.snapshot.email}</bdi>
      </p>
      {prospect.breakdown.breakdown?.map((r) => (
        <p key={r.rule}>
          {r.rule}: {r.points} points · {r.state}
        </p>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void onSave({
            evidence,
            lawfulBasis: f.get("lawfulBasis"),
            country: f.get("country"),
            consentAt: f.get("consentAt")
              ? new Date(String(f.get("consentAt"))).toISOString()
              : null,
            excluded: f.get("excluded") === "on",
          });
        }}
      >
        <h3>Dated source review</h3>
        {evidence.map((item, index) => (
          <div className="evidence" key={item.id}>
            <label>
              Claim
              <textarea
                dir="auto"
                value={item.claim}
                disabled={!canApprove}
                onChange={(e) =>
                  setEvidence((previous) =>
                    previous.map((v, i) =>
                      i === index
                        ? { ...v, claim: e.target.value, approved: false }
                        : v,
                    ),
                  )
                }
              />
            </label>
            <label>
              Source URL
              <Input
                value={item.url}
                type="url"
                disabled={!canApprove}
                onChange={(e) =>
                  setEvidence((previous) =>
                    previous.map((v, i) =>
                      i === index
                        ? { ...v, url: e.target.value, approved: false }
                        : v,
                    ),
                  )
                }
              />
            </label>
            <label>
              Source date
              <Input
                type="date"
                value={item.date.slice(0, 10)}
                disabled={!canApprove}
                onChange={(e) =>
                  setEvidence((previous) =>
                    previous.map((v, i) =>
                      i === index
                        ? {
                            ...v,
                            date: e.target.value
                              ? new Date(e.target.value).toISOString()
                              : "",
                            approved: false,
                          }
                        : v,
                    ),
                  )
                }
              />
            </label>
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              Open source
            </a>
            <label className="check-label">
              <input
                type="checkbox"
                checked={item.approved}
                disabled={!canApprove}
                onChange={(e) =>
                  setEvidence((previous) =>
                    previous.map((v, i) =>
                      i === index ? { ...v, approved: e.target.checked } : v,
                    ),
                  )
                }
              />
              I reviewed this factual claim and its dated source
            </label>
          </div>
        ))}
        <Button
          type="button"
          disabled={!canApprove}
          onClick={() =>
            setEvidence((previous) => [
              ...previous,
              {
                id: crypto.randomUUID(),
                claim: "",
                url: "https://example.com",
                date: new Date().toISOString(),
                kind: "fact",
                approved: false,
                source: "Human supplied",
              },
            ])
          }
        >
          Add source
        </Button>
        <div className="form-grid">
          <label>
            Country
            <select name="country" defaultValue={prospect.country}>
              <option value="EG">Egypt</option>
              <option value="SA">Saudi Arabia</option>
              <option value="AE">United Arab Emirates</option>
            </select>
          </label>
          <label>
            Communication basis
            <select
              name="lawfulBasis"
              defaultValue={prospect.lawfulBasis ?? ""}
            >
              <option value="">Not recorded · blocked</option>
              <option value="consent">Recorded consent</option>
              <option value="relationship">Existing relationship</option>
            </select>
          </label>
          <label>
            Consent time
            <Input
              name="consentAt"
              type="datetime-local"
              defaultValue={prospect.consentAt?.slice(0, 16) ?? ""}
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              name="excluded"
              defaultChecked={prospect.excluded}
            />
            Exclude from outreach
          </label>
        </div>
        <Button type="submit" disabled={!canApprove}>
          Save evidence and policy
        </Button>
      </form>
    </section>
  );
}
function DraftReview({
  draft,
  name,
  canWrite,
  canApprove,
  busy,
  onSave,
  onApprove,
  assets,
  onAttach,
}: {
  draft: Draft;
  name: string;
  canWrite: boolean;
  canApprove: boolean;
  busy: boolean;
  onSave: (content: Touch[]) => Promise<void>;
  onApprove: () => Promise<void>;
  assets: Asset[];
  onAttach: (id: string | null) => Promise<void>;
}) {
  const [content, setContent] = useState(draft.content),
    [reviewed, setReviewed] = useState(false);
  const [assetId, setAssetId] = useState(draft.assetId ?? "");
  return (
    <section className="panel">
      <div className="section-title">
        <h2>{name}</h2>
        <Tag good={draft.approvedVersion === draft.version}>
          Version {draft.version} ·{" "}
          {draft.approvedVersion === draft.version
            ? "Approved"
            : "Needs review"}
        </Tag>
      </div>
      {content.map((touch, index) => (
        <div className="draft-touch" key={index}>
          <Tag>
            {touch.channel} · day {touch.day}
          </Tag>
          {touch.subject !== undefined && (
            <label>
              Subject
              <Input
                dir="auto"
                value={touch.subject}
                disabled={!canWrite}
                onChange={(e) =>
                  setContent((previous) =>
                    previous.map((v, i) =>
                      i === index ? { ...v, subject: e.target.value } : v,
                    ),
                  )
                }
              />
            </label>
          )}
          <label>
            Message
            <textarea
              dir="auto"
              value={touch.body}
              disabled={!canWrite}
              onChange={(e) =>
                setContent((previous) =>
                  previous.map((v, i) =>
                    i === index ? { ...v, body: e.target.value } : v,
                  ),
                )
              }
            />
          </label>
          <small>
            Source references:{" "}
            {touch.evidenceIds.length || "Offer-only manual task"}
          </small>
        </div>
      ))}
      <label>
        Approved asset
        <select
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
          disabled={!canWrite}
        >
          <option value="">No asset</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title} · {a.language}
            </option>
          ))}
        </select>
      </label>
      <Button
        disabled={!canWrite || busy || assetId === (draft.assetId ?? "")}
        onClick={() => void onAttach(assetId || null)}
      >
        Save asset assignment
      </Button>
      <label className="check-label">
        <input
          type="checkbox"
          checked={reviewed}
          onChange={(e) => setReviewed(e.target.checked)}
        />
        I reviewed all three touches and their claims
      </label>
      <div className="button-row">
        <Button
          disabled={!canWrite || busy}
          onClick={() => void onSave(content)}
        >
          Save revision
        </Button>
        <Button
          disabled={
            !canApprove ||
            busy ||
            !reviewed ||
            JSON.stringify(content) !== JSON.stringify(draft.content)
          }
          onClick={() => void onApprove()}
        >
          Approve current version
        </Button>
      </div>
    </section>
  );
}
function ContextForm({
  data,
  busy,
  onSave,
  onOnboard,
}: {
  data: Dashboard;
  busy: boolean;
  onSave: (value: unknown) => Promise<void>;
  onOnboard: (url: string) => Promise<void>;
}) {
  const [description, setDescription] = useState(
    data.workspace.company.description,
  );
  const onboarding = data.runs.find(
    (r) => r.tool === "onboard" && r.state === "succeeded",
  )?.output as { proposedDescription?: string; website?: string }[] | undefined;
  return (
    <section className="panel">
      {onboarding?.[0]?.proposedDescription && (
        <div>
          <h2>Website context proposal</h2>
          <p dir="auto">{onboarding[0].proposedDescription}</p>
          <p>
            Source: {onboarding[0].website}. Review this text before saving it
            as company context.
          </p>
          <Button
            disabled={data.role !== "owner"}
            onClick={() => setDescription(onboarding[0].proposedDescription!)}
          >
            Use proposal for review
          </Button>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void onSave({
            name: f.get("name"),
            company: {
              description: f.get("description"),
              icp: f.get("icp"),
              marketingLicence: f.get("licence") === "on",
            },
            brand: {
              name: f.get("brand"),
              website: f.get("website"),
              primary: f.get("primary"),
              accent: "#6B7365",
            },
            offers: [
              {
                id: "growth",
                text: f.get("offer"),
                approved: f.get("offerApproved") === "on",
              },
            ],
          });
        }}
      >
        <div className="form-grid">
          <label>
            Workspace name
            <Input name="name" defaultValue={data.workspace.name} required />
          </label>
          <label>
            Brand name
            <Input
              name="brand"
              defaultValue={data.workspace.brand.name}
              required
            />
          </label>
          <label>
            Website
            <Input
              name="website"
              type="url"
              defaultValue={data.workspace.brand.website}
              required
            />
          </label>
          <label>
            Brand color
            <Input
              name="primary"
              defaultValue={data.workspace.brand.primary}
              pattern="#[0-9a-fA-F]{6}"
              required
            />
          </label>
        </div>
        <label>
          What your company does
          <textarea
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label>
          Ideal customer
          <textarea name="icp" defaultValue={data.workspace.company.icp} />
        </label>
        <label>
          Offer hypothesis
          <textarea
            name="offer"
            defaultValue={data.workspace.offers[0]?.text}
            required
          />
        </label>
        <label className="check-label">
          <input
            name="offerApproved"
            type="checkbox"
            defaultChecked={data.workspace.offers[0]?.approved}
          />
          I reviewed this offer; it does not claim an unverified result
        </label>
        <label className="check-label">
          <input
            name="licence"
            type="checkbox"
            defaultChecked={data.workspace.company.marketingLicence}
          />
          Egypt electronic marketing licence recorded
        </label>
        <Button type="submit" disabled={busy || data.role !== "owner"}>
          Save company context
        </Button>
      </form>
      <hr />
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          void onOnboard(String(new FormData(e.currentTarget).get("url")));
        }}
      >
        <label>
          Suggest context from website
          <Input name="url" type="url" required />
        </label>
        <Button
          type="submit"
          disabled={busy || !["owner", "operator"].includes(data.role)}
        >
          Review website research
        </Button>
      </form>
      <p className="muted">
        Website text is untrusted research. A person reviews it before it
        becomes approved company context.
      </p>
    </section>
  );
}

function QuotaSettings({
  data,
  busy,
  onSave,
}: {
  data: Dashboard;
  busy: boolean;
  onSave: (value: unknown) => Promise<void>;
}) {
  const limits = {
    ...data.plans[data.workspace.plan],
    ...data.workspace.planLimits,
  };
  return (
    <section className="panel">
      <h2>Resource quotas and member caps</h2>
      <p>
        Monthly workspace quotas apply alongside spending caps. Reducing a cap
        retains existing usage and prevents further reservations.
      </p>
      {data.quotas.map((q) => (
        <p key={q.kind}>
          {q.kind}: {q.used} used · {q.reserved} reserved · {q.cap} cap
        </p>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void onSave({
            planLimits: Object.fromEntries(
              ["aiCredits", "enrichmentCredits", "sends", "exports"].map(
                (k) => [k, Number(f.get(k))],
              ),
            ),
            memberCaps: data.members.map((m) => ({
              userId: m.userId,
              cap: Number(f.get(`member:${m.userId}`)),
            })),
          });
        }}
      >
        <div className="form-grid">
          {["aiCredits", "enrichmentCredits", "sends", "exports"].map((k) => (
            <label key={k}>
              {k}
              <Input
                name={k}
                type="number"
                min={0}
                max={k === "exports" ? 10000 : k === "sends" ? 1000000 : 100000}
                defaultValue={limits[k as keyof typeof limits]}
                required
              />
            </label>
          ))}
          {data.members.map((m) => (
            <label key={m.userId}>
              {m.user.name} · {m.role} monthly credits
              <Input
                name={`member:${m.userId}`}
                type="number"
                min={0}
                max={100000}
                defaultValue={
                  m.creditCap ??
                  data.budgets.find((b) => b.userId === m.userId)?.cap ??
                  limits.aiCredits
                }
                required
              />
            </label>
          ))}
        </div>
        <Button type="submit" disabled={data.role !== "owner" || busy}>
          Save quotas and member caps
        </Button>
      </form>
    </section>
  );
}
