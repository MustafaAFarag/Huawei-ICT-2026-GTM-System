import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { COUNTRIES, type Actor } from "@revenue/contracts";
import { db, json, WorkspaceService, channelHolds } from "@revenue/backend";

// PRD v3.2 A3: explicit country and basis evidence.
const workspaceId = randomUUID(),
  userId = randomUUID();
const owner: Actor = { workspaceId, userId, role: "owner" };
const workspaces = new WorkspaceService();

const BLOCKED = "This country is blocked until a reviewed channel policy is configured";
const NEEDS_EVIDENCE = "Record evidence for the relationship basis";

let seq = 0;
async function makeProspect(data: {
  country: string | null;
  lawfulBasis?: string;
}) {
  const n = seq++;
  return db.prospect.create({
    data: {
      workspaceId,
      ownerId: userId,
      sourceKey: `p${n}@country.example`,
      country: data.country,
      lawfulBasis: data.lawfulBasis ?? "",
      snapshot: json({
        firstName: `P${n}`,
        lastName: "Test",
        email: `p${n}@country.example`,
        company: "Country Co",
        website: "https://country.example",
        title: "Head of People",
      }),
    },
  });
}
const load = (id: string) => db.prospect.findUniqueOrThrow({ where: { id } });
const holds = async (id: string, licence = true) =>
  channelHolds(await load(id), licence);

beforeAll(async () => {
  await db.workspace.create({
    data: { id: workspaceId, name: "Country test", crmBinding: "A", assetBinding: "A" },
  });
  await db.user.create({
    data: {
      id: userId,
      name: "Country tester",
      email: `${userId}@example.test`,
      emailVerified: true,
    },
  });
  await db.membership.create({ data: { workspaceId, userId, role: "owner" } });
});
afterAll(async () => {
  for (const model of [db.audit, db.sequence, db.prospect])
    await (model.deleteMany as (args: object) => Promise<unknown>)({
      where: { workspaceId },
    });
  await db.membership.deleteMany({ where: { workspaceId } });
  await db.workspace.delete({ where: { id: workspaceId } });
  await db.user.delete({ where: { id: userId } });
});

describe("A3 contract", () => {
  it("lists the seven supported countries", () => {
    expect([...COUNTRIES]).toEqual(["EG", "SA", "AE", "KW", "QA", "BH", "OM"]);
  });
});

describe("A3 country is never defaulted to EG", () => {
  it("re-reviewing an SA prospect without a country keeps SA", async () => {
    const p = await makeProspect({ country: "SA", lawfulBasis: "relationship" });
    await workspaces.reviewProspect(owner, p.id, { evidence: [] });
    expect((await load(p.id)).country).toBe("SA");
    await workspaces.reviewProspect(owner, p.id, { evidence: [] });
    expect((await load(p.id)).country).toBe("SA");
  });

  it("re-reviewing an SA prospect with other fields changed keeps SA", async () => {
    const p = await makeProspect({ country: "SA" });
    await workspaces.reviewProspect(owner, p.id, {
      evidence: [],
      lawfulBasis: "consent",
      consentAt: new Date().toISOString(),
    });
    expect((await load(p.id)).country).toBe("SA");
    await workspaces.reviewProspect(owner, p.id, { evidence: [], excluded: true });
    expect((await load(p.id)).country).toBe("SA");
  });

  it("omitted country on a prospect with no country stays null", async () => {
    const p = await makeProspect({ country: null });
    await workspaces.reviewProspect(owner, p.id, { evidence: [] });
    expect((await load(p.id)).country).toBeNull();
    await workspaces.reviewProspect(owner, p.id, { evidence: [] });
    expect((await load(p.id)).country).toBeNull();
  });

  it("an explicit country is stored, and null clears it", async () => {
    const p = await makeProspect({ country: null });
    await workspaces.reviewProspect(owner, p.id, { evidence: [], country: "AE" });
    expect((await load(p.id)).country).toBe("AE");
    await workspaces.reviewProspect(owner, p.id, { evidence: [] });
    expect((await load(p.id)).country).toBe("AE");
    await workspaces.reviewProspect(owner, p.id, { evidence: [], country: null });
    expect((await load(p.id)).country).toBeNull();
  });

  it("every supported country can be set explicitly", async () => {
    for (const country of COUNTRIES) {
      const p = await makeProspect({ country: null });
      await workspaces.reviewProspect(owner, p.id, { evidence: [], country });
      expect((await load(p.id)).country).toBe(country);
    }
  });
});

describe("A3 blocked countries are held", () => {
  it.each(["KW", "QA", "BH", "OM"])("%s prospect is held as country-blocked", async (country) => {
    const p = await makeProspect({ country, lawfulBasis: "relationship" });
    const h = await holds(p.id);
    expect(h).toContain(BLOCKED);
  });

  it("KW stays held after a review that does not change the country", async () => {
    const p = await makeProspect({ country: "KW" });
    await workspaces.reviewProspect(owner, p.id, { evidence: [] });
    expect((await load(p.id)).country).toBe("KW");
    expect(await holds(p.id)).toContain(BLOCKED);
  });

  it("setting a blocked country by review holds the prospect", async () => {
    const p = await makeProspect({ country: "EG" });
    await workspaces.reviewProspect(owner, p.id, { evidence: [], country: "KW" });
    expect(await holds(p.id)).toContain(BLOCKED);
  });

  it("an EG or SA prospect is not held as country-blocked", async () => {
    for (const country of ["EG", "SA"]) {
      const p = await makeProspect({ country, lawfulBasis: "relationship" });
      expect(await holds(p.id)).not.toContain(BLOCKED);
    }
  });
});

describe("A3 relationship basis needs evidence", () => {
  it("a relationship basis without evidence is held", async () => {
    const p = await makeProspect({ country: "SA", lawfulBasis: "relationship" });
    expect((await load(p.id)).basisEvidence).toEqual([]);
    expect(await holds(p.id)).toContain(NEEDS_EVIDENCE);
  });

  it("recording relationship evidence in a review clears the hold and stamps who and when", async () => {
    const p = await makeProspect({ country: "SA", lawfulBasis: "relationship" });
    const before = Date.now();
    await workspaces.reviewProspect(owner, p.id, {
      evidence: [],
      lawfulBasis: "relationship",
      basisEvidence: {
        type: "relationship",
        source: "Met at GITEX 2026, signed attendee list",
        date: "2026-09-01",
      },
    });
    const row = await load(p.id);
    expect(row.country).toBe("SA");
    const entries = row.basisEvidence as Array<Record<string, unknown>>;
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      type: "relationship",
      source: "Met at GITEX 2026, signed attendee list",
      date: "2026-09-01",
      recordedBy: userId,
    });
    expect(typeof entries[0]!.recordedAt).toBe("string");
    const at = Date.parse(entries[0]!.recordedAt as string);
    expect(Number.isNaN(at)).toBe(false);
    expect(at).toBeGreaterThanOrEqual(before - 5000);
    expect(at).toBeLessThanOrEqual(Date.now() + 5000);
    expect(await holds(p.id)).not.toContain(NEEDS_EVIDENCE);
  });

  it("evidence survives a later review that supplies none", async () => {
    const p = await makeProspect({ country: "EG", lawfulBasis: "relationship" });
    await workspaces.reviewProspect(owner, p.id, {
      evidence: [],
      lawfulBasis: "relationship",
      basisEvidence: { type: "relationship", source: "Intro call", date: "2026-08-15" },
    });
    await workspaces.reviewProspect(owner, p.id, { evidence: [] });
    expect(((await load(p.id)).basisEvidence as unknown[]).length).toBe(1);
    expect(await holds(p.id)).not.toContain(NEEDS_EVIDENCE);
  });

  it("a malformed evidence date or empty source is rejected", async () => {
    const p = await makeProspect({ country: "EG", lawfulBasis: "relationship" });
    await expect(
      workspaces.reviewProspect(owner, p.id, {
        evidence: [],
        basisEvidence: { type: "relationship", source: "x", date: "01/09/2026" },
      }),
    ).rejects.toThrow();
    await expect(
      workspaces.reviewProspect(owner, p.id, {
        evidence: [],
        basisEvidence: { type: "friendship" as never, source: "x", date: "2026-09-01" },
      }),
    ).rejects.toThrow();
    expect((await load(p.id)).basisEvidence).toEqual([]);
    expect(await holds(p.id)).toContain(NEEDS_EVIDENCE);
  });
});

describe("A3 unsupported countries are rejected", () => {
  it.each(["XX", "US", "eg", "", "Egypt", "EGY"])("rejects %j", async (country) => {
    const p = await makeProspect({ country: "SA" });
    await expect(
      workspaces.reviewProspect(owner, p.id, { evidence: [], country: country as never }),
    ).rejects.toThrow();
    // A rejected review must not change the stored country.
    expect((await load(p.id)).country).toBe("SA");
  });

  it("rejects a non-string country", async () => {
    const p = await makeProspect({ country: "SA" });
    await expect(
      workspaces.reviewProspect(owner, p.id, { evidence: [], country: 20 as never }),
    ).rejects.toThrow();
    expect((await load(p.id)).country).toBe("SA");
  });
});

describe("A3 permissions", () => {
  it("an operator cannot record basis evidence or change the country", async () => {
    const p = await makeProspect({ country: "SA", lawfulBasis: "relationship" });
    await expect(
      workspaces.reviewProspect({ ...owner, role: "operator" }, p.id, {
        evidence: [],
        country: "EG",
        basisEvidence: { type: "relationship", source: "x", date: "2026-09-01" },
      }),
    ).rejects.toThrow();
    const row = await load(p.id);
    expect(row.country).toBe("SA");
    expect(row.basisEvidence).toEqual([]);
  });

  it("another workspace cannot review this prospect", async () => {
    const p = await makeProspect({ country: "SA" });
    await expect(
      workspaces.reviewProspect({ ...owner, workspaceId: randomUUID() }, p.id, {
        evidence: [],
        country: "EG",
      }),
    ).rejects.toThrow();
    expect((await load(p.id)).country).toBe("SA");
  });
});
