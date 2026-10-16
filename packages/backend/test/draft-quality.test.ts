import { describe, expect, it } from "vitest";
import { validateDraftContent } from "../src/draft-quality.js";
import type { Evidence, ProspectSnapshot, Touch } from "@revenue/contracts";
const snapshot: ProspectSnapshot = {
  firstName: "Huda",
  lastName: "Test",
  company: "Example24",
  title: "CFO",
  website: "",
  email: "",
};
const evidence: Evidence[] = [
  {
    id: "f",
    kind: "fact",
    approved: true,
    claim: "Example24 lists 1,000 jobs and 2 offices.",
    date: "2026-10-01",
    url: "https://example.test",
    source: "Synthetic",
  },
];
const touch = (body: string): Touch[] => [
  { channel: "email", day: 0, body, evidenceIds: ["f"] },
];
describe("draft content checks", () => {
  it("accepts source number words rewritten as digits and approved source dates", () => {
    expect(() =>
      validateDraftContent(
        touch("Huda, 3 roles were listed as of 1 October 2026."),
        snapshot,
        [{ ...evidence[0]!, claim: "Lists three roles." }],
        "Offer",
      ),
    ).not.toThrow();
    expect(() =>
      validateDraftContent(
        touch("Huda, 125 roles."),
        snapshot,
        [
          {
            ...evidence[0]!,
            claim: "Lists one hundred and twenty-five roles.",
          },
        ],
        "Offer",
      ),
    ).not.toThrow();
  });
  it("preserves supplied recipient names and accepts equivalent Arabic/thousands numerals", () => {
    expect(() =>
      validateDraftContent(
        touch("Huda، لدى Example24 عدد ١٠٠٠ وظيفة و٢ مكتب"),
        snapshot,
        evidence,
        "Offer",
      ),
    ).not.toThrow();
    expect(() =>
      validateDraftContent(
        touch("Huda, Example24 lists 1,000 jobs"),
        snapshot,
        evidence,
        "Offer",
      ),
    ).not.toThrow();
    expect(() =>
      validateDraftContent(
        touch("Hala، وظائف جديدة"),
        snapshot,
        evidence,
        "Offer",
      ),
    ).toThrow(/first name/);
  });
  it("counts approved offer numbers but does not treat unrelated evidence IDs or URLs as permission for numbers", () => {
    expect(() =>
      validateDraftContent(
        touch("Huda, a 30 day review?"),
        snapshot,
        evidence,
        "A 30 day review.",
      ),
    ).not.toThrow();
    expect(() =>
      validateDraftContent(
        touch("Huda, we helped 50 clients."),
        snapshot,
        [{ ...evidence[0]!, id: "50", url: "https://example.test/50" }],
        "Offer",
      ),
    ).toThrow(/unsupported number/);
  });
});
