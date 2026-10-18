"use client";
import { useState } from "react";
import {
  angleFor,
  draftChecks,
  draftConfidence,
  type Touch,
} from "@revenue/contracts";
import { IconShieldCheck } from "@revenue/ui";
import {
  Badge,
  Button,
  Check,
  Field,
  Input,
  Panel,
  PageTabs,
  Select,
  Textarea,
} from "../primitives";
import { useWorkspace } from "../workspace-context";
import { usePrefs } from "../../lib/prefs";
import type { Asset, Draft, Prospect } from "../../lib/types";

const CHANNEL_LABEL = { email: "Email", linkedin: "LinkedIn", call: "Call" };

// One selected version: angle, register and confidence, the touch being edited with the
// evidence it cites, the draft checks, and the approval attached to this exact version.
export function DraftDetail({
  draft,
  name,
  prospect,
  assets,
  next,
  onSave,
  onApprove,
  onAttach,
  onNext,
  onEditWithNabil,
  onReadiness,
}: {
  draft: Draft;
  name: string;
  prospect?: Prospect;
  assets: Asset[];
  next?: { name: string };
  onSave: (content: Touch[]) => Promise<void>;
  onApprove: () => Promise<void>;
  onAttach: (id: string | null) => Promise<void>;
  onNext: () => void;
  onEditWithNabil: () => void;
  onReadiness: () => void;
}) {
  const { canWrite, canApprove, busy, data } = useWorkspace();
  const { t } = usePrefs();
  const [content, setContent] = useState(draft.content),
    [reviewed, setReviewed] = useState(false),
    [touchIndex, setTouchIndex] = useState(0),
    [assetId, setAssetId] = useState(draft.assetId ?? "");
  const approved = draft.approvedVersion === draft.version;
  const edited = JSON.stringify(content) !== JSON.stringify(draft.content);
  const language = prospect?.language ?? "en";
  const checks = draftChecks(content, language);
  const blocking = checks.filter((c) => c.level === "error");
  const confidence = prospect
    ? draftConfidence(content, prospect.evidence, prospect.snapshot, language)
    : null;
  const plan = prospect
    ? angleFor(
        prospect.snapshot,
        (data.workspace.company as { angles?: Record<string, string> }).angles,
        data.workspace.offers.find((o) => o.approved)?.text,
      )
    : null;
  const touch = content[Math.min(touchIndex, content.length - 1)];
  const index = content.indexOf(touch);
  const cited = new Set(content.flatMap((c) => c.evidenceIds));
  const evidence = (prospect?.evidence ?? []).filter((e) =>
    touch?.evidenceIds.includes(e.id),
  );
  const patch = (value: Partial<Touch>) =>
    setContent((previous) =>
      previous.map((v, i) => (i === index ? { ...v, ...value } : v)),
    );
  const status = (
    <Badge tone={approved ? "ok" : "warn"}>
      {t(approved ? "Approved" : "Needs review")} ·{" "}
      <bdi>v{draft.version}</bdi>
    </Badge>
  );
  const channelLabel = (c: Touch) =>
    `${t(CHANNEL_LABEL[c.channel] ?? c.channel)} · ${t("Day")} ${c.day}`;
  return (
    <Panel
      as="section"
      className={`review-detail${approved ? " is-approved" : ""}`}
      title={<span dir="auto">{name}</span>}
      actions={status}
    >
      <div className="draft-insights">
        {plan && (
          <Badge dot={false}>
            {plan.register === "founder"
              ? t("Founder voice")
              : t("Leader voice")}
          </Badge>
        )}
        {confidence && (
          <span title={confidence.reasons.join(" ")}>
            <Badge
              tone={
                confidence.level === "high"
                  ? "ok"
                  : confidence.level === "medium"
                    ? "warn"
                    : "danger"
              }
            >
              {t("confidence")} {t(confidence.level)} ·{" "}
              <bdi>{confidence.score}</bdi>
            </Badge>
          </span>
        )}
        {plan?.angle && (
          <span className="review-angle muted small" dir="auto" title={plan.angle}>
            {t("Angle")}: {plan.angle}
          </span>
        )}
      </div>
      {content.length > 1 && (
        <PageTabs
          label={t("Touch sequence")}
          value={String(index)}
          onChange={(id) => setTouchIndex(Number(id))}
          tabs={content.map((c, i) => ({
            id: String(i),
            label: channelLabel(c),
          }))}
        />
      )}
      {touch && (
        <div className="review-touch">
          {content.length === 1 && (
            <p className="review-touch-label">{channelLabel(touch)}</p>
          )}
          {touch.subject !== undefined && (
            <Field label={t("Subject")}>
              <Input
                dir="auto"
                value={touch.subject}
                disabled={!canWrite}
                onChange={(e) => patch({ subject: e.target.value })}
              />
            </Field>
          )}
          <Field label={t("Message")}>
            <Textarea
              dir="auto"
              rows={8}
              value={touch.body}
              disabled={!canWrite}
              onChange={(e) => patch({ body: e.target.value })}
            />
          </Field>
          <section className="review-evidence" aria-label={t("Cited evidence")}>
            <h3>{t("Cited evidence")}</h3>
            {evidence.length === 0 ? (
              <p className="muted small">{t("Offer-only manual task")}</p>
            ) : (
              <ul>
                {evidence.map((e) => (
                  <li key={e.id}>
                    <span dir="auto">{e.claim}</span>
                    <span className="muted small">
                      <Badge
                        tone={
                          e.kind === "fact"
                            ? "ok"
                            : e.kind === "hypothesis"
                              ? "warn"
                              : "neutral"
                        }
                        dot={false}
                      >
                        {t(
                          e.kind === "fact"
                            ? "Fact"
                            : e.kind === "hypothesis"
                              ? "Hypothesis"
                              : "Unknown",
                        )}
                      </Badge>{" "}
                      {!e.approved && (
                        <>
                          <Badge tone="warn" dot={false}>
                            {t("Source not yet approved")}
                          </Badge>{" "}
                        </>
                      )}
                      <bdi dir="ltr">{e.source}</bdi>
                      {e.date && (
                        <>
                          {" · "}
                          <bdi dir="ltr">{e.date.slice(0, 10)}</bdi>
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
      <div className="review-summary" role="status">
        <IconShieldCheck size={16} aria-hidden />
        <span>
          <span className="mono">{cited.size}</span> {t("sources cited")} ·{" "}
          {checks.length === 0 ? (
            t("No draft check issues")
          ) : (
            <>
              <span className="mono">{checks.length}</span>{" "}
              {t("checks need attention")}
            </>
          )}
        </span>
      </div>
      {checks.length > 0 && (
        <ul className="check-list review-checks" aria-label={t("Draft checks")}>
          {checks.map((c, i) => (
            <li
              key={i}
              className={`tone-${c.level === "error" ? "danger" : "warn"}`}
            >
              <span className="dot" aria-hidden />
              {c.touch !== undefined && (
                <span className="mono">#{c.touch + 1}</span>
              )}{" "}
              {t(c.message)}
            </li>
          ))}
        </ul>
      )}
      <div className="review-asset">
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
      <div className="review-decision">
        {!approved && (
          <Check
            label={t("I reviewed all three touches and their claims")}
            checked={reviewed}
            onChange={(e) => setReviewed(e.target.checked)}
          />
        )}
        {approved && (
          <p className="review-approved" role="status">
            <IconShieldCheck size={16} aria-hidden />{" "}
            {t("Approved")} · <bdi>v{draft.version}</bdi>
          </p>
        )}
        <div className="button-row">
          {!approved && (
            <Button
              variant="primary"
              disabled={
                !canApprove ||
                busy ||
                !reviewed ||
                edited ||
                blocking.length > 0
              }
              onClick={() => void onApprove()}
            >
              {t("Approve current version")}
            </Button>
          )}
          {approved && next && (
            <Button variant="primary" onClick={onNext}>
              {t("Review next draft")}
            </Button>
          )}
          {approved && !next && (
            <Button variant="primary" onClick={onReadiness}>
              {t("Campaign readiness")}
            </Button>
          )}
          <Button
            disabled={!canWrite || busy || !edited}
            onClick={() => void onSave(content)}
          >
            {t("Save revision")}
          </Button>
          <Button variant="ghost" disabled={!canWrite} onClick={onEditWithNabil}>
            {t("Edit with Nabil")}
          </Button>
          {approved && next && (
            <span className="review-next muted small" dir="auto">
              {t("Next")}: {next.name}
            </span>
          )}
        </div>
        <p className="review-note">
          <IconShieldCheck size={16} aria-hidden />
          <span>
            {t(
              "Approval does not send. Approved drafts are exported to your own sender.",
            )}{" "}
            {approved &&
              t("Editing creates a new version that needs approval again.")}
          </span>
        </p>
      </div>
    </Panel>
  );
}
