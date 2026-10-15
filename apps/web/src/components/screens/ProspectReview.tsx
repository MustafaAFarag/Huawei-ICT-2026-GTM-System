"use client";
import { useEffect, useState } from "react";
import { IconArrowRight, IconExternalLink, IconPlus } from "@revenue/ui";
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
import type { Prospect } from "../../lib/types";
import { CallLog } from "../CallLog";

export function ProspectReview({ prospect }: { prospect: Prospect }) {
  const { ws, canApprove, action, setProspect } = useWorkspace();
  const { t } = usePrefs();
  const [evidence, setEvidence] = useState(prospect.evidence);
  useEffect(() => setEvidence(prospect.evidence), [prospect]);
  const update = (index: number, patch: Partial<(typeof evidence)[number]>) =>
    setEvidence((previous) =>
      previous.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    );
  const s = prospect.snapshot;
  return (
    <form
      className="detail-grid"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        void action(async () => {
          const updated = await client.workspace<Prospect>(
            ws,
            `/prospects/${prospect.id}`,
            {
              method: "PATCH",
              body: JSON.stringify({
                evidence,
                lawfulBasis: f.get("lawfulBasis"),
                country: f.get("country"),
                consentAt: f.get("consentAt")
                  ? new Date(String(f.get("consentAt"))).toISOString()
                  : null,
                excluded: f.get("excluded") === "on",
              }),
            },
          );
          setProspect(updated);
        }, t("Evidence saved. Previous copy approvals were invalidated."));
      }}
    >
      <div className="detail-main">
        <Button
          variant="ghost"
          size="sm"
          startIcon={<IconArrowRight size={14} className="flip back" />}
          onClick={() => setProspect(null)}
        >
          {t("Back to accounts")}
        </Button>
        <Panel
          eyebrow={t("Dated source review")}
          title={
            <span dir="auto">
              {s.firstName} {s.lastName}
            </span>
          }
          actions={
            <Button
              size="sm"
              startIcon={<IconPlus size={14} />}
              disabled={!canApprove}
              onClick={() =>
                setEvidence((previous) => [
                  ...previous,
                  {
                    id: crypto.randomUUID(),
                    claim: "",
                    url: "https://example.com",
                    date: new Date().toISOString(),
                    kind: "fact",
                    approved: false,
                    source: "Human supplied",
                  },
                ])
              }
            >
              {t("Add source")}
            </Button>
          }
        >
          <p className="muted">
            <span dir="auto">{s.title}</span> · <bdi>{s.email}</bdi>
          </p>
          {!evidence.length && (
            <Empty title={t("No sources yet")}>
              {t(
                "Add a dated public source before drafting. Messages may only cite reviewed claims.",
              )}
            </Empty>
          )}
          <div className="evidence-list">
            {evidence.map((item, index) => (
              <div
                className={`evidence ${item.approved ? "is-approved" : ""}`}
                key={item.id}
              >
                <div className="evidence-head">
                  <Badge tone={item.kind === "fact" ? "info" : "warn"}>
                    {item.kind}
                  </Badge>
                  <span className="mono muted">{item.source}</span>
                  {item.approved && <Badge tone="ok">{t("reviewed")}</Badge>}
                </div>
                <Field label={t("Claim")}>
                  <Textarea
                    dir="auto"
                    rows={2}
                    value={item.claim}
                    disabled={!canApprove}
                    onChange={(e) =>
                      update(index, { claim: e.target.value, approved: false })
                    }
                  />
                </Field>
                <div className="form-grid two">
                  <Field label={t("Source URL")}>
                    <Input
                      value={item.url}
                      type="url"
                      disabled={!canApprove}
                      onChange={(e) =>
                        update(index, { url: e.target.value, approved: false })
                      }
                    />
                  </Field>
                  <Field label={t("Source date")}>
                    <Input
                      type="date"
                      value={item.date.slice(0, 10)}
                      disabled={!canApprove}
                      onChange={(e) =>
                        update(index, {
                          date: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : "",
                          approved: false,
                        })
                      }
                    />
                  </Field>
                </div>
                <div className="evidence-foot">
                  <Check
                    label={t("I reviewed this factual claim and its dated source")}
                    checked={item.approved}
                    disabled={!canApprove}
                    onChange={(e) => update(index, { approved: e.target.checked })}
                  />
                  <a
                    className="link"
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("Open source")} <IconExternalLink size={13} aria-hidden />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <aside className="detail-side">
        <Panel eyebrow={t("Fit")} title={prospect.score ?? "—"}>
          {prospect.breakdown.tier && (
            <Badge tone="info">
              {t("Tier")} {prospect.breakdown.tier}
            </Badge>
          )}
          <ul className="breakdown">
            {prospect.breakdown.breakdown?.map((r) => (
              <li key={r.rule}>
                <span>{r.rule}</span>
                <span className="mono">+{r.points}</span>
                <Badge tone={r.state === "match" ? "ok" : r.state === "unknown" ? "warn" : "neutral"}>
                  {r.state}
                </Badge>
              </li>
            )) ?? <li className="muted">{t("Not scored")}</li>}
          </ul>
        </Panel>
        <Panel eyebrow={t("Compliance")} title={t("Contact policy")}>
          <div className="stack">
            <Field label={t("Country")}>
              <Select name="country" defaultValue={prospect.country}>
                <option value="EG">Egypt</option>
                <option value="SA">Saudi Arabia</option>
                <option value="AE">United Arab Emirates</option>
              </Select>
            </Field>
            <Field label={t("Communication basis")}>
              <Select
                name="lawfulBasis"
                defaultValue={prospect.lawfulBasis ?? ""}
              >
                <option value="">{t("Not recorded · blocked")}</option>
                <option value="consent">{t("Recorded consent")}</option>
                <option value="relationship">{t("Existing relationship")}</option>
              </Select>
            </Field>
            <Field label={t("Consent time")}>
              <Input
                name="consentAt"
                type="datetime-local"
                defaultValue={prospect.consentAt?.slice(0, 16) ?? ""}
              />
            </Field>
            <Check
              name="excluded"
              label={t("Exclude from outreach")}
              defaultChecked={prospect.excluded}
            />
            <Button type="submit" variant="primary" disabled={!canApprove}>
              {t("Save evidence and policy")}
            </Button>
          </div>
        </Panel>
        <CallLog prospect={prospect} />
      </aside>
    </form>
  );
}
