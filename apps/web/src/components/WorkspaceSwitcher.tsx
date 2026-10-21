"use client";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconSelector } from "@revenue/ui";
import type { Membership } from "../lib/types";
import { usePrefs } from "../lib/prefs";

function initials(name: string) {
  return name
    .replace(/[·|-].*$/, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const POP_MIN_WIDTH = 280;

/* Workspace picker: a button that opens a listbox popover (replaces the native select).
   The popover is portalled to <body> so it can be wider than the sidebar, which clips overflow. */
export function WorkspaceSwitcher({
  memberships,
  ws,
  onWorkspace,
}: {
  memberships: Membership[];
  ws: string;
  onWorkspace: (id: string) => void;
}) {
  const { t } = usePrefs();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{
    top: number;
    start: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const listId = useId();
  const current = memberships.find((m) => m.workspace.id === ws);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!root.current?.contains(target) && !pop.current?.contains(target))
        setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const measure = useCallback(() => {
    const el = trigger.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const rtl = getComputedStyle(el).direction === "rtl";
    const viewport = document.documentElement.clientWidth;
    const top = rect.bottom + 6;
    setPlace({
      top,
      start: rtl ? viewport - rect.right : rect.left,
      width: Math.min(Math.max(rect.width, POP_MIN_WIDTH), viewport - 16),
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
    if (!open || !place) return;
    list.current?.focus();
    list.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, place, active]);

  const show = () => {
    setActive(
      Math.max(
        0,
        memberships.findIndex((m) => m.workspace.id === ws),
      ),
    );
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    setPlace(null);
    trigger.current?.focus();
  };
  const pick = (id: string) => {
    if (id !== ws) onWorkspace(id);
    close();
  };

  const onKey = (e: React.KeyboardEvent) => {
    const last = memberships.length - 1;
    if (e.key === "ArrowDown") setActive((i) => (i >= last ? 0 : i + 1));
    else if (e.key === "ArrowUp") setActive((i) => (i <= 0 ? last : i - 1));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(last);
    else if (e.key === "Enter" || e.key === " ") {
      const m = memberships[active];
      if (m) pick(m.workspace.id);
    } else if (e.key === "Escape" || e.key === "Tab") {
      if (e.key === "Escape") close();
      else setOpen(false);
      return;
    } else return;
    e.preventDefault();
  };

  return (
    <div className="workspace-picker" ref={root}>
      <button
        ref={trigger}
        type="button"
        className="ws-trigger"
        data-value={ws}
        aria-label={t("Workspace")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            show();
          }
        }}
      >
        <span className="ws-avatar" aria-hidden>
          {initials(current?.workspace.name ?? "")}
        </span>
        <span className="ws-name truncate" dir="auto">
          {current?.workspace.name}
        </span>
        <IconSelector size={16} aria-hidden className="ws-chevron" />
      </button>
      {open &&
        place &&
        createPortal(
          <div
            ref={pop}
            className="ws-pop"
            style={{
              insetBlockStart: place.top,
              insetInlineStart: place.start,
              inlineSize: place.width,
              maxBlockSize: place.maxHeight,
            }}
          >
            <p className="ws-pop-label">{t("Workspaces")}</p>
            <ul
              ref={list}
              id={listId}
              role="listbox"
              tabIndex={-1}
              aria-label={t("Workspace")}
              aria-activedescendant={`${listId}-${active}`}
              className="ws-list"
              onKeyDown={onKey}
            >
              {memberships.map((m, i) => {
                const selected = m.workspace.id === ws;
                return (
                  <li
                    key={m.workspace.id}
                    id={`${listId}-${i}`}
                    data-index={i}
                  data-value={m.workspace.id}
                    role="option"
                    aria-selected={selected}
                    className={`ws-item ${i === active ? "is-active" : ""}`}
                    onPointerMove={() => setActive(i)}
                    onClick={() => pick(m.workspace.id)}
                  >
                    <span className="ws-avatar ws-avatar-sm" aria-hidden>
                      {initials(m.workspace.name)}
                    </span>
                    <span className="truncate" dir="auto">
                      {m.workspace.name}
                    </span>
                    {selected && (
                      <IconCheck size={16} aria-hidden className="ws-check" />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}
