"use client";
import type { ReactNode } from "react";
import { IconArrowLeft, IconChevronRight, IconFileText } from "@revenue/ui";

// Small layout pieces shared by the Campaigns sections. Styles live in styles/pages/campaigns.css.

// Section switcher inside a Campaigns tab. It switches the content below, so it is navigation.
export function SubTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: readonly { id: T; label: ReactNode }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <nav className="cmp-subtabs" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          aria-current={tab.id === value ? "page" : undefined}
          onClick={() => tab.id !== value && onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

// A list row: icon, title with one muted line, a status on the end and a chevron when it opens.
export function ListRow({
  title,
  sub,
  trail,
  onOpen,
  selected,
  prefix,
  pressed,
  aiTarget,
}: {
  title: ReactNode;
  sub?: ReactNode;
  trail?: ReactNode;
  onOpen?: () => void;
  selected?: boolean;
  prefix?: ReactNode;
  pressed?: boolean;
  aiTarget?: string;
}) {
  const body = (
    <>
      <span className="cmp-row-icon" aria-hidden={prefix ? undefined : true}>
        {prefix ?? <IconFileText size={16} />}
      </span>
      <span className="cmp-row-text">
        <strong>{title}</strong>
        {sub && <span className="cmp-row-sub">{sub}</span>}
      </span>
      {trail && <span className="cmp-row-trail">{trail}</span>}
      {onOpen && (
        <IconChevronRight
          size={16}
          className="cmp-row-chevron flip-rtl"
          aria-hidden
        />
      )}
    </>
  );
  return onOpen ? (
    <button
      type="button"
      className={`cmp-row ${selected ? "is-selected" : ""}`}
      onClick={onOpen}
      aria-pressed={pressed}
      data-ai-target={aiTarget}
    >
      {body}
    </button>
  ) : (
    <div className="cmp-row" data-ai-target={aiTarget}>
      {body}
    </div>
  );
}

export function BackLink({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" className="cmp-back" onClick={onClick}>
      <IconArrowLeft size={14} className="flip-rtl" aria-hidden />
      {children}
    </button>
  );
}
