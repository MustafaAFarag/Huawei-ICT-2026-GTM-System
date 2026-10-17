import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type { Actor } from "@revenue/contracts";
import {
  db,
  json,
  GtmService,
  WorkspaceService,
  senderEvent,
} from "@revenue/backend";

// PRD v3.2 A4: an honest scorecard (distinct prospects, provenance, batches, human labels).
const workspaceId = randomUUID(),
  userId = randomUUID();
const owner: Actor = { workspaceId, userId, role: "owner" };
const gtm = new GtmService();
const workspaces = new WorkspaceService();
const batchA = randomUUID(),
  batchB = randomUUID(),
  batchC = randomUUID();
const prospects: string[] = [];
const iso = (daysAgo: number) =>
  new Date(Date.now() - daysAgo * 86400000).toISOString();

const steps = (state: string) => [
  { channel: "email", day: 0, subject: "s", body: "b", evidenceIds: [], state },
  { channel: "call", day: 3, subject: "", body: "b", evidenceIds: [], state: "manual" },
];
async function sequence(
  prospectId: string,
  batchId: string | null,
  state: string,
  createdDaysAgo = 0,
) {
  return db.sequence.create({
    data: {
      workspaceId,
      prospectId,
      draftId: randomUUID(),
      draftVersion: 1,
      approvalDigest: "digest",
      sender: "sender@example.test",
      state,
      batchId,
      steps: json(steps(state.startsWith("simulated") ? "simulated" : "sent")),
      createdAt: new Date(Date.now() - createdDaysAgo * 86400000),
    },
  });
}
async function event(
  sequenceId: string,
  kind: string,
  provenance: string,
  daysAgo = 0,
) {
  await db.providerEvent.create({
    data: {
      id: `${workspaceId}:${randomUUID()}`,
      workspaceId,
      sequenceId,
      kind,
      provenance,
      occurredAt: new Date(Date.now() - daysAgo * 86400000),
    },
  });
}
const count = (card: Awaited<ReturnType<typeof gtm.scorecard>>, stage: string) =>
  card.stages.find((s) => s.stage === stage)!.count;

beforeAll(async () => {
  await db.workspace.create({
    data: { id: workspaceId, name: "Scorecard test", crmBinding: "A", assetBinding: "A" },
  });
  await db.user.create({
    data: {
      id: userId,
      name: "Scorecard tester",
      email: `${userId}@example.test`,
      emailVerified: true,
    },
  });
  await db.membership.create({ data: { workspaceId, userId, role: "owner" } });
  for (let i = 0; i < 6; i++) {
    const p = await db.prospect.create({
      data: {
        workspaceId,
        ownerId: userId,
        sourceKey: `p${i}@scorecard.example`,
        country: "SA",
        lawfulBasis: "relationship",
        snapshot: json({
          firstName: `P${i}`,
          lastName: "Test",
          email: `p${i}@scorecard.example`,
          company: "Scorecard Co",
          website: "https://scorecard.example",
          title: "Head of People",
        }),
      },
    });
    prospects.push(p.id);
  }
});
afterAll(async () => {
  for (const model of [db.providerEvent, db.audit, db.sequence, db.prospect])
    await (model.deleteMany as (args: object) => Promise<unknown>)({
      where: { workspaceId },
    });
  await db.membership.deleteMany({ where: { workspaceId } });
  await db.workspace.delete({ where: { id: workspaceId } });
  await db.user.delete({ where: { id: userId } });
});

describe("scorecard", () => {
  it("is empty and honest before anything is queued", async () => {
    const card = await gtm.scorecard(owner);
    expect(card.stages.every((s) => s.count === 0)).toBe(true);
    expect(card.positive).toBe(0);
    expect(card.batches).toEqual([]);
    expect(card.filters).toMatchObject({ batchId: null, includeSimulated: false });
    expect(card.caravan).toMatchObject({ activated: false, repeatBatch: false });
  });

  it("keeps simulated events out by default, even after reviewProspect cancels the sequence", async () => {
    const seq = await sequence(prospects[0]!, batchA, "simulated");
    await senderEvent(owner, {
      id: `evt-${randomUUID()}`,
      sequenceId: seq.id,
      kind: "delivered",
      occurredAt: iso(0),
    });
    const stored = await db.providerEvent.findFirstOrThrow({
      where: { sequenceId: seq.id },
    });
    expect(stored.provenance).toBe("simulated");
    expect(
      (await db.sequence.findUniqueOrThrow({ where: { id: seq.id } })).state,
    ).toBe("simulated_delivered");

    await workspaces.reviewProspect(owner, prospects[0]!, { evidence: [] });
    expect(
      (await db.sequence.findUniqueOrThrow({ where: { id: seq.id } })).state,
    ).toBe("cancelled");

    const hidden = await gtm.scorecard(owner);
    expect(count(hidden, "prepared")).toBe(0);
    expect(count(hidden, "delivered")).toBe(0);
    expect(hidden.asset.sequences).toBe(0);

    const shown = await gtm.scorecard(owner, { includeSimulated: true });
    expect(count(shown, "prepared")).toBe(1);
    expect(count(shown, "delivered")).toBe(1);
    expect(shown.filters.includeSimulated).toBe(true);
    // The batch is listed so it can be chosen, and is marked as simulated.
    expect(shown.batches[0]).toMatchObject({ batchId: batchA, sequences: 1, simulated: 1 });
  });

  it("counts imported and live events, each stage once per prospect", async () => {
    // Prospect 1 has two sequences in batch B; both are delivered, one replied.
    const first = await sequence(prospects[1]!, batchB, "exported", 5);
    const second = await sequence(prospects[1]!, batchB, "exported", 5);
    await event(first.id, "delivered", "imported", 4);
    await event(second.id, "delivered", "imported", 4);
    await event(second.id, "replied", "imported", 3);
    // Prospect 2 is only prepared, prospect 3 is delivered live.
    await sequence(prospects[2]!, batchB, "exported", 5);
    const live = await sequence(prospects[3]!, batchB, "exported", 5);
    await event(live.id, "delivered", "live", 4);
    // A simulated event on a real sequence is excluded by default.
    await event(live.id, "replied", "simulated", 3);

    const card = await gtm.scorecard(owner);
    expect(count(card, "prepared")).toBe(3);
    expect(count(card, "delivered")).toBe(2);
    expect(count(card, "replied")).toBe(1);
    expect(card.asset.sequences).toBe(4);
    expect(card.asset.prospects).toBe(3);
    expect(card.asset).toMatchObject({ delivered: 2, replied: 1, replyRate: 0.5 });

    const all = await gtm.scorecard(owner, { includeSimulated: true });
    expect(count(all, "replied")).toBe(2);
  });

  it("filters by batch and by date", async () => {
    const olderSeq = await sequence(prospects[4]!, batchC, "exported", 30);
    await event(olderSeq.id, "delivered", "imported", 29);
    await event(olderSeq.id, "replied", "imported", 28);

    const batchOnly = await gtm.scorecard(owner, { batchId: batchC });
    expect(count(batchOnly, "prepared")).toBe(1);
    expect(count(batchOnly, "replied")).toBe(1);
    expect(batchOnly.filters.batchId).toBe(batchC);
    expect(batchOnly.batches.map((b) => b.batchId)).toEqual(
      expect.arrayContaining([batchA, batchB, batchC]),
    );

    const recent = await gtm.scorecard(owner, { from: iso(10).slice(0, 10) });
    expect(count(recent, "prepared")).toBe(3);
    const old = await gtm.scorecard(owner, { to: iso(10).slice(0, 10) });
    expect(count(old, "prepared")).toBe(1);
    const window = await gtm.scorecard(owner, {
      from: iso(40).slice(0, 10),
      to: iso(20).slice(0, 10),
    });
    expect(count(window, "prepared")).toBe(1);
    expect(count(window, "delivered")).toBe(1);
    // Events outside the window do not count.
    const early = await gtm.scorecard(owner, {
      batchId: batchC,
      to: iso(29).slice(0, 10),
    });
    expect(count(early, "replied")).toBe(0);
    await expect(
      gtm.scorecard(owner, { from: "2026-02-01", to: "2026-01-01" }),
    ).rejects.toThrow();
  });

  it("reports activation and repeat batches for Caravan itself", async () => {
    const card = await gtm.scorecard(owner);
    expect(card.caravan).toMatchObject({
      batches: 2,
      simulatedBatches: 1,
      activated: true,
      repeatBatch: true,
    });
  });

  it("never infers a positive reply; only a confirmed label counts", async () => {
    const before = await gtm.scorecard(owner);
    expect(count(before, "replied")).toBeGreaterThan(0);
    expect(before.positive).toBe(0);

    await expect(
      gtm.labelReply({ ...owner, role: "operator" }, prospects[1]!, {
        label: "positive",
      }),
    ).rejects.toThrow(/cannot approve/);
    await expect(
      gtm.labelReply(owner, prospects[1]!, { label: "great" }),
    ).rejects.toThrow();
    await expect(
      gtm.labelReply(owner, randomUUID(), { label: "positive" }),
    ).rejects.toThrow(/not found/i);
    expect((await gtm.scorecard(owner)).positive).toBe(0);

    await gtm.labelReply(owner, prospects[1]!, { label: "positive" });
    let card = await gtm.scorecard(owner);
    expect(card.positive).toBe(1);
    expect(card.replyLabels).toEqual({ positive: 1, neutral: 0, negative: 0 });
    expect(await db.audit.count({ where: { workspaceId, action: "reply.labelled" } })).toBe(1);

    // The latest label wins.
    await gtm.labelReply(owner, prospects[1]!, { label: "negative" });
    card = await gtm.scorecard(owner);
    expect(card.positive).toBe(0);
    expect(card.replyLabels.negative).toBe(1);

    // A label on a prospect with no counted reply does not create a positive reply.
    await gtm.labelReply(owner, prospects[2]!, { label: "positive" });
    expect((await gtm.scorecard(owner)).positive).toBe(0);
  });
});
