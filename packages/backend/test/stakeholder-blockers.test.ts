import { describe, expect, it } from "vitest";
import { z } from "zod";
import { formatContext, safeError } from "@revenue/backend";

// Regressions from the 25 Oct stakeholder review: errors must read as sentences and
// demo-data labels like "(client)" must never reach a deliverable.
describe("stakeholder review blockers", () => {
  it("turns a validation failure into one plain sentence", () => {
    const result = z.object({ slides: z.number().min(3) }).safeParse({ slides: 1 });
    const message = safeError(result.error);
    expect(message).toMatch(/^The generated slides did not pass checks/);
    expect(message).not.toContain("{");
  });

  it("keeps ordinary error messages", () => {
    expect(safeError(new Error("Enter the assistant message."))).toBe("Enter the assistant message.");
  });

  const workspace = (name: string, nameAr?: string) => ({
    name: "Mirqab · Fintech client (KSA)",
    company: { description: "Payments API." },
    offers: [],
    brand: { name, nameAr, primary: "#0E2A47", accent: "#3CCFB0", website: "https://sarafa-pay.example" },
  });

  it("strips a trailing (client) label from the brand name", () => {
    const ctx = formatContext({ workspace: workspace("Sarafa Pay (client)"), evidence: [], language: "en" });
    expect(ctx.brand.name).toBe("Sarafa Pay");
  });

  it("uses the Arabic brand name in Arabic deliverables", () => {
    const ctx = formatContext({ workspace: workspace("Sarafa Pay", "صرافة باي"), evidence: [], language: "ar-Gulf" });
    expect(ctx.brand.name).toBe("صرافة باي");
  });
});
