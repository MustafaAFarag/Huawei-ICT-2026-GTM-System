import { describe, expect, it } from "vitest";
import { discoveryGuide, discoveryGuideHtml } from "../src/discovery-guide.js";
import type { Evidence, ProspectSnapshot } from "@revenue/contracts";

const snapshot: ProspectSnapshot = {
  firstName: "Huda",
  lastName: "Saeedi",
  email: "huda@lumaro.example",
  company: "Lumaro Pay",
  website: "https://lumaro.example",
  title: "Finance Director",
};
const evidence: Evidence[] = [
  {
    id: "fact",
    claim: "A reviewed <script>alert(1)</script> observation",
    date: "2026-10-10",
    url: "https://lumaro.example",
    approved: true,
    kind: "fact",
    source: "Synthetic",
  },
  {
    id: "unknown",
    claim: "Secret unreviewed claim",
    date: "2026-10-10",
    url: "https://lumaro.example",
    approved: false,
    kind: "fact",
    source: "Synthetic",
  },
  {
    id: "hypothesis",
    claim: "Secret hypothesis",
    date: "2026-10-10",
    url: "https://lumaro.example",
    approved: true,
    kind: "hypothesis",
    source: "Synthetic",
  },
];
describe("discovery guide", () => {
  it("uses reviewed context and role-specific questions without manufacturing answers", () => {
    const before = JSON.stringify(snapshot);
    const guide = discoveryGuide(
      snapshot,
      evidence,
      "Synthetic workspace",
      "en",
    );
    expect(guide.facts.map((f) => f.id)).toEqual(["fact"]);
    expect(guide.questions.find((q) => q.id === "role")?.question).toContain(
      "reconciliation",
    );
    expect(JSON.stringify(snapshot)).toBe(before);
    expect(guide.completion).toContain("does not create answers");
    const founder = discoveryGuide(
      { ...snapshot, title: "Co-founder" },
      evidence,
      "Synthetic workspace",
      "en",
    );
    expect(founder.questions.find((q) => q.id === "role")?.question).toContain(
      "your time personally",
    );
  });
  it("renders Arabic RTL, escapes customer content and handles missing evidence", () => {
    const html = discoveryGuideHtml(
      discoveryGuide(snapshot, evidence, "Synthetic workspace", "ar"),
    );
    expect(html).toContain('lang="ar" dir="rtl"');
    expect(html).toContain("دليل مقابلة الاستكشاف");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("Secret");
    expect(
      discoveryGuideHtml(discoveryGuide(snapshot, [], "Test", "en")),
    ).toContain("No reviewed facts yet");
  });
});
