import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Actor, Evidence, Touch } from "@revenue/contracts";
import { db, json, digest, itemsDigest, ExportBatchService, GtmService } from "@revenue/backend";

const workspaceId = randomUUID(),
  userId = randomUUID();
const actor: Actor = { workspaceId, userId, role: "owner" };
const service = new ExportBatchService();
const now = new Date().toISOString();
const evidence: Evidence[] = [
  {
    id: "f1",
    claim: "Hiring payroll staff",
    url: "https://lumaro.example/careers",
    date: "2026-09-01",
    kind: "fact",
    approved: true,
    source: "Careers page",
  },
];
const touches = (body: string, subject = "An idea"): Touch[] => [
  { channel: "email", day: 0, subject, body, evidenceIds: ["f1"] },
  { channel: "call", day: 3, body: "Ask for a time.", evidenceIds: [] },
];
const optOut = "Reply stop to opt out.";
const names = [
  "ok1",
  "ok2",
  "ok3",
  "unapproved",
  "edited",
  "evidence",
  "basis",
  "suppressed",
] as const;
const draftIds: Record<string, string> = {};
const prospectIds: Record<string, string> = {};
const emailOf = (name: string) => `${name}@lumaro.example`;
const csv = (rows: string[]) =>
  Buffer.from(["sequence_id,email,outcome,occurred_at", ...rows].join("\n"));
let first: Awaited<ReturnType<ExportBatchService["create"]>>;
let second: Awaited<ReturnType<ExportBatchService["create"]>>;

beforeAll(async () => {
  await db.workspace.create({
    data: {
      id: workspaceId,
      name: "Export batch test",
      crmBinding: "A",
      assetBinding: "A",
      company: json({ description: "Test" }),
      preflight: json({
        mailbox: "sender@caravan.example",
        spf: true,
        dkim: true,
        dmarc: true,
        unsubscribe: true,
        warmupDays: 30,
        bounceRate: 0.005,
        complaintRate: 0.0002,
        dailyCap: 20,
        checkedAt: now,
        simulated: true,
      }),
    },
  });
  await db.user.create({
    data: {
      id: userId,
      name: "Export tester",
      email: `${userId}@example.test`,
    },
  });
  await db.membership.create({ data: { workspaceId, userId, role: "owner" } });
  for (const name of names) {
    const prospect = await db.prospect.create({
      data: {
        workspaceId,
        ownerId: userId,
        sourceKey: emailOf(name),
        country: "SA",
        lawfulBasis: name === "basis" ? null : "relationship",
        basisEvidence: json([
          {
            type: "relationship",
            source: "CRM",
            date: "2026-08-01",
            recordedBy: "tester",
            recordedAt: now,
          },
        ]),
        language: name === "ok2" ? "ar" : "en",
        evidence: json(evidence),
        snapshot: json({
          firstName: name,
          lastName: "Tester",
          email: emailOf(name),
          company: "Lumaro Pay",
          website: "https://lumaro.example",
          title: "Head of People",
          employees: 60,
          hiring: true,
        }),
      },
    });
    prospectIds[name] = prospect.id;
    const body =
      name === "ok2"
        ? `مرحبا، فكرة لفريقك. ${optOut}`
        : `Hello ${name}. ${optOut}`;
    const draft = await db.draft.create({
      data: {
        workspaceId,
        prospectId: prospect.id,
        playVersionId: "play-v1",
        runId: randomUUID(),
        version: name === "edited" ? 2 : 1,
        content: json(touches(body, name === "ok1" ? "=Offer" : "An idea")),
        // jsonb reorders keys, so digest what the database returns, as the app does.
        evidenceDigest: digest(
          (await db.prospect.findUniqueOrThrow({ where: { id: prospect.id } }))
            .evidence,
        ),
        approvedVersion: name === "unapproved" ? null : 1,
      },
    });
    draftIds[name] = draft.id;
  }
  // Evidence changed after approval.
  await db.prospect.update({
    where: { id: prospectIds.evidence },
    data: { evidence: json([{ ...evidence[0], claim: "Changed after approval" }]) },
  });
  await db.suppression.create({
    data: {
      workspaceId,
      identity: emailOf("suppressed"),
      reason: "Opt-out",
    },
  });
});
afterAll(async () => {
  for (const model of [
    db.providerEvent,
    db.exportBatch,
    db.audit,
    db.sequence,
    db.suppression,
    db.draft,
    db.prospect,
  ])
    await (model.deleteMany as (args: object) => Promise<unknown>)({
      where: { workspaceId },
    });
  await db.workspace.delete({ where: { id: workspaceId } });
  await db.user.delete({ where: { id: userId } });
});

describe("approved-batch export (EXP-01)", () => {
  it("exports only approved, basis-cleared drafts, each with its approval digest", async () => {
    first = await service.create(actor, {
      draftIds: [
        draftIds.ok1,
        draftIds.ok2,
        draftIds.unapproved,
        draftIds.edited,
        draftIds.evidence,
        draftIds.basis,
        draftIds.suppressed,
        randomUUID(),
      ],
    });
    expect(first.export?.count).toBe(2);
    const reasons = (name: string) =>
      first.excluded.find((e) => e.draftId === draftIds[name])?.reasons.join(";");
    expect(reasons("unapproved")).toMatch(/approve the current draft/);
    expect(reasons("edited")).toMatch(/approve the current draft/);
    expect(reasons("evidence")).toMatch(/approve the current draft/);
    expect(reasons("basis")).toMatch(/consent\/relationship/);
    expect(reasons("suppressed")).toMatch(/suppressed/);
    expect(first.excluded).toHaveLength(6);
    const batch = await db.exportBatch.findUniqueOrThrow({
      where: { id: first.export!.id },
    });
    const items = batch.items as {
      draftId: string;
      approvalDigest: string;
      sequenceId: string;
      email: string;
      subject: string;
      language: string;
    }[];
    expect(batch.digest).toBe(itemsDigest(items));
    expect(items.map((i) => i.draftId).sort()).toEqual(
      [draftIds.ok1, draftIds.ok2].sort(),
    );
    for (const item of items) expect(item.approvalDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(items.find((i) => i.email === emailOf("ok2"))?.language).toBe("ar");
    const sequences = await db.sequence.findMany({
      where: { batchId: batch.id },
    });
    expect(sequences).toHaveLength(2);
    for (const sequence of sequences) {
      expect(sequence).toMatchObject({
        state: "exported",
        playVersionId: "play-v1",
      });
      expect(
        items.find((i) => i.sequenceId === sequence.id)?.approvalDigest,
      ).toBe(sequence.approvalDigest);
    }
    expect(
      await db.audit.count({ where: { workspaceId, action: "export.created" } }),
    ).toBe(1);
    // Exported contacts are enrolled: a second export of the same draft is refused.
    const again = await service.create(actor, { draftIds: [draftIds.ok1] });
    expect(again.export).toBeNull();
    expect(again.excluded[0]?.reasons.join()).toMatch(/already enrolled/);
  });

  it("applies holdout like queue_sequence: holdout sequences carry no asset", async () => {
    second = await service.create(actor, {
      draftIds: [draftIds.ok3],
      holdoutPercent: 100,
    });
    const sequence = await db.sequence.findFirstOrThrow({
      where: { batchId: second.export!.id },
    });
    expect(sequence.holdout).toBe(true);
    expect(
      (sequence.steps as { assetId: string | null }[]).every(
        (step) => step.assetId === null,
      ),
    ).toBe(true);
  });

  it("restricts who can export and download", async () => {
    await expect(
      service.create({ ...actor, role: "viewer" }, { draftIds: [draftIds.ok1] }),
    ).rejects.toThrow(/cannot write/);
    await expect(service.csv({ ...actor, role: "viewer" }, first.export!.id)).rejects.toThrow(
      /cannot download/,
    );
    await expect(
      service.csv({ ...actor, role: "reviewer" }, first.export!.id),
    ).resolves.toBeTruthy();
    await expect(
      service.csv({ ...actor, workspaceId: randomUUID() }, first.export!.id),
    ).rejects.toThrow(/Export not found/);
  });

  it("downloads a CSV carrying the approval digest and sequence id", async () => {
    const file = await service.csv(actor, first.export!.id);
    expect(file.filename).toMatch(/\.csv$/);
    const header = file.content.replace("﻿", "").split("\r\n")[0];
    expect(header).toContain("approval_digest");
    expect(header).toContain("sequence_id");
    const sequences = await db.sequence.findMany({
      where: { batchId: first.export!.id },
    });
    for (const sequence of sequences) {
      expect(file.content).toContain(sequence.id);
      expect(file.content).toContain(sequence.approvalDigest);
    }
    expect(file.content).toContain("مرحبا");
    // Formula-looking subjects are neutralised for spreadsheets.
    expect(file.content).toContain("'=Offer");
    expect(file.content).not.toContain(emailOf("basis"));
  });

  it("imports outcomes as 'imported' under the batch, rejects other batches, and is idempotent", async () => {
    const [a, b] = await db.sequence.findMany({
      where: { batchId: first.export!.id },
      orderBy: { createdAt: "asc" },
    });
    const other = await db.sequence.findFirstOrThrow({
      where: { batchId: second.export!.id },
    });
    const ok1 = a!.prospectId === prospectIds.ok1 ? a! : b!;
    const ok2 = ok1 === a ? b! : a!;
    const file = csv([
      `${ok1.id},,delivered,2026-10-10T09:00:00Z`,
      `,${emailOf("ok2")},replied,2026-10-11T09:00:00Z`,
      `${other.id},,delivered,2026-10-10T09:00:00Z`,
      `,${emailOf("ok3")},delivered,2026-10-10T09:00:00Z`,
      `,nobody@elsewhere.example,delivered,2026-10-10T09:00:00Z`,
      `${ok1.id},,teleported,2026-10-10T09:00:00Z`,
      `${ok1.id},,bounced,not-a-date`,
    ]);
    const result = await service.importOutcomes(actor, first.export!.id, file);
    expect(result.rows.map((r) => r.status)).toEqual([
      "imported",
      "imported",
      "unmatched",
      "unmatched",
      "unmatched",
      "invalid",
      "invalid",
    ]);
    expect(result).toMatchObject({ imported: 2, rejected: 5, duplicates: 0 });
    const events = await db.providerEvent.findMany({ where: { workspaceId } });
    expect(events).toHaveLength(2);
    for (const event of events) {
      expect(event.provenance).toBe("imported");
      expect(event.id).toContain(`:import:${first.export!.id}:`);
      expect([ok1.id, ok2.id]).toContain(event.sequenceId);
    }
    expect(
      (await db.sequence.findUniqueOrThrow({ where: { id: ok1.id } })).state,
    ).toBe("imported_delivered");
    expect(
      (await db.sequence.findUniqueOrThrow({ where: { id: ok2.id } })).state,
    ).toBe("cancelled");
    expect(
      (await db.sequence.findUniqueOrThrow({ where: { id: other.id } })).state,
    ).toBe("exported");
    // Re-import adds nothing.
    const again = await service.importOutcomes(actor, first.export!.id, file);
    expect(again).toMatchObject({ imported: 0, duplicates: 2 });
    expect(await db.providerEvent.count({ where: { workspaceId } })).toBe(2);
    const listed = (await service.list(actor)).find(
      (batch) => batch.id === first.export!.id,
    );
    expect(listed).toMatchObject({
      count: 2,
      outcomes: { delivered: 1, replied: 1 },
    });
    expect(
      await db.audit.count({
        where: { workspaceId, action: "export.outcomes_imported" },
      }),
    ).toBe(2);
    // Imported outcomes count in the scorecard under their export batch (A5 + A4).
    const gtm = new GtmService();
    const count = (card: Awaited<ReturnType<GtmService["scorecard"]>>, stage: string) =>
      card.stages.find((s) => s.stage === stage)?.count ?? 0;
    const batchCard = await gtm.scorecard(actor, { batchId: first.export!.id });
    expect(count(batchCard, "delivered")).toBeGreaterThanOrEqual(1);
    expect(count(batchCard, "replied")).toBe(1);
    const otherCard = await gtm.scorecard(actor, { batchId: second.export!.id });
    expect(count(otherCard, "delivered")).toBe(0);
    expect(count(otherCard, "replied")).toBe(0);
  });

  it("turns an imported opt-out into a suppression", async () => {
    const other = await db.sequence.findFirstOrThrow({
      where: { batchId: second.export!.id },
    });
    await service.importOutcomes(
      actor,
      second.export!.id,
      csv([`${other.id},,opt_out,2026-10-12T09:00:00Z`]),
    );
    expect(
      await db.suppression.findUnique({
        where: {
          workspaceId_identity: { workspaceId, identity: emailOf("ok3") },
        },
      }),
    ).toMatchObject({ reason: "Provider opt-out" });
    await expect(
      service.importOutcomes({ ...actor, role: "viewer" }, second.export!.id, csv([])),
    ).rejects.toThrow(/cannot write/);
    await expect(
      service.importOutcomes(actor, second.export!.id, Buffer.from("a,b\n1,2\n")),
    ).rejects.toThrow(/needs outcome/);
  });

  it("leaves the live sender guard in workflows.ts unchanged", () => {
    const source = readFileSync(
      new URL("../src/workflows.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain('process.env.PROVIDER_MODE === "live"');
    expect(source).toContain(
      "Live sender activation requires a verified sandbox. This release does not submit outbound messages.",
    );
  });
});
