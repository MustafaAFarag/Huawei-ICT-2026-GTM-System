"use client";
import { useEffect, useState, type ComponentType } from "react";
import {
  IconChecklist,
  IconClock,
  IconFileText,
  IconLayoutSidebar,
  IconLogout,
  IconMoon,
  IconPalette,
  IconPlayerPlay,
  IconPlus,
  IconSettings,
  IconSun,
  IconTrash,
  IconUsers,
} from "@revenue/ui";
import type { ToolRequest } from "@revenue/contracts";
import { SidebarSearch } from "./SidebarSearch";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import {
  CAMPAIGN_VIEWS,
  TAB_LABELS,
  type Tab,
} from "./workspace-context";
import type { Dashboard, Membership, Prospect, Thread } from "../lib/types";
import { usePrefs } from "../lib/prefs";
import { Logo } from "./brand/Logo";

export const TAB_ICONS: Record<Tab, ComponentType<{ size?: number }>> = {
  Plays: IconPlayerPlay,
  Accounts: IconUsers,
  "Review queue": IconChecklist,
  "Asset Studio": IconFileText,
  Sequences: IconClock,
  "Company context": IconPalette,
  Settings: IconSettings,
};
// Sidebar order (Figma): Deliverables, Accounts, Campaigns, Review, Brand & company.
// Sequences has no entry: it is a tab of the Campaigns page.
const NAV_TABS: Tab[] = [
  "Asset Studio",
  "Accounts",
  "Plays",
  "Review queue",
  "Company context",
];
const RECENTS_MAX = 5;
const NARROW = "(max-width: 960px)";

export function Wordmark() {
  return <Logo variant="wordmark" />;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => [...word][0])
    .join("")
    .toUpperCase();
}

// Sidebar: logo, workspace switcher, navigation, recent conversations, then (pushed to the
// bottom) settings, AI credits and the profile row. At 960px and below it is an off-canvas drawer.
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
  searchTabs,
  onPlay,
  onProspect,
  onToggleChat,
  onExpandSearch,
  threads,
  threadId,
  onThread,
  onNewChat,
  onArchive,
  collapsed,
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
  searchTabs: readonly Tab[];
  onPlay: (play: ToolRequest["play"]) => void;
  onProspect: (prospect: Prospect) => void;
  onToggleChat: () => void;
  onExpandSearch: () => void;
  threads: Thread[];
  threadId: string | null;
  onThread: (id: string) => void;
  onNewChat: () => void;
  onArchive: (id: string) => void;
  collapsed: boolean;
}) {
  const { t } = usePrefs();
  const budget = data?.budgets.find((b) => !b.userId);
  const spent = budget ? budget.used + budget.reserved : 0;
  const pending = data
    ? data.drafts.filter((d) => d.approvedVersion !== d.version).length
    : 0;
  const navButton = (name: Tab) => {
    const Icon = TAB_ICONS[name];
    const label = t(TAB_LABELS[name]);
    // Campaigns stays highlighted while its Sequences tab is open.
    const active =
      view === name || (name === "Plays" && CAMPAIGN_VIEWS.includes(view as Tab));
    return (
      <button
        data-ai-target={`screen:${name}`}
        key={name}
        type="button"
        aria-label={label}
        title={collapsed ? label : undefined}
        aria-current={active ? "page" : undefined}
        className={active ? "active" : ""}
        onClick={() => onTab(name)}
      >
        <Icon size={18} />
        <span className="nav-label">{label}</span>
        {name === "Review queue" && pending > 0 && (
          <span className="count">{pending}</span>
        )}
      </button>
    );
  };
  return (
    <>
      <div className="sidebar-brand">
        <button
          type="button"
          className="brand-home"
          onClick={onHome}
          aria-label="Caravan home"
        >
          <Wordmark />
        </button>
      </div>
      <WorkspaceSwitcher
        memberships={memberships}
        ws={ws}
        onWorkspace={onWorkspace}
      />
      <nav className="nav" aria-label={t("Main navigation")}>
        <SidebarSearch
          tabs={searchTabs}
          onTab={onTab}
          onPlay={onPlay}
          onProspect={onProspect}
          onToggleChat={onToggleChat}
          onExpand={onExpandSearch}
          data={data}
          threads={threads}
          onThread={onThread}
        />
        <button
          type="button"
          className={`new-chat ${view === "Home" && !threadId ? "active" : ""}`}
          aria-current={view === "Home" && !threadId ? "page" : undefined}
          onClick={onNewChat}
          title={collapsed ? t("New chat") : undefined}
        >
          <IconPlus size={18} />
          <span className="nav-label">{t("New chat")}</span>
        </button>
        {NAV_TABS.map(navButton)}
      </nav>
      <section className="recents" aria-labelledby="recents-title">
        <h2 id="recents-title" className="recents-title">
          {t("Recent conversations")}
        </h2>
        {threads.length === 0 ? (
          <p className="recents-empty">
            {t("Conversations with Nabil appear here.")}
          </p>
        ) : (
          <ul>
            {threads.slice(0, RECENTS_MAX).map((thread) => (
              <li
                key={thread.id}
                className={
                  thread.id === threadId && view === "Home" ? "active" : ""
                }
              >
                <button
                  type="button"
                  className="recent"
                  aria-current={
                    thread.id === threadId && view === "Home"
                      ? "page"
                      : undefined
                  }
                  onClick={() => onThread(thread.id)}
                >
                  <span className="truncate" dir="auto">
                    {thread.title === "Earlier conversation"
                      ? t(thread.title)
                      : thread.title}
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
          {navButton("Settings")}
        </nav>
        {data && budget && (
          <div className="usage">
            <span>{t("AI credits")}</span>
            <span className={spent >= budget.cap * 0.8 ? "usage-high" : ""}>
              <bdi dir="ltr">
                {spent.toLocaleString("en-US")} /{" "}
                {budget.cap.toLocaleString("en-US")}
              </bdi>
            </span>
          </div>
        )}
        <div className="user-row">
          <span className="user-initials" aria-hidden>
            <bdi>{initials(userName) || "?"}</bdi>
          </span>
          <div className="user-meta">
            <p className="truncate" dir="auto">
              {t(userName)}
            </p>
            <p className="user-role truncate">
              {t(data?.role ?? "Loading")}
              {data && (
                <>
                  {" · "}
                  <bdi>{data.workspace.plan}</bdi>
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label={t("Sign out")}
            title={t("Sign out")}
            onClick={onSignOut}
          >
            <IconLogout size={16} className="flip-rtl" />
          </button>
        </div>
      </div>
    </>
  );
}

// Header: sidebar toggle, workspace / page breadcrumb, then language and theme. There is no bell:
// the product has no notification source yet, and an empty bell would only be noise.
export function Topbar({
  workspaceName,
  section,
  collapsed,
  onToggleCollapsed,
  onOpenNav,
  onHome,
}: {
  workspaceName?: string;
  section: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenNav: () => void;
  onHome: () => void;
}) {
  const { t, theme, setTheme, language, setLanguage } = usePrefs();
  // The same icon opens the drawer on narrow screens and collapses the sidebar on wide ones.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(NARROW);
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const menuLabel = narrow
    ? t("Open navigation")
    : collapsed
      ? t("Expand sidebar")
      : t("Collapse sidebar");
  return (
    <header className="topbar">
      <button
        type="button"
        className="icon-button topbar-menu"
        aria-label={menuLabel}
        aria-expanded={narrow ? undefined : !collapsed}
        onClick={narrow ? onOpenNav : onToggleCollapsed}
      >
        <IconLayoutSidebar size={18} className="flip-rtl" />
      </button>
      <button
        type="button"
        className="brand-home topbar-logo"
        onClick={onHome}
        aria-label="Caravan home"
      >
        <Wordmark />
      </button>
      <span className="crumbs">
        <bdi className="crumb-workspace truncate">
          {workspaceName ?? t("Loading workspace…")}
        </bdi>
        <span className="slash" aria-hidden>
          /
        </span>
        <span className="crumb-page truncate" dir="auto">
          {section}
        </span>
      </span>
      <div className="topbar-actions">
        <button
          type="button"
          className="icon-button topbar-lang"
          aria-label={language === "ar" ? "English interface" : "واجهة عربية"}
          title={language === "ar" ? "English" : "العربية"}
          onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
        >
          {language === "ar" ? "EN" : "ع"}
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label={theme === "dark" ? t("Light theme") : t("Dark theme")}
          title={theme === "dark" ? t("Light theme") : t("Dark theme")}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
        </button>
      </div>
    </header>
  );
}
