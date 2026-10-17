import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import {
  db,
  json,
  score,
  resolveRubric,
  rubricSchema,
  matchRole,
  RubricService,
  WorkflowService,
  Providers,
} from "@revenue/backend";
import {
  DEFAULT_RUBRIC,
  toolRequest,
  type Actor,
  type ProspectSnapshot,
  type Rubric,
} from "@revenue/contracts";

const base: ProspectSnapshot = {
  firstName: "Test",
  lastName: "Person",
  email: "test@example.test",
  company: "Test Company",
  website: "https://example.com",
  title: "CEO",
  employees: 50,
  hiring: true,
};
const rubricOf = (patch: Partial<Rubric>): Rubric => ({
  ...structuredClone(DEFAULT_RUBRIC),
  ...patch,
});
const pointsFor = (snapshot: ProspectSnapshot, rubric?: Rubric) =>
  Object.fromEntries(
    score(snapshot, rubric).breakdown.map((r) => [r.id, r.points]),
  );

describe("workspace rubric scoring (PRD v3.2 A1)", () => {
  it("keeps today's weights under the default rubric", () => {
    const result = score(base);
    expect(result.score).toBe(100);
    expect(result.tier).toBe("A");
    expect(result.disqualified).toBe(false);
    expect(score({ ...base, existingClient: true })).toMatchObject({
      score: 0,
      disqualified: true,
    });
  });

  it("ranks the same prospect differently under two rubrics", () => {
    const prospect = { ...base, employees: 800, hiring: undefined };
    const small = score(prospect); // default band 1–200
    const midMarket = score(
      prospect,
      rubricOf({ size: { points: 25, min: 500, max: 5000 } }),
    );
    expect(small.score).toBe(50);
    expect(midMarket.score).toBe(75);
    expect(small.tier).toBe("B");
    expect(midMarket.tier).toBe("A");
    const strict = score(
      prospect,
      rubricOf({ tiers: { a: 95, b: 90 }, minimum: 90 }),
    );
    expect(strict.tier).toBe("C");
    expect(strict.disqualified).toBe(true);
    expect(small.disqualified).toBe(false);
  });

  it("gives an English and an Arabic title the same role points", () => {
    for (const title of [
      "CEO",
      "الرئيس التنفيذي",
      "الرئيس التنفيذى", // yeh spelling variant
      "الـرئـيـس التنفيذي", // tatweel
      "المدير العام",
      "مدير الموارد البشرية",
      "Founder & CEO",
    ])
      expect(pointsFor({ ...base, title }).role, title).toBe(30);
    expect(pointsFor({ ...base, title: "Intern" }).role).toBe(0);
    expect(pointsFor({ ...base, title: "متدرب" }).role).toBe(0);
    expect(pointsFor({ ...base, title: "" }).role).toBe(0);
    expect(
      score({ ...base, title: "" }).breakdown.find((r) => r.id === "role")
        ?.state,
    ).toBe("unknown");
  });

  it("folds Arabic spelling variants and honours workspace keywords", () => {
    expect(matchRole("مُدِيرُ المبيعات", ["مدير"])).toBe("مدير");
    expect(matchRole("إدارة التسويق", ["ادارة"])).toBe("ادارة");
    const rubric = rubricOf({
      role: { points: 30, keywords: ["procurement", "مشتريات"] },
    });
    expect(pointsFor({ ...base, title: "Procurement Lead" }, rubric).role).toBe(
      30,
    );
    expect(pointsFor({ ...base, title: "مدير المشتريات" }, rubric).role).toBe(
      30,
    );
    expect(pointsFor({ ...base, title: "CEO" }, rubric).role).toBe(0);
  });

  it("scores a 5,000-employee account by the workspace band", () => {
    const big = { ...base, employees: 5000 };
    expect(pointsFor(big).size).toBe(0);
    const wide = rubricOf({ size: { points: 25, min: 1000, max: 10000 } });
    expect(pointsFor(big, wide).size).toBe(25);
    expect(pointsFor({ ...big, employees: 10001 }, wide).size).toBe(0);
    expect(pointsFor({ ...big, employees: 1000 }, wide).size).toBe(25);
    expect(pointsFor({ ...big, employees: 999 }, wide).size).toBe(0);
  });

  it("explains every rule with a self-describing name built from the rubric", () => {
    const wide = rubricOf({ size: { points: 25, min: 1000, max: 10000 } });
    const rows = score({ ...base, employees: 5000 }, wide).breakdown;
    expect(rows.map((r) => r.id)).toEqual(["role", "size", "website", "signal"]);
    const size = rows.find((r) => r.id === "size")!;
    expect(size.rule).toBe("Company size in band (1000–10000 staff)");
    expect(size.params).toEqual({ min: 1000, max: 10000 });
    expect(size.detail).toBe("5000");
    expect(size.state).toBe("match");
    expect(rows.find((r) => r.id === "role")?.detail).toBe("ceo");
    for (const row of rows) {
      expect(row.rule.length).toBeGreaterThan(8);
      expect(row.weight).toBeGreaterThan(0);
      expect(["match", "no match", "unknown"]).toContain(row.state);
    }
    // Legacy readers only use rule, points and state.
    expect(rows.every((r) => "rule" in r && "points" in r && "state" in r)).toBe(
      true,
    );
    expect(
      score({ ...base, employees: undefined }).breakdown.find(
        (r) => r.id === "size",
      )?.state,
    ).toBe("unknown");
  });

  it("validates rubrics and resolves workspace over pack default", () => {
    expect(rubricSchema.safeParse(DEFAULT_RUBRIC).success).toBe(true);
    const bad = (patch: object) =>
      rubricSchema.safeParse({ ...DEFAULT_RUBRIC, ...patch }).success;
    expect(bad({ size: { points: 25, min: 300, max: 100 } })).toBe(false);
    expect(bad({ tiers: { a: 40, b: 60 } })).toBe(false);
    expect(bad({ minimum: 120 })).toBe(false);
    expect(bad({ role: { points: 50, keywords: ["ceo"] } })).toBe(false); // sums to 120
    expect(bad({ role: { points: 30, keywords: [] } })).toBe(false);
    expect(bad({ extra: true })).toBe(false);
    expect(resolveRubric({ pack: "hr-services", rubric: null })).toEqual(
      DEFAULT_RUBRIC,
    );
    expect(resolveRubric({ pack: "unknown-pack" })).toEqual(DEFAULT_RUBRIC);
    const own = rubricOf({ minimum: 80 });
    expect(resolveRubric({ pack: "generic", rubric: own }).minimum).toBe(80);
    // A corrupt stored rubric never blocks scoring.
    expect(resolveRubric({ pack: "generic", rubric: { nope: 1 } })).toEqual(
      DEFAULT_RUBRIC,
    );
  });
});

describe("rubric API service and enrichment gate", () => {
  const workspaceId = randomUUID(),
    ownerId = randomUUID();
  const owner: Actor = { workspaceId, userId: ownerId, role: "owner" };
  const service = new RubricService();
  const workflows = new WorkflowService();
  let prospectId: string;

  beforeAll(async () => {
    await db.workspace.create({
      data: {
        id: workspaceId,
        name: "Rubric test",
        crmBinding: "A",
        assetBinding: "A",
      },
    });
    await db.user.create({
      data: {
        id: ownerId,
        name: "Rubric owner",
        email: `${ownerId}@example.test`,
        emailVerified: true,
      },
    });
    await db.membership.create({
      data: { workspaceId, userId: ownerId, role: "owner" },
    });
    const prospect = await db.prospect.create({
      data: {
        workspaceId,
        ownerId,
        sourceKey: "rubric@example.test",
        // 800 staff: outside the default 1–200 band.
        snapshot: json({ ...base, employees: 800, hiring: undefined }),
      },
    });
    prospectId = prospect.id;
  });
  afterAll(async () => {
    const runIds = (
      await db.run.findMany({ where: { workspaceId }, select: { id: true } })
    ).map((r) => r.id);
    await db.outbox.deleteMany({ where: { runId: { in: runIds } } });
    for (const model of [
      db.quotaReservation,
      db.quota,
      db.spendApproval,
      db.usage,
      db.audit,
      db.run,
      db.prospect,
      db.budget,
      db.cacheEntry,
    ])
      await (model.deleteMany as (args: object) => Promise<unknown>)({
        where: { workspaceId },
      });
    await db.membership.deleteMany({ where: { workspaceId } });
    await db.workspace.delete({ where: { id: workspaceId } });
    await db.user.delete({ where: { id: ownerId } });
    await db.$disconnect();
  });

  it("returns the pack default until the owner sets a rubric, then resets on null", async () => {
    expect(await service.get({ ...owner, role: "viewer" })).toMatchObject({
      pack: "hr-services",
      rubric: DEFAULT_RUBRIC,
      isPackDefault: true,
    });
    const custom = rubricOf({ minimum: 75, tiers: { a: 90, b: 75 } });
    const saved = await service.update(owner, { rubric: custom });
    expect(saved.isPackDefault).toBe(false);
    expect(saved.rubric).toEqual(custom);
    expect((await service.get(owner)).rubric.minimum).toBe(75);
    const audit = await db.audit.findFirstOrThrow({
      where: { workspaceId, action: "rubric.updated" },
      orderBy: { id: "desc" },
    });
    expect(audit.userId).toBe(ownerId);
    const reset = await service.update(owner, { rubric: null });
    expect(reset).toMatchObject({ isPackDefault: true, rubric: DEFAULT_RUBRIC });
    expect(
      (await db.workspace.findUniqueOrThrow({ where: { id: workspaceId } }))
        .rubric,
    ).toBeNull();
    expect(
      await db.audit.count({ where: { workspaceId, action: "rubric.updated" } }),
    ).toBe(2);
  });

  it("allows only the owner to change the rubric and rejects invalid bodies", async () => {
    for (const role of ["operator", "reviewer", "viewer"] as const)
      await expect(
        service.update({ ...owner, role }, { rubric: DEFAULT_RUBRIC }),
      ).rejects.toThrow("cannot admin");
    await expect(service.update(owner, { rubric: { minimum: 5 } })).rejects.toThrow(
      /rubric/,
    );
    await expect(service.update(owner, {})).rejects.toThrow();
    await expect(
      service.update(owner, {
        rubric: { ...DEFAULT_RUBRIC, size: { points: 25, min: 9, max: 3 } },
      }),
    ).rejects.toThrow(/min must not exceed max/);
  });

  it("never reaches enrichment for a prospect the workspace rubric disqualifies", async () => {
    const request = async () => {
      const req = toolRequest.parse({
        tool: "enrich_contacts",
        requestKey: randomUUID(),
        prospectIds: [prospectId],
      });
      const quote = await workflows.quote(owner, req);
      await workflows.approveQuote(owner, quote.id);
      return { ...req, spendApprovalId: quote.id };
    };
    const enrich = vi.spyOn(Providers.prototype, "enrich");
    try {
      // Under the default rubric this account earns 50 (role + website; 800 staff is out of band).
      // Raise the minimum above that so the workspace rubric disqualifies it.
      await service.update(owner, {
        rubric: rubricOf({ minimum: 90, tiers: { a: 95, b: 90 } }),
      });
      const blocked = await workflows.start(owner, await request());
      await workflows.execute(blocked.id);
      const heldRun = await db.run.findUniqueOrThrow({
        where: { id: blocked.id },
      });
      expect(enrich).not.toHaveBeenCalled();
      expect(JSON.stringify(heldRun.output)).toContain("below the deterministic");

      // The same prospect under a rubric whose band fits it is enriched.
      await service.update(owner, {
        rubric: rubricOf({ size: { points: 25, min: 500, max: 5000 } }),
      });
      const allowed = await workflows.start(owner, await request());
      await workflows.execute(allowed.id);
      expect(enrich).toHaveBeenCalledTimes(1);
      expect(enrich.mock.calls[0]![2]).toBe("A"); // 75 points under the 500–5000 band
    } finally {
      enrich.mockRestore();
    }
  });
});
