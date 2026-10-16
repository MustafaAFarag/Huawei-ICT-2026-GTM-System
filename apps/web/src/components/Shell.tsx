"use client";
import type { ComponentType } from "react";
import {
  IconBuilding,
  IconChecklist,
  IconClock,
  IconFileText,
  IconLanguage,
  IconLogout,
  IconMessageCircle,
  IconMoon,
  IconPlayerPlay,
  IconSearch,
  IconSettings,
  IconSun,
  IconUsers,
} from "@revenue/ui";
import { Badge, Button, Kbd, Meter } from "./primitives";
import type { Tab } from "./workspace-context";
import type { Dashboard, Membership } from "../lib/types";
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

export function Wordmark() {
  return (
    <div className="wordmark">
      <span className="mark" aria-hidden />
      <bdi>Revenue Workspace</bdi>
    </div>
  );
}

export function Sidebar({
  tabs,
  tab,
  onTab,
  memberships,
  ws,
  onWorkspace,
  data,
  userName,
  onSignOut,
  onPalette,
}: {
  tabs: readonly Tab[];
  tab: Tab;
  onTab: (tab: Tab) => void;
  memberships: Membership[];
  ws: string;
  onWorkspace: (id: string) => void;
  data: Dashboard | null;
  userName: string;
  onSignOut: () => void;
  onPalette: () => void;
}) {
  const { t } = usePrefs();
  const budget = data?.budgets.find((b) => !b.userId);
  const pending = data
    ? data.drafts.filter((d) => d.approvedVersion !== d.version).length
    : 0;
  return (
    <>
      <div className="sidebar-top">
        <Wordmark />
        <label className="workspace-picker">
          <span className="eyebrow">{t("Workspace")}</span>
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
        <button className="palette-trigger" onClick={onPalette}>
          <IconSearch size={14} aria-hidden />
          <span>{t("Search or run…")}</span>
          <Kbd>⌘K</Kbd>
        </button>
      </div>
      <nav aria-label="Main navigation" className="nav">
        {tabs.map((name) => {
          const Icon = TAB_ICONS[name];
          return (
            <button
              data-ai-target={`screen:${name}`}
              key={name}
              aria-label={t(name)}
              aria-current={tab === name ? "page" : undefined}
              className={tab === name ? "active" : ""}
              onClick={() => onTab(name)}
            >
              <Icon size={16} />
              <span className="nav-label">{t(name)}</span>
              {name === "Review queue" && pending > 0 && (
                <span className="count mono">{pending}</span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="sidebar-bottom">
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
            <span className="muted small">
              <bdi>{data.workspace.plan}</bdi> {t("plan")}
            </span>
          </div>
        )}
        <div className="user-row">
          <span className="avatar" aria-hidden>
            {(userName[0] ?? "?").toUpperCase()}
          </span>
          <div className="user-meta">
            <p className="truncate" dir="auto">
              {t(userName)}
            </p>
            <Badge>{t(data?.role ?? "Loading")}</Badge>
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
  chatOpen,
  onToggleChat,
}: {
  workspaceName?: string;
  section: string;
  chatOpen: boolean;
  onToggleChat: () => void;
}) {
  const { t, theme, setTheme, language, setLanguage } = usePrefs();
  return (
    <header className="topbar">
      <span className="crumbs">
        <bdi className="truncate">
          {workspaceName ?? t("Loading workspace…")}
        </bdi>
        <span className="slash" aria-hidden>
          /
        </span>
        <strong>{section}</strong>
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
        <Button
          variant={chatOpen ? "secondary" : "ai"}
          size="sm"
          onClick={onToggleChat}
          startIcon={<IconMessageCircle size={14} />}
        >
          {chatOpen ? t("Hide assistant") : t("Assistant")}
        </Button>
      </div>
    </header>
  );
}
