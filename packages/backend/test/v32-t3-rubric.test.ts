import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import {
  db,
  json,
  score,
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

// Black-box tests for PRD v3.2 A1 (workspace scoring rubric: SCR-01/02, PB-01).

const base: ProspectSnapshot = {
  firstName: "Black",
  lastName: "Box",
  email: "bb@example.test",
  company: "Black Box Co",
  website: "https://example.com",
  title: "CEO",
  employees: 100,
};
const clone = (): Rubric => structuredClone(DEFAULT_RUBRIC);
/** Rubric with explicit role/size weights (their sum stays at 55, so the total stays at 100). */
const weighted = (
  role: number,
  size: number,
  band = { min: 1, max: 200 },
): Rubric => {
  const r = clone();
  r.role = { ...r.role, points: role };
  r.size = { ...r.size, points: size, ...band };
  return r;
};
const total = (p: ProspectSnapshot, r?: Rubric) => score(p, r).score;

describe("A1.1 the same prospect ranks differently under two rubrics", () => {
  const exec: ProspectSnapshot = {
    ...base,
    email: "exec@example.test",
    title: "CEO",
    employees: 800, // outside the 1-200 band
  };
  const small: ProspectSnapshot = {
    ...base,
    email: "small@example.test",
    title: "Intern",
    employees: 100, // inside the 1-200 band
  };
  const rank = (r: Rubric) =>
    [
      { name: "exec", s: score(exec, r).score },
      { name: "small", s: score(small, r).score },
    ]
      .sort((a, b) => b.s - a.s)
      .map((x) => x.name);

  it("swaps the order when role and size weights are exchanged", () => {
    const roleHeavy = weighted(40, 15);
    const sizeHeavy = weighted(15, 40);
    expect(total(exec, roleHeavy)).toBeGreaterThan(total(small, roleHeavy));
    expect(total(small, sizeHeavy)).toBeGreaterThan(total(exec, sizeHeavy));
    expect(rank(roleHeavy)).toEqual(["exec", "small"]);
    expect(rank(sizeHeavy)).toEqual(["small", "exec"]);
  });

  it("gives the same prospect different scores under different weights", () => {
    expect(total(exec, weighted(40, 15))).not.toBe(total(exec, weighted(15, 40)));
    expect(total(small, weighted(40, 15))).not.toBe(
      total(small, weighted(15, 40)),
    );
  });

  it("uses the pack default when no rubric is passed", () => {
    expect(score(exec).score).toBe(score(exec, DEFAULT_RUBRIC).score);
    expect(score(small).score).toBe(score(small, clone()).score);
  });

  it("changes the tier when the thresholds change", () => {
    const lenient = clone();
    lenient.tiers = { a: 20, b: 10 };
    lenient.minimum = 0;
    const strict = clone();
    strict.tiers = { a: 99, b: 98 };
    strict.minimum = 0;
    const s = score(exec, lenient);
    expect(s.score).toBe(score(exec, strict).score);
    expect(s.tier).toBe("A");
    expect(score(exec, strict).tier).toBe("C");
  });
});

describe("A1.2 Arabic and English titles earn equal role points", () => {
  const pairs: [string, string][] = [
    ["CEO", "الرئيس التنفيذي"],
    ["Managing Director", "المدير العام"],
    ["HR Manager", "مدير الموارد البشرية"],
  ];
  const role = (title: string, r?: Rubric) =>
    score({ ...base, title }, r).breakdown.find((x) => x.id === "role")!;

  it("CEO and الرئيس التنفيذي get equal role points and equal totals", () => {
    const en = role("CEO");
    const ar = role("الرئيس التنفيذي");
    expect(ar.points).toBeGreaterThan(0);
    expect(ar.points).toBe(en.points);
    expect(ar.state).toBe(en.state);
    expect(total({ ...base, title: "الرئيس التنفيذي" })).toBe(
      total({ ...base, title: "CEO" }),
    );
  });

  it.each(pairs)("%s and %s score the same", (en, ar) => {
    expect(role(ar).points).toBe(role(en).points);
  });

  it("stays equal when the workspace changes the role weight", () => {
    for (const pts of [10, 30, 45]) {
      const r = weighted(pts, 55 - pts);
      expect(role("الرئيس التنفيذي", r).points).toBe(pts);
      expect(role("CEO", r).points).toBe(pts);
    }
  });

  it("does not award Arabic non-executive titles", () => {
    expect(role("متدرب").points).toBe(0);
    expect(role("Intern").points).toBe(0);
  });

  it("is robust to surrounding whitespace and mixed text", () => {
    expect(role("  الرئيس التنفيذي  ").points).toBe(role("CEO").points);
    expect(role("Co-Founder & الرئيس التنفيذي").points).toBe(role("CEO").points);
  });
});

describe("A1.3 size is scored by the workspace band", () => {
  const big: ProspectSnapshot = { ...base, employees: 5000 };
  const size = (p: ProspectSnapshot, r?: Rubric) =>
    score(p, r).breakdown.find((x) => x.id === "size")!;

  it("scores 5,000 employees when the band includes it and 0 when it excludes it", () => {
    const includes = weighted(30, 25, { min: 1000, max: 10000 });
    const excludes = weighted(30, 25, { min: 1, max: 200 });
    expect(size(big, includes).points).toBe(25);
    expect(size(big, excludes).points).toBe(0);
    expect(total(big, includes) - total(big, excludes)).toBe(25);
  });

  it("does not use a fixed 1-200 band", () => {
    expect(size(big, weighted(30, 25, { min: 4000, max: 6000 })).points).toBe(25);
    expect(size({ ...base, employees: 150 }, weighted(30, 25, { min: 4000, max: 6000 })).points).toBe(0);
  });

  it("treats the band edges as inclusive and respects the size weight", () => {
    const r = weighted(30, 20, { min: 5000, max: 5000 });
    expect(size(big, r).points).toBe(20);
    expect(size({ ...big, employees: 4999 }, r).points).toBe(0);
    expect(size({ ...big, employees: 5001 }, r).points).toBe(0);
  });

  it("does not award points when employee count is unknown", () => {
    const r = weighted(30, 25, { min: 1, max: 100000 });
    const s = size({ ...base, employees: undefined }, r);
    expect(s.points).toBe(0);
  });
});

describe("A1.4 every rule carries its own explanation", () => {
  const cases: Record<string, ProspectSnapshot> = {
    "full match": base,
    "arabic title": { ...base, title: "الرئيس التنفيذي" },
    "no match": { ...base, title: "Intern", employees: 99999 },
    "missing data": { ...base, title: "", employees: undefined, website: "" },
    "5000 staff": { ...base, employees: 5000 },
  };

  it.each(Object.entries(cases))("%s: every rule has a non-empty reason", (_n, p) => {
    const rows = score(p).breakdown;
    expect(rows.length).toBeGreaterThanOrEqual(4);
    for (const row of rows) {
      expect(typeof row.rule).toBe("string");
      expect(row.rule.trim().length).toBeGreaterThan(0);
      expect(typeof row.points).toBe("number");
    }
    const ids = rows.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    // Explanations must be per rule, not one shared string.
    expect(new Set(rows.map((r) => r.rule)).size).toBe(rows.length);
  });

  it("explains each rule under a custom rubric, reflecting its band", () => {
    const rubric = weighted(30, 25, { min: 1234, max: 5678 });
    const rows = score({ ...base, employees: 5000 }, rubric).breakdown;
    for (const row of rows) expect(row.rule.trim().length).toBeGreaterThan(0);
    const size = rows.find((r) => r.id === "size")!;
    expect(size.rule).toContain("1234");
    expect(size.rule).toContain("5678");
  });

  it("points per rule add up to the score for a non-disqualified prospect", () => {
    const r = score(base);
    expect(r.breakdown.reduce((a, b) => a + b.points, 0)).toBe(r.score);
  });
});

describe("A1.5 disqualified prospects never reach enrichment", () => {
  const ids: { workspaceId: string; ownerId: string }[] = [];
  const service = new RubricService();
  const workflows = new WorkflowService();

  async function setup(snapshots: ProspectSnapshot[]) {
    const workspaceId = randomUUID();
    const ownerId = randomUUID();
    ids.push({ workspaceId, ownerId });
    await db.workspace.create({
      data: { id: workspaceId, name: "A1 bb", crmBinding: "A", assetBinding: "A" },
    });
    await db.user.create({
      data: {
        id: ownerId,
        name: "A1 owner",
        email: `${ownerId}@example.test`,
        emailVerified: true,
      },
    });
    await db.membership.create({
      data: { workspaceId, userId: ownerId, role: "owner" },
    });
    const prospectIds: string[] = [];
    for (const snapshot of snapshots) {
      const p = await db.prospect.create({
        data: {
          workspaceId,
          ownerId,
          sourceKey: snapshot.email as string,
          snapshot: json(snapshot),
        },
      });
      prospectIds.push(p.id);
    }
    const owner: Actor = { workspaceId, userId: ownerId, role: "owner" };
    return { owner, prospectIds };
  }
  async function runEnrich(owner: Actor, prospectIds: string[]) {
    const req = toolRequest.parse({
      tool: "enrich_contacts",
      requestKey: randomUUID(),
      prospectIds,
    });
    const quote = await workflows.quote(owner, req);
    await workflows.approveQuote(owner, quote.id);
    const run = await workflows.start(owner, { ...req, spendApprovalId: quote.id });
    await workflows.execute(run.id);
    return db.run.findUniqueOrThrow({ where: { id: run.id } });
  }

  afterAll(async () => {
    for (const { workspaceId, ownerId } of ids) {
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
    }
    await db.$disconnect();
  });

  it("scores an existing client as disqualified", () => {
    const r = score({ ...base, existingClient: true });
    expect(r.disqualified).toBe(true);
    expect(r.score).toBe(0);
  });

  it("does not call the enrichment provider for an existing client", async () => {
    const { owner, prospectIds } = await setup([
      { ...base, email: `client-${randomUUID()}@example.test`, existingClient: true },
    ]);
    const enrich = vi.spyOn(Providers.prototype, "enrich");
    try {
      await runEnrich(owner, prospectIds);
      expect(enrich).not.toHaveBeenCalled();
    } finally {
      enrich.mockRestore();
    }
  });

  it("does not call enrichment for a prospect below the workspace minimum", async () => {
    const { owner, prospectIds } = await setup([
      { ...base, email: `low-${randomUUID()}@example.test`, title: "Intern", employees: 9999 },
    ]);
    const r = clone();
    r.minimum = 60;
    r.tiers = { a: 90, b: 60 };
    expect(score(
      { ...base, title: "Intern", employees: 9999 }, r,
    ).disqualified).toBe(true);
    await service.update(owner, { rubric: r });
    const enrich = vi.spyOn(Providers.prototype, "enrich");
    try {
      await runEnrich(owner, prospectIds);
      expect(enrich).not.toHaveBeenCalled();
    } finally {
      enrich.mockRestore();
    }
  });

  it("enriches only the qualified prospect in a mixed batch", async () => {
    const good = { ...base, email: `good-${randomUUID()}@example.test` };
    const bad = { ...base, email: `bad-${randomUUID()}@example.test`, existingClient: true };
    const { owner, prospectIds } = await setup([bad, good]);
    const enrich = vi.spyOn(Providers.prototype, "enrich");
    try {
      await runEnrich(owner, prospectIds);
      expect(enrich).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(enrich.mock.calls)).not.toContain(bad.email);
    } finally {
      enrich.mockRestore();
    }
  });

  it("a stricter workspace rubric stops enrichment that the default allowed", async () => {
    const p = { ...base, email: `swap-${randomUUID()}@example.test` };
    const { owner, prospectIds } = await setup([p]);
    const enrich = vi.spyOn(Providers.prototype, "enrich");
    try {
      await runEnrich(owner, prospectIds);
      expect(enrich).toHaveBeenCalledTimes(1);
      enrich.mockClear();
      const strict = clone();
      strict.size = { ...strict.size, min: 5000, max: 6000 }; // 100 staff now out of band
      strict.minimum = 95;
      strict.tiers = { a: 99, b: 95 };
      await service.update(owner, { rubric: strict });
      await runEnrich(owner, prospectIds);
      expect(enrich).not.toHaveBeenCalled();
    } finally {
      enrich.mockRestore();
    }
  });
});

describe("A1.6 rubric API: PATCH validation and GET round trip", () => {
  const workspaceId = randomUUID();
  const ownerId = randomUUID();
  const owner: Actor = { workspaceId, userId: ownerId, role: "owner" };
  const service = new RubricService();

  beforeAll(async () => {
    await db.workspace.create({
      data: { id: workspaceId, name: "A1 api", crmBinding: "A", assetBinding: "A" },
    });
    await db.user.create({
      data: {
        id: ownerId,
        name: "A1 api owner",
        email: `${ownerId}@example.test`,
        emailVerified: true,
      },
    });
    await db.membership.create({
      data: { workspaceId, userId: ownerId, role: "owner" },
    });
  });
  afterAll(async () => {
    await db.audit.deleteMany({ where: { workspaceId } });
    await db.membership.deleteMany({ where: { workspaceId } });
    await db.workspace.deleteMany({ where: { id: workspaceId } });
    await db.user.deleteMany({ where: { id: ownerId } });
    await db.$disconnect();
  });

  it("GET returns the pack default when no rubric has been set", async () => {
    const got = await service.get(owner);
    expect(got.rubric).toEqual(DEFAULT_RUBRIC);
  });

  it("GET after a valid PATCH returns the patched rubric", async () => {
    const custom = clone();
    custom.minimum = 33;
    custom.tiers = { a: 80, b: 50 };
    custom.size = { ...custom.size, min: 1000, max: 9000 };
    await service.update(owner, { rubric: custom });
    const got = await service.get(owner);
    expect(got.rubric).toEqual(custom);
    expect(got.rubric).not.toEqual(DEFAULT_RUBRIC);
  });

  it("a stored rubric changes what scoring would produce for the workspace", async () => {
    const got = await service.get(owner);
    const p = { ...base, employees: 5000 };
    expect(score(p, got.rubric).breakdown.find((x) => x.id === "size")!.points)
      .toBeGreaterThan(0);
    expect(score(p).breakdown.find((x) => x.id === "size")!.points).toBe(0);
  });

  const stored = async () => (await service.get(owner)).rubric;

  const invalid: [string, (r: Rubric) => unknown][] = [
    ["size min greater than max", (r) => ({ ...r, size: { ...r.size, min: 300, max: 100 } })],
    ["tier A below tier B", (r) => ({ ...r, tiers: { a: 40, b: 60 } })],
    ["minimum above 100", (r) => ({ ...r, minimum: 101 })],
    ["negative minimum", (r) => ({ ...r, minimum: -1 })],
    ["weights summing above 100", (r) => ({ ...r, role: { ...r.role, points: 90 } })],
    ["weights summing below 100", (r) => ({ ...r, role: { ...r.role, points: 1 } })],
    ["negative weight", (r) => ({ ...r, role: { ...r.role, points: -30 } })],
    ["empty role keywords", (r) => ({ ...r, role: { ...r.role, keywords: [] } })],
    ["non-string role keyword", (r) => ({ ...r, role: { ...r.role, keywords: [1] } })],
    ["unknown top-level key", (r) => ({ ...r, extra: true })],
    ["string weight", (r) => ({ ...r, role: { ...r.role, points: "30" } })],
    ["NaN weight", (r) => ({ ...r, role: { ...r.role, points: Number.NaN } })],
    ["negative size min", (r) => ({ ...r, size: { ...r.size, min: -5 } })],
    ["empty object", () => ({})],
    ["array", () => []],
    ["string", () => "rubric"],
    ["number", () => 7],
  ];

  it.each(invalid)("rejects an invalid rubric: %s", async (_n, make) => {
    const before = await stored();
    await expect(
      service.update(owner, { rubric: make(structuredClone(before)) }),
    ).rejects.toThrow();
    expect(await stored()).toEqual(before); // nothing was persisted
  });

  it("rejects a PATCH without a rubric field", async () => {
    await expect(service.update(owner, {})).rejects.toThrow();
  });

  it("rejects a body that is not an object", async () => {
    await expect(service.update(owner, null)).rejects.toThrow();
    await expect(service.update(owner, "x")).rejects.toThrow();
  });

  it("only the workspace owner can PATCH", async () => {
    for (const role of ["operator", "reviewer", "viewer"] as const)
      await expect(
        service.update({ ...owner, role }, { rubric: clone() }),
      ).rejects.toThrow();
  });

  it("another workspace is unaffected by this workspace's rubric", async () => {
    const otherWs = randomUUID();
    await db.workspace.create({
      data: { id: otherWs, name: "A1 other", crmBinding: "A", assetBinding: "A" },
    });
    try {
      const got = await service.get({ ...owner, workspaceId: otherWs });
      expect(got.rubric).toEqual(DEFAULT_RUBRIC);
    } finally {
      await db.workspace.delete({ where: { id: otherWs } });
    }
  });

  it("PATCH null resets to the pack default", async () => {
    await service.update(owner, { rubric: null });
    expect(await stored()).toEqual(DEFAULT_RUBRIC);
  });
});
