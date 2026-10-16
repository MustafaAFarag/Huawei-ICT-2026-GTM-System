"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PLAYS, type ToolRequest } from "@revenue/contracts";
import {
  IconMessageCircle,
  IconMoon,
  IconPlayerPlay,
  IconLanguage,
  IconSearch,
  IconUsers,
} from "@revenue/ui";
import { Kbd } from "./primitives";
import { TAB_ICONS } from "./Shell";
import { TAB_LABELS, type Tab } from "./workspace-context";
import type { Dashboard, Prospect } from "../lib/types";
import { usePrefs } from "../lib/prefs";

type Item = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  run: () => void;
};

export function CommandPalette({
  open,
  onClose,
  tabs,
  onTab,
  onPlay,
  onProspect,
  onToggleChat,
  data,
}: {
  open: boolean;
  onClose: () => void;
  tabs: readonly Tab[];
  onTab: (tab: Tab) => void;
  onPlay: (play: ToolRequest["play"]) => void;
  onProspect: (prospect: Prospect) => void;
  onToggleChat: () => void;
  data: Dashboard | null;
}) {
  const { t, theme, setTheme, language, setLanguage } = usePrefs();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const previous = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => input.current?.focus());
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  const items = useMemo<Item[]>(() => {
    const list: Item[] = [
      ...tabs.map((name, i) => {
        const Icon = TAB_ICONS[name];
        return {
          id: `tab:${name}`,
          group: t("Go to"),
          label: t(TAB_LABELS[name]),
          hint: `G ${i + 1}`,
          icon: <Icon size={16} />,
          run: () => onTab(name),
        };
      }),
      ...PLAYS.map((p) => ({
        id: `play:${p.id}`,
        group: t("Plays"),
        label: `${p.id} · ${t(p.name)}`,
        icon: <IconPlayerPlay size={16} />,
        run: () => onPlay(p.id),
      })),
      {
        id: "chat",
        group: t("Actions"),
        label: t("Ask Nabil"),
        icon: <IconMessageCircle size={16} />,
        run: onToggleChat,
      },
      {
        id: "theme",
        group: t("Actions"),
        label: theme === "dark" ? t("Light theme") : t("Dark theme"),
        icon: <IconMoon size={16} />,
        run: () => setTheme(theme === "dark" ? "light" : "dark"),
      },
      {
        id: "lang",
        group: t("Actions"),
        label: language === "ar" ? "English interface" : "واجهة عربية",
        icon: <IconLanguage size={16} />,
        run: () => setLanguage(language === "ar" ? "en" : "ar"),
      },
    ];
    for (const p of data?.prospects.slice(0, 200) ?? [])
      list.push({
        id: `prospect:${p.id}`,
        group: t("Accounts"),
        label: `${p.snapshot.company} · ${p.snapshot.firstName} ${p.snapshot.lastName}`,
        hint: p.breakdown.tier,
        icon: <IconUsers size={16} />,
        run: () => onProspect(p),
      });
    const q = query.trim().toLowerCase();
    const filtered = q
      ? list.filter((item) => item.label.toLowerCase().includes(q))
      : list.filter((item) => !item.id.startsWith("prospect:"));
    return filtered.slice(0, 40);
  }, [tabs, data, query, t, theme, language, onTab, onPlay, onProspect, onToggleChat, setTheme, setLanguage]);
  if (!open) return null;
  const choose = (item?: Item) => {
    if (!item) return;
    onClose();
    item.run();
  };
  let lastGroup = "";
  return (
    <div className="modal-backdrop palette-backdrop" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("Command palette")}
        className="palette"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, items.length - 1));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          }
          if (e.key === "Enter") {
            e.preventDefault();
            choose(items[active]);
          }
        }}
      >
        <div className="palette-search">
          <IconSearch size={16} aria-hidden />
          <input
            ref={input}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={items[active]?.id}
            placeholder={t("Search screens, plays, accounts…")}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
          />
          <Kbd>esc</Kbd>
        </div>
        <ul id="palette-list" role="listbox" className="palette-list">
          {items.map((item, index) => {
            const header = item.group !== lastGroup;
            lastGroup = item.group;
            return (
              <li key={item.id} role="presentation">
                {header && <p className="eyebrow palette-group">{item.group}</p>}
                <div
                  id={item.id}
                  role="option"
                  aria-selected={index === active}
                  className="palette-item"
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(item)}
                >
                  <span className="palette-icon">{item.icon}</span>
                  <span className="truncate" dir="auto">
                    {item.label}
                  </span>
                  {item.hint && <Kbd>{item.hint}</Kbd>}
                </div>
              </li>
            );
          })}
          {!items.length && (
            <li className="palette-empty muted">{t("No results")}</li>
          )}
        </ul>
      </div>
    </div>
  );
}
