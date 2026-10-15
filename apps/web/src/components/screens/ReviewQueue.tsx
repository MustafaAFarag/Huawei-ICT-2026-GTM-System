"use client";
import { useState } from "react";
import type { Touch } from "@revenue/contracts";
import { IconChecklist, IconMail, IconPhone, IconBrandLinkedin } from "@revenue/ui";
import {
  Badge,
  Button,
  Check,
  Empty,
  Field,
  Input,
  Panel,
  Select,
  Textarea,
} from "../primitives";
import { useWorkspace } from "../workspace-context";
import { usePrefs } from "../../lib/prefs";
import { client } from "../../lib/client";
import type { Asset, Draft } from "../../lib/types";

const CHANNEL_ICON = {
  email: IconMail,
  linkedin: IconBrandLinkedin,
  call: IconPhone,
} as const;

export function ReviewQueue() {
  const { ws, data, action } = useWorkspace();
  const { t } = usePrefs();
  if (!data.drafts.length)
    return (
      <Empty
        title={t("No drafts waiting for review")}
        icon={<IconChecklist size={18} />}
      >
        {t(
          "Approve a source and an offer, then prepare messages from a play.",
        )}
      </Empty>
    );
  const pending = data.drafts.filter((d) => d.approvedVersion !== d.version);
  const ordered = [
    ...pending,
    ...data.drafts.filter((d) => d.approvedVersion === d.version),
  ];
  return (
    <div className="stack-lg">
      <p className="muted">
        <span className="mono">{pending.length}</span>{" "}
        {t("drafts need a decision. Edit, then approve the current version.")}
      </p>
      {ordered.map((d) => (
        <DraftReview
          key={`${d.id}:${d.version}`}
          draft={d}
          name={
            data.prospects.find((p) => p.id === d.prospectId)?.snapshot
              .company ?? "Prospect"
          }
          assets={data.assets.filter(
            (a) => a.prospectId === d.prospectId && a.approvedAt,
          )}
          onAttach={(assetId) =>
            action(
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
          onSave={(content) =>
            action(
              () =>
                client.workspace(ws, `/drafts/${d.id}`, {
                  method: "PATCH",
                  body: JSON.stringify({ version: d.version, content }),
                }),
              t("Draft saved. Review its new version before approval."),
            )
          }
          onApprove={() =>
            action(
              () =>
                client.workspace(ws, `/drafts/${d.id}/approve`, {
                  method: "POST",
                  body: JSON.stringify({ version: d.version }),
                }),
              t("Current draft approved."),
            )
          }
        />
      ))}
    </div>
  );
}

function DraftReview({
  draft,
  name,
  onSave,
  onApprove,
  assets,
  onAttach,
}: {
  draft: Draft;
  name: string;
  onSave: (content: Touch[]) => Promise<void>;
  onApprove: () => Promise<void>;
  assets: Asset[];
  onAttach: (id: string | null) => Promise<void>;
}) {
  const { canWrite, canApprove, busy } = useWorkspace();
  const { t } = usePrefs();
  const [content, setContent] = useState(draft.content),
    [reviewed, setReviewed] = useState(false);
  const [assetId, setAssetId] = useState(draft.assetId ?? "");
  const approved = draft.approvedVersion === draft.version;
  const edited = JSON.stringify(content) !== JSON.stringify(draft.content);
  const patch = (index: number, value: Partial<Touch>) =>
    setContent((previous) =>
      previous.map((v, i) => (i === index ? { ...v, ...value } : v)),
    );
  return (
    <Panel
      className={approved ? "is-approved" : ""}
      eyebrow={`v${draft.version}`}
      title={<span dir="auto">{name}</span>}
      actions={
        <Badge tone={approved ? "ok" : "warn"}>
          Version {draft.version} · {approved ? "Approved" : "Needs review"}
        </Badge>
      }
    >
      <ol className="touch-timeline">
        {content.map((touch, index) => {
          const Icon = CHANNEL_ICON[touch.channel] ?? IconMail;
          return (
            <li className="draft-touch" key={index}>
              <span className="touch-marker" aria-hidden>
                <Icon size={14} />
              </span>
              <div className="touch-body">
                <div className="touch-meta">
                  <Badge>
                    {touch.channel} · day {touch.day}
                  </Badge>
                  <span className="mono muted">
                    {touch.evidenceIds.length
                      ? `${touch.evidenceIds.length} ${t("sources cited")}`
                      : t("Offer-only manual task")}
                  </span>
                </div>
                {touch.subject !== undefined && (
                  <Field label={t("Subject")}>
                    <Input
                      dir="auto"
                      value={touch.subject}
                      disabled={!canWrite}
                      onChange={(e) => patch(index, { subject: e.target.value })}
                    />
                  </Field>
                )}
                <Field label={t("Message")}>
                  <Textarea
                    dir="auto"
                    rows={5}
                    value={touch.body}
                    disabled={!canWrite}
                    onChange={(e) => patch(index, { body: e.target.value })}
                  />
                </Field>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="draft-foot">
        <div className="asset-assign">
          <Field label={t("Approved asset")}>
            <Select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              disabled={!canWrite}
            >
              <option value="">{t("No asset")}</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} · {a.language}
                </option>
              ))}
            </Select>
          </Field>
          <Button
            disabled={!canWrite || busy || assetId === (draft.assetId ?? "")}
            onClick={() => void onAttach(assetId || null)}
          >
            {t("Save asset assignment")}
          </Button>
        </div>
        <Check
          label={t("I reviewed all three touches and their claims")}
          checked={reviewed}
          onChange={(e) => setReviewed(e.target.checked)}
        />
        <div className="button-row">
          <Button
            disabled={!canWrite || busy || !edited}
            onClick={() => void onSave(content)}
          >
            {t("Save revision")}
          </Button>
          <Button
            variant="primary"
            disabled={!canApprove || busy || !reviewed || edited}
            onClick={() => void onApprove()}
          >
            {t("Approve current version")}
          </Button>
        </div>
      </div>
    </Panel>
  );
}
