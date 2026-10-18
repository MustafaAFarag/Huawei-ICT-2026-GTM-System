"use client";
import { useEffect, useState, type ReactNode } from "react";
import { IconCheck, IconChevronRight, IconUsers } from "@revenue/ui";
import { Button } from "../primitives";
import { usePrefs } from "../../lib/prefs";

// Paging state: stays on a valid page when the list shrinks (search, filters, resolved rows).
export function usePaging(total: number, size: number, resetKey: string) {
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [resetKey]);
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(page, pages - 1);
  return {
    page: current,
    pages,
    from: total ? current * size + 1 : 0,
    to: Math.min(total, (current + 1) * size),
    slice: <T,>(rows: T[]) => rows.slice(current * size, (current + 1) * size),
    prev: () => setPage(Math.max(0, current - 1)),
    next: () => setPage(Math.min(pages - 1, current + 1)),
  };
}
export type Paging = ReturnType<typeof usePaging>;

// "Showing 1–8 of 170 accounts" with Previous and Next (Accounts frame).
export function Pager({
  paging,
  total,
  summary,
}: {
  paging: Paging;
  total: number;
  summary: ReactNode;
}) {
  const { t, language } = usePrefs();
  const num = (value: number) =>
    value.toLocaleString(language === "ar" ? "ar-EG" : "en");
  return (
    <footer className="acct-foot">
      <p className="muted small">
        {summary ??
          `${t("Showing")} ${num(paging.from)}–${num(paging.to)} ${t("of")} ${num(total)}`}
      </p>
      {paging.pages > 1 && (
        <div className="button-row">
          <Button disabled={paging.page === 0} onClick={paging.prev}>
            {t("Previous")}
          </Button>
          <Button disabled={paging.page >= paging.pages - 1} onClick={paging.next}>
            {t("Next")}
          </Button>
        </div>
      )}
    </footer>
  );
}

// Person icon that turns into a check mark when the row is selected (Accounts frames). The real
// checkbox stays in the page for keyboard and assistive technology.
export function SelectMark({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="acct-select">
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="acct-select-mark" aria-hidden>
        {checked ? <IconCheck size={16} /> : <IconUsers size={16} />}
      </span>
    </label>
  );
}

export function RowChevron() {
  return <IconChevronRight size={16} className="flip-rtl" aria-hidden />;
}

export function CountryChip({ country }: { country: string | null }) {
  const { t } = usePrefs();
  return country ? (
    <span className="acct-chip" dir="ltr">
      {country}
    </span>
  ) : (
    <span className="acct-chip is-warn">{t("Not set")}</span>
  );
}

// Downloads text as a file (UTF-8 with a byte-order mark so spreadsheets read Arabic).
export function downloadText(name: string, text: string, type = "text/csv") {
  const blob = new Blob(["﻿", text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const csvCell = (value: unknown) => {
  const text = String(value ?? "");
  // A leading =, +, - or @ would run as a formula when the file opens in a spreadsheet.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};
