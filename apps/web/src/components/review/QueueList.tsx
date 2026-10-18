"use client";
import { Badge, Input } from "../primitives";
import { usePrefs } from "../../lib/prefs";

export type QueueItem = {
  id: string;
  company: string;
  contact: string;
  version: number;
  approved: boolean;
};
export type QueueFilter = "pending" | "approved" | null;

// The queue column: filter chips with counts, a search box and one row per draft. The
// selected row drives the detail beside it. Rows are buttons, not an ARIA listbox, because
// each one is navigation to a detail, not a form value.
export function QueueList({
  items,
  pendingCount,
  approvedCount,
  filter,
  onFilter,
  query,
  onQuery,
  selectedId,
  onSelect,
}: {
  items: QueueItem[];
  pendingCount: number;
  approvedCount: number;
  filter: QueueFilter;
  onFilter: (filter: QueueFilter) => void;
  query: string;
  onQuery: (value: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { t } = usePrefs();
  const chip = (id: "pending" | "approved", tone: "warn" | "ok", count: number) => (
    <button
      type="button"
      className={`review-chip tone-${tone}`}
      aria-pressed={filter === id}
      onClick={() => onFilter(filter === id ? null : id)}
    >
      {t(id === "pending" ? "To review" : "Approved")} ·{" "}
      <span className="mono">{count}</span>
    </button>
  );
  return (
    <div className="review-queue" data-ai-target="review-queue">
      <div className="review-chips" role="group" aria-label={t("Review queue filters")}>
        {chip("pending", "warn", pendingCount)}
        {chip("approved", "ok", approvedCount)}
      </div>
      <Input
        type="search"
        dir="auto"
        value={query}
        placeholder={t("Search review items…")}
        aria-label={t("Search review items…")}
        onChange={(e) => onQuery(e.target.value)}
      />
      {items.length === 0 ? (
        <p className="review-queue-empty muted small">
          {t("No items match your search.")}
        </p>
      ) : (
        <ul className="review-items" aria-label={t("Review queue list")}>
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="review-item"
                aria-current={item.id === selectedId ? "true" : undefined}
                onClick={() => onSelect(item.id)}
              >
                <span className="review-item-text">
                  <span className="review-item-name" dir="auto">
                    {item.company}
                  </span>
                  <span className="review-item-sub" dir="auto">
                    {item.contact}
                  </span>
                </span>
                <Badge tone={item.approved ? "ok" : "warn"} dot={false}>
                  {t(item.approved ? "Approved" : "Needs review")}
                </Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
