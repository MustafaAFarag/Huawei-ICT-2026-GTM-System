import { describe, expect, it } from "vitest";
import type { Evidence, ProspectSnapshot } from "@revenue/contracts";
import { researchBrief, researchBriefHtml } from "../src/research-brief.js";
const snapshot: ProspectSnapshot = {
  firstName: "Huda",
  lastName: "Test",
  company: "Example <Pay>",
  title: "CFO",
  website: "https://example.test",
  email: "huda@example.test",
};
const evidence: Evidence[] = [
  {
    id: "fact",
    claim: "Lists four roles.",
    kind: "fact",
    approved: true,
    url: "https://example.test/careers",
    date: "2026-10-01",
    source: "Careers",
  },
  {
    id: "unreviewed",
    claim: "Do not publish this claim.",
    kind: "fact",
    approved: false,
    url: "https://example.test",
    date: "2026-10-01",
    source: "Draft",
  },
  {
    id: "undated",
    claim: "Do not publish an undated fact.",
    kind: "fact",
    approved: true,
    url: "https://example.test",
    date: "bad",
    source: "Draft",
  },
  {
    id: "hyp",
    claim: "May need help with payroll.",
    kind: "hypothesis",
    approved: true,
    url: "",
    date: "",
    source: "Analyst",
  },
  {
    id: "unknown",
    claim: "<script>alert(1)</script> Is there a budget?",
    kind: "unknown",
    approved: false,
    url: "javascript:alert(1)",
    date: "",
    source: "Open question",
  },
];
describe("research brief export", () => {
  it("separates reviewed valid facts from hypotheses and unknowns without changing the record", () => {
    const original = JSON.stringify(evidence);
    const brief = researchBrief(
      snapshot,
      evidence,
      "Test",
      new Date("2026-10-15"),
      "en",
    );
    expect(brief.facts.map((item) => item.id)).toEqual(["fact"]);
    expect(brief.withheldFacts).toBe(2);
    expect(brief.hypotheses.map((item) => item.id)).toEqual(["hyp"]);
    expect(brief.unknowns.map((item) => item.id)).toEqual(["unknown"]);
    expect(JSON.stringify(evidence)).toBe(original);
    const changed = researchBrief(
      snapshot,
      evidence.slice(1),
      "Test",
      new Date("2026-10-15"),
      "en",
    );
    expect(changed.recordDigest).not.toBe(brief.recordDigest);
  });
  it("renders RTL labels while preserving original source text, escaping content and omitting unsafe links", () => {
    const html = researchBriefHtml(
      researchBrief(snapshot, evidence, "Test", new Date("2026-10-15"), "ar"),
    );
    expect(html).toContain('lang="ar" dir="rtl"');
    expect(html).toContain("حقائق مراجعة");
    expect(html).toContain("Lists four roles.");
    expect(html).toContain('href="https://example.test/careers"');
    expect(html).not.toContain("Do not publish");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain("Example &lt;Pay&gt;");
  });
});
