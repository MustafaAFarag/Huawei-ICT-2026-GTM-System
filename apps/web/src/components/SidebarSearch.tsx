"use client";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
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
import type { Dashboard, Prospect, Thread } from "../lib/types";
import { usePrefs } from "../lib/prefs";
import "../styles/search.css";

export const SIDEBAR_SEARCH_ID = "sidebar-search";

type Item = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  run: () => void;
};

type Place = { top: number; start: number; width: number; maxHeight: number };

const POPOVER_MIN_WIDTH = 320;
const RECENT_DEFAULT = 5;

// Inline sidebar search (replaces the old modal command palette). The results popover is
// portalled to <body> and fixed-positioned under the input so the sidebar's own scroll/clip
// box cannot cut it off.
export function SidebarSearch({
  tabs,
  onTab,
  onPlay,
  onProspect,
  onToggleChat,
  onExpand,
  data,
  threads,
  onThread,
}: {
  tabs: readonly Tab[];
  onTab: (tab: Tab) => void;
  onPlay: (play: ToolRequest["play"]) => void;
  onProspect: (prospect: Prospect) => void;
  onToggleChat: () => void;
  /** Collapsed rail: expand the sidebar, then focus the input. */
  onExpand: () => void;
  data: Dashboard | null;
  threads: Thread[];
  onThread: (id: string) => void;
}) {
  const { t, theme, setTheme, language, setLanguage } = usePrefs();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [place, setPlace] = useState<Place | null>(null);
  const field = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const uid = useId().replace(/:/g, "");
  const listId = `${uid}-list`;
  const optionId = (index: number) => `${uid}-opt-${index}`;

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
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
    ];
    const recent = q ? threads : threads.slice(0, RECENT_DEFAULT);
    for (const thread of recent)
      list.push({
        id: `thread:${thread.id}`,
        group: t("Conversations"),
        label:
          thread.title === "Earlier conversation"
            ? t(thread.title)
            : thread.title,
        icon: <IconMessageCircle size={16} />,
        run: () => onThread(thread.id),
      });
    list.push(
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
    );
    for (const p of data?.prospects.slice(0, 200) ?? [])
      list.push({
        id: `prospect:${p.id}`,
        group: t("Accounts"),
        label: `${p.snapshot.company} · ${p.snapshot.firstName} ${p.snapshot.lastName}`,
        hint: p.breakdown.tier,
        icon: <IconUsers size={16} />,
        run: () => onProspect(p),
      });
    const filtered = q
      ? list.filter((item) => item.label.toLowerCase().includes(q))
      : list.filter((item) => !item.id.startsWith("prospect:"));
    return filtered.slice(0, 40);
  }, [
    tabs,
    data,
    threads,
    query,
    t,
    theme,
    language,
    onTab,
    onPlay,
    onProspect,
    onThread,
    onToggleChat,
    setTheme,
    setLanguage,
  ]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);
  const choose = (item?: Item) => {
    if (!item) return;
    close();
    item.run();
  };

  const measure = useCallback(() => {
    const el = field.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const rtl = getComputedStyle(el).direction === "rtl";
    const viewport = document.documentElement.clientWidth;
    const width = Math.min(
      Math.max(rect.width, POPOVER_MIN_WIDTH),
      viewport - 16,
    );
    const top = rect.bottom + 6;
    setPlace({
      top,
      start: rtl ? viewport - rect.right : rect.left,
      width,
      maxHeight: Math.max(160, Math.min(420, window.innerHeight - top - 16)),
    });
  }, []);
  useLayoutEffect(() => {
    if (!open) return;
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    document
      .getElementById(optionId(active))
      ?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, open]);

  const showList = open && place;
  let lastGroup = "";
  return (
    <>
      <div ref={field} className="search-field">
        <IconSearch size={16} aria-hidden className="search-icon" />
        <input
          ref={input}
          id={SIDEBAR_SEARCH_ID}
          data-ai-target="sidebar-search"
          type="text"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          aria-label={t("Search")}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={Boolean(showList)}
          aria-controls={listId}
          aria-activedescendant={
            showList && items[active] ? optionId(active) : undefined
          }
          placeholder={t("Search")}
          value={query}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onBlur={close}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              if (open || query) {
                e.preventDefault();
                close();
              }
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              if (!open) setOpen(true);
              else setActive((a) => Math.min(a + 1, items.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && open) {
              e.preventDefault();
              choose(items[active]);
            }
          }}
        />
        <Kbd>⌘K</Kbd>
      </div>
      <button
        type="button"
        className="search-collapsed"
        aria-label={t("Search")}
        title={t("Search")}
        onClick={onExpand}
      >
        <IconSearch size={18} />
      </button>
      {showList &&
        createPortal(
          <div
            className="search-pop"
            style={{
              insetBlockStart: place.top,
              insetInlineStart: place.start,
              inlineSize: place.width,
              maxBlockSize: place.maxHeight,
            }}
            // Keep focus in the input while clicking or scrolling the results.
            onMouseDown={(e) => e.preventDefault()}
          >
            <ul
              id={listId}
              role="listbox"
              aria-label={t("Search")}
              className="search-list"
            >
              {items.map((item, index) => {
                const header = item.group !== lastGroup;
                lastGroup = item.group;
                return (
                  <li key={item.id} role="presentation">
                    {header && (
                      <p className="eyebrow search-group" aria-hidden>
                        {item.group}
                      </p>
                    )}
                    <div
                      id={optionId(index)}
                      role="option"
                      aria-selected={index === active}
                      className="search-item"
                      onMouseEnter={() => setActive(index)}
                      onClick={() => choose(item)}
                    >
                      <span className="search-item-icon">{item.icon}</span>
                      <span className="truncate" dir="auto">
                        {item.label}
                      </span>
                      {item.hint && <Kbd>{item.hint}</Kbd>}
                    </div>
                  </li>
                );
              })}
              {!items.length && (
                <li role="presentation" className="search-empty muted">
                  {t("No results")}
                </li>
              )}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}
