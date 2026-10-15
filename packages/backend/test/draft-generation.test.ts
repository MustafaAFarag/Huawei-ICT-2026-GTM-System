import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  generateText: vi.fn(),
}));
import { generateText } from "ai";
import { config } from "../src/config.js";
import { Providers } from "../src/providers.js";
import type { Evidence, ProspectSnapshot } from "@revenue/contracts";

const snapshot: ProspectSnapshot = {
  firstName: "Huda",
  lastName: "Saeedi",
  email: "huda@lumaro.example",
  company: "Lumaro Pay",
  website: "https://lumaro.example",
  title: "Head of People",
};
const evidence: Evidence[] = [
  {
    id: "reviewed",
    claim: "The company lists an HR vacancy.",
    url: "https://lumaro.example",
    date: "2026-10-10",
    kind: "fact",
    approved: true,
    source: "Synthetic",
  },
];
const valid = () => [
  {
    channel: "email",
    day: 0,
    subject: "A payroll question",
    body: "A question about the listed role. Is outside support relevant? Reply stop to opt out.",
    evidenceIds: ["reviewed"],
  },
  {
    channel: "linkedin",
    day: 3,
    subject: null,
    body: "I saw the listed role. Is outside support relevant?",
    evidenceIds: ["reviewed"],
  },
  {
    channel: "call",
    day: 7,
    subject: null,
    body: "I saw the listed role. Is this relevant to discuss?",
    evidenceIds: ["reviewed"],
  },
];
const originalFixture = config.modelFixture;
beforeAll(() => {
  config.modelFixture = false;
});
afterAll(() => {
  config.modelFixture = originalFixture;
  vi.restoreAllMocks();
});
async function draft(touches: ReturnType<typeof valid>, language = "en") {
  vi.mocked(generateText).mockResolvedValue({ output: { touches } } as never);
  return new Providers().draft(
    snapshot,
    evidence,
    "An outsourced payroll desk.",
    language,
  );
}
describe("live draft publication contract", () => {
  it("adds the product-owned caller note outside the spoken script", async () => {
    const result = await draft(valid());
    expect(result[2]!.body).toMatch(
      /^Before calling: check the recorded communication basis/,
    );
    expect(result[2]!.body).toContain("\n\nI saw the listed role.");
    expect(result[1]!.subject).toBeUndefined();
  });
  it("rejects wrong days, missing citations, unsupported IDs and oversized channel copy", async () => {
    for (const mutate of [
      (t: ReturnType<typeof valid>) => {
        t[1]!.day = 30;
      },
      (t: ReturnType<typeof valid>) => {
        t[1]!.evidenceIds = [];
      },
      (t: ReturnType<typeof valid>) => {
        t[0]!.evidenceIds = ["unreviewed"];
      },
      (t: ReturnType<typeof valid>) => {
        t[0]!.subject = "x".repeat(61);
      },
      (t: ReturnType<typeof valid>) => {
        t[1]!.body = "x".repeat(301);
      },
    ]) {
      const touches = valid();
      mutate(touches);
      await expect(draft(touches)).rejects.toThrow("grounded sequence check");
    }
  });
  it("rejects an Arabic request with an English channel even if the other touches are Arabic", async () => {
    const touches = valid();
    touches[0]!.body = "مرحبًا هل الخدمة مناسبة؟ رد بكلمة توقف";
    await expect(draft(touches, "ar-EG")).rejects.toThrow(
      "grounded sequence check",
    );
  });
});
