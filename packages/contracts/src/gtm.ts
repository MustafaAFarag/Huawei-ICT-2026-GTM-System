// Pure GTM rules shared by the server and the UI (PRD v3.1 §7.14).
import type { Evidence, ProspectSnapshot, Touch } from "./index.js";

export type Persona = NonNullable<ProspectSnapshot["persona"]>;
export type Maturity = NonNullable<ProspectSnapshot["hrMaturity"]>;
export type Bucket = NonNullable<ProspectSnapshot["bucket"]>;
export const BUCKETS: Bucket[] = ["client", "partner", "drop", "existing"];

// GAP-04: persona from title, maturity from size, register from persona.
export function inferPersona(title = ""): Persona {
  if (/founder|ceo|owner|managing director|chief executive|مؤسس|الرئيس التنفيذي/i.test(title)) return "founder";
  if (/hr|people|talent|human|recruit|موارد|توظيف/i.test(title)) return "people-leader";
  if (/cfo|finance|account|مالي/i.test(title)) return "finance";
  if (/sales|commercial|growth|revenue|مبيعات/i.test(title)) return "sales";
  return "operations";
}
export function inferMaturity(employees?: number): Maturity {
  if (!employees || employees < 25) return "P1a";
  return employees < 150 ? "P1b" : "P2";
}
export const registerFor = (persona: Persona): "founder" | "leader" =>
  persona === "founder" ? "founder" : "leader";

// The workspace stores an angle matrix keyed "persona:maturity"; the approved offer is the fallback.
export function angleFor(
  snapshot: ProspectSnapshot,
  matrix: Record<string, string> = {},
  offer?: string,
) {
  const persona = snapshot.persona ?? inferPersona(snapshot.title);
  const maturity = snapshot.hrMaturity ?? inferMaturity(snapshot.employees);
  return {
    persona,
    maturity,
    register: snapshot.register ?? registerFor(persona),
    angle:
      snapshot.angle ??
      matrix[`${persona}:${maturity}`] ??
      matrix[persona] ??
      offer ??
      null,
  };
}

// GAP-02: near-duplicate keys — same person at the same company, or the same mailbox root.
export function duplicateKeys(s: Pick<ProspectSnapshot, "firstName" | "lastName" | "company" | "email">) {
  const norm = (v = "") => v.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, "");
  const keys = [`person:${norm(s.company)}|${norm(s.firstName)}|${norm(s.lastName)}`];
  if (s.email) {
    const [local = "", domain = ""] = s.email.toLowerCase().split("@");
    keys.push(`mail:${local.split(/[.+_-]/)[0]}@${domain}`);
  }
  return keys;
}
export function duplicateGroups<T extends { id: string; snapshot: ProspectSnapshot }>(rows: T[]) {
  const byKey = new Map<string, T[]>();
  for (const row of rows)
    for (const key of duplicateKeys(row.snapshot))
      byKey.set(key, [...(byKey.get(key) ?? []), row]);
  const seen = new Set<string>();
  const groups: T[][] = [];
  for (const list of byKey.values()) {
    if (list.length < 2) continue;
    const id = list.map((r) => r.id).sort().join(",");
    if (seen.has(id)) continue;
    seen.add(id);
    groups.push(list);
  }
  return groups;
}

// GAP-14 and ARB-03 (subset): deterministic checks on a draft before approval.
export type DraftCheck = { level: "error" | "warning"; code: string; message: string; touch?: number };
const PERSONAL_EVENT =
  /great (meeting|to meet|seeing) you|nice (meeting|to meet) you|(we|i) met (at|during)|met you at|saw you at|سعدت بلقائك|اتشرفت بمقابلتك|قابلتك في|شفتك في/i;
const OPT_OUT = /\bstop\b|unsubscribe|opt.?out|توقف|إلغاء الاشتراك|الغاء الاشتراك/i;
const ARABIC = /[؀-ۿ]/;
export function draftChecks(touches: Touch[], language = "en"): DraftCheck[] {
  const checks: DraftCheck[] = [];
  touches.forEach((touch, index) => {
    const text = `${touch.subject ?? ""}\n${touch.body}`;
    if (PERSONAL_EVENT.test(text))
      checks.push({ level: "error", code: "event-claim", touch: index, message: "Event references must stay at company level, not a personal meeting claim." });
    if (touch.channel === "email" && !OPT_OUT.test(touch.body))
      checks.push({ level: "error", code: "opt-out", touch: index, message: "The email needs an opt-out line." });
    if (touch.channel === "email" && (touch.subject ?? "").length > 70)
      checks.push({ level: "warning", code: "subject-length", touch: index, message: "Subject is longer than 70 characters." });
    if (touch.channel === "linkedin" && touch.body.length > 300)
      checks.push({ level: "warning", code: "linkedin-length", touch: index, message: "LinkedIn messages over 300 characters are cut in connection notes." });
    if (touch.channel === "email" && touch.body.split(/\s+/).length > 160)
      checks.push({ level: "warning", code: "email-length", touch: index, message: "Email body is over 160 words." });
    if (language !== "en" && !ARABIC.test(touch.body))
      checks.push({ level: "warning", code: "language", touch: index, message: "This draft is meant to be Arabic but contains no Arabic text." });
    if (language === "en" && ARABIC.test(touch.body))
      checks.push({ level: "warning", code: "language", touch: index, message: "This English draft contains Arabic text." });
    if (/\[(name|company|first ?name)\]|{{|}}/i.test(text))
      checks.push({ level: "error", code: "placeholder", touch: index, message: "Unfilled placeholder left in the copy." });
  });
  return checks;
}

// GAP-10: message confidence from evidence, freshness, contactability and checks.
export function draftConfidence(
  touches: Touch[],
  evidence: Evidence[],
  snapshot: ProspectSnapshot,
  language = "en",
  now = Date.now(),
) {
  const reasons: string[] = [];
  let score = 0;
  const cited = new Set(touches.flatMap((t) => t.evidenceIds));
  const facts = evidence.filter((e) => e.approved && e.kind === "fact" && cited.has(e.id));
  if (facts.length >= 2) score += 35;
  else if (facts.length === 1) score += 25;
  else reasons.push("No reviewed fact is cited.");
  const newest = Math.max(0, ...facts.map((f) => new Date(f.date).getTime()));
  const days = newest ? (now - newest) / 86400000 : Infinity;
  if (days <= 30) score += 25;
  else if (days <= 90) score += 15;
  else reasons.push("The cited fact is older than 90 days.");
  if (snapshot.email) score += 15;
  else reasons.push("No email address.");
  if (snapshot.angle || snapshot.persona) score += 10;
  else reasons.push("No persona or angle recorded.");
  const checks = draftChecks(touches, language);
  if (!checks.some((c) => c.level === "error")) score += 15;
  else reasons.push("A blocking copy check fails.");
  return {
    score,
    level: (score >= 75 ? "high" : score >= 50 ? "medium" : "low") as "high" | "medium" | "low",
    reasons,
  };
}

// GAP-07: funnel stages for the scorecard.
export const FUNNEL = ["prepared", "delivered", "replied", "meeting", "agreed"] as const;
