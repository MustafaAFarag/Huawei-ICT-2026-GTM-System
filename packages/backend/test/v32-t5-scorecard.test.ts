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

// Black-box tests for PRD v3.2 A4 (batches, provenance, honest scorecard; GAP-07, SEQ-08).
// Written from the spec only. Fixture mode: no network, no paid calls.
//
// Seed (all in one fresh workspace, "now" = test run time):
//   p0  batch S  simulated sequence (fixture simulator events, then cancelled by reviewProspect)
//   p1  batch X  3 sequences; many duplicate delivered events, replied on two sequences (imported)
//   p2  batch X  prepared only
//   p3  batch X  live delivered, simulated replied
//   p4  batch Y  old (25 days ago): imported delivered + replied
//   p5  batch X  live sequence with a simulated delivered event
//   p6  batch Z  one sequence, three replied events (imported) - never labelled
const workspaceId = randomUUID();
const userId = randomUUID();
const owner: Actor = { workspaceId, userId, role: "owner" };
const gtm = new GtmService();
const workspaces = new WorkspaceService();
const batchS = randomUUID();
const batchX = randomUUID();
const batchY = randomUUID();
const batchZ = randomUUID();
const prospects: string[] = [];

const dayAgo = (n: number) => new Date(Date.now() - n * 86400000);
const ymd = (n: number) => dayAgo(n).toISOString().slice(0, 10);

async function makeSequence(
  prospectId: string,
  batchId: string | null,
  state: string,
  createdDaysAgo: number,
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
      steps: json([
        {
          channel: "email",
          day: 0,
          subject: "s",
          body: "b",
          evidenceIds: [],
          state: state.startsWith("simulated") ? "simulated" : "sent",
        },
        { channel: "call", day: 3, subject: "", body: "b", evidenceIds: [], state: "manual" },
      ]),
      createdAt: dayAgo(createdDaysAgo),
    },
  });
}
async function makeEvent(
  sequenceId: string,
  kind: string,
  provenance: "live" | "simulated" | "imported",
  daysAgo: number,
) {
  await db.providerEvent.create({
    data: {
      id: `${workspaceId}:${randomUUID()}`,
      workspaceId,
      sequenceId,
      kind,
      provenance,
      occurredAt: dayAgo(daysAgo),
    },
  });
}
type Card = Awaited<ReturnType<typeof gtm.scorecard>>;
const stage = (card: Card, name: string) => {
  const found = card.stages.find((s) => s.stage === name);
  expect(found, `stage ${name} present`).toBeDefined();
  return found!.count;
};

let seqS: { id: string };

beforeAll(async () => {
  await db.workspace.create({
    data: { id: workspaceId, name: "A4 black-box", crmBinding: "A", assetBinding: "A" },
  });
  await db.user.create({
    data: {
      id: userId,
      name: "A4 tester",
      email: `${userId}@example.test`,
      emailVerified: true,
    },
  });
  await db.membership.create({ data: { workspaceId, userId, role: "owner" } });
  for (let i = 0; i < 7; i++) {
    const p = await db.prospect.create({
      data: {
        workspaceId,
        ownerId: userId,
        sourceKey: `bb${i}@a4.example`,
        country: "SA",
        lawfulBasis: "relationship",
        snapshot: json({
          firstName: `BB${i}`,
          lastName: "Tester",
          email: `bb${i}@a4.example`,
          company: "A4 Co",
          website: "https://a4.example",
          title: "Head of People",
        }),
      },
    });
    prospects.push(p.id);
  }

  // p0: simulated sequence; events go through the fixture simulator path.
  seqS = await makeSequence(prospects[0]!, batchS, "simulated", 0);
  await senderEvent(owner, {
    id: `evt-${randomUUID()}`,
    sequenceId: seqS.id,
    kind: "delivered",
    occurredAt: dayAgo(0).toISOString(),
  });

  // p1: three sequences in X, duplicates everywhere.
  const a = await makeSequence(prospects[1]!, batchX, "exported", 5);
  const b = await makeSequence(prospects[1]!, batchX, "exported", 5);
  const c = await makeSequence(prospects[1]!, batchX, "exported", 5);
  for (const s of [a, b, c]) await makeEvent(s.id, "delivered", "imported", 4);
  await makeEvent(a.id, "delivered", "imported", 3);
  await makeEvent(a.id, "delivered", "live", 3);
  await makeEvent(b.id, "replied", "imported", 3);
  await makeEvent(c.id, "replied", "imported", 2);

  // p2: prepared only.
  await makeSequence(prospects[2]!, batchX, "exported", 5);

  // p3: live delivered, simulated reply.
  const p3 = await makeSequence(prospects[3]!, batchX, "exported", 5);
  await makeEvent(p3.id, "delivered", "live", 4);
  await makeEvent(p3.id, "replied", "simulated", 3);

  // p4: old batch Y.
  const p4 = await makeSequence(prospects[4]!, batchY, "exported", 25);
  await makeEvent(p4.id, "delivered", "imported", 24);
  await makeEvent(p4.id, "replied", "imported", 23);

  // p5: real sequence, simulated delivered event only.
  const p5 = await makeSequence(prospects[5]!, batchX, "exported", 5);
  await makeEvent(p5.id, "delivered", "simulated", 4);

  // p6: three raw reply events, never labelled.
  const p6 = await makeSequence(prospects[6]!, batchZ, "exported", 6);
  await makeEvent(p6.id, "delivered", "imported", 5);
  for (const d of [4, 3, 2]) await makeEvent(p6.id, "replied", "imported", d);
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

describe("A4 provenance", () => {
  it("fixture simulator writes provenance=simulated and the sequence carries its batchId", async () => {
    const stored = await db.providerEvent.findFirstOrThrow({
      where: { sequenceId: seqS.id },
    });
    expect(stored.provenance).toBe("simulated");
    const seq = await db.sequence.findUniqueOrThrow({ where: { id: seqS.id } });
    expect(seq.batchId).toBe(batchS);
  });
});

describe("acceptance 1: simulated events excluded by default, even after reviewProspect", () => {
  it("excludes simulated before and after reviewProspect cancels the sequence", async () => {
    const beforeReview = await gtm.scorecard(owner, { batchId: batchS });
    expect(stage(beforeReview, "delivered")).toBe(0);
    expect(stage(beforeReview, "prepared")).toBe(0);

    await workspaces.reviewProspect(owner, prospects[0]!, { evidence: [] });
    expect(
      (await db.sequence.findUniqueOrThrow({ where: { id: seqS.id } })).state,
    ).toBe("cancelled");

    const afterReview = await gtm.scorecard(owner, { batchId: batchS });
    expect(stage(afterReview, "prepared")).toBe(0);
    expect(stage(afterReview, "delivered")).toBe(0);
    expect(stage(afterReview, "replied")).toBe(0);
    expect(afterReview.positive).toBe(0);
    expect(afterReview.filters.includeSimulated).toBe(false);
  });

  it("default and explicit includeSimulated:false are identical", async () => {
    const implicit = await gtm.scorecard(owner);
    const explicit = await gtm.scorecard(owner, { includeSimulated: false });
    expect(explicit.stages).toEqual(implicit.stages);
    expect(explicit.positive).toBe(implicit.positive);
  });

  it("simulated events on a real sequence are excluded by default, real events on it kept", async () => {
    // p5 has only a simulated delivered event; p3 has live delivered + simulated replied.
    const card = await gtm.scorecard(owner, { batchId: batchX });
    expect(stage(card, "delivered")).toBe(2); // p1 + p3, not p5
    expect(stage(card, "replied")).toBe(1); // p1, not p3's simulated reply
  });
});

describe("acceptance 2: includeSimulated:true counts simulated events", () => {
  it("counts the cancelled simulated sequence and its event", async () => {
    const card = await gtm.scorecard(owner, { batchId: batchS, includeSimulated: true });
    expect(stage(card, "prepared")).toBe(1);
    expect(stage(card, "delivered")).toBe(1);
    expect(card.filters.includeSimulated).toBe(true);
  });

  it("adds simulated events on top of live/imported ones, still per distinct prospect", async () => {
    const card = await gtm.scorecard(owner, { batchId: batchX, includeSimulated: true });
    expect(stage(card, "prepared")).toBe(4); // p1,p2,p3,p5
    expect(stage(card, "delivered")).toBe(3); // p1,p3,p5
    expect(stage(card, "replied")).toBe(2); // p1,p3
  });

  it("includeSimulated never lowers any stage count", async () => {
    const off = await gtm.scorecard(owner);
    const on = await gtm.scorecard(owner, { includeSimulated: true });
    for (const s of off.stages) expect(stage(on, s.stage)).toBeGreaterThanOrEqual(s.count);
  });
});

describe("acceptance 3: batch and date filters", () => {
  it("filters by batch: other batches' events are not counted", async () => {
    const y = await gtm.scorecard(owner, { batchId: batchY });
    expect(stage(y, "prepared")).toBe(1);
    expect(stage(y, "delivered")).toBe(1);
    expect(stage(y, "replied")).toBe(1);
    expect(y.filters.batchId).toBe(batchY);

    const z = await gtm.scorecard(owner, { batchId: batchZ });
    expect(stage(z, "prepared")).toBe(1);
    expect(stage(z, "delivered")).toBe(1);
    expect(stage(z, "replied")).toBe(1);

    const x = await gtm.scorecard(owner, { batchId: batchX });
    expect(stage(x, "prepared")).toBe(4);
  });

  it("an unknown batch id yields all-zero stages and positive=0", async () => {
    const card = await gtm.scorecard(owner, { batchId: randomUUID() });
    expect(card.stages.every((s) => s.count === 0)).toBe(true);
    expect(card.positive).toBe(0);
  });

  it("batch totals partition the unfiltered total when prospects do not overlap", async () => {
    const all = await gtm.scorecard(owner);
    const parts = await Promise.all(
      [batchX, batchY, batchZ].map((batchId) => gtm.scorecard(owner, { batchId })),
    );
    for (const name of ["prepared", "delivered", "replied"]) {
      expect(parts.reduce((n, c) => n + stage(c, name), 0)).toBe(stage(all, name));
    }
  });

  it("lists the batches so one can be chosen", async () => {
    const card = await gtm.scorecard(owner, { includeSimulated: true });
    expect(card.batches.map((b) => b.batchId)).toEqual(
      expect.arrayContaining([batchS, batchX, batchY, batchZ]),
    );
  });

  it("from: excludes older activity", async () => {
    const card = await gtm.scorecard(owner, { from: ymd(10) });
    expect(stage(card, "prepared")).toBe(5); // p1,p2,p3,p5 (X) + p6 (Z); p4 is 25 days old
  });

  it("to: keeps only older activity", async () => {
    const card = await gtm.scorecard(owner, { to: ymd(10) });
    expect(stage(card, "prepared")).toBe(1);
    expect(stage(card, "delivered")).toBe(1);
    expect(stage(card, "replied")).toBe(1);
  });

  it("from+to window selects exactly the old batch", async () => {
    const card = await gtm.scorecard(owner, { from: ymd(40), to: ymd(20) });
    expect(stage(card, "prepared")).toBe(1);
    expect(stage(card, "delivered")).toBe(1);
    expect(stage(card, "replied")).toBe(1);
  });

  it("a window with no activity is all zero", async () => {
    const card = await gtm.scorecard(owner, { from: ymd(400), to: ymd(300) });
    expect(card.stages.every((s) => s.count === 0)).toBe(true);
  });

  it("events outside the window do not count", async () => {
    // p4's reply was 23 days ago; a window ending 24+ days ago must not include it.
    const card = await gtm.scorecard(owner, { batchId: batchY, to: ymd(24) });
    expect(stage(card, "replied")).toBe(0);
  });

  it("batch and date filters combine", async () => {
    const card = await gtm.scorecard(owner, { batchId: batchY, from: ymd(10) });
    expect(stage(card, "prepared")).toBe(0);
    expect(stage(card, "delivered")).toBe(0);
  });

  it("rejects an inverted date range", async () => {
    await expect(
      gtm.scorecard(owner, { from: "2026-02-01", to: "2026-01-01" }),
    ).rejects.toThrow();
  });

  it("rejects a malformed date", async () => {
    await expect(gtm.scorecard(owner, { from: "not-a-date" })).rejects.toThrow();
  });
});

describe("acceptance 4: stage counts reconcile to distinct prospects", () => {
  it("duplicate events and multiple sequences for one prospect count once", async () => {
    // p1 has 3 sequences and 5 delivered events, 2 replied events.
    const card = await gtm.scorecard(owner, { batchId: batchX });
    const p1Seqs = await db.sequence.findMany({
      where: { workspaceId, prospectId: prospects[1]! },
      select: { id: true },
    });
    const p1Only = await db.providerEvent.count({
      where: { workspaceId, kind: "delivered", sequenceId: { in: p1Seqs.map((q) => q.id) } },
    });
    expect(p1Only).toBeGreaterThanOrEqual(4); // sanity: the data really is duplicated
    expect(stage(card, "delivered")).toBe(2); // p1 once + p3 once
    expect(stage(card, "replied")).toBe(1);
    expect(stage(card, "prepared")).toBe(4); // p1 counted once despite 3 sequences
  });

  it("three raw reply events for one prospect are one replied prospect", async () => {
    const card = await gtm.scorecard(owner, { batchId: batchZ });
    expect(stage(card, "replied")).toBe(1);
  });

  it("every stage equals an independently computed distinct-prospect count", async () => {
    for (const includeSimulated of [false, true]) {
      const card = await gtm.scorecard(owner, { includeSimulated });
      const allowed = includeSimulated
        ? ["live", "imported", "simulated"]
        : ["live", "imported"];
      for (const kind of ["delivered", "replied"]) {
        const events = await db.providerEvent.findMany({
          where: { workspaceId, kind, provenance: { in: allowed } },
          select: { sequenceId: true },
        });
        const owners = await db.sequence.findMany({
          where: { id: { in: events.map((e) => e.sequenceId) } },
          select: { prospectId: true },
        });
        const distinct = new Set(owners.map((o) => o.prospectId));
        expect(stage(card, kind), `${kind} includeSimulated=${includeSimulated}`).toBe(
          distinct.size,
        );
      }
      const seqs = await db.sequence.findMany({
        where: {
          workspaceId,
          ...(includeSimulated ? {} : { NOT: { state: { startsWith: "simulated" } } }),
        },
        select: { prospectId: true, state: true },
      });
      // Cancelled-from-simulated sequences cannot be told apart by state, so only
      // assert the prospect-distinct upper bound and that real prospects are all there.
      const distinctSeqProspects = new Set(seqs.map((s) => s.prospectId));
      expect(stage(card, "prepared")).toBeLessThanOrEqual(distinctSeqProspects.size);
    }
  });

  it("no stage exceeds the number of prospects in the workspace", async () => {
    const total = await db.prospect.count({ where: { workspaceId } });
    const card = await gtm.scorecard(owner, { includeSimulated: true });
    for (const s of card.stages) expect(s.count).toBeLessThanOrEqual(total);
  });
});

describe("acceptance 5: positive reply needs a human-confirmed label", () => {
  it("raw replied events, however many, are not positive replies", async () => {
    const card = await gtm.scorecard(owner);
    expect(stage(card, "replied")).toBeGreaterThan(0);
    expect(card.positive).toBe(0);
    const z = await gtm.scorecard(owner, { batchId: batchZ });
    expect(stage(z, "replied")).toBe(1);
    expect(z.positive).toBe(0);
    expect(await db.audit.count({ where: { workspaceId, action: "reply.labelled" } })).toBe(0);
  });

  it("a failed or invalid label does not create a positive reply", async () => {
    await expect(
      gtm.labelReply(owner, prospects[6]!, { label: "excellent" }),
    ).rejects.toThrow();
    await expect(
      gtm.labelReply(owner, randomUUID(), { label: "positive" }),
    ).rejects.toThrow();
    expect((await gtm.scorecard(owner)).positive).toBe(0);
  });

  it("a confirmed positive label makes exactly one positive reply and writes the audit", async () => {
    await gtm.labelReply(owner, prospects[6]!, { label: "positive" });
    expect(await db.audit.count({ where: { workspaceId, action: "reply.labelled" } })).toBe(1);
    const card = await gtm.scorecard(owner);
    expect(card.positive).toBe(1);
    expect((await gtm.scorecard(owner, { batchId: batchZ })).positive).toBe(1);
    // Other batches are untouched.
    expect((await gtm.scorecard(owner, { batchId: batchY })).positive).toBe(0);
  });

  it("labelling twice the same way still counts the prospect once", async () => {
    await gtm.labelReply(owner, prospects[6]!, { label: "positive" });
    expect((await gtm.scorecard(owner)).positive).toBe(1);
  });

  it("a neutral or negative label is not positive", async () => {
    await gtm.labelReply(owner, prospects[4]!, { label: "neutral" });
    expect((await gtm.scorecard(owner)).positive).toBe(1);
    await gtm.labelReply(owner, prospects[6]!, { label: "negative" });
    expect((await gtm.scorecard(owner)).positive).toBe(0);
  });

  it("a positive label on a prospect whose only reply is simulated is not counted by default", async () => {
    await gtm.labelReply(owner, prospects[3]!, { label: "positive" });
    expect((await gtm.scorecard(owner)).positive).toBe(0);
  });

  it("an operator cannot confirm a label", async () => {
    await expect(
      gtm.labelReply({ ...owner, role: "operator" }, prospects[6]!, { label: "positive" }),
    ).rejects.toThrow();
    expect((await gtm.scorecard(owner)).positive).toBe(0);
  });
});

describe("workspace isolation", () => {
  it("another workspace sees none of this data", async () => {
    const otherWorkspace = randomUUID();
    const otherUser = randomUUID();
    await db.workspace.create({
      data: { id: otherWorkspace, name: "A4 other", crmBinding: "A", assetBinding: "A" },
    });
    await db.user.create({
      data: { id: otherUser, name: "Other", email: `${otherUser}@example.test`, emailVerified: true },
    });
    await db.membership.create({
      data: { workspaceId: otherWorkspace, userId: otherUser, role: "owner" },
    });
    try {
      const card = await gtm.scorecard(
        { workspaceId: otherWorkspace, userId: otherUser, role: "owner" },
        { batchId: batchX, includeSimulated: true },
      );
      expect(card.stages.every((s) => s.count === 0)).toBe(true);
      expect(card.positive).toBe(0);
    } finally {
      await db.membership.deleteMany({ where: { workspaceId: otherWorkspace } });
      await db.workspace.delete({ where: { id: otherWorkspace } });
      await db.user.delete({ where: { id: otherUser } });
    }
  });
});
