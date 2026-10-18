import { BadRequestException, NotFoundException } from "@nestjs/common";
import { z } from "zod";
import { FUNNEL, type Actor } from "@revenue/contracts";
import { db, json } from "./database.js";
import { assertRole } from "./policy.js";

// PRD v3.2 A4 (GAP-07, SEQ-08, §10): an honest scorecard. Every stage counts distinct prospects,
// simulated activity is excluded unless asked for, and "positive reply" is a label a person confirms.

export const REPLY_LABELS = ["positive", "neutral", "negative"] as const;
export const replyLabelSchema = z.object({
  label: z.enum(REPLY_LABELS),
  sequenceId: z.uuid().optional(),
});

export type ScorecardFilters = {
  batchId?: string;
  from?: string;
  to?: string;
  includeSimulated?: boolean;
};

type Step = { state?: string };
type ReplyCandidate = {
  prospectId: string;
  sequenceId: string;
  provenance: "live" | "simulated" | "imported";
  occurredAt: string;
  label: (typeof REPLY_LABELS)[number] | null;
};

// A bare date means the whole day: `to` is exclusive of the next midnight.
function bound(value: string | undefined, end: boolean) {
  if (!value) return undefined;
  const at = Date.parse(value);
  if (Number.isNaN(at)) throw new BadRequestException("Enter a valid date.");
  return end && /^\d{4}-\d{2}-\d{2}$/.test(value) ? at + 86400000 : at;
}

// A sequence is simulated while in a simulated_* state. Cancelling it (a prospect review, an
// opt-out) overwrites that state, but its email steps stay "simulated", so it is still excluded.
function simulatedSequence(sequence: { state: string; steps: unknown }) {
  if (sequence.state.startsWith("simulated")) return true;
  return (
    sequence.state === "cancelled" &&
    Array.isArray(sequence.steps) &&
    (sequence.steps as Step[]).some((s) => s?.state === "simulated")
  );
}

export async function scorecard(actor: Actor, filters: ScorecardFilters = {}) {
  const ws = actor.workspaceId;
  const includeSimulated = filters.includeSimulated === true;
  const from = bound(filters.from, false);
  const to = bound(filters.to, true);
  if (from !== undefined && to !== undefined && from >= to)
    throw new BadRequestException("The start date must be before the end date.");
  const inRange = (date: Date) =>
    (from === undefined || date.getTime() >= from) &&
    (to === undefined || date.getTime() < to);

  const [all, allCalls, labels, plays] = await Promise.all([
    db.sequence.findMany({
      where: { workspaceId: ws },
      select: {
        id: true,
        holdout: true,
        prospectId: true,
        state: true,
        steps: true,
        batchId: true,
        playVersionId: true,
        createdAt: true,
      },
    }),
    db.audit.findMany({
      where: { workspaceId: ws, action: "call.outcome" },
      select: { details: true, targetId: true, createdAt: true },
    }),
    db.audit.findMany({
      where: { workspaceId: ws, action: "reply.labelled" },
      orderBy: { createdAt: "asc" },
      select: { details: true, targetId: true },
    }),
    db.playVersion.findMany({
      where: { workspaceId: ws },
      select: { id: true, play: true, version: true },
    }),
  ]);

  // Batches available for filtering, from every sequence the workspace has queued.
  const playName = new Map(plays.map((p) => [p.id, `${p.play} v${p.version}`]));
  const byBatch = new Map<
    string,
    { batchId: string; createdAt: Date; sequences: number; simulated: number; playVersionId: string | null }
  >();
  for (const s of all) {
    if (!s.batchId) continue;
    const batch = byBatch.get(s.batchId) ?? {
      batchId: s.batchId,
      createdAt: s.createdAt,
      sequences: 0,
      simulated: 0,
      playVersionId: s.playVersionId,
    };
    batch.sequences += 1;
    if (simulatedSequence(s)) batch.simulated += 1;
    if (s.createdAt < batch.createdAt) batch.createdAt = s.createdAt;
    byBatch.set(s.batchId, batch);
  }
  const batches = [...byBatch.values()]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((b) => ({
      batchId: b.batchId,
      createdAt: b.createdAt.toISOString(),
      sequences: b.sequences,
      simulated: b.simulated,
      playVersionId: b.playVersionId,
      play: b.playVersionId ? (playName.get(b.playVersionId) ?? null) : null,
    }));

  const sequences = all.filter(
    (s) =>
      (!filters.batchId || s.batchId === filters.batchId) &&
      (includeSimulated || !simulatedSequence(s)) &&
      inRange(s.createdAt),
  );
  const inScope = new Map(sequences.map((s) => [s.id, s]));
  const events = sequences.length
    ? await db.providerEvent.findMany({
        where: {
          workspaceId: ws,
          sequenceId: { in: [...inScope.keys()] },
          ...(includeSimulated ? {} : { provenance: { not: "simulated" } }),
        },
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
        select: { kind: true, sequenceId: true, provenance: true, occurredAt: true },
      })
    : [];

  // Distinct prospects per stage. A reply implies a delivery.
  const prospectsWith = (kinds: string[]) =>
    new Set(
      events
        .filter((e) => kinds.includes(e.kind) && inRange(e.occurredAt))
        .map((e) => inScope.get(e.sequenceId)?.prospectId)
        .filter((id): id is string => Boolean(id)),
    );
  const delivered = prospectsWith(["delivered", "replied"]);
  const replied = prospectsWith(["replied"]);
  const prepared = new Set(sequences.map((s) => s.prospectId));

  // Call outcomes are confirmed by a person. A batch filter keeps only that batch's prospects.
  const calls = allCalls.filter(
    (c) =>
      inRange(c.createdAt) &&
      (!filters.batchId || prepared.has(c.targetId ?? "")),
  );
  const outcome = (o: string) =>
    new Set(
      calls
        .filter((c) => (c.details as { outcome?: string }).outcome === o)
        .map((c) => c.targetId),
    );
  const counts = {
    prepared: prepared.size,
    delivered: delivered.size,
    replied: replied.size,
    meeting: outcome("meeting-booked").size,
    agreed: outcome("agreed").size,
  };

  // The latest label per prospect wins; a person recorded each one. Never inferred.
  const latest = new Map<string, string>();
  for (const l of labels)
    if (l.targetId)
      latest.set(l.targetId, (l.details as { label?: string }).label ?? "");
  // Reply events survive cancellation of the remaining sequence touches. Use the same
  // scoped events as the funnel, keeping the latest eligible reply for each prospect.
  const candidates = new Map<string, ReplyCandidate>();
  for (const event of events) {
    if (event.kind !== "replied" || !inRange(event.occurredAt)) continue;
    const prospectId = inScope.get(event.sequenceId)?.prospectId;
    if (!prospectId || candidates.has(prospectId)) continue;
    const provenance = event.provenance;
    if (
      provenance !== "live" && provenance !== "simulated" && provenance !== "imported"
    ) continue;
    const saved = latest.get(prospectId);
    candidates.set(prospectId, {
      prospectId,
      sequenceId: event.sequenceId,
      provenance,
      occurredAt: event.occurredAt.toISOString(),
      label: saved === "positive" || saved === "neutral" || saved === "negative"
        ? saved : null,
    });
  }
  const labelled = (label: string) =>
    [...latest].filter(([id, value]) => value === label && replied.has(id)).length;

  const group = (holdout: boolean) => {
    const list = sequences.filter((s) => s.holdout === holdout);
    const members = new Set(list.map((s) => s.prospectId));
    const d = [...members].filter((id) => delivered.has(id)).length;
    const r = [...members].filter((id) => replied.has(id)).length;
    return {
      sequences: list.length,
      prospects: members.size,
      delivered: d,
      replied: r,
      replyRate: d ? r / d : null,
    };
  };

  const real = batches.filter((b) => b.simulated < b.sequences).length;
  return {
    stages: FUNNEL.map((stage) => ({ stage, count: counts[stage] })),
    // Confirmed by a person via reply labels; always a subset of "replied".
    positive: labelled("positive"),
    replyCandidates: [...candidates.values()],
    replyLabels: {
      positive: labelled("positive"),
      neutral: labelled("neutral"),
      negative: labelled("negative"),
    },
    asset: group(false),
    holdout: group(true),
    // Below this sample size no lift claim is shown (SEQ-08).
    minimumSample: 100,
    calls: calls.length,
    batches,
    filters: {
      batchId: filters.batchId ?? null,
      from: filters.from ?? null,
      to: filters.to ?? null,
      includeSimulated,
    },
    // §10 measures for Caravan itself. A batch counts once it holds a non-simulated sequence:
    // activation = a first such batch, repeat = a second.
    caravan: {
      batches: real,
      simulatedBatches: batches.length - real,
      activated: real >= 1,
      repeatBatch: real >= 2,
    },
  };
}

// A person confirms how a prospect replied. Reviewers and owners only.
export async function labelReply(actor: Actor, prospectId: string, value: unknown) {
  assertRole(actor, "approve");
  const input = replyLabelSchema.parse(value);
  const prospect = await db.prospect.findFirst({
    where: { id: prospectId, workspaceId: actor.workspaceId },
    select: { id: true },
  });
  if (!prospect) throw new NotFoundException("Prospect not found.");
  if (input.sequenceId) {
    const sequence = await db.sequence.findFirst({
      where: {
        id: input.sequenceId,
        workspaceId: actor.workspaceId,
        prospectId,
      },
      select: { id: true },
    });
    if (!sequence)
      throw new BadRequestException("That sequence does not belong to this prospect.");
  }
  const audit = await db.audit.create({
    data: {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      action: "reply.labelled",
      targetId: prospectId,
      details: json(input),
    },
  });
  return { id: audit.id, prospectId, ...input };
}
