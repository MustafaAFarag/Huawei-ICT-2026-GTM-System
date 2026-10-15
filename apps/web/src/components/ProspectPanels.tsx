"use client";
import { useState } from "react";
import { BUCKETS, angleFor } from "@revenue/contracts";
import {
  Badge,
  Button,
  Field,
  Input,
  Panel,
  Select,
  Textarea,
} from "./primitives";
import { useWorkspace } from "./workspace-context";
import { usePrefs } from "../lib/prefs";
import { client } from "../lib/client";
import type { Prospect } from "../lib/types";
import { InterviewGuide } from "./InterviewGuide";

// GAP-03 / GAP-04 / GAP-13: triage bucket, segment, owner, and the angle the drafts will use.
export function TriagePanel({ prospect }: { prospect: Prospect }) {
  const { ws, data, canWrite, busy, action, setProspect } = useWorkspace();
  const { t } = usePrefs();
  const s = prospect.snapshot;
  const company = data.workspace.company as {
    angles?: Record<string, string>;
    segments?: Record<string, string>;
  };
  const plan = angleFor(
    s,
    company.angles,
    data.workspace.offers.find((o) => o.approved)?.text,
  );
  const [bucket, setBucket] = useState(s.bucket ?? "");
  const [segment, setSegment] = useState(s.segment ?? "");
  const [owner, setOwner] = useState(prospect.ownerId);
  const [note, setNote] = useState(s.triageNote ?? "");
  const segments = Object.keys(company.segments ?? {});
  return (
    <Panel eyebrow={t("Triage")} title={t("Bucket, owner and angle")}>
      <div className="stack">
        <div className="outcome-row" role="group" aria-label={t("Bucket")}>
          {BUCKETS.map((b) => (
            <button
              key={b}
              type="button"
              aria-pressed={bucket === b}
              onClick={() => setBucket(b)}
            >
              {t(b)}
            </button>
          ))}
        </div>
        <div className="form-grid two">
          <Field label={t("Segment")}>
            {segments.length ? (
              <Select
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
              >
                <option value="">—</option>
                {segments.map((k) => (
                  <option key={k} value={k}>
                    {k} · {company.segments![k]}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                value={segment}
                maxLength={10}
                onChange={(e) => setSegment(e.target.value)}
              />
            )}
          </Field>
          <Field label={t("Owner")}>
            <Select value={owner} onChange={(e) => setOwner(e.target.value)}>
              {data.members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={t("Rationale")}>
          <Textarea
            dir="auto"
            rows={2}
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <dl className="angle-card">
          <div>
            <dt className="eyebrow">{t("Persona")}</dt>
            <dd>{t(plan.persona)}</dd>
          </div>
          <div>
            <dt className="eyebrow">{t("Maturity")}</dt>
            <dd className="mono">{plan.maturity}</dd>
          </div>
          <div>
            <dt className="eyebrow">{t("Register")}</dt>
            <dd>
              {plan.register === "founder"
                ? t("Founder voice")
                : t("Leader voice")}
            </dd>
          </div>
          <div className="span-all">
            <dt className="eyebrow">{t("Angle")}</dt>
            <dd dir="auto">{plan.angle ?? t("Use the approved offer")}</dd>
          </div>
        </dl>
        <Button
          variant="primary"
          disabled={!canWrite || busy}
          onClick={() =>
            void action(async () => {
              const updated = await client.workspace<Prospect>(
                ws,
                `/prospects/${prospect.id}/triage`,
                {
                  method: "PATCH",
                  body: JSON.stringify({
                    ...(bucket ? { bucket } : {}),
                    segment,
                    ownerId: owner,
                    rationale: note,
                  }),
                },
              );
              setProspect(updated);
            }, t("Triage saved."))
          }
        >
          {t("Save triage")}
        </Button>
      </div>
    </Panel>
  );
}

const PAINS = [
  "payroll",
  "hiring",
  "onboarding",
  "compliance",
  "retention",
  "training",
  "hr-admin",
  "cost",
];

// GAP-12: discovery pilot capture (play P15).
export function DiscoveryPanel({ prospect }: { prospect: Prospect }) {
  const { ws, canWrite, busy, action, setProspect } = useWorkspace();
  const { t } = usePrefs();
  const existing = prospect.snapshot.discovery;
  const [band, setBand] = useState(existing?.headcountBand ?? "11-25");
  const [setup, setSetup] = useState(existing?.hrSetup ?? "none");
  const [pains, setPains] = useState<Record<string, number>>(
    existing?.pains ?? {},
  );
  const [maturity, setMaturity] = useState(existing?.maturity ?? 1);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  return (
    <Panel eyebrow="P15" title={t("Discovery interview")}>
      <InterviewGuide key={`${ws}:${prospect.id}`} prospectId={prospect.id} />
      <details className="disclosure" open={Boolean(existing)}>
        <summary>
          {existing
            ? `${t("Captured")} ${existing.capturedAt.slice(0, 10)}`
            : t("Capture answers from a discovery call")}
        </summary>
        <div className="stack">
          <div className="form-grid two">
            <Field label={t("Headcount")}>
              <Select value={band} onChange={(e) => setBand(e.target.value)}>
                {["1-10", "11-25", "26-50", "51-200", "200+"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </Select>
            </Field>
            <Field label={t("HR set-up")}>
              <Select value={setup} onChange={(e) => setSetup(e.target.value)}>
                {["none", "founder", "1-3", "team"].map((v) => (
                  <option key={v} value={v}>
                    {t(v)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="pain-grid">
            {PAINS.map((pain) => (
              <label key={pain} className="pain">
                <span>{t(pain)}</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={pains[pain] ?? 1}
                  onChange={(e) =>
                    setPains({ ...pains, [pain]: Number(e.target.value) })
                  }
                />
                <span className="mono">{pains[pain] ?? 1}</span>
              </label>
            ))}
          </div>
          <Field label={`${t("Maturity")} (0–4)`}>
            <input
              type="range"
              min={0}
              max={4}
              value={maturity}
              onChange={(e) => setMaturity(Number(e.target.value))}
            />
          </Field>
          <Field label={t("Notes")}>
            <Textarea
              dir="auto"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <Button
            disabled={!canWrite || busy}
            onClick={() =>
              void action(async () => {
                const discovery = await client.workspace<
                  NonNullable<Prospect["snapshot"]["discovery"]>
                >(ws, `/prospects/${prospect.id}/discovery`, {
                  method: "POST",
                  body: JSON.stringify({
                    headcountBand: band,
                    hrSetup: setup,
                    pains,
                    maturity,
                    notes,
                  }),
                });
                setProspect({
                  ...prospect,
                  snapshot: { ...prospect.snapshot, discovery },
                });
              }, t("Discovery answers saved."))
            }
          >
            {t("Save interview")}
          </Button>
          {existing && <Badge tone="ok">{t("Saved")}</Badge>}
        </div>
      </details>
    </Panel>
  );
}
