import type { Country } from "@revenue/contracts";
import type { Prospect } from "../../lib/types";

// Country names shown in selects and hold reasons. Labels go through t() at render time.
export const COUNTRY_LABEL: Record<Country, string> = {
  EG: "Egypt",
  SA: "Saudi Arabia",
  AE: "United Arab Emirates",
  KW: "Kuwait",
  QA: "Qatar",
  BH: "Bahrain",
  OM: "Oman",
};

// Only EG, SA and AE have a reviewed channel rule; the other countries stay blocked.
// This mirrors COUNTRY_RULES and channelHolds in packages/backend/src/policy.ts. The API does
// not return per-account holds yet, so the Ready/Held view derives them from the same fields.
const COUNTRY_RULES: Record<string, { bases: string[]; licence: boolean }> = {
  EG: { bases: ["consent", "relationship"], licence: true },
  SA: { bases: ["consent", "relationship"], licence: false },
  AE: { bases: ["consent"], licence: false },
};
export const BASES_FOR = (country: string | null): string[] =>
  (country && COUNTRY_RULES[country]?.bases) || ["consent", "relationship"];

export type HoldCode =
  | "country-missing"
  | "country-blocked"
  | "basis-missing"
  | "evidence-missing"
  | "consent-time"
  | "licence"
  | "excluded"
  | "email"
  | "existing"
  | "dropped"
  | "segment-hold";
export type Hold = { code: HoldCode };

type HoldInput = Pick<
  Prospect,
  | "country"
  | "lawfulBasis"
  | "consentAt"
  | "basisEvidence"
  | "excluded"
  | "snapshot"
>;

export function holdsFor(p: HoldInput, marketingLicence: boolean): Hold[] {
  const holds: Hold[] = [];
  const rule = p.country ? COUNTRY_RULES[p.country] : undefined;
  if (!p.country) holds.push({ code: "country-missing" });
  else if (!rule) holds.push({ code: "country-blocked" });
  else {
    if (!rule.bases.includes(p.lawfulBasis ?? ""))
      holds.push({ code: "basis-missing" });
    else if (
      !(p.basisEvidence ?? []).some((entry) => entry?.type === p.lawfulBasis)
    )
      holds.push({ code: "evidence-missing" });
    if (
      p.lawfulBasis === "consent" &&
      (!p.consentAt || Date.parse(p.consentAt) > Date.now())
    )
      holds.push({ code: "consent-time" });
    if (rule.licence && !marketingLicence) holds.push({ code: "licence" });
  }
  if (p.excluded) holds.push({ code: "excluded" });
  const s = p.snapshot;
  if (!s.email) holds.push({ code: "email" });
  if (s.existingClient || s.bucket === "existing")
    holds.push({ code: "existing" });
  if (s.bucket === "drop") holds.push({ code: "dropped" });
  if (s.segment === "HOLD") holds.push({ code: "segment-hold" });
  return holds;
}

// Accounts a person has set aside: they never reach the Ready or Held lists.
export const isDropped = (p: Prospect) =>
  p.excluded ||
  p.snapshot.bucket === "drop" ||
  p.snapshot.bucket === "existing" ||
  Boolean(p.snapshot.existingClient);

export type TriageGroup = "ready" | "held" | "dropped";
export function triageGroup(p: Prospect, marketingLicence: boolean): TriageGroup {
  if (isDropped(p)) return "dropped";
  return holdsFor(p, marketingLicence).length ? "held" : "ready";
}

// Untriaged accounts, or accounts parked in the HOLD segment, wait for a person's review.
export const needsReview = (p: Prospect) =>
  !p.excluded && (!p.snapshot.bucket || p.snapshot.segment === "HOLD");

// Hold reason in the reader's language. `t` is the interface translator.
export function holdText(
  hold: Hold,
  country: string | null,
  t: (text: string) => string,
): string {
  switch (hold.code) {
    case "country-missing":
      return t("Country not set: choose one (no default)");
    case "country-blocked":
      return country && country in COUNTRY_LABEL
        ? `${t("Country blocked")}: ${t(COUNTRY_LABEL[country as Country])} (${t("no reviewed rule")})`
        : `${t("Country blocked")} (${t("no reviewed rule")})`;
    case "basis-missing":
      return t("No lawful basis");
    case "evidence-missing":
      return t("Basis without evidence");
    case "consent-time":
      return t("Consent timestamp missing");
    case "licence":
      return t("Egypt marketing licence missing");
    case "excluded":
      return t("Excluded from outreach");
    case "email":
      return t("Email address is missing");
    case "existing":
      return t("Existing client");
    case "dropped":
      return t("Dropped in triage");
    case "segment-hold":
      return t("On hold until contact research is complete");
  }
}

export type NextStep = "country" | "basis" | "evidence" | "licence" | "open" | "none";
// The first hold decides what a person can do next; a blocked country cannot be fixed here.
export function nextStepFor(holds: Hold[]): NextStep {
  const first = holds[0]?.code;
  switch (first) {
    case "country-missing":
      return "country";
    case "country-blocked":
      return "none";
    case "basis-missing":
      return "basis";
    case "evidence-missing":
    case "consent-time":
      return "evidence";
    case "licence":
      return "licence";
    default:
      return "open";
  }
}
