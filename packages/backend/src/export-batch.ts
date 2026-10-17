import { createHash, randomUUID } from "node:crypto";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { parse as parseCsv } from "csv-parse/sync";
import { z } from "zod";
import type {
  Actor,
  Evidence,
  Preflight,
  ProspectSnapshot,
  Touch,
} from "@revenue/contracts";
import { draftChecks } from "@revenue/contracts";
import { db, json, serializable } from "./database.js";
import {
  assertRole,
  channelHolds,
  digest,
  preflightHolds,
  score,
  validateEvidence,
} from "./policy.js";
import { resolveRubric } from "./rubric-core.js";

// EXP-01: approved-batch export and outcome import. A bridge to the customer's own sender:
// nothing here submits a message, and the live-sending guard in workflows.ts is untouched.

export const exportRequestSchema = z.object({
  draftIds: z.array(z.uuid()).min(1).max(100),
  holdoutPercent: z.number().int().min(0).max(100).default(0),
});

export const EXPORT_OUTCOMES = [
  "delivered",
  "replied",
  "bounced",
  "opt_out",
  "meeting_booked",
] as const;
export type ExportOutcome = (typeof EXPORT_OUTCOMES)[number];

export const EXPORT_CSV_COLUMNS = [
  "batch_id",
  "sequence_id",
  "approval_digest",
  "play_version_id",
  "prospect_id",
  "draft_id",
  "draft_version",
  "email",
  "first_name",
  "last_name",
  "company",
  "language",
  "step",
  "day",
  "subject",
  "body",
  "holdout",
] as const;

export type ExportItem = {
  sequenceId: string;
  prospectId: string;
  draftId: string;
  version: number;
  approvalDigest: string;
  playVersionId: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  language: string;
  holdout: boolean;
  subject: string;
  body: string;
  touches: { step: number; day: number; subject: string; body: string }[];
};
export type ExcludedDraft = { draftId: string; reasons: string[] };
export type OutcomeRowResult = {
  row: number;
  status: "imported" | "duplicate" | "unmatched" | "invalid";
  message: string;
  sequenceId?: string;
  outcome?: ExportOutcome;
};

// Rank mirrors events.ts so a late "delivered" never overwrites a reply.
const rank: Record<string, number> = {
  exported: 0,
  delivered: 3,
  bounced: 4,
  replied: 5,
  meeting_booked: 5,
  opt_out: 6,
  cancelled: 7,
};
const stateRank = (state: string) =>
  rank[state.replace(/^(imported|simulated)_/, "")] ?? 0;

// jsonb does not keep key order, so the batch digest is taken over key-sorted JSON.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
export const itemsDigest = (items: unknown) =>
  createHash("sha256").update(canonical(items)).digest("hex");

// Spreadsheet formula guard plus RFC 4180 quoting.
function cell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function assertDownload(actor: Actor) {
  if (!["owner", "operator", "reviewer"].includes(actor.role))
    throw new ForbiddenException(
      `Your ${actor.role} role cannot download this export.`,
    );
}

export class ExportBatchService {
  async create(actor: Actor, value: unknown) {
    assertRole(actor, "write");
    const input = exportRequestSchema.parse(value);
    const draftIds = [...new Set(input.draftIds)];
    return serializable(async (tx) => {
      const workspace = await tx.workspace.findUniqueOrThrow({
        where: { id: actor.workspaceId },
      });
      const preflight = preflightHolds(workspace.preflight as Partial<Preflight>);
      const marketingLicence =
        (workspace.company as { marketingLicence?: boolean })
          .marketingLicence === true;
      const rubric = resolveRubric(workspace);
      const exportId = randomUUID();
      const items: ExportItem[] = [];
      const excluded: ExcludedDraft[] = [];
      for (const draftId of draftIds) {
        const draft = await tx.draft.findFirst({
          where: { id: draftId, workspaceId: actor.workspaceId },
        });
        const prospect = draft
          ? await tx.prospect.findFirst({
              where: { id: draft.prospectId, workspaceId: actor.workspaceId },
            })
          : null;
        if (!draft || !prospect) {
          excluded.push({ draftId, reasons: ["Draft not found"] });
          continue;
        }
        const holds = [...preflight, ...channelHolds(prospect, marketingLicence)];
        const snapshot = prospect.snapshot as ProspectSnapshot;
        if (score(snapshot, rubric).disqualified)
          holds.push(
            "This account is below the deterministic qualification threshold",
          );
        try {
          validateEvidence(prospect.evidence as Evidence[]);
        } catch (error) {
          holds.push((error as Error).message);
        }
        if (
          draft.approvedVersion !== draft.version ||
          draft.evidenceDigest !== digest(prospect.evidence)
        )
          holds.push("Review and approve the current draft and evidence");
        const content = draft.content as Touch[];
        for (const check of draftChecks(content, prospect.language))
          if (check.level === "error") holds.push(check.message);
        if (
          await tx.suppression.findUnique({
            where: {
              workspaceId_identity: {
                workspaceId: actor.workspaceId,
                identity: prospect.sourceKey,
              },
            },
          })
        )
          holds.push("This contact is suppressed");
        if (
          await tx.sequence.count({
            where: {
              workspaceId: actor.workspaceId,
              prospectId: prospect.id,
              state: { notIn: ["cancelled", "completed", "failed"] },
            },
          })
        )
          holds.push("This contact is already enrolled in an active sequence");
        const emails = content.filter((touch) => touch.channel === "email");
        if (!emails.length) holds.push("The draft has no email touch to export");
        if (holds.length) {
          excluded.push({ draftId, reasons: [...new Set(holds)] });
          continue;
        }
        const holdout =
          parseInt(digest(prospect.id).slice(0, 8), 16) % 100 <
          input.holdoutPercent;
        const approvalDigest = digest({
          content: draft.content,
          evidence: prospect.evidence,
          sender: workspace.preflight,
          company: workspace.company,
          holdoutPercent: input.holdoutPercent,
        });
        const sequence = await tx.sequence.create({
          data: {
            workspaceId: actor.workspaceId,
            prospectId: prospect.id,
            draftId: draft.id,
            draftVersion: draft.version,
            approvalDigest,
            sender: (workspace.preflight as Preflight).mailbox,
            state: "exported",
            holdout,
            nextAt: null,
            batchId: exportId,
            playVersionId: draft.playVersionId,
            steps: json(
              content.map((touch) => ({
                ...touch,
                state: touch.channel === "email" ? "exported" : "manual",
                assetId: holdout ? null : draft.assetId,
              })),
            ),
          },
        });
        items.push({
          sequenceId: sequence.id,
          prospectId: prospect.id,
          draftId: draft.id,
          version: draft.version,
          approvalDigest,
          playVersionId: draft.playVersionId,
          email: snapshot.email,
          firstName: snapshot.firstName,
          lastName: snapshot.lastName,
          company: snapshot.company,
          language: prospect.language,
          holdout,
          subject: emails[0]!.subject ?? "",
          body: emails[0]!.body,
          touches: content.flatMap((touch, index) =>
            touch.channel === "email"
              ? [
                  {
                    step: index + 1,
                    day: touch.day,
                    subject: touch.subject ?? "",
                    body: touch.body,
                  },
                ]
              : [],
          ),
        });
      }
      if (!items.length) return { export: null, excluded };
      const batch = await tx.exportBatch.create({
        data: {
          id: exportId,
          workspaceId: actor.workspaceId,
          createdBy: actor.userId,
          digest: itemsDigest(items),
          items: json(items),
        },
      });
      await tx.audit.create({
        data: {
          workspaceId: actor.workspaceId,
          userId: actor.userId,
          action: "export.created",
          targetId: batch.id,
          details: json({
            digest: batch.digest,
            included: items.length,
            excluded: excluded.length,
            holdoutPercent: input.holdoutPercent,
          }),
        },
      });
      return {
        export: {
          id: batch.id,
          digest: batch.digest,
          createdAt: batch.createdAt,
          count: items.length,
          sequenceIds: items.map((item) => item.sequenceId),
        },
        excluded,
      };
    });
  }

  async list(actor: Actor) {
    const batches = await db.exportBatch.findMany({
      where: { workspaceId: actor.workspaceId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const sequences = await db.sequence.findMany({
      where: {
        workspaceId: actor.workspaceId,
        batchId: { in: batches.map((batch) => batch.id) },
      },
      select: { id: true, batchId: true },
    });
    const batchOf = new Map(sequences.map((s) => [s.id, s.batchId]));
    const events = sequences.length
      ? await db.providerEvent.findMany({
          where: {
            workspaceId: actor.workspaceId,
            provenance: "imported",
            sequenceId: { in: sequences.map((s) => s.id) },
          },
          select: { sequenceId: true, kind: true },
        })
      : [];
    return batches.map((batch) => {
      const outcomes: Record<string, number> = {};
      for (const event of events)
        if (batchOf.get(event.sequenceId) === batch.id)
          outcomes[event.kind] = (outcomes[event.kind] ?? 0) + 1;
      return {
        id: batch.id,
        digest: batch.digest,
        createdAt: batch.createdAt,
        createdBy: batch.createdBy,
        count: (batch.items as ExportItem[]).length,
        outcomes,
      };
    });
  }

  async csv(actor: Actor, exportId: string) {
    assertDownload(actor);
    const batch = await db.exportBatch.findFirst({
      where: { id: exportId, workspaceId: actor.workspaceId },
    });
    if (!batch) throw new NotFoundException("Export not found");
    const items = batch.items as ExportItem[];
    if (itemsDigest(items) !== batch.digest)
      throw new BadRequestException(
        "This export no longer matches its recorded digest.",
      );
    const lines = [EXPORT_CSV_COLUMNS.join(",")];
    for (const item of items)
      for (const touch of item.touches)
        lines.push(
          [
            batch.id,
            item.sequenceId,
            item.approvalDigest,
            item.playVersionId,
            item.prospectId,
            item.draftId,
            item.version,
            item.email,
            item.firstName,
            item.lastName,
            item.company,
            item.language,
            touch.step,
            touch.day,
            touch.subject,
            touch.body,
            item.holdout,
          ]
            .map(cell)
            .join(","),
        );
    return {
      filename: `approved-batch-${batch.id.slice(0, 8)}.csv`,
      // BOM keeps Arabic text intact when the file is opened in Excel.
      content: `﻿${lines.join("\r\n")}\r\n`,
    };
  }

  async importOutcomes(actor: Actor, exportId: string, buffer: Buffer) {
    assertRole(actor, "write");
    let records: Record<string, string>[];
    try {
      records = parseCsv(buffer, {
        columns: (header: string[]) =>
          header.map((name) => name.trim().toLowerCase()),
        bom: true,
        skip_empty_lines: true,
        max_record_size: 20000,
        to: 1001,
        relax_column_count: true,
      });
    } catch {
      throw new BadRequestException("Upload a valid CSV file.");
    }
    if (records.length > 1000)
      throw new BadRequestException("Import at most 1,000 outcome rows.");
    const columns = new Set(Object.keys(records[0] ?? {}));
    if (
      !columns.has("outcome") ||
      !columns.has("occurred_at") ||
      !(columns.has("sequence_id") || columns.has("email"))
    )
      throw new BadRequestException(
        "The CSV needs outcome, occurred_at and a sequence_id or email column.",
      );
    return serializable(async (tx) => {
      const batch = await tx.exportBatch.findFirst({
        where: { id: exportId, workspaceId: actor.workspaceId },
      });
      if (!batch) throw new NotFoundException("Export not found");
      const items = batch.items as ExportItem[];
      const bySequence = new Map(items.map((item) => [item.sequenceId, item]));
      const byEmail = new Map<string, ExportItem[]>();
      for (const item of items) {
        const key = item.email.trim().toLowerCase();
        byEmail.set(key, [...(byEmail.get(key) ?? []), item]);
      }
      const rows: OutcomeRowResult[] = [];
      for (const [index, record] of records.entries()) {
        const row = index + 2;
        const reject = (
          status: "unmatched" | "invalid",
          message: string,
        ): void => {
          rows.push({ row, status, message });
        };
        const outcome = (record.outcome ?? "")
          .trim()
          .toLowerCase()
          .replace(/[\s-]+/g, "_") as ExportOutcome;
        if (!(EXPORT_OUTCOMES as readonly string[]).includes(outcome)) {
          reject(
            "invalid",
            `Outcome must be one of ${EXPORT_OUTCOMES.join(", ")}`,
          );
          continue;
        }
        const when = Date.parse((record.occurred_at ?? "").trim());
        if (!Number.isFinite(when)) {
          reject("invalid", "occurred_at must be a valid date");
          continue;
        }
        if (when > Date.now() + 60000) {
          reject("invalid", "occurred_at is in the future");
          continue;
        }
        const sequenceId = (record.sequence_id ?? "").trim();
        const email = (record.email ?? "").trim().toLowerCase();
        let item: ExportItem | undefined;
        if (sequenceId) {
          item = bySequence.get(sequenceId);
          if (!item) {
            reject("unmatched", "Sequence does not belong to this export");
            continue;
          }
          if (email && email !== item.email.trim().toLowerCase()) {
            reject("unmatched", "Email does not match the sequence");
            continue;
          }
        } else if (email) {
          const matches = byEmail.get(email) ?? [];
          if (matches.length > 1) {
            reject("unmatched", "Email matches more than one sequence");
            continue;
          }
          item = matches[0];
          if (!item) {
            reject("unmatched", "Email is not in this export");
            continue;
          }
        } else {
          reject("invalid", "Row needs a sequence_id or an email");
          continue;
        }
        const occurredAt = new Date(when);
        const eventId = `${actor.workspaceId}:import:${exportId}:${digest({
          sequenceId: item.sequenceId,
          outcome,
          occurredAt: occurredAt.toISOString(),
        }).slice(0, 32)}`;
        if (await tx.providerEvent.findUnique({ where: { id: eventId } })) {
          rows.push({
            row,
            status: "duplicate",
            message: "Already imported",
            sequenceId: item.sequenceId,
            outcome,
          });
          continue;
        }
        await tx.providerEvent.create({
          data: {
            id: eventId,
            workspaceId: actor.workspaceId,
            sequenceId: item.sequenceId,
            kind: outcome,
            occurredAt,
            provenance: "imported",
          },
        });
        const sequence = await tx.sequence.findFirstOrThrow({
          where: { id: item.sequenceId, workspaceId: actor.workspaceId },
        });
        // Same semantics as events.ts: a reply or opt-out cancels every open sequence for the contact.
        if (outcome === "replied" || outcome === "opt_out") {
          const prospect = await tx.prospect.findFirstOrThrow({
            where: { id: sequence.prospectId, workspaceId: actor.workspaceId },
          });
          await tx.sequence.updateMany({
            where: {
              workspaceId: actor.workspaceId,
              prospectId: prospect.id,
              state: { notIn: ["completed", "failed"] },
            },
            data: { state: "cancelled", nextAt: null },
          });
          if (outcome === "opt_out")
            await tx.suppression.upsert({
              where: {
                workspaceId_identity: {
                  workspaceId: actor.workspaceId,
                  identity: prospect.sourceKey,
                },
              },
              create: {
                workspaceId: actor.workspaceId,
                identity: prospect.sourceKey,
                reason: "Provider opt-out",
              },
              update: { reason: "Provider opt-out" },
            });
        } else if (
          sequence.state !== "cancelled" &&
          stateRank(outcome) > stateRank(sequence.state)
        )
          await tx.sequence.update({
            where: { id: sequence.id },
            data: { state: `imported_${outcome}` },
          });
        rows.push({
          row,
          status: "imported",
          message: "Imported",
          sequenceId: item.sequenceId,
          outcome,
        });
      }
      const counts = {
        total: rows.length,
        imported: rows.filter((r) => r.status === "imported").length,
        duplicates: rows.filter((r) => r.status === "duplicate").length,
        rejected: rows.filter((r) => ["unmatched", "invalid"].includes(r.status))
          .length,
      };
      await tx.audit.create({
        data: {
          workspaceId: actor.workspaceId,
          userId: actor.userId,
          action: "export.outcomes_imported",
          targetId: exportId,
          details: json(counts),
        },
      });
      return { exportId, ...counts, rows };
    });
  }
}
