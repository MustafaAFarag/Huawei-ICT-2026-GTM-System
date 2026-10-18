"use client";
import { useEffect, useMemo, useState } from "react";
import { type Touch } from "@revenue/contracts";
import { IconChecklist } from "@revenue/ui";
import { Badge, Button, Empty, PageTabs } from "../primitives";
import { useWorkspace } from "../workspace-context";
import { usePrefs } from "../../lib/prefs";
import { client } from "../../lib/client";
import { ScheduledReviews } from "../ScheduledPlays";
import { DraftDetail } from "../review/DraftDetail";
import {
  QueueList,
  type QueueFilter,
  type QueueItem,
} from "../review/QueueList";
import "../../styles/pages/review.css";

type Section = "messages" | "scheduled";

// Review: a queue beside one selected version. The approval attaches to the item you are
// looking at, so a person decides on one message at a time (Figma Review, v3.2 frame 08).
export function ReviewQueue() {
  const {
    ws,
    data,
    action,
    canWrite,
    canApprove,
    setTab,
    openSequencesExport,
    askNabil,
  } = useWorkspace();
  const { t } = usePrefs();
  const [section, setSection] = useState<Section>("messages");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<QueueFilter>(null);
  const [query, setQuery] = useState("");
  // Phones show the list or the detail, never both.
  const [phoneView, setPhoneView] = useState<"list" | "detail">("list");

  const company = (prospectId: string) =>
    data.prospects.find((p) => p.id === prospectId)?.snapshot.company ??
    "Prospect";
  const items = useMemo(() => {
    const rows = data.drafts.map((d): QueueItem => {
      const snap = data.prospects.find((p) => p.id === d.prospectId)?.snapshot;
      const person = snap ? `${snap.firstName} ${snap.lastName}`.trim() : "";
      return {
        id: d.id,
        company: snap?.company ?? "Prospect",
        contact: [person, snap?.title].filter(Boolean).join(" · ") || "—",
        version: d.version,
        approved: d.approvedVersion === d.version,
      };
    });
    // Needs-review items first, in the order the drafts were prepared.
    return [
      ...rows.filter((r) => !r.approved),
      ...rows.filter((r) => r.approved),
    ];
  }, [data.drafts, data.prospects]);
  const pendingCount = items.filter((i) => !i.approved).length;
  const approvedCount = items.length - pendingCount;
  const needle = query.trim().toLowerCase();
  const visible = items.filter(
    (i) =>
      (filter === null || (filter === "approved") === i.approved) &&
      (!needle || `${i.company} ${i.contact}`.toLowerCase().includes(needle)),
  );
  // A filter is a view boundary: never keep a hidden draft open in the detail pane.
  const resolvedSelectedId = visible.some((item) => item.id === selectedId)
    ? selectedId
    : (visible[0]?.id ?? null);
  const selected = data.drafts.find((d) => d.id === resolvedSelectedId) ?? null;
  useEffect(() => {
    if (visible.length === 0) setPhoneView("list");
  }, [visible.length]);
  const nextPending = selected
    ? (visible.find((i) => !i.approved && i.id !== selected.id) ?? null)
    : null;

  const tabs = (
    <div className="review-toolbar">
      <PageTabs
        label={t("Review sections")}
        value={section}
        onChange={setSection}
        tabs={[
          { id: "messages", label: t("Messages"), count: items.length },
          { id: "scheduled", label: t("Scheduled") },
        ]}
      />
      {approvedCount > 0 && (
        <Button size="sm" onClick={openSequencesExport}>
          {t("Export approved batch")}
        </Button>
      )}
    </div>
  );

  if (section === "scheduled")
    return (
      <div className="review">
        {tabs}
        <ScheduledReviews key={ws} />
      </div>
    );

  if (!data.drafts.length)
    return (
      <div className="review">
        {tabs}
        <Empty
          title={t("No drafts waiting for review")}
          icon={<IconChecklist size={18} />}
        >
          {t(
            "Approve a source and an offer, then prepare messages from a play.",
          )}
        </Empty>
      </div>
    );

  const select = (id: string) => {
    setSelectedId(id);
    setPhoneView("detail");
  };
  // Hold the selection on this draft while it changes version, so the detail stays put.
  const run = (draftId: string, fn: () => Promise<unknown>, done: string) => {
    setSelectedId(draftId);
    return action(fn, done);
  };
  const d = selected;
  const prospect = d && data.prospects.find((p) => p.id === d.prospectId);
  return (
    <div className="review" data-phone={phoneView}>
      {tabs}
      {!canWrite && (
        <p className="review-access" role="note">
          <Badge dot={false}>
            {t(canApprove ? "Reviewer access" : "Viewer access")}
          </Badge>
          <span>
            {t(
              canApprove
                ? "You can review this work. Editing requires a workspace role with write access."
                : "You can read this work. Approving requires a workspace role with review access.",
            )}
          </span>
        </p>
      )}
      <p className="review-lede muted">
        <span className="mono">{pendingCount}</span>{" "}
        {t("drafts need a decision. Edit, then approve the current version.")}
      </p>
      <div className="review-split" data-view={phoneView}>
        <QueueList
          items={visible}
          pendingCount={pendingCount}
          approvedCount={approvedCount}
          filter={filter}
          onFilter={setFilter}
          query={query}
          onQuery={setQuery}
          selectedId={resolvedSelectedId}
          onSelect={select}
        />
        <div className="review-detail-wrap" data-ai-target="review-detail">
          <Button
            variant="secondary"
            className="review-back"
            onClick={() => setPhoneView("list")}
          >
            {t("Back to queue")}
          </Button>
          {d ? (
            <DraftDetail
              key={`${d.id}:${d.version}`}
              draft={d}
              name={company(d.prospectId)}
              prospect={prospect ?? undefined}
              /* The brand-level capability profile (no account) can go on any draft. */
              assets={data.assets.filter(
                (a) =>
                  a.approvedAt &&
                  (a.prospectId === d.prospectId ||
                    (a.prospectId === null &&
                      a.template === "capability-profile")),
              )}
              next={nextPending ? { name: nextPending.company } : undefined}
              onNext={() => nextPending && select(nextPending.id)}
              onReadiness={() => setTab("Plays")}
              onEditWithNabil={() =>
                askNabil(
                  `${t("Revise the draft message for ")}${company(d.prospectId)}: `,
                )
              }
              onAttach={(assetId) =>
                run(
                  d.id,
                  () =>
                    client.workspace(ws, `/drafts/${d.id}/asset`, {
                      method: "POST",
                      body: JSON.stringify({ version: d.version, assetId }),
                    }),
                  t(
                    "Asset assignment saved. Review and approve the new copy version.",
                  ),
                )
              }
              onSave={(content: Touch[]) =>
                run(
                  d.id,
                  () =>
                    client.workspace(ws, `/drafts/${d.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({ version: d.version, content }),
                    }),
                  t("Draft saved. Review its new version before approval."),
                )
              }
              onApprove={() =>
                run(
                  d.id,
                  () =>
                    client.workspace(ws, `/drafts/${d.id}/approve`, {
                      method: "POST",
                      body: JSON.stringify({ version: d.version }),
                    }),
                  t("Current draft approved."),
                )
              }
            />
          ) : (
            <Empty
              title={t("Nothing to review in this list.")}
              icon={<IconChecklist size={18} />}
            >
              {t("Choose a message from the queue to review it.")}
            </Empty>
          )}
        </div>
      </div>
    </div>
  );
}
