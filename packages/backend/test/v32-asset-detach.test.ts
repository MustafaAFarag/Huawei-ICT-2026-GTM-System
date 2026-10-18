import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { attachAssetToDraft } from "../src/asset-attach.js";
import { db, json } from "@revenue/backend";

const workspaceId = randomUUID();
const otherWorkspaceId = randomUUID();
const userId = randomUUID();
const prospectId = randomUUID();
const otherProspectId = randomUUID();
const otherWorkspaceProspectId = randomUUID();
const brandAssetId = randomUUID();
const unapprovedAssetId = randomUUID();
const otherAccountAssetId = randomUUID();
const foreignWorkspaceAssetId = randomUUID();
const approvedAt = new Date("2026-10-18T12:00:00.000Z");

async function createDraft(options: {
  id?: string;
  workspaceId?: string;
  prospectId?: string;
  assetId?: string | null;
  version?: number;
  approved?: boolean;
}) {
  const workspace = options.workspaceId ?? workspaceId;
  const version = options.version ?? 4;
  return db.draft.create({
    data: {
      id: options.id ?? randomUUID(),
      workspaceId: workspace,
      prospectId: options.prospectId ?? prospectId,
      playVersionId: "play-v1",
      runId: randomUUID(),
      version,
      content: json([]),
      evidenceDigest: "detach-fixture",
      assetId: options.assetId ?? null,
      approvedVersion: options.approved === false ? null : version,
      approvedAt: options.approved === false ? null : approvedAt,
      approvedBy: options.approved === false ? null : userId,
    },
  });
}

async function createSequence(draftId: string, state: string) {
  return db.sequence.create({
    data: {
      workspaceId,
      prospectId,
      draftId,
      draftVersion: 4,
      approvalDigest: "detach-fixture",
      sender: "sender@example.test",
      state,
      steps: json([{ channel: "email", day: 0, assetId: brandAssetId }]),
      holdout: false,
    },
  });
}

beforeAll(async () => {
  await db.user.create({
    data: { id: userId, name: "Detach tester", email: `${userId}@example.test`, emailVerified: true },
  });
  for (const id of [workspaceId, otherWorkspaceId]) {
    await db.workspace.create({
      data: { id, name: `Detach fixture ${id}`, crmBinding: "A", assetBinding: "A" },
    });
    await db.membership.create({ data: { workspaceId: id, userId, role: "owner" } });
  }
  for (const [id, ws, key] of [
    [prospectId, workspaceId, "primary"],
    [otherProspectId, workspaceId, "other-account"],
    [otherWorkspaceProspectId, otherWorkspaceId, "other-workspace"],
  ])
    await db.prospect.create({
      data: {
        id,
        workspaceId: ws,
        ownerId: userId,
        sourceKey: `${key}-${id}@example.test`,
        country: "SA",
        lawfulBasis: "relationship",
        snapshot: json({ firstName: key, email: `${key}@example.test`, company: "Detach fixture" }),
      },
    });

  for (const [id, ws, pid, approved] of [
    [brandAssetId, workspaceId, null, true],
    [unapprovedAssetId, workspaceId, null, false],
    [otherAccountAssetId, workspaceId, otherProspectId, true],
    [foreignWorkspaceAssetId, otherWorkspaceId, null, true],
  ] as const)
    await db.asset.create({
      data: {
        id,
        workspaceId: ws,
        prospectId: pid,
        runId: randomUUID(),
        template: "capability-profile",
        language: "en",
        engineVersion: "test",
        title: `Detach asset ${id.slice(0, 4)}`,
        htmlKey: `${id}.html`,
        pdfKey: null,
        evidenceDigest: "detach-fixture",
        approvedAt: approved ? approvedAt : null,
        approvedBy: approved ? userId : null,
      },
    });
});

afterAll(async () => {
  await db.sequence.deleteMany({ where: { workspaceId: { in: [workspaceId, otherWorkspaceId] } } });
  await db.draft.deleteMany({ where: { workspaceId: { in: [workspaceId, otherWorkspaceId] } } });
  await db.asset.deleteMany({ where: { workspaceId: { in: [workspaceId, otherWorkspaceId] } } });
  await db.prospect.deleteMany({ where: { workspaceId: { in: [workspaceId, otherWorkspaceId] } } });
  await db.membership.deleteMany({ where: { userId } });
  await db.workspace.deleteMany({ where: { id: { in: [workspaceId, otherWorkspaceId] } } });
  await db.user.delete({ where: { id: userId } });
});

describe("draft asset detachment", () => {
  it("clears the assigned asset and approval state while incrementing the draft version", async () => {
    const draft = await createDraft({ assetId: brandAssetId });

    const updated = await attachAssetToDraft(workspaceId, draft.id, {
      assetId: null,
      version: draft.version,
    });

    expect(updated).toMatchObject({
      id: draft.id,
      assetId: null,
      version: draft.version + 1,
      approvedVersion: null,
      approvedAt: null,
      approvedBy: null,
    });
    await expect(db.draft.findUniqueOrThrow({ where: { id: draft.id } })).resolves.toMatchObject({
      assetId: null,
      version: draft.version + 1,
      approvedVersion: null,
      approvedAt: null,
      approvedBy: null,
    });
  });

  it("cancels pending, simulated, and exported sequences while preserving terminal states", async () => {
    const draft = await createDraft({ assetId: brandAssetId });
    const states = ["pending", "simulated", "exported", "completed", "failed", "cancelled"] as const;
    const sequences = await Promise.all(states.map((state) => createSequence(draft.id, state)));

    await attachAssetToDraft(workspaceId, draft.id, { assetId: null, version: draft.version });

    const results = await Promise.all(
      sequences.map(async (sequence) => [
        sequence.state,
        (await db.sequence.findUniqueOrThrow({ where: { id: sequence.id } })).state,
      ] as const),
    );
    expect(Object.fromEntries(results)).toEqual({
      pending: "cancelled",
      simulated: "cancelled",
      exported: "cancelled",
      completed: "completed",
      failed: "failed",
      cancelled: "cancelled",
    });
  });

  it("rejects a stale detach without changing the draft or its active sequences", async () => {
    const draft = await createDraft({ assetId: brandAssetId });
    const sequence = await createSequence(draft.id, "exported");

    await expect(
      attachAssetToDraft(workspaceId, draft.id, { assetId: null, version: draft.version - 1 }),
    ).rejects.toThrow();

    await expect(db.draft.findUniqueOrThrow({ where: { id: draft.id } })).resolves.toMatchObject({
      assetId: brandAssetId,
      version: draft.version,
      approvedVersion: draft.version,
      approvedAt,
      approvedBy: userId,
    });
    await expect(db.sequence.findUniqueOrThrow({ where: { id: sequence.id } })).resolves.toMatchObject({
      state: "exported",
    });
  });

  it("rejects a draft from another workspace and unapproved or foreign-account assets without mutation", async () => {
    const draft = await createDraft({ assetId: brandAssetId });
    const foreignDraft = await createDraft({
      workspaceId: otherWorkspaceId,
      prospectId: otherWorkspaceProspectId,
    });

    await expect(
      attachAssetToDraft(workspaceId, foreignDraft.id, { assetId: null, version: foreignDraft.version }),
    ).rejects.toThrow();
    await expect(
      attachAssetToDraft(workspaceId, draft.id, { assetId: unapprovedAssetId, version: draft.version }),
    ).rejects.toThrow();
    await expect(
      attachAssetToDraft(workspaceId, draft.id, { assetId: otherAccountAssetId, version: draft.version }),
    ).rejects.toThrow();
    await expect(
      attachAssetToDraft(workspaceId, draft.id, { assetId: foreignWorkspaceAssetId, version: draft.version }),
    ).rejects.toThrow();

    await expect(db.draft.findUniqueOrThrow({ where: { id: draft.id } })).resolves.toMatchObject({
      assetId: brandAssetId,
      version: draft.version,
      approvedVersion: draft.version,
    });
    await expect(db.draft.findUniqueOrThrow({ where: { id: foreignDraft.id } })).resolves.toMatchObject({
      assetId: null,
      version: foreignDraft.version,
    });
  });

  it("still attaches an approved brand-level capability profile to any workspace draft", async () => {
    const draft = await createDraft({ approved: false });

    const updated = await attachAssetToDraft(workspaceId, draft.id, {
      assetId: brandAssetId,
      version: draft.version,
    });

    expect(updated).toMatchObject({
      assetId: brandAssetId,
      version: draft.version + 1,
      approvedVersion: null,
      approvedAt: null,
      approvedBy: null,
    });
  });
});
