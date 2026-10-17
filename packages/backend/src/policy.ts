import { createHash } from "node:crypto";
import type {
  Actor,
  Evidence,
  Preflight,
  ProspectSnapshot,
  ToolRequest,
} from "@revenue/contracts";
import { COSTS } from "@revenue/contracts";
import { BadRequestException, ForbiddenException } from "@nestjs/common";

export function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
export function month(date = new Date()) {
  return date.toISOString().slice(0, 7);
}
export function assertRole(
  actor: Actor,
  operation: "read" | "write" | "approve" | "admin",
) {
  const permitted =
    operation === "read" ||
    (operation === "write" && ["owner", "operator"].includes(actor.role)) ||
    (operation === "approve" && ["owner", "reviewer"].includes(actor.role)) ||
    (operation === "admin" && actor.role === "owner");
  if (!permitted)
    throw new ForbiddenException(
      `Your ${actor.role} role cannot ${operation} this action.`,
    );
}
export function estimate(input: ToolRequest) {
  if (["assistant", "onboard", "preflight"].includes(input.tool))
    return COSTS[input.tool];
  return (
    COSTS[input.tool] *
    Math.max(
      1,
      input.tool === "queue_sequence"
        ? input.draftIds.length
        : input.prospectIds.length,
    )
  );
}
export function score(snapshot: ProspectSnapshot) {
  const rules = [
    {
      name: "B2B decision-making role",
      points: 30,
      known: Boolean(snapshot.title),
      match: /founder|ceo|director|head|manager|owner/i.test(snapshot.title),
    },
    {
      name: "Small or growing business (1–200 staff)",
      points: 25,
      known: snapshot.employees !== undefined,
      match:
        Number(snapshot.employees) >= 1 && Number(snapshot.employees) <= 200,
    },
    {
      name: "Company website available",
      points: 20,
      known: Boolean(snapshot.website),
      match: Boolean(snapshot.website),
    },
    {
      name: "Hiring or funding signal",
      points: 25,
      known: snapshot.hiring !== undefined || snapshot.funding !== undefined,
      match: snapshot.hiring === true || snapshot.funding === true,
    },
  ].map((rule) => ({
    rule: rule.name,
    points: rule.match ? rule.points : 0,
    state: !rule.known ? "unknown" : rule.match ? "match" : "no match",
  }));
  const total = snapshot.existingClient
    ? 0
    : rules.reduce((sum, rule) => sum + rule.points, 0);
  return {
    score: total,
    tier: total >= 75 ? "A" : total >= 50 ? "B" : "C",
    disqualified: Boolean(snapshot.existingClient) || total < 50,
    breakdown: rules,
  };
}
export function validateEvidence(evidence: Evidence[]) {
  const facts = evidence.filter((item) => item.kind === "fact");
  if (!facts.length)
    throw new BadRequestException(
      "Add and review at least one dated source before approving this draft.",
    );
  if (
    facts.some(
      (item) =>
        !item.approved ||
        !/^https?:\/\//.test(item.url) ||
        !Number.isFinite(Date.parse(item.date)),
    )
  ) {
    throw new BadRequestException(
      "Review every factual claim and add its source URL and date before approval.",
    );
  }
}
export function preflightHolds(value: Partial<Preflight>) {
  const holds: string[] = [];
  for (const key of ["spf", "dkim", "dmarc", "unsubscribe"] as const)
    if (value[key] !== true)
      holds.push(`${key.toUpperCase()} needs verification`);
  if (!value.mailbox) holds.push("Connect a sender mailbox");
  if (!(Number(value.warmupDays) >= 14))
    holds.push("Mailbox needs at least 14 days of warm-up history");
  if (!(Number(value.bounceRate) < 0.02))
    holds.push("Bounce rate must be known and below 2%");
  if (!(Number(value.complaintRate) < 0.001))
    holds.push("Complaint rate must be known and below 0.1%");
  if (!(Number(value.dailyCap) > 0 && Number(value.dailyCap) <= 30))
    holds.push("Set a daily mailbox cap from 1 to 30");
  if (
    !value.checkedAt ||
    !Number.isFinite(Date.parse(value.checkedAt)) ||
    Date.parse(value.checkedAt) > Date.now() + 60000 ||
    Date.now() - Date.parse(value.checkedAt) > 86400000
  )
    holds.push("Refresh the sender check (valid for 24 hours)");
  return holds;
}
export const COUNTRY_RULES = {
  EG: {
    bases: ["consent", "relationship"],
    licence: true,
    name: "Egypt marketing consent/relationship and licence gate",
  },
  SA: {
    bases: ["consent", "relationship"],
    licence: false,
    name: "Saudi marketing consent/relationship gate",
  },
  AE: { bases: ["consent"], licence: false, name: "UAE consent-first gate" },
} as const;
export function channelHolds(
  prospect: {
    country: string | null;
    lawfulBasis: string | null;
    consentAt: Date | null;
    basisEvidence: unknown;
    excluded: boolean;
    snapshot: unknown;
  },
  marketingLicence: boolean,
) {
  const holds: string[] = [];
  const rule = prospect.country
    ? COUNTRY_RULES[prospect.country as keyof typeof COUNTRY_RULES]
    : undefined;
  if (!prospect.country) holds.push("Set the country before contact");
  else if (!rule)
    holds.push(
      "This country is blocked until a reviewed channel policy is configured",
    );
  else {
    if (!(rule.bases as readonly string[]).includes(prospect.lawfulBasis ?? ""))
      holds.push(rule.name);
    else if (
      !(Array.isArray(prospect.basisEvidence) ? prospect.basisEvidence : []).some(
        (entry) =>
          (entry as { type?: string } | null)?.type === prospect.lawfulBasis,
      )
    )
      holds.push(`Record evidence for the ${prospect.lawfulBasis} basis`);
    if (
      prospect.lawfulBasis === "consent" &&
      (!prospect.consentAt || prospect.consentAt.getTime() > Date.now())
    )
      holds.push("Record the consent timestamp");
    if (rule.licence && !marketingLicence)
      holds.push("Record the Egypt electronic marketing licence");
  }
  if (prospect.excluded) holds.push("This prospect is excluded");
  const snapshot = prospect.snapshot as ProspectSnapshot;
  if (!snapshot.email) holds.push("Email address is missing");
  if (snapshot.existingClient || snapshot.bucket === "existing")
    holds.push("Existing clients are excluded from acquisition");
  if (snapshot.bucket === "drop") holds.push("This account was triaged as Drop");
  if (snapshot.segment === "HOLD")
    holds.push("This account is on hold until contact research is complete");
  return holds;
}
export function escapeHtml(text: unknown) {
  return String(text ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );
}
export function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : "The step failed.";
  return message
    .replace(/(Bearer\s+)[^\s]+/gi, "$1[redacted]")
    .replace(/([?&](?:api_key|token|key|secret)=)[^&\s]+/gi, "$1[redacted]")
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[database]")
    .slice(0, 400);
}
