"use client";
import { useMemo, useState } from "react";
import { IconAlertTriangle, IconDownload, IconShieldCheck } from "@revenue/ui";
import { Button, EmptyState, PageTabs, Select } from "../primitives";
import { useWorkspace } from "../workspace-context";
import { usePrefs } from "../../lib/prefs";
import type { Prospect } from "../../lib/types";
import { BasisEvidenceDialog, ChooseCountryDialog } from "./PolicyDialogs";
import {
  holdText,
  holdsFor,
  nextStepFor,
  triageGroup,
  type Hold,
  type TriageGroup,
} from "./holds";
import { CountryChip, Pager, csvCell, downloadText, usePaging } from "./parts";

type Row = {
  prospect: Prospect;
  group: TriageGroup;
  holds: Hold[];
};
// Reason filter groups, by the first hold on the row.
const REASONS = ["basis", "country-missing", "country-blocked", "licence", "other"] as const;
type Reason = (typeof REASONS)[number];
const REASON_LABEL: Record<Reason, string> = {
  basis: "Basis or evidence missing",
  "country-missing": "Country not set",
  "country-blocked": "Country blocked",
  licence: "Licence missing",
  other: "Other",
};
const reasonOf = (holds: Hold[]): Reason => {
  const code = holds[0]?.code;
  if (code === "basis-missing" || code === "evidence-missing" || code === "consent-time")
    return "basis";
  if (code === "country-missing") return "country-missing";
  if (code === "country-blocked") return "country-blocked";
  if (code === "licence") return "licence";
  return "other";
};
const BUCKET_LABEL = {
  client: "Client",
  partner: "Partner",
  drop: "Drop",
  existing: "Existing client",
} as const;

// Frames v32-04 and the All-held state: Ready (basis evidenced), Held with the rule that holds
// each row, and Dropped or Existing accounts. A row is only ever drafted for sending once it has
// an evidenced basis and an allowed country.
export function TriageView({ onOpen }: { onOpen: (p: Prospect) => void }) {
  const { data, setSelected, setTab, canApprove } = useWorkspace();
  const { t, language } = usePrefs();
  const num = (value: number) =>
    value.toLocaleString(language === "ar" ? "ar-EG" : "en");
  const licence = Boolean(data.workspace.company.marketingLicence);
  const [group, setGroup] = useState<TriageGroup>("held");
  const [reason, setReason] = useState<"all" | Reason>("all");
  const [country, setCountry] = useState("all");
  const [dialog, setDialog] = useState<
    { kind: "basis" | "country"; prospect: Prospect } | null
  >(null);
  const rows = useMemo<Row[]>(
    () =>
      data.prospects.map((prospect) => ({
        prospect,
        group: triageGroup(prospect, licence),
        holds: holdsFor(prospect, licence),
      })),
    [data.prospects, licence],
  );
  const counts = {
    ready: rows.filter((r) => r.group === "ready").length,
    held: rows.filter((r) => r.group === "held").length,
    dropped: rows.filter((r) => r.group === "dropped").length,
  };
  // The first visit lands on Held when it has rows; otherwise on Ready.
  const [touched, setTouched] = useState(false);
  const active: TriageGroup = touched
    ? group
    : counts.held
      ? "held"
      : counts.ready
        ? "ready"
        : "dropped";
  const inGroup = rows.filter((r) => r.group === active);
  const countries = useMemo(
    () => [...new Set(inGroup.map((r) => r.prospect.country ?? ""))].sort(),
    [inGroup],
  );
  const shown = inGroup.filter(
    (r) =>
      (reason === "all" || active !== "held" || reasonOf(r.holds) === reason) &&
      (country === "all" || (r.prospect.country ?? "") === country),
  );
  const paging = usePaging(shown.length, 25, `${active}|${reason}|${country}`);
  const pageRows = paging.slice(shown);
  const reasonCounts = useMemo(() => {
    const byReason = new Map<Reason, number>();
    for (const r of rows)
      if (r.group === "held")
        byReason.set(reasonOf(r.holds), (byReason.get(reasonOf(r.holds)) ?? 0) + 1);
    return byReason;
  }, [rows]);
  const basisRows = reasonCounts.get("basis") ?? 0;
  const pickGroup = (next: TriageGroup) => {
    setTouched(true);
    setGroup(next);
    setReason("all");
    setCountry("all");
  };
  const prepareReady = () => {
    setSelected(() =>
      rows.filter((r) => r.group === "ready").map((r) => r.prospect.id),
    );
    setTab("Plays");
  };
  const downloadHeld = () => {
    const header = [
      t("Company"),
      t("Contact"),
      t("Role"),
      t("Country"),
      t("Triage"),
      t("Basis"),
      t("Held by rule"),
    ];
    const lines = rows
      .filter((r) => r.group === "held")
      .map((r) => {
        const s = r.prospect.snapshot;
        return [
          s.company,
          `${s.firstName} ${s.lastName}`.trim(),
          s.title,
          r.prospect.country ?? t("Not set"),
          s.bucket ? t(BUCKET_LABEL[s.bucket]) : t("untriaged"),
          basisLabel(r.prospect),
          r.holds.map((h) => holdText(h, r.prospect.country, t)).join("; "),
        ]
          .map(csvCell)
          .join(",");
      });
    downloadText("held-accounts.csv", [header.map(csvCell).join(","), ...lines].join("\n"));
  };
  const basisLabel = (p: Prospect) =>
    p.lawfulBasis === "consent"
      ? t("Consent")
      : p.lawfulBasis === "relationship"
        ? t("Relationship")
        : t("None");
  if (!rows.length)
    return (
      <EmptyState
        title={t("Nothing to triage yet")}
        text={t("Import accounts to see which are ready and which are held.")}
      />
    );
  const allHeld = counts.ready === 0 && counts.held > 0;
  return (
    <section className="acct-triage" aria-label={t("Ready and held")}>
      <div className="acct-section-head">
        <div>
          <h2>{t("Ready and held")}</h2>
          <p className="muted">
            {num(rows.length)} {t("accounts")} · {t("Country is set on every row. A row without one stays held; Caravan never assumes Egypt.")}
          </p>
        </div>
        <div className="button-row">
          <Button
            variant="primary"
            disabled={!counts.ready}
            onClick={prepareReady}
          >
            {t("Prepare ready accounts")}
          </Button>
        </div>
      </div>
      <PageTabs
        label={t("Triage lists")}
        value={active}
        onChange={pickGroup}
        tabs={[
          {
            id: "ready",
            label: t("Ready (basis evidenced)"),
            count: num(counts.ready),
          },
          { id: "held", label: t("Held"), count: num(counts.held) },
          {
            id: "dropped",
            label: t("Dropped/Existing"),
            count: num(counts.dropped),
          },
        ]}
      />
      {active === "ready" && allHeld ? (
        <div className="acct-allheld">
          <EmptyState
            icon={<IconShieldCheck size={20} />}
            title={t("No rows are ready to prepare")}
            text={`${t("All")} ${num(counts.held)} ${t("accounts are held, each with its rule:")} ${REASONS.filter(
              (r) => reasonCounts.get(r),
            )
              .map((r) => `${num(reasonCounts.get(r)!)} ${t(REASON_LABEL[r])}`)
              .join(" · ")}`}
            action={
              <div className="button-row">
                {basisRows > 0 && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      setTouched(true);
                      setGroup("held");
                      setReason("basis");
                      setCountry("all");
                    }}
                  >
                    {t("Add basis evidence")} · {num(basisRows)} {t("rows")}
                  </Button>
                )}
                <Button onClick={() => pickGroup("held")}>
                  {t("Open held list")}
                </Button>
              </div>
            }
          />
          <p className="acct-note is-info">
            <IconShieldCheck size={16} aria-hidden />
            <span>
              {t(
                "Nothing is drafted for sending until a row has an evidenced basis and an allowed country.",
              )}
            </span>
          </p>
        </div>
      ) : (
        <>
          <div className="acct-filters">
            {active === "held" && (
              <Select
                aria-label={t("Reason")}
                value={reason}
                onChange={(event) => setReason(event.target.value as "all" | Reason)}
              >
                <option value="all">{t("Reason: All")}</option>
                {REASONS.filter((r) => reasonCounts.get(r)).map((r) => (
                  <option key={r} value={r}>
                    {t(REASON_LABEL[r])}
                  </option>
                ))}
              </Select>
            )}
            <Select
              aria-label={t("Country")}
              value={country}
              onChange={(event) => setCountry(event.target.value)}
            >
              <option value="all">{t("Country: All")}</option>
              {countries.map((code) => (
                <option key={code || "none"} value={code}>
                  {code || t("Not set")}
                </option>
              ))}
            </Select>
            {active === "held" && (
              <Button
                startIcon={<IconDownload size={14} />}
                disabled={!counts.held}
                onClick={downloadHeld}
              >
                {t("Download held list")}
              </Button>
            )}
          </div>
          {!shown.length ? (
            <EmptyState
              title={t("No accounts match this filter.")}
              text={
                active === "ready"
                  ? t("A row becomes Ready once its basis is evidenced and its country has a reviewed rule.")
                  : undefined
              }
            />
          ) : (
            <div className="acct-table-wrap">
              <table className="acct-table acct-triage-table">
                <thead>
                  <tr>
                    <th>{t("Company / contact")}</th>
                    <th>{t("Country")}</th>
                    <th>{t("Triage")}</th>
                    <th>{t("Basis")}</th>
                    <th>
                      {active === "ready" ? t("Status") : t("Held by rule")}
                    </th>
                    <th>{t("Next step")}</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(({ prospect: p, holds }) => {
                    const s = p.snapshot;
                    const step = active === "held" ? nextStepFor(holds) : "open";
                    return (
                      <tr key={p.id}>
                        <td data-label={t("Company / contact")}>
                          <strong dir="auto">{s.company}</strong>
                          <p className="muted small" dir="auto">
                            {s.firstName} {s.lastName}
                            {s.title ? ` · ${s.title}` : ""}
                          </p>
                        </td>
                        <td data-label={t("Country")}>
                          <CountryChip country={p.country} />
                        </td>
                        <td data-label={t("Triage")}>
                          {s.bucket ? t(BUCKET_LABEL[s.bucket]) : t("untriaged")}
                        </td>
                        <td data-label={t("Basis")}>{basisLabel(p)}</td>
                        <td data-label={active === "ready" ? t("Status") : t("Held by rule")}>
                          {active === "ready" ? (
                            <span className="acct-status is-ok">{t("Ready")}</span>
                          ) : active === "dropped" ? (
                            <span className="muted">
                              {s.bucket === "existing" || s.existingClient
                                ? t("Existing client")
                                : s.bucket === "drop"
                                  ? t("Dropped in triage")
                                  : t("Excluded from outreach")}
                            </span>
                          ) : (
                            <span className="acct-hold">
                              <IconAlertTriangle size={15} aria-hidden />
                              <span>
                                {holdText(holds[0]!, p.country, t)}
                                {holds.length > 1 && (
                                  <span className="muted small">
                                    {" "}
                                    +{num(holds.length - 1)}
                                  </span>
                                )}
                              </span>
                            </span>
                          )}
                        </td>
                        <td data-label={t("Next step")} className="acct-next">
                          {step === "none" ? (
                            <span className="muted">{t("Stays held")}</span>
                          ) : (
                            <Button
                              size="sm"
                              disabled={
                                (step === "country" ||
                                  step === "basis" ||
                                  step === "evidence") &&
                                !canApprove
                              }
                              onClick={() => {
                                if (step === "country")
                                  setDialog({ kind: "country", prospect: p });
                                else if (step === "basis" || step === "evidence")
                                  setDialog({ kind: "basis", prospect: p });
                                else if (step === "licence") setTab("Company context");
                                else onOpen(p);
                              }}
                            >
                              {
                                {
                                  country: t("Choose country"),
                                  basis: t("Add basis"),
                                  evidence: t("Add evidence"),
                                  licence: t("Add licence"),
                                  open: t("Open account"),
                                }[step]
                              }
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Pager
            paging={paging}
            total={shown.length}
            summary={
              active === "held"
                ? `${t("Showing")} ${num(paging.from)}–${num(paging.to)} ${t("of")} ${num(shown.length)} ${t("held rows")}. ${t("Held rows are never drafted for sending or exported. Countries: EG, SA, AE, KW, QA, BH, OM; only EG, SA and AE have reviewed rules.")}`
                : `${t("Showing")} ${num(paging.from)}–${num(paging.to)} ${t("of")} ${num(shown.length)} ${t("accounts")}`
            }
          />
        </>
      )}
      {dialog?.kind === "basis" && (
        <BasisEvidenceDialog
          prospect={dialog.prospect}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "country" && (
        <ChooseCountryDialog
          prospect={dialog.prospect}
          onClose={() => setDialog(null)}
        />
      )}
    </section>
  );
}
