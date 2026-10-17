import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  PACKS,
  PACK_IDS,
  inferMaturity,
  packFor,
  type Actor,
  type ProspectSnapshot,
} from "@revenue/contracts";
import {
  db,
  json,
  GtmService,
  WorkspaceService,
} from "@revenue/backend";
import { discoveryGuide } from "../src/discovery-guide.js";

const snapshot: ProspectSnapshot = {
  firstName: "Omar",
  lastName: "Nasser",
  email: "omar@northwind.example",
  company: "Northwind Advisory",
  website: "https://northwind.example",
  title: "Operations Manager",
  employees: 60,
};

describe("workflow packs as data (pure)", () => {
  it("ships the HR pack and a generic fallback, and falls back to HR for unknown ids", () => {
    expect([...PACK_IDS]).toEqual(["hr-services", "generic"]);
    expect(packFor("generic").id).toBe("generic");
    expect(packFor("nope").id).toBe("hr-services");
    expect(packFor(null).id).toBe("hr-services");
    expect(PACKS["hr-services"].setupField).not.toBeNull();
    expect(PACKS.generic.setupField).toBeNull();
    for (const pack of Object.values(PACKS)) {
      expect(pack.angleKeys.length).toBe(5 * pack.maturity.bands.length);
      expect(pack.maturity.scale).toHaveLength(5);
      expect(pack.pains.length).toBeGreaterThan(0);
      expect(pack.rubric.minimum).toBeGreaterThan(0);
    }
  });

  it("never asks a generic workspace about payroll or HR, in either language", () => {
    const generic = PACKS.generic;
    const painKeys = generic.pains.map((p) => p.key);
    expect(painKeys).not.toContain("payroll");
    for (const language of ["en", "ar"] as const) {
      const guide = discoveryGuide(snapshot, [], "Generic", language, generic);
      const text = JSON.stringify(guide.questions).toLowerCase();
      expect(text).not.toContain("payroll");
      expect(text).not.toContain("الرواتب");
      expect(text).not.toContain("hr set-up");
      expect(guide.questions.find((q) => q.id === "setup")).toBeUndefined();
      expect(guide.questions.length).toBeGreaterThanOrEqual(7);
    }
    const hr = discoveryGuide(snapshot, [], "HR", "en", PACKS["hr-services"]);
    expect(JSON.stringify(hr.questions).toLowerCase()).toContain("payroll");
    // Default pack stays HR so existing callers are unchanged.
    expect(discoveryGuide(snapshot, [], "HR", "en").questions).toEqual(
      hr.questions,
    );
  });

  it("infers the maturity band from the pack's bands", () => {
    const bands = PACKS.generic.maturity.bands;
    expect(inferMaturity(undefined, bands)).toBe("P1a");
    expect(inferMaturity(24, bands)).toBe("P1a");
    expect(inferMaturity(25, bands)).toBe("P1b");
    expect(inferMaturity(5000, bands)).toBe("P2");
  });
});

const workspaceId = randomUUID(),
  ownerId = randomUUID(),
  viewerId = randomUUID();
const owner: Actor = { workspaceId, userId: ownerId, role: "owner" };
const gtm = new GtmService();
const workspaces = new WorkspaceService();
let prospectId = "";

describe("workflow packs (service)", () => {
  beforeAll(async () => {
    await db.workspace.create({
      data: {
        id: workspaceId,
        name: "Packs test",
        pack: "generic",
        crmBinding: "A",
        assetBinding: "A",
      },
    });
    for (const id of [ownerId, viewerId])
      await db.user.create({
        data: {
          id,
          name: id,
          email: `${id}@example.test`,
          emailVerified: true,
        },
      });
    await db.membership.createMany({
      data: [
        { workspaceId, userId: ownerId, role: "owner" },
        { workspaceId, userId: viewerId, role: "viewer" },
      ],
    });
    const prospect = await db.prospect.create({
      data: {
        workspaceId,
        ownerId,
        sourceKey: "packs@example.test",
        snapshot: json({ ...snapshot, hrMaturity: "P1b" }),
      },
    });
    prospectId = prospect.id;
  });
  afterAll(async () => {
    await db.audit.deleteMany({ where: { workspaceId } });
    await db.prospect.deleteMany({ where: { workspaceId } });
    await db.membership.deleteMany({ where: { workspaceId } });
    await db.workspace.delete({ where: { id: workspaceId } });
    await db.user.deleteMany({ where: { id: { in: [ownerId, viewerId] } } });
    await db.$disconnect();
  });

  it("captures generic discovery without hrSetup and confirms the maturity band", async () => {
    const before = (await db.prospect.findUniqueOrThrow({
      where: { id: prospectId },
    })).snapshot as ProspectSnapshot;
    expect(before.maturitySource).toBeUndefined();
    const saved = await gtm.discovery(owner, prospectId, {
      headcountBand: "51-200",
      pains: { qualification: 4, "follow-up": 3 },
      maturity: 2,
      maturityBand: "P2",
      notes: "",
    });
    expect(saved).not.toHaveProperty("hrSetup");
    const after = (await db.prospect.findUniqueOrThrow({
      where: { id: prospectId },
    })).snapshot as ProspectSnapshot;
    expect(after.hrMaturity).toBe("P2");
    expect(after.maturitySource).toBe("confirmed");
  });

  it("rejects HR pain topics for a generic workspace", async () => {
    await expect(
      gtm.discovery(owner, prospectId, {
        headcountBand: "11-25",
        pains: { payroll: 4 },
        maturity: 1,
      }),
    ).rejects.toThrow();
  });

  it("switches pack for the owner only, audits it, and then requires hrSetup", async () => {
    await expect(
      workspaces.setPack({ ...owner, userId: viewerId, role: "viewer" }, {
        pack: "hr-services",
      }),
    ).rejects.toThrow();
    await expect(workspaces.setPack(owner, { pack: "bogus" })).rejects.toThrow();
    const result = await workspaces.setPack(owner, { pack: "hr-services" });
    expect(result.pack.id).toBe("hr-services");
    expect(
      await db.audit.count({ where: { workspaceId, action: "pack.updated" } }),
    ).toBe(1);
    await expect(
      gtm.discovery(owner, prospectId, {
        headcountBand: "11-25",
        pains: { payroll: 4 },
        maturity: 1,
      }),
    ).rejects.toThrow();
    await expect(
      gtm.discovery(owner, prospectId, {
        headcountBand: "11-25",
        hrSetup: "team",
        pains: { payroll: 4 },
        maturity: 1,
      }),
    ).resolves.toMatchObject({ hrSetup: "team" });
  });
});
