"use client";
import type { ComponentType } from "react";
import {
  IconBuilding,
  IconChecklist,
  IconClock,
  IconEdit,
  IconFileText,
  IconLanguage,
  IconLayoutSidebar,
  IconLogout,
  IconMoon,
  IconPlayerPlay,
  IconSearch,
  IconSettings,
  IconSun,
  IconTrash,
  IconUsers,
} from "@revenue/ui";
import { Badge, Kbd, Meter } from "./primitives";
import { TAB_LABELS, type Tab } from "./workspace-context";
import type { Dashboard, Membership, Thread } from "../lib/types";
import { usePrefs } from "../lib/prefs";

export const TAB_ICONS: Record<Tab, ComponentType<{ size?: number }>> = {
  Plays: IconPlayerPlay,
  Accounts: IconUsers,
  "Review queue": IconChecklist,
  "Asset Studio": IconFileText,
  Sequences: IconClock,
  "Company context": IconBuilding,
  Settings: IconSettings,
};
const WORK_TABS: Tab[] = ["Asset Studio", "Accounts", "Plays", "Review queue", "Sequences"];
const SETUP_TABS: Tab[] = ["Company context", "Settings"];

export function Wordmark() {
  return (
    <div className="wordmark">
      <span className="mark" aria-hidden />
      <bdi>Caravan</bdi>
    </div>
  );
}

// Claude-style sidebar: new chat and search first, work screens, then recent conversations.
// Setup screens, credits and the account sit at the bottom.
export function Sidebar({
  view,
  onTab,
  onHome,
  memberships,
  ws,
  onWorkspace,
  data,
  userName,
  onSignOut,
  onPalette,
  threads,
  threadId,
  onThread,
  onNewChat,
  onArchive,
  collapsed,
  onToggleCollapsed,
}: {
  view: "Home" | Tab;
  onTab: (tab: Tab) => void;
  onHome: () => void;
  memberships: Membership[];
  ws: string;
  onWorkspace: (id: string) => void;
  data: Dashboard | null;
  userName: string;
  onSignOut: () => void;
  onPalette: () => void;
  threads: Thread[];
  threadId: string | null;
  onThread: (id: string) => void;
  onNewChat: () => void;
  onArchive: (id: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const { t } = usePrefs();
  const budget = data?.budgets.find((b) => !b.userId);
  const pending = data
    ? data.drafts.filter((d) => d.approvedVersion !== d.version).length
    : 0;
  const navButton = (name: Tab) => {
    const Icon = TAB_ICONS[name];
    const label = t(TAB_LABELS[name]);
    return (
      <button
        data-ai-target={`screen:${name}`}
        key={name}
        aria-label={label}
        title={collapsed ? label : undefined}
        aria-current={view === name ? "page" : undefined}
        className={view === name ? "active" : ""}
        onClick={() => onTab(name)}
      >
        <Icon size={16} />
        <span className="nav-label">{label}</span>
        {name === "Review queue" && pending > 0 && (
          <span className="count mono">{pending}</span>
        )}
      </button>
    );
  };
  return (
    <>
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <button type="button" className="brand-home" onClick={onHome} aria-label="Caravan home">
            <Wordmark />
          </button>
          <button
            type="button"
            className="icon-button sidebar-collapse"
            aria-label={collapsed ? t("Expand sidebar") : t("Collapse sidebar")}
            aria-expanded={!collapsed}
            onClick={onToggleCollapsed}
          >
            <IconLayoutSidebar size={16} />
          </button>
        </div>
        <nav className="nav" aria-label={t("Chats")}>
          <button
            type="button"
            className={`new-chat ${view === "Home" && !threadId ? "active" : ""}`}
            onClick={onNewChat}
            title={collapsed ? t("New chat") : undefined}
          >
            <IconEdit size={16} />
            <span className="nav-label">{t("New chat")}</span>
          </button>
          <button type="button" onClick={onPalette} title={collapsed ? t("Search") : undefined}>
            <IconSearch size={16} />
            <span className="nav-label">{t("Search")}</span>
            <Kbd>⌘K</Kbd>
          </button>
        </nav>
      </div>
      <nav aria-label="Main navigation" className="nav nav-work">
        {WORK_TABS.map(navButton)}
      </nav>
      <section className="recents" aria-labelledby="recents-title">
        <h2 id="recents-title" className="recents-title">
          {t("Recents")}
        </h2>
        {threads.length === 0 ? (
          <p className="muted small recents-empty">{t("Conversations with Nabil appear here.")}</p>
        ) : (
          <ul>
            {threads.map((thread) => (
              <li key={thread.id} className={thread.id === threadId && view === "Home" ? "active" : ""}>
                <button
                  type="button"
                  className="recent"
                  aria-current={thread.id === threadId && view === "Home" ? "page" : undefined}
                  onClick={() => onThread(thread.id)}
                >
                  <span className="truncate" dir="auto">
                    {thread.title === "Earlier conversation" ? t(thread.title) : thread.title}
                  </span>
                </button>
                <button
                  type="button"
                  className="icon-button recent-archive"
                  aria-label={`${t("Archive")}: ${thread.title}`}
                  title={t("Archive")}
                  onClick={() => onArchive(thread.id)}
                >
                  <IconTrash size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="sidebar-bottom">
        <nav className="nav" aria-label={t("Setup")}>
          {SETUP_TABS.map(navButton)}
        </nav>
        {data && budget && (
          <div className="usage">
            <div className="usage-head">
              <span className="eyebrow">{t("AI credits")}</span>
              <span className="mono">
                <bdi dir="ltr">
                  {budget.used + budget.reserved}/{budget.cap}
                </bdi>
              </span>
            </div>
            <Meter value={budget.used + budget.reserved} max={budget.cap} />
          </div>
        )}
        <label className="workspace-picker">
          <span className="sr-only">{t("Workspace")}</span>
          <select
            aria-label="Workspace"
            value={ws}
            onChange={(e) => onWorkspace(e.target.value)}
          >
            {memberships.map((m) => (
              <option key={m.workspace.id} value={m.workspace.id}>
                {m.workspace.name}
              </option>
            ))}
          </select>
        </label>
        <div className="user-row">
          <span className="avatar" aria-hidden>
            {(userName[0] ?? "?").toUpperCase()}
          </span>
          <div className="user-meta">
            <p className="truncate" dir="auto">
              {t(userName)}
            </p>
            <Badge>
              {t(data?.role ?? "Loading")}
              {data && (
                <>
                  {" · "}
                  <bdi>{data.workspace.plan}</bdi>
                </>
              )}
            </Badge>
          </div>
          <button
            className="icon-button"
            aria-label={t("Sign out")}
            title={t("Sign out")}
            onClick={onSignOut}
          >
            <IconLogout size={16} />
          </button>
        </div>
      </div>
    </>
  );
}

export function Topbar({
  workspaceName,
  section,
  onMenu,
}: {
  workspaceName?: string;
  section: string;
  onMenu: () => void;
}) {
  const { t, theme, setTheme, language, setLanguage } = usePrefs();
  return (
    <header className="topbar">
      <button
        type="button"
        className="icon-button topbar-menu"
        aria-label={t("Open navigation")}
        onClick={onMenu}
      >
        <IconLayoutSidebar size={16} />
      </button>
      <span className="crumbs">
        <bdi className="truncate">
          {workspaceName ?? t("Loading workspace…")}
        </bdi>
        <span className="slash" aria-hidden>
          /
        </span>
        <strong className="truncate" dir="auto">
          {section}
        </strong>
      </span>
      <div className="topbar-actions">
        <button
          className="icon-button"
          aria-label={language === "ar" ? "English interface" : "واجهة عربية"}
          title={language === "ar" ? "English" : "العربية"}
          onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
        >
          <IconLanguage size={16} />
          <span className="icon-button-label">
            {language === "ar" ? "EN" : "ع"}
          </span>
        </button>
        <button
          className="icon-button"
          aria-label={theme === "dark" ? t("Light theme") : t("Dark theme")}
          title={theme === "dark" ? t("Light theme") : t("Dark theme")}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <IconSun size={16} /> : <IconMoon size={16} />}
        </button>
      </div>
    </header>
  );
}
