import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
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
import {
  db,
  json,
  GtmService,
  WorkspaceService,
  channelHolds,
  digest,
  Crm,
} from "@revenue/backend";

const touches = (email: string): Touch[] => [
  {
    channel: "email",
    day: 0,
    subject: "An idea",
    body: email,
    evidenceIds: ["f1"],
  },
  {
    channel: "linkedin",
    day: 3,
    body: "Hi, an idea for your team.",
    evidenceIds: [],
  },
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
      {
        firstName: "A",
        lastName: "B",
        email: "",
        company: "C",
        website: "",
        title: "CFO",
        employees: 60,
      },
      { "finance:P1b": "Payroll accuracy" },
      "Offer",
    );
    expect(plan).toMatchObject({
      persona: "finance",
      maturity: "P1b",
      register: "leader",
      angle: "Payroll accuracy",
    });
  });
  it("blocks personal event claims, missing opt-out and placeholders", () => {
    const codes = (body: string) =>
      draftChecks(touches(body)).map((c) => c.code);
    expect(
      codes("Great meeting you at the expo! Reply stop to opt out."),
    ).toContain("event-claim");
    expect(
      codes("Your company was at the expo this year. Reply stop to opt out."),
    ).not.toContain("event-claim");
    expect(codes("Hello there")).toContain("opt-out");
    expect(codes("Hi [name], reply stop")).toContain("placeholder");
    expect(
      draftChecks(touches("مرحبا، رد بكلمة توقف"), "ar-EG").filter(
        (c) => c.level === "error",
      ),
    ).toEqual([]);
  });
  it("scores confidence from cited, fresh evidence", () => {
    const fresh = new Date().toISOString();
    const high = draftConfidence(
      touches("Hi. Reply stop."),
      [
        {
          id: "f1",
          claim: "x",
          url: "https://a.example",
          date: fresh,
          kind: "fact",
          approved: true,
          source: "s",
        },
      ],
      {
        firstName: "A",
        lastName: "B",
        email: "a@b.example",
        company: "C",
        website: "",
        title: "CEO",
        persona: "founder",
      },
    );
    expect(high.level).toBe("high");
    const low = draftConfidence(touches("Hi"), [], {
      firstName: "A",
      lastName: "B",
      email: "",
      company: "C",
      website: "",
      title: "",
    });
    expect(low.level).toBe("low");
    expect(low.reasons.length).toBeGreaterThan(2);
  });
  it("groups near-duplicates by person and mailbox root", () => {
    const s = (email: string, first = "Huda") => ({
      firstName: first,
      lastName: "Saeedi",
      email,
      company: "Lumaro Pay",
      website: "",
      title: "",
    });
    const groups = duplicateGroups([
      { id: "1", snapshot: s("huda.saeedi@lumaro.example") },
      { id: "2", snapshot: s("huda@lumaro.example") },
      { id: "3", snapshot: s("reem@lumaro.example", "Reem") },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.map((r) => r.id).sort()).toEqual(["1", "2"]);
  });
  describe("country and basis evidence (A3)", () => {
    const evidence = (type: "consent" | "relationship") => [
      {
        type,
        source: "Signed engagement letter",
        date: "2026-09-01",
        recordedBy: "user-1",
        recordedAt: "2026-09-02T10:00:00.000Z",
      },
    ];
    const base = {
      country: "SA" as string | null,
      lawfulBasis: "relationship" as string | null,
      consentAt: null,
      basisEvidence: evidence("relationship") as unknown,
      excluded: false,
      snapshot: { email: "a@b.example" },
    };
    const holds = (extra: object = {}) =>
      channelHolds({ ...base, ...extra }, false);
    it("holds dropped, existing and HOLD-segment accounts", () => {
      const withSnapshot = (extra: object) =>
        holds({ snapshot: { email: "a@b.example", ...extra } });
      expect(withSnapshot({ bucket: "drop" }).join()).toMatch(/Drop/);
      expect(withSnapshot({ bucket: "existing" }).join()).toMatch(
        /Existing clients/,
      );
      expect(withSnapshot({ segment: "HOLD" }).join()).toMatch(/on hold/);
      expect(withSnapshot({})).toEqual([]);
    });
    it("holds a relationship basis that has no evidence", () => {
      expect(holds({ basisEvidence: [] })).toEqual([
        "Record evidence for the relationship basis",
      ]);
      expect(holds({ basisEvidence: evidence("consent") })).toEqual([
        "Record evidence for the relationship basis",
      ]);
    });
    it("holds a consent basis without matching evidence, and keeps the timestamp check", () => {
      const consent = {
        country: "AE",
        lawfulBasis: "consent",
        consentAt: new Date(Date.now() - 3600000),
      };
      expect(holds({ ...consent, basisEvidence: [] })).toEqual([
        "Record evidence for the consent basis",
      ]);
      expect(holds({ ...consent, basisEvidence: evidence("consent") })).toEqual(
        [],
      );
      expect(
        holds({ ...consent, consentAt: null, basisEvidence: evidence("consent") }),
      ).toEqual(["Record the consent timestamp"]);
    });
    it("holds Kuwait, Qatar, Bahrain and Oman as country blocked", () => {
      for (const country of ["KW", "QA", "BH", "OM"])
        expect(holds({ country })).toEqual([
          "This country is blocked until a reviewed channel policy is configured",
        ]);
    });
    it("holds a prospect with no country", () => {
      expect(holds({ country: null })).toEqual([
        "Set the country before contact",
      ]);
    });
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
      company: json({
        description: "Test",
        segments: { A: "Hot" },
        references: [{ name: "Ref Co", consent: true }],
      }),
    },
  });
  await db.user.create({
    data: {
      id: userId,
      name: "GTM tester",
      email: `${userId}@example.test`,
      emailVerified: true,
    },
  });
  await db.membership.create({ data: { workspaceId, userId, role: "owner" } });
  for (const [first, email] of [
    ["Huda", "huda.saeedi@lumaro.example"],
    ["Huda", "huda@lumaro.example"],
  ]) {
    const p = await db.prospect.create({
      data: {
        workspaceId,
        ownerId: userId,
        sourceKey: email!,
        country: "SA",
        lawfulBasis: "relationship",
        snapshot: json({
          firstName: first,
          lastName: "Saeedi",
          email,
          company: "Lumaro Pay",
          website: "https://lumaro.example",
          title: "Head of People",
          employees: 60,
          hiring: true,
        }),
      },
    });
    ids.push(p.id);
  }
});
afterAll(async () => {
  for (const model of [db.audit, db.sequence, db.draft, db.prospect])
    await (model.deleteMany as (args: object) => Promise<unknown>)({
      where: { workspaceId },
    });
  await db.workspace.delete({ where: { id: workspaceId } });
  await db.user.delete({ where: { id: userId } });
});

describe("GTM service", () => {
  it("exports saved research to readers and rejects a prospect in another workspace", async () => {
    const before = await db.prospect.findUniqueOrThrow({
      where: { id: ids[0] },
    });
    const result = await gtm.researchBrief(
      { ...actor, role: "viewer" },
      ids[0]!,
      "ar",
    );
    expect(result).toMatchObject({
      language: "ar",
      company: "Lumaro Pay",
      recordUpdatedAt: before.updatedAt.toISOString(),
    });
    expect(
      (await db.prospect.findUniqueOrThrow({ where: { id: ids[0] } }))
        .updatedAt,
    ).toEqual(before.updatedAt);
    await expect(
      gtm.researchBrief({ ...actor, workspaceId: randomUUID() }, ids[0]!, "en"),
    ).rejects.toThrow("Prospect not found");
  });

  it("prepares interview guides without changing answers and hides other workspaces", async () => {
    const before = await db.prospect.findUniqueOrThrow({ where: { id: ids[0] } });
    const guide = await gtm.interviewGuide(actor, ids[0]!, "ar");
    expect(guide).toMatchObject({ language: "ar", company: "Lumaro Pay", method: "reviewed-context-template" });
    const after = await db.prospect.findUniqueOrThrow({ where: { id: ids[0] } });
    expect(after.snapshot).toEqual(before.snapshot);
    expect(after.updatedAt).toEqual(before.updatedAt);
    await expect(gtm.interviewGuide({ ...actor, workspaceId: randomUUID() }, ids[0]!, "en")).rejects.toThrow("Prospect not found");
  });
  it("finds and resolves duplicates", async () => {
    const groups = await gtm.duplicates(actor);
    expect(groups).toHaveLength(1);
    await gtm.resolveDuplicate(actor, { keepId: ids[0], dropIds: [ids[1]] });
    expect(await gtm.duplicates(actor)).toHaveLength(0);
    const dropped = await db.prospect.findUniqueOrThrow({
      where: { id: ids[1] },
    });
    expect(dropped.excluded).toBe(true);
  });
  it("rejects blocking copy at the approval boundary", async () => {
    const draft = await db.draft.create({
      data: {
        workspaceId,
        prospectId: ids[0]!,
        playVersionId: randomUUID(),
        runId: randomUUID(),
        content: json(touches("Great meeting you at the expo. Reply stop.")),
        evidenceDigest: digest([]),
      },
    });
    const service = new WorkspaceService();
    await expect(
      service.draft(actor, draft.id, { version: draft.version }, true),
    ).rejects.toThrow(/event|personal|meeting/i);
    expect(
      (await db.draft.findUniqueOrThrow({ where: { id: draft.id } }))
        .approvedVersion,
    ).toBeNull();
  });
  it("resolves duplicates atomically and cancels their active sequences", async () => {
    await db.prospect.update({
      where: { id: ids[1] },
      data: { excluded: false },
    });
    await expect(
      gtm.resolveDuplicate(actor, {
        keepId: ids[0],
        dropIds: [ids[1], randomUUID()],
      }),
    ).rejects.toThrow("Prospect not found");
    expect(
      (await db.prospect.findUniqueOrThrow({ where: { id: ids[1] } })).excluded,
    ).toBe(false);
    const draft = await db.draft.findFirstOrThrow({ where: { workspaceId } });
    const sequence = await db.sequence.create({
      data: {
        workspaceId,
        prospectId: ids[1]!,
        draftId: draft.id,
        draftVersion: 1,
        sender: "fixture",
        state: "prepared",
        steps: json([]),
        holdout: false,
        approvalDigest: "test",
      },
    });
    await gtm.resolveDuplicate(actor, { keepId: ids[0], dropIds: [ids[1]] });
    expect(
      (await db.sequence.findUniqueOrThrow({ where: { id: sequence.id } }))
        .state,
    ).toBe("cancelled");
  });
  it("triages, assigns an owner and rejects non-member owners", async () => {
    const updated = await gtm.triage(actor, ids[0]!, {
      bucket: "partner",
      rationale: "Channel fit",
      segment: "E",
      ownerId: userId,
    });
    expect((updated.snapshot as { bucket: string }).bucket).toBe("partner");
    await expect(
      gtm.triage(actor, ids[0]!, { ownerId: randomUUID() }),
    ).rejects.toThrow(/member/);
    await expect(
      gtm.triage({ ...actor, role: "viewer" }, ids[0]!, { bucket: "drop" }),
    ).rejects.toThrow();
  });
  it("distributes imports only to eligible owners below their contact caps", async () => {
    const teammate = randomUUID();
    await db.user.create({
      data: { id: teammate, name: "SDR", email: `${teammate}@example.test` },
    });
    await db.membership.create({
      data: { workspaceId, userId: teammate, role: "operator" },
    });
    const crm = vi
      .spyOn(Crm.prototype, "upsertPerson")
      .mockResolvedValue({
        crmPersonId: randomUUID(),
        crmCompanyId: randomUUID(),
      });
    try {
      const service = new WorkspaceService();
      await service.configure(actor, {
        company: {
          roundRobin: true,
          ownerCaps: { [userId]: 1, [teammate]: 1 },
        },
      });
      const csv = Buffer.from(
        "firstName,lastName,email,company,website,title\nNew,Person,new@assignment.example,Assignment Lab,https://assignment.example,Founder\nNext,Person,next@assignment.example,Assignment Two,https://assignment.example,Founder\n",
      );
      const result = await service.import(
        actor,
        csv,
        "owners.csv",
        randomUUID(),
      );
      expect(result.outcomes[0]!.state).toBe("imported");
      expect(result.outcomes[1]!.message).toMatch(/caps are reached/);
      const created = await db.prospect.findFirstOrThrow({
        where: { workspaceId, sourceKey: "new@assignment.example" },
      });
      expect(created.ownerId).toBe(teammate);
      expect(crm).toHaveBeenCalledTimes(1);
    } finally {
      crm.mockRestore();
      await db.prospect.deleteMany({
        where: { workspaceId, ownerId: teammate },
      });
      await db.importBatch.deleteMany({ where: { workspaceId } });
      await db.membership.deleteMany({
        where: { workspaceId, userId: teammate },
      });
      await db.user.delete({ where: { id: teammate } });
    }
  });
  it("reports launch-gate holds before a sequence is quoted", async () => {
    const gate = await gtm.launchGate(actor, []);
    expect(gate.ready).toBe(false);
    expect(gate.items.find((i) => i.id === "offer")!.ok).toBe(true);
    expect(gate.items.find((i) => i.id === "sender")!.ok).toBe(false);
  });
  it("builds a scorecard, captures discovery and renders the SDR kit", async () => {
    const card = await gtm.scorecard(actor);
    expect(card.stages.map((s) => s.stage)).toEqual([
      "prepared",
      "delivered",
      "replied",
      "meeting",
      "agreed",
    ]);
    await gtm.discovery(actor, ids[0]!, {
      headcountBand: "51-200",
      hrSetup: "1-3",
      pains: { payroll: 4, hiring: 5 },
      maturity: 2,
      notes: "",
    });
    const summary = await gtm.discoverySummary(actor);
    expect(summary[0]).toMatchObject({ interviews: 1, averageMaturity: 2 });
    const pdf = await gtm.sdrKit(actor);
    expect(Buffer.from(pdf).subarray(0, 4).toString()).toBe("%PDF");
  }, 60000);
});
