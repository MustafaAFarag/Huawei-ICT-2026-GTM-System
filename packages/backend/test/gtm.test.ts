import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  angleFor,
  draftChecks,
  draftConfidence,
  duplicateGroups,
  inferMaturity,
  inferPersona,
  type Actor,
  type Touch,
} from "@revenue/contracts";
import { db, json, GtmService, channelHolds } from "@revenue/backend";

const touches = (email: string): Touch[] => [
  { channel: "email", day: 0, subject: "An idea", body: email, evidenceIds: ["f1"] },
  { channel: "linkedin", day: 3, body: "Hi, an idea for your team.", evidenceIds: [] },
  { channel: "call", day: 7, body: "Ask for a time.", evidenceIds: [] },
];

describe("GTM rules (pure)", () => {
  it("infers persona, maturity, register and angle", () => {
    expect(inferPersona("Co-founder & CEO")).toBe("founder");
    expect(inferPersona("Head of People")).toBe("people-leader");
    expect(inferPersona("مدير الموارد البشرية")).toBe("people-leader");
    expect(inferMaturity(12)).toBe("P1a");
    expect(inferMaturity(80)).toBe("P1b");
    expect(inferMaturity(900)).toBe("P2");
    const plan = angleFor(
      { firstName: "A", lastName: "B", email: "", company: "C", website: "", title: "CFO", employees: 60 },
      { "finance:P1b": "Payroll accuracy" },
      "Offer",
    );
    expect(plan).toMatchObject({ persona: "finance", maturity: "P1b", register: "leader", angle: "Payroll accuracy" });
  });
  it("blocks personal event claims, missing opt-out and placeholders", () => {
    const codes = (body: string) => draftChecks(touches(body)).map((c) => c.code);
    expect(codes("Great meeting you at the expo! Reply stop to opt out.")).toContain("event-claim");
    expect(codes("Your company was at the expo this year. Reply stop to opt out.")).not.toContain("event-claim");
    expect(codes("Hello there")).toContain("opt-out");
    expect(codes("Hi [name], reply stop")).toContain("placeholder");
    expect(draftChecks(touches("مرحبا، رد بكلمة توقف"), "ar-EG").filter((c) => c.level === "error")).toEqual([]);
  });
  it("scores confidence from cited, fresh evidence", () => {
    const fresh = new Date().toISOString();
    const high = draftConfidence(
      touches("Hi. Reply stop."),
      [{ id: "f1", claim: "x", url: "https://a.example", date: fresh, kind: "fact", approved: true, source: "s" }],
      { firstName: "A", lastName: "B", email: "a@b.example", company: "C", website: "", title: "CEO", persona: "founder" },
    );
    expect(high.level).toBe("high");
    const low = draftConfidence(touches("Hi"), [], { firstName: "A", lastName: "B", email: "", company: "C", website: "", title: "" });
    expect(low.level).toBe("low");
    expect(low.reasons.length).toBeGreaterThan(2);
  });
  it("groups near-duplicates by person and mailbox root", () => {
    const s = (email: string, first = "Huda") => ({ firstName: first, lastName: "Saeedi", email, company: "Lumaro Pay", website: "", title: "" });
    const groups = duplicateGroups([
      { id: "1", snapshot: s("huda.saeedi@lumaro.example") },
      { id: "2", snapshot: s("huda@lumaro.example") },
      { id: "3", snapshot: s("reem@lumaro.example", "Reem") },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.map((r) => r.id).sort()).toEqual(["1", "2"]);
  });
  it("holds dropped, existing and HOLD-segment accounts", () => {
    const base = { country: "SA", lawfulBasis: "relationship", consentAt: null, excluded: false };
    const holds = (extra: object) =>
      channelHolds({ ...base, snapshot: { email: "a@b.example", ...extra } }, false);
    expect(holds({ bucket: "drop" }).join()).toMatch(/Drop/);
    expect(holds({ bucket: "existing" }).join()).toMatch(/Existing clients/);
    expect(holds({ segment: "HOLD" }).join()).toMatch(/on hold/);
    expect(holds({})).toEqual([]);
  });
});

const workspaceId = randomUUID(),
  userId = randomUUID();
const actor: Actor = { workspaceId, userId, role: "owner" };
const gtm = new GtmService();
const ids: string[] = [];
beforeAll(async () => {
  await db.workspace.create({
    data: {
      id: workspaceId,
      name: "GTM service test",
      crmBinding: "A",
      assetBinding: "A",
      offers: json([{ id: "growth", text: "Offer", approved: true }]),
      company: json({ description: "Test", segments: { A: "Hot" }, references: [{ name: "Ref Co", consent: true }] }),
    },
  });
  await db.user.create({ data: { id: userId, name: "GTM tester", email: `${userId}@example.test`, emailVerified: true } });
  await db.membership.create({ data: { workspaceId, userId, role: "owner" } });
  for (const [first, email] of [["Huda", "huda.saeedi@lumaro.example"], ["Huda", "huda@lumaro.example"]]) {
    const p = await db.prospect.create({
      data: {
        workspaceId,
        ownerId: userId,
        sourceKey: email!,
        country: "SA",
        lawfulBasis: "relationship",
        snapshot: json({ firstName: first, lastName: "Saeedi", email, company: "Lumaro Pay", website: "https://lumaro.example", title: "Head of People", employees: 60, hiring: true }),
      },
    });
    ids.push(p.id);
  }
});
afterAll(async () => {
  for (const model of [db.audit, db.sequence, db.draft, db.prospect])
    await (model.deleteMany as (args: object) => Promise<unknown>)({ where: { workspaceId } });
  await db.workspace.delete({ where: { id: workspaceId } });
  await db.user.delete({ where: { id: userId } });
});

describe("GTM service", () => {
  it("finds and resolves duplicates", async () => {
    const groups = await gtm.duplicates(actor);
    expect(groups).toHaveLength(1);
    await gtm.resolveDuplicate(actor, { keepId: ids[0], dropIds: [ids[1]] });
    expect(await gtm.duplicates(actor)).toHaveLength(0);
    const dropped = await db.prospect.findUniqueOrThrow({ where: { id: ids[1] } });
    expect(dropped.excluded).toBe(true);
  });
  it("triages, assigns an owner and rejects non-member owners", async () => {
    const updated = await gtm.triage(actor, ids[0]!, { bucket: "partner", rationale: "Channel fit", segment: "E", ownerId: userId });
    expect((updated.snapshot as { bucket: string }).bucket).toBe("partner");
    await expect(gtm.triage(actor, ids[0]!, { ownerId: randomUUID() })).rejects.toThrow(/member/);
    await expect(gtm.triage({ ...actor, role: "viewer" }, ids[0]!, { bucket: "drop" })).rejects.toThrow();
  });
  it("reports launch-gate holds before a sequence is quoted", async () => {
    const gate = await gtm.launchGate(actor, []);
    expect(gate.ready).toBe(false);
    expect(gate.items.find((i) => i.id === "offer")!.ok).toBe(true);
    expect(gate.items.find((i) => i.id === "sender")!.ok).toBe(false);
  });
  it("builds a scorecard, captures discovery and renders the SDR kit", async () => {
    const card = await gtm.scorecard(actor);
    expect(card.stages.map((s) => s.stage)).toEqual(["prepared", "delivered", "replied", "meeting", "agreed"]);
    await gtm.discovery(actor, ids[0]!, { headcountBand: "51-200", hrSetup: "1-3", pains: { payroll: 4, hiring: 5 }, maturity: 2, notes: "" });
    const summary = await gtm.discoverySummary(actor);
    expect(summary[0]).toMatchObject({ interviews: 1, averageMaturity: 2 });
    const pdf = await gtm.sdrKit(actor);
    expect(Buffer.from(pdf).subarray(0, 4).toString()).toBe("%PDF");
  }, 60000);
});
