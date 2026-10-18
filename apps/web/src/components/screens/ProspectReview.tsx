"use client";
import { useEffect, useState } from "react";
import { COUNTRIES } from "@revenue/contracts";
import {
  IconArrowLeft,
  IconExternalLink,
  IconFileText,
  IconPlus,
} from "@revenue/ui";
import "../../styles/pages/accounts.css";
import {
  Badge,
  Button,
  Check,
  EmptyState,
  Field,
  Input,
  PageTabs,
  Select,
  Textarea,
} from "../primitives";
import { useWorkspace } from "../workspace-context";
import { usePrefs } from "../../lib/prefs";
import type { Prospect } from "../../lib/types";
import { CallLog } from "../CallLog";
import { DiscoveryPanel, TriagePanel } from "../ProspectPanels";
import { ResearchBrief } from "../ResearchBrief";
import { BasisEvidenceDialog } from "../accounts/PolicyDialogs";
import { COUNTRY_LABEL, holdText, holdsFor } from "../accounts/holds";
import { saveProspect, toIso, toLocalInput } from "../accounts/prospect-save";

type DetailTab = "overview" | "sources" | "policy" | "triage" | "calls" | "discovery";

export function ProspectReview({ prospect }: { prospect: Prospect }) {
  const { ws, data, canApprove, busy, action, setProspect, setSelected, setTab } =
    useWorkspace();
  const { t, language } = usePrefs();
  const num = (value: number) =>
    value.toLocaleString(language === "ar" ? "ar-EG" : "en");
  // Size rules carry the workspace band, so build the translated name from its parameters.
  const ruleName = (r: NonNullable<Prospect["breakdown"]["breakdown"]>[number]) =>
    r.id === "size" && r.params
      ? `${t("Company size in band")} (${num(r.params.min)}–${num(r.params.max)} ${t("staff")})`
      : t(r.rule);
  const [tab, setDetailTab] = useState<DetailTab>("overview");
  const [evidence, setEvidence] = useState(prospect.evidence);
  const [country, setCountry] = useState(prospect.country ?? "");
  const [basis, setBasis] = useState(prospect.lawfulBasis ?? "");
  const [consent, setConsent] = useState(toLocalInput(prospect.consentAt));
  const [excluded, setExcluded] = useState(prospect.excluded);
  const [dialog, setDialog] = useState(false);
  useEffect(() => {
    setEvidence(prospect.evidence);
    setCountry(prospect.country ?? "");
    setBasis(prospect.lawfulBasis ?? "");
    setConsent(toLocalInput(prospect.consentAt));
    setExcluded(prospect.excluded);
  }, [prospect]);
  const update = (index: number, patch: Partial<(typeof evidence)[number]>) =>
    setEvidence((previous) =>
      previous.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    );
  const s = prospect.snapshot;
  const licence = Boolean(data.workspace.company.marketingLicence);
  const holds = holdsFor(prospect, licence);
  const reviewed = prospect.evidence.filter((e) => e.approved);
  const owner = data.members.find((m) => m.userId === prospect.ownerId)?.user.name;
  const facts = [s.industry, s.city, s.employees ? `${num(s.employees)} ${t("employees")}` : ""]
    .filter(Boolean)
    .join(" · ");
  const nextStep = !reviewed.length
    ? t("Review a dated source before you draft anything for this account.")
    : holds.length
      ? `${t("Resolve before outreach")}: ${holdText(holds[0]!, prospect.country, t)}`
      : s.triageNote || t("Ready to prepare outreach.");
  const hasUnsavedSources =
    JSON.stringify(evidence) !== JSON.stringify(prospect.evidence);
  const policyDirty =
    country !== (prospect.country ?? "") ||
    basis !== (prospect.lawfulBasis ?? "") ||
    consent !== toLocalInput(prospect.consentAt) ||
    excluded !== prospect.excluded;
  const saveSources = () =>
    void action(async () => {
      setProspect(await saveProspect(ws, prospect, { evidence }));
    }, t("Evidence saved. Previous copy approvals were invalidated."));
  const savePolicy = () =>
    void action(async () => {
      setProspect(
        await saveProspect(ws, prospect, {
          country: country || null,
          lawfulBasis: basis as "consent" | "relationship" | "",
          consentAt: toIso(consent),
          excluded,
        }),
      );
    }, t("Policy saved. Previous copy approvals were invalidated."));
  const prepareOutreach = () => {
    setSelected(() => [prospect.id]);
    setTab("Plays");
  };
  const fit = prospect.breakdown.breakdown;
  return (
    <div className="acct-detail" data-ai-target="account-detail">
      <div className="acct-detail-head">
        <div>
          <p className="acct-person" dir="auto">
            {s.firstName} {s.lastName}
            {s.title ? ` · ${s.title}` : ""} · <bdi>{s.email}</bdi>
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="acct-back"
            startIcon={<IconArrowLeft size={14} className="flip-rtl" />}
            onClick={() => setProspect(null)}
          >
            {t("Back to accounts")}
          </Button>
        </div>
        <Button variant="primary" onClick={prepareOutreach}>
          {t("Prepare outreach")}
        </Button>
      </div>
      <PageTabs<DetailTab>
        label={t("Account detail")}
        value={tab}
        onChange={setDetailTab}
        tabs={[
          { id: "overview", label: t("Overview") },
          {
            id: "sources",
            label: t("Sources"),
            count: prospect.evidence.length ? num(prospect.evidence.length) : undefined,
          },
          { id: "policy", label: t("Fit & policy") },
          { id: "triage", label: t("Triage") },
          { id: "calls", label: t("Calls") },
          { id: "discovery", label: t("Discovery") },
        ]}
      />

      {tab === "overview" && (
        <section className="acct-pane" aria-label={t("Overview")}>
          <h2>{t("What matters before you reach out")}</h2>
          <div className="acct-card">
            {facts && <p dir="auto">{facts}</p>}
            <p className="acct-next-step" dir="auto">
              {nextStep}
            </p>
            <p className="acct-meta muted">
              {prospect.score !== null && (
                <span>
                  {t("Fit")}: {prospect.breakdown.tier ? `${prospect.breakdown.tier} · ` : ""}
                  {prospect.score}
                </span>
              )}
              <span>
                {t("Owner")}: {owner ?? "—"}
              </span>
              <span>
                {num(reviewed.length)} {t("reviewed sources")}
              </span>
            </p>
            {holds.length > 0 && (
              <ul className="acct-holds">
                {holds.map((hold) => (
                  <li key={hold.code}>{holdText(hold, prospect.country, t)}</li>
                ))}
              </ul>
            )}
            <div className="button-row">
              <Button onClick={() => setDetailTab("sources")}>{t("Review source")}</Button>
              {holds.length > 0 && (
                <Button onClick={() => setDetailTab("policy")}>{t("Fit & policy")}</Button>
              )}
            </div>
          </div>
          <h2>{t("Recent activity")}</h2>
          <ul className="acct-list">
            {[...reviewed]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 3)
              .map((item) => (
                <li key={item.id}>
                  <button type="button" className="acct-list-item" onClick={() => setDetailTab("sources")}>
                    <IconFileText size={18} aria-hidden />
                    <span className="acct-list-text">
                      <strong dir="auto">{item.claim || t("Reviewed source")}</strong>
                      <span className="muted small">
                        {item.source} · <bdi>{item.date.slice(0, 10)}</bdi>
                      </span>
                    </span>
                    <Badge tone="ok">{t("Reviewed")}</Badge>
                  </button>
                </li>
              ))}
            {(prospect.basisEvidence ?? []).slice(-2).map((entry, index) => (
              <li key={`${entry.recordedAt}:${index}`}>
                <button type="button" className="acct-list-item" onClick={() => setDetailTab("policy")}>
                  <IconFileText size={18} aria-hidden />
                  <span className="acct-list-text">
                    <strong>
                      {entry.type === "consent" ? t("Recorded consent") : t("Existing relationship")}
                    </strong>
                    <span className="muted small">
                      <span dir="auto">{entry.source}</span> · <bdi>{entry.date}</bdi>
                    </span>
                  </span>
                  <Badge>{t("Basis evidence")}</Badge>
                </button>
              </li>
            ))}
            <li>
              <button type="button" className="acct-list-item" onClick={() => setDetailTab("sources")}>
                <IconFileText size={18} aria-hidden />
                <span className="acct-list-text">
                  <strong>{t("Research brief available")}</strong>
                  <span className="muted small">
                    {t("Facts, hypotheses and unknowns remain separate")}
                  </span>
                </span>
                <Badge>{t("Ready")}</Badge>
              </button>
            </li>
          </ul>
        </section>
      )}

      {tab === "sources" && (
        <section className="acct-pane" aria-label={t("Sources")}>
          <div className="acct-section-head">
            <div>
              <h2>{t("Dated source review")}</h2>
              <p className="muted">
                {t("Messages may only cite reviewed claims.")}
              </p>
            </div>
            <Button
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
          </div>
          <ResearchBrief
            key={`${ws}:${prospect.id}`}
            prospectId={prospect.id}
            hasUnsavedChanges={hasUnsavedSources}
          />
          {!evidence.length && (
            <EmptyState
              title={t("No sources yet")}
              text={t(
                "Add a dated public source before drafting. Messages may only cite reviewed claims.",
              )}
            />
          )}
          <div className="acct-evidence-list">
            {evidence.map((item, index) => (
              <article
                className={`acct-card acct-evidence ${item.approved ? "is-approved" : ""}`}
                key={item.id}
              >
                <header>
                  <Badge tone={item.kind === "fact" ? "info" : "warn"}>{item.kind}</Badge>
                  <span className="muted small">{item.source}</span>
                  {item.approved && <Badge tone="ok">{t("reviewed")}</Badge>}
                </header>
                <Field label={t("Claim")}>
                  <Textarea
                    dir="auto"
                    rows={2}
                    value={item.claim}
                    disabled={!canApprove}
                    onChange={(e) => update(index, { claim: e.target.value, approved: false })}
                  />
                </Field>
                <div className="acct-two">
                  <Field label={t("Source URL")}>
                    <Input
                      value={item.url}
                      type="url"
                      disabled={!canApprove}
                      onChange={(e) => update(index, { url: e.target.value, approved: false })}
                    />
                  </Field>
                  <Field label={t("Source date")}>
                    <Input
                      type="date"
                      value={item.date.slice(0, 10)}
                      disabled={!canApprove}
                      onChange={(e) =>
                        update(index, {
                          date: e.target.value ? new Date(e.target.value).toISOString() : "",
                          approved: false,
                        })
                      }
                    />
                  </Field>
                </div>
                <div className="acct-evidence-foot">
                  <Check
                    label={t("I reviewed this factual claim and its dated source")}
                    checked={item.approved}
                    disabled={!canApprove}
                    onChange={(e) => update(index, { approved: e.target.checked })}
                  />
                  <a className="link" href={item.url} target="_blank" rel="noopener noreferrer">
                    {t("Open source")} <IconExternalLink size={13} aria-hidden />
                  </a>
                </div>
              </article>
            ))}
          </div>
          {evidence.length > 0 && (
            <div className="button-row">
              <Button
                variant="primary"
                disabled={!canApprove || busy || !hasUnsavedSources}
                onClick={saveSources}
              >
                {t("Save reviewed source")}
              </Button>
            </div>
          )}
        </section>
      )}

      {tab === "policy" && (
        <section className="acct-pane acct-policy" aria-label={t("Fit & policy")}>
          <div className="acct-card acct-fit-card">
            <p className="acct-fit-score" dir="ltr">
              {prospect.score ?? "—"}
              {prospect.breakdown.tier ? ` · ${t("Tier")} ${prospect.breakdown.tier}` : ""}
            </p>
            <ul className="acct-breakdown">
              {fit?.map((r) => (
                <li key={r.id ?? r.rule}>
                  <span>
                    {ruleName(r)}
                    {r.detail && r.id === "role" && (
                      <span className="muted small" dir="auto">
                        {" "}
                        · {r.detail}
                      </span>
                    )}
                  </span>
                  <bdi className="mono" dir="ltr">
                    {r.points}
                    {r.weight !== undefined ? ` / ${r.weight}` : ""}
                  </bdi>
                  <Badge
                    tone={r.state === "match" ? "ok" : r.state === "unknown" ? "warn" : "neutral"}
                  >
                    {t(r.state)}
                  </Badge>
                </li>
              )) ?? <li className="muted">{t("Not scored")}</li>}
            </ul>
          </div>
          <div className="acct-policy-form">
            <div className="field">
              <label className="field-label" htmlFor="policy-country">
                {t("Country")}
              </label>
              <Select
                id="policy-country"
                name="country"
                value={country}
                disabled={!canApprove}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="">{t("Not set · blocked")}</option>
                {COUNTRIES.map((code) => (
                  <option key={code} value={code}>
                    {t(COUNTRY_LABEL[code])}
                  </option>
                ))}
              </Select>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="policy-communication-basis">
                {t("Communication basis")}
              </label>
              <Select
                id="policy-communication-basis"
                name="lawfulBasis"
                value={basis}
                disabled={!canApprove}
                onChange={(e) => setBasis(e.target.value)}
              >
                <option value="">{t("Not recorded · blocked")}</option>
                <option value="consent">{t("Recorded consent")}</option>
                <option value="relationship">{t("Existing relationship")}</option>
              </Select>
            </div>
            <Field label={t("Consent time")}>
              <Input
                name="consentAt"
                type="datetime-local"
                value={consent}
                disabled={!canApprove}
                onChange={(e) => setConsent(e.target.value)}
              />
            </Field>
            <div className="acct-basis-list">
              <p className="field-label">{t("Basis evidence")}</p>
              {prospect.basisEvidence?.length ? (
                <ul className="acct-breakdown">
                  {prospect.basisEvidence.map((entry, index) => (
                    <li key={`${entry.recordedAt}:${index}`}>
                      <Badge tone="info">
                        {entry.type === "consent" ? t("Recorded consent") : t("Existing relationship")}
                      </Badge>
                      <span dir="auto">{entry.source}</span>
                      <bdi className="mono" dir="ltr">
                        {entry.date}
                      </bdi>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">{t("No basis evidence recorded")}</p>
              )}
              <Button size="sm" disabled={!canApprove} onClick={() => setDialog(true)}>
                {t("Record basis evidence")}
              </Button>
            </div>
            <Check
              name="excluded"
              label={t("Exclude from outreach")}
              checked={excluded}
              disabled={!canApprove}
              onChange={(e) => setExcluded(e.target.checked)}
            />
            {holds.length > 0 && (
              <p className="acct-warn" role="status">
                {t("This contact is held:")}{" "}
                {holds.map((hold) => holdText(hold, prospect.country, t)).join(" · ")}
              </p>
            )}
            <div className="button-row">
              <Button
                variant="primary"
                disabled={!canApprove || busy || !policyDirty}
                onClick={savePolicy}
              >
                {t("Save policy")}
              </Button>
            </div>
          </div>
          {dialog && (
            <BasisEvidenceDialog
              prospect={prospect}
              onClose={() => setDialog(false)}
              onSaved={setProspect}
            />
          )}
        </section>
      )}

      {tab === "triage" && <TriagePanel key={`triage:${prospect.id}`} prospect={prospect} />}
      {tab === "calls" && <CallLog key={`call:${prospect.id}`} prospect={prospect} />}
      {tab === "discovery" && (
        <DiscoveryPanel key={`discovery:${prospect.id}`} prospect={prospect} />
      )}
    </div>
  );
}
