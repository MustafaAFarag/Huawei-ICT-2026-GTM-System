import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type { Actor } from "@revenue/contracts";
import { db, json, GtmService, WorkspaceService } from "@revenue/backend";

// Black-box additive scorecard contract. DB writes below only arrange synthetic
// fixtures; every behavioral assertion uses the public scorecard/label services.
const gtm = new GtmService();
const workspaces = new WorkspaceService();
const workspaceId = randomUUID();
const otherWorkspaceId = randomUUID();
const userId = randomUUID();
const owner: Actor = { workspaceId, userId, role: "owner" };
const otherOwner: Actor = { workspaceId: otherWorkspaceId, userId, role: "owner" };
const batchX = randomUUID();
const batchY = randomUUID();
const now = Date.now();
const daysAgo = (days: number) => new Date(now - days * 86400000);
const dateOnly = (days: number) => daysAgo(days).toISOString().slice(0, 10);

type Candidate = {
  prospectId: string;
  sequenceId: string;
  provenance: "live" | "simulated" | "imported";
  occurredAt: string;
  label: "positive" | "neutral" | "negative" | null;
};
type Card = Awaited<ReturnType<typeof gtm.scorecard>> & { replyCandidates: Candidate[] };
async function scorecard(actor: Actor = owner, filters: Parameters<typeof gtm.scorecard>[1] = {}) {
  return await gtm.scorecard(actor, filters) as Card;
}
function stage(card: Card, name: string) {
  const item = card.stages.find((entry) => entry.stage === name);
  expect(item, `Expected ${name} stage`).toBeDefined();
  return item!.count;
}
async function prospect(ws: string, name: string) {
  return db.prospect.create({ data: {
    workspaceId: ws, ownerId: userId,
    sourceKey: `${name}-${randomUUID()}@synthetic-demo.example`,
    country: "SA", lawfulBasis: "relationship",
    snapshot: json({ firstName: name, lastName: "Synthetic", email: `${name}@synthetic-demo.example`, company: "Reply Candidate Lab", title: "Founder" }),
  } });
}
async function sequence(ws: string, prospectId: string, batchId: string, state = "exported", age = 8) {
  return db.sequence.create({ data: {
    workspaceId: ws, prospectId, batchId, state,
    draftId: randomUUID(), draftVersion: 1,
    approvalDigest: "synthetic-approval-digest", sender: "sender@synthetic-demo.example",
    createdAt: daysAgo(age),
    steps: json([{ channel: "email", day: 0, subject: "Synthetic follow-up", body: "Synthetic test only", evidenceIds: [], state: state === "simulated" ? "simulated" : "sent" }]),
  } });
}
async function event(ws: string, sequenceId: string, kind: string, provenance: Candidate["provenance"], age: number) {
  return db.providerEvent.create({ data: {
    id: `${ws}:${randomUUID()}`, workspaceId: ws, sequenceId, kind, provenance, occurredAt: daysAgo(age),
  } });
}
let primary: { id: string };
let latestInX: { id: string };
let latestInY: { id: string };
let old: { id: string };
let simulated: { id: string };
let simulatedSequence: { id: string };
let foreign: { id: string };
let foreignSequence: { id: string };

beforeAll(async () => {
  await db.user.create({ data: { id: userId, name: "Reply candidate tester", email: `${userId}@synthetic-demo.example`, emailVerified: true } });
  for (const ws of [workspaceId, otherWorkspaceId]) {
    await db.workspace.create({ data: { id: ws, name: `Synthetic reply candidates ${ws}`, crmBinding: "A", assetBinding: "A" } });
    await db.membership.create({ data: { workspaceId: ws, userId, role: "owner" } });
  }
  primary = await prospect(workspaceId, "Primary");
  // Keep this sequence inside the olderReply query's sequence-created window;
  // its reply event below is also inside that window.
  const first = await sequence(workspaceId, primary.id, batchX, "exported", 6);
  latestInX = await sequence(workspaceId, primary.id, batchX);
  latestInY = await sequence(workspaceId, primary.id, batchY);
  await event(workspaceId, first.id, "delivered", "imported", 7);
  await event(workspaceId, first.id, "replied", "imported", 6);
  await event(workspaceId, latestInX.id, "replied", "imported", 4);
  // Duplicate reply events must not make duplicate candidates or funnel counts.
  await event(workspaceId, latestInX.id, "replied", "imported", 3);
  await event(workspaceId, latestInY.id, "replied", "live", 1);
  // A genuine reply remains available to label after review stops its sequence.
  await workspaces.reviewProspect(owner, primary.id, { evidence: [] });

  old = await prospect(workspaceId, "Old");
  const oldSequence = await sequence(workspaceId, old.id, batchY, "exported", 25);
  await event(workspaceId, oldSequence.id, "replied", "imported", 25);
  // Event-date filtering alone would admit this reply, but its sequence was
  // created outside the 7-to-5-day window and must keep it out of that scope.
  await event(workspaceId, oldSequence.id, "replied", "imported", 6);

  simulated = await prospect(workspaceId, "Simulation");
  simulatedSequence = await sequence(workspaceId, simulated.id, batchX, "simulated");
  await event(workspaceId, simulatedSequence.id, "replied", "simulated", 2);
  await workspaces.reviewProspect(owner, simulated.id, { evidence: [] });

  const noReply = await prospect(workspaceId, "DeliveredOnly");
  const noReplySequence = await sequence(workspaceId, noReply.id, batchX);
  await event(workspaceId, noReplySequence.id, "delivered", "imported", 2);

  // Sharing a batch identifier deliberately challenges workspace scoping.
  foreign = await prospect(otherWorkspaceId, "OtherWorkspace");
  foreignSequence = await sequence(otherWorkspaceId, foreign.id, batchX);
  await event(otherWorkspaceId, foreignSequence.id, "replied", "imported", 1);
});

afterAll(async () => {
  for (const ws of [workspaceId, otherWorkspaceId]) {
    for (const model of [db.providerEvent, db.audit, db.sequence, db.prospect]) {
      await (model.deleteMany as (args: object) => Promise<unknown>)({ where: { workspaceId: ws } });
    }
    await db.membership.deleteMany({ where: { workspaceId: ws } });
    await db.workspace.deleteMany({ where: { id: ws } });
  }
  await db.user.deleteMany({ where: { id: userId } });
});

describe("public scorecard reply candidates", () => {
  it("keeps a cancelled sequence's genuine imported reply and chooses its latest matching reply", async () => {
    const card = await scorecard(owner, { batchId: batchX });
    expect(card.replyCandidates).toEqual([{
      prospectId: primary.id,
      sequenceId: latestInX.id,
      provenance: "imported",
      occurredAt: daysAgo(3).toISOString(),
      label: null,
    }]);
    expect(card.positive).toBe(0);
    expect(stage(card, "replied")).toBe(1);
    expect(stage(card, "delivered")).toBe(2);
  });

  it("returns one candidate per prospect, using the latest matching reply across batches", async () => {
    const card = await scorecard();
    expect(card.replyCandidates).toHaveLength(2);
    expect(card.replyCandidates.find((candidate) => candidate.prospectId === primary.id)).toEqual({
      prospectId: primary.id, sequenceId: latestInY.id, provenance: "live",
      occurredAt: daysAgo(1).toISOString(), label: null,
    });
    expect(new Set(card.replyCandidates.map((candidate) => candidate.prospectId)).size).toBe(2);
    expect(stage(card, "replied")).toBe(2);
    expect(card.positive).toBe(0);
  });

  it("uses reply event dates to choose candidates inside the requested window", async () => {
    const recent = await scorecard(owner, { from: dateOnly(10) });
    expect(recent.replyCandidates.map((candidate) => candidate.prospectId)).toEqual([primary.id]);
    const olderReply = await scorecard(owner, { from: dateOnly(7), to: dateOnly(5) });
    expect(olderReply.replyCandidates).toHaveLength(1);
    expect(olderReply.replyCandidates[0]).toMatchObject({ prospectId: primary.id, occurredAt: daysAgo(6).toISOString() });
    const oldWindow = await scorecard(owner, { from: dateOnly(29), to: dateOnly(20) });
    expect(oldWindow.replyCandidates.map((candidate) => candidate.prospectId)).toEqual([old.id]);
    expect(stage(oldWindow, "replied")).toBe(1);
  });

  it("returns no candidates for an unknown batch, an empty date window, or a foreign batch's data", async () => {
    expect((await scorecard(owner, { batchId: randomUUID() })).replyCandidates).toEqual([]);
    expect((await scorecard(owner, { from: dateOnly(100), to: dateOnly(90) })).replyCandidates).toEqual([]);
    const other = await scorecard(otherOwner, { batchId: batchX, includeSimulated: true });
    expect(other.replyCandidates).toEqual([{
      prospectId: foreign.id, sequenceId: foreignSequence.id, provenance: "imported",
      occurredAt: daysAgo(1).toISOString(), label: null,
    }]);
    expect(stage(other, "replied")).toBe(1);
    expect((await scorecard(owner, { batchId: batchX })).replyCandidates.some((candidate) => candidate.prospectId === foreign.id)).toBe(false);
  });

  it("excludes cancelled simulated replies unless explicitly included, preserving distinct funnel counts", async () => {
    const implicit = await scorecard(owner, { batchId: batchX });
    const explicit = await scorecard(owner, { batchId: batchX, includeSimulated: false });
    expect(explicit.replyCandidates).toEqual(implicit.replyCandidates);
    expect(implicit.replyCandidates.some((candidate) => candidate.prospectId === simulated.id)).toBe(false);
    const included = await scorecard(owner, { batchId: batchX, includeSimulated: true });
    expect(included.replyCandidates).toHaveLength(2);
    expect(included.replyCandidates.find((candidate) => candidate.prospectId === simulated.id)).toEqual({
      prospectId: simulated.id, sequenceId: simulatedSequence.id, provenance: "simulated",
      occurredAt: daysAgo(2).toISOString(), label: null,
    });
    expect(stage(implicit, "replied")).toBe(1);
    expect(stage(included, "replied")).toBe(2);
    expect(stage(included, "delivered")).toBe(stage(implicit, "delivered") + 1);
    expect(included.positive).toBe(0);
  });

  it("persists human labels on the candidate, counts positive once, and replaces it with neutral without changing stages", async () => {
    const before = await scorecard(owner, { batchId: batchX });
    expect(before.positive).toBe(0);
    await gtm.labelReply(owner, primary.id, { label: "positive", sequenceId: latestInX.id });
    const positive = await scorecard(owner, { batchId: batchX });
    expect(positive.positive).toBe(1);
    expect(positive.replyCandidates.find((candidate) => candidate.prospectId === primary.id)?.label).toBe("positive");
    expect(positive.stages).toEqual(before.stages);
    const reloaded = await new GtmService().scorecard(owner, { batchId: batchX }) as Card;
    expect(reloaded.replyCandidates.find((candidate) => candidate.prospectId === primary.id)?.label).toBe("positive");
    expect(reloaded.positive).toBe(1);
    await gtm.labelReply(owner, primary.id, { label: "neutral", sequenceId: latestInX.id });
    const neutral = await scorecard(owner, { batchId: batchX });
    expect(neutral.positive).toBe(0);
    expect(neutral.replyCandidates.find((candidate) => candidate.prospectId === primary.id)?.label).toBe("neutral");
    expect(neutral.stages).toEqual(before.stages);
    const foreignCard = await scorecard(otherOwner, { batchId: batchX });
    expect(foreignCard.positive).toBe(0);
    expect(foreignCard.replyCandidates[0]?.label).toBeNull();
  });
});
