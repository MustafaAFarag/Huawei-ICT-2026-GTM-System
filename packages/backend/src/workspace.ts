import { BadRequestException, NotFoundException } from "@nestjs/common";
import { z } from "zod";
import ExcelJS from "exceljs";
import { parse as parseCsv } from "csv-parse/sync";
import type {
  Actor,
  Evidence,
  ProspectSnapshot,
  Touch,
} from "@revenue/contracts";
import { PLANS } from "@revenue/contracts";
import { db, json, serializable } from "./database.js";
import { assertRole, digest, month, validateEvidence } from "./policy.js";
import { Crm } from "./providers.js";

export const prospectSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).default(""),
  email: z.union([z.email(), z.literal("")]).default(""),
  company: z.string().min(1).max(200),
  website: z.union([z.url(), z.literal("")]).default(""),
  title: z.string().max(200).default(""),
  employees: z.coerce.number().int().positive().optional(),
  industry: z.string().max(200).optional(),
  funding: z.boolean().optional(),
  hiring: z.boolean().optional(),
  existingClient: z.boolean().optional(),
});
export const evidenceSchema = z
  .array(
    z.object({
      id: z.uuid(),
      claim: z.string().min(1).max(2000),
      url: z
        .url()
        .refine((url) => /^https?:\/\//.test(url), "Use HTTP or HTTPS"),
      date: z.iso.datetime(),
      kind: z.enum(["fact", "hypothesis", "unknown"]),
      approved: z.boolean(),
      source: z.string().max(200),
    }),
  )
  .max(30);
const touchesSchema = z
  .array(
    z.object({
      channel: z.enum(["email", "linkedin", "call"]),
      day: z.number().int().min(0).max(60),
      subject: z.string().max(200).optional(),
      body: z.string().min(1).max(5000),
      evidenceIds: z.array(z.uuid()),
    }),
  )
  .length(3);

export class WorkspaceService {
  async workspace(actor: Actor) {
    const workspace = await db.workspace.findUnique({
      where: { id: actor.workspaceId },
    });
    if (!workspace) throw new NotFoundException("Workspace not found.");
    return workspace;
  }
  async dashboard(actor: Actor) {
    const [
      workspace,
      prospects,
      drafts,
      assets,
      runs,
      sequences,
      connectors,
      budgets,
      audit,
    ] = await Promise.all([
      this.workspace(actor),
      db.prospect.findMany({
        where: { workspaceId: actor.workspaceId },
        orderBy: { createdAt: "desc" },
      }),
      db.draft.findMany({
        where: { workspaceId: actor.workspaceId },
        orderBy: { updatedAt: "desc" },
      }),
      db.asset.findMany({
        where: { workspaceId: actor.workspaceId },
        orderBy: { createdAt: "desc" },
      }),
      db.run.findMany({
        where: { workspaceId: actor.workspaceId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.sequence.findMany({
        where: { workspaceId: actor.workspaceId },
        orderBy: { createdAt: "desc" },
      }),
      db.connector.findMany({
        where: { workspaceId: actor.workspaceId },
        select: {
          provider: true,
          status: true,
          mode: true,
          lastSuccess: true,
          lastError: true,
        },
      }),
      db.budget.findMany({
        where: { workspaceId: actor.workspaceId, month: month() },
      }),
      db.audit.findMany({
        where: { workspaceId: actor.workspaceId },
        orderBy: { id: "desc" },
        take: 50,
      }),
    ]);
    return {
      workspace,
      role: actor.role,
      prospects,
      drafts,
      assets,
      runs,
      sequences,
      connectors,
      budgets,
      audit,
      plans: PLANS,
      fixture: process.env.PROVIDER_MODE !== "live",
      modelFixture: process.env.MODEL_MODE !== "live",
      quotas: await db.quota.findMany({
        where: { workspaceId: actor.workspaceId, month: month() },
      }),
      members: await db.membership.findMany({
        where: { workspaceId: actor.workspaceId },
        select: {
          userId: true,
          role: true,
          creditCap: true,
          user: { select: { name: true, email: true } },
        },
      }),
    };
  }
  async configure(actor: Actor, value: unknown) {
    assertRole(actor, "admin");
    const input = z
      .object({
        name: z.string().min(1).max(100).optional(),
        company: z
          .object({
            description: z.string().max(3000),
            icp: z.string().max(2000),
            marketingLicence: z.boolean(),
          })
          .optional(),
        brand: z
          .object({
            name: z.string().min(1).max(100),
            primary: z.string().regex(/^#[\da-f]{6}$/i),
            accent: z.string().regex(/^#[\da-f]{6}$/i),
            website: z.url(),
          })
          .optional(),
        offers: z
          .array(
            z.object({
              id: z.string().max(100),
              text: z.string().min(1).max(2000),
              approved: z.boolean(),
            }),
          )
          .max(20)
          .optional(),
        plan: z
          .enum(["Free", "Solo", "Team", "Agency", "Enterprise"])
          .optional(),
        cap: z.number().int().min(0).max(100000).optional(),
        planLimits: z
          .object({
            aiCredits: z.number().int().min(0).max(100000),
            enrichmentCredits: z.number().int().min(0).max(100000),
            sends: z.number().int().min(0).max(1000000),
            exports: z.number().int().min(0).max(10000),
          })
          .optional(),
        memberCaps: z
          .array(
            z.object({
              userId: z.string().min(1).max(100),
              cap: z.number().int().min(0).max(100000),
            }),
          )
          .max(100)
          .optional(),
      })
      .parse(value);
    return serializable(async (tx) => {
      const { cap, memberCaps, ...data } = input;
      const updated = await tx.workspace.update({
        where: { id: actor.workspaceId },
        data,
      });
      if (cap !== undefined)
        await tx.budget.upsert({
          where: { id: `${actor.workspaceId}:${month()}` },
          create: {
            id: `${actor.workspaceId}:${month()}`,
            workspaceId: actor.workspaceId,
            month: month(),
            cap,
          },
          update: { cap },
        });
      for (const member of memberCaps ?? []) {
        const updated = await tx.membership.updateMany({
          where: { workspaceId: actor.workspaceId, userId: member.userId },
          data: { creditCap: member.cap },
        });
        if (!updated.count)
          throw new BadRequestException(
            "This member does not belong to the workspace.",
          );
        const id = `${actor.workspaceId}:${member.userId}:${month()}`;
        await tx.budget.upsert({
          where: { id },
          create: {
            id,
            workspaceId: actor.workspaceId,
            userId: member.userId,
            month: month(),
            cap: member.cap,
          },
          update: { cap: member.cap },
        });
      }
      // Context changes invalidate approvals and queued execution in one transaction.
      if (input.company || input.offers || input.brand) {
        await tx.asset.updateMany({
          where: { workspaceId: actor.workspaceId },
          data: { approvedAt: null, approvedBy: null },
        });
        await tx.draft.updateMany({
          where: { workspaceId: actor.workspaceId },
          data: { approvedVersion: null, approvedAt: null, approvedBy: null },
        });
        await tx.sequence.updateMany({
          where: {
            workspaceId: actor.workspaceId,
            state: { notIn: ["cancelled", "completed", "failed"] },
          },
          data: { state: "cancelled" },
        });
      }
      await tx.audit.create({
        data: {
          workspaceId: actor.workspaceId,
          userId: actor.userId,
          action: "workspace.updated",
          details: json(Object.keys(input)),
        },
      });
      return updated;
    });
  }
  async import(
    actor: Actor,
    buffer: Buffer,
    filename: string,
    requestKey: string,
    mapping: Record<string, string> = {},
  ) {
    assertRole(actor, "write");
    z.string().min(8).max(150).parse(requestKey);
    if (buffer.length > 5 * 1024 * 1024 || !/\.(csv|xlsx)$/i.test(filename))
      throw new BadRequestException("Upload CSV or XLSX up to 5 MB.");
    const inputDigest = digest({ bytes: buffer.toString("base64"), mapping });
    let batch = await db.importBatch.findUnique({
      where: {
        workspaceId_requestKey: { workspaceId: actor.workspaceId, requestKey },
      },
    });
    if (batch && batch.digest !== inputDigest)
      throw new BadRequestException(
        "This import key was already used for a different file or mapping.",
      );
    let rows: Record<string, unknown>[];
    if (/\.csv$/i.test(filename))
      rows = parseCsv(buffer, {
        columns: true,
        bom: true,
        skip_empty_lines: true,
        max_record_size: 20000,
        to: 1001,
      });
    else {
      validateXlsxArchive(buffer);
      const book = new ExcelJS.Workbook();
      await book.xlsx.load(buffer as never);
      const sheet = book.worksheets[0];
      if (!sheet || sheet.rowCount > 1001 || sheet.columnCount > 50)
        throw new BadRequestException(
          "XLSX must have at most 1,000 rows and 50 columns.",
        );
      const headers: string[] = [];
      sheet.getRow(1).eachCell((cell, column) => {
        headers[column] = cell.text.trim();
      });
      rows = [];
      sheet.eachRow((row, index) => {
        if (index === 1) return;
        const value: Record<string, unknown> = {};
        row.eachCell((cell, column) => {
          if (headers[column])
            value[headers[column]!] =
              cell.type === ExcelJS.ValueType.Number ? cell.value : cell.text;
        });
        rows.push(value);
      });
    }
    if (rows.length > 1000)
      throw new BadRequestException("Import at most 1,000 rows per file.");
    batch = await db.importBatch.upsert({
      where: {
        workspaceId_requestKey: { workspaceId: actor.workspaceId, requestKey },
      },
      create: {
        workspaceId: actor.workspaceId,
        requestKey,
        digest: inputDigest,
        outcomes: [],
      },
      update: {},
    });
    if (batch.digest !== inputDigest)
      throw new BadRequestException(
        "This import key belongs to a different file or mapping.",
      );
    const acquired = await db.importBatch.updateMany({
      where: {
        id: batch.id,
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }],
      },
      data: { leaseUntil: new Date(Date.now() + 180000) },
    });
    if (!acquired.count)
      return { id: batch.id, outcomes: batch.outcomes, inProgress: true };
    const outcomes = batch.outcomes as {
      row: number;
      state: string;
      id?: string;
      message?: string;
    }[];
    const workspace = await this.workspace(actor);
    const limit =
      PLANS[workspace.plan as keyof typeof PLANS]?.records ??
      PLANS.Free.records;
    try {
      for (let index = 0; index < rows.length; index++) {
        if (
          outcomes.some(
            (result) => result.row === index + 2 && result.state === "imported",
          )
        )
          continue;
        const row = rows[index]!;
        const normalized = Object.fromEntries(
          Object.entries(row).map(([key, value]) => [key.trim(), value]),
        );
        for (const [target, source] of Object.entries(mapping))
          normalized[target] = row[source];
        const parsed = prospectSchema.safeParse(normalized);
        let outcome: (typeof outcomes)[number];
        if (!parsed.success)
          outcome = {
            row: index + 2,
            state: "invalid",
            message: parsed.error.issues
              .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
              .join("; "),
          };
        else {
          const snapshot = parsed.data;
          const sourceKey = (
            snapshot.email ||
            `${snapshot.company}:${snapshot.firstName}:${snapshot.lastName}`
          )
            .trim()
            .toLowerCase();
          try {
            const prospect = await serializable(async (tx) => {
              const existing = await tx.prospect.findUnique({
                where: {
                  workspaceId_sourceKey: {
                    workspaceId: actor.workspaceId,
                    sourceKey,
                  },
                },
              });
              if (existing) {
                if (
                  !snapshot.email &&
                  digest(existing.snapshot) !== digest(snapshot)
                )
                  throw new Error(
                    "Ambiguous identity without email. Review and supply a verified professional identifier.",
                  );
                return existing;
              }
              if (
                (await tx.prospect.count({
                  where: { workspaceId: actor.workspaceId },
                })) >= limit
              )
                throw new Error("Record quota reached.");
              return tx.prospect.create({
                data: {
                  workspaceId: actor.workspaceId,
                  sourceKey,
                  snapshot: json(snapshot),
                  ownerId: actor.userId,
                },
              });
            });
            const crm = await new Crm(workspace).upsertPerson(
              sourceKey,
              snapshot,
              prospect,
            );
            await serializable(async (tx) => {
              const current = await tx.prospect.findUniqueOrThrow({
                where: { id: prospect.id },
              });
              if (digest(current.snapshot) !== digest(snapshot)) {
                await tx.draft.updateMany({
                  where: {
                    workspaceId: actor.workspaceId,
                    prospectId: prospect.id,
                  },
                  data: {
                    approvedVersion: null,
                    approvedAt: null,
                    approvedBy: null,
                  },
                });
                await tx.asset.updateMany({
                  where: {
                    workspaceId: actor.workspaceId,
                    prospectId: prospect.id,
                  },
                  data: { approvedAt: null, approvedBy: null },
                });
                await tx.sequence.updateMany({
                  where: {
                    workspaceId: actor.workspaceId,
                    prospectId: prospect.id,
                    state: { notIn: ["cancelled", "completed", "failed"] },
                  },
                  data: { state: "cancelled" },
                });
              }
              await tx.prospect.update({
                where: { id: prospect.id },
                data: { ...crm, snapshot: json(snapshot) },
              });
            });
            outcome = { row: index + 2, state: "imported", id: prospect.id };
          } catch (error) {
            outcome = {
              row: index + 2,
              state: "retry",
              message:
                error instanceof Error
                  ? error.message
                  : "Import failed. Retry this file with the same key.",
            };
          }
        }
        const previous = outcomes.findIndex(
          (result) => result.row === outcome.row,
        );
        if (previous >= 0) outcomes[previous] = outcome;
        else outcomes.push(outcome);
        await db.importBatch.update({
          where: { id: batch.id },
          data: {
            outcomes: json(outcomes),
            leaseUntil: new Date(Date.now() + 180000),
          },
        });
      }
    } finally {
      await db.importBatch.update({
        where: { id: batch.id },
        data: { leaseUntil: null },
      });
    }
    return { id: batch.id, outcomes };
  }
  async reviewProspect(actor: Actor, id: string, value: unknown) {
    assertRole(actor, "approve");
    const input = z
      .object({
        evidence: evidenceSchema,
        lawfulBasis: z.enum(["consent", "relationship", ""]).default(""),
        consentAt: z.iso.datetime().nullable().default(null),
        country: z.enum(["EG", "SA", "AE"]).default("EG"),
        excluded: z.boolean().default(false),
      })
      .parse(value);
    return serializable(async (tx) => {
      const prospect = await tx.prospect.findFirst({
        where: { id, workspaceId: actor.workspaceId },
      });
      if (!prospect) throw new NotFoundException("Prospect not found.");
      const updated = await tx.prospect.update({
        where: { id },
        data: {
          ...input,
          evidence: json(input.evidence),
          consentAt: input.consentAt ? new Date(input.consentAt) : null,
        },
      });
      await tx.asset.updateMany({
        where: { workspaceId: actor.workspaceId, prospectId: id },
        data: { approvedAt: null, approvedBy: null },
      });
      await tx.draft.updateMany({
        where: { workspaceId: actor.workspaceId, prospectId: id },
        data: { approvedAt: null, approvedBy: null, approvedVersion: null },
      });
      await tx.sequence.updateMany({
        where: {
          workspaceId: actor.workspaceId,
          prospectId: id,
          state: { notIn: ["cancelled", "completed", "failed"] },
        },
        data: { state: "cancelled" },
      });
      await tx.audit.create({
        data: {
          workspaceId: actor.workspaceId,
          userId: actor.userId,
          action: "evidence.reviewed",
          targetId: id,
          details: json(input),
        },
      });
      return updated;
    });
  }
  async draft(actor: Actor, id: string, value: unknown, approve: boolean) {
    assertRole(actor, approve ? "approve" : "write");
    const input = z
      .object({
        version: z.number().int().positive(),
        content: touchesSchema.optional(),
      })
      .parse(value);
    return serializable(async (tx) => {
      const draft = await tx.draft.findFirst({
        where: { id, workspaceId: actor.workspaceId },
      });
      if (!draft) throw new NotFoundException("Draft not found.");
      if (draft.version !== input.version)
        throw new BadRequestException(
          "This draft changed. Reload and review its current version.",
        );
      const prospect = await tx.prospect.findFirstOrThrow({
        where: { id: draft.prospectId, workspaceId: actor.workspaceId },
      });
      if (approve) {
        validateEvidence(prospect.evidence as Evidence[]);
        if (draft.evidenceDigest !== digest(prospect.evidence))
          throw new BadRequestException(
            "Evidence changed. Generate a new draft before approval.",
          );
        const ids = new Set(
          (prospect.evidence as Evidence[])
            .filter((e) => e.approved && e.kind === "fact")
            .map((e) => e.id),
        );
        if (
          (draft.content as Touch[]).some((t) =>
            t.evidenceIds.some((ref) => !ids.has(ref)),
          )
        )
          throw new BadRequestException(
            "Every cited claim must reference approved evidence.",
          );
      }
      const updated = await tx.draft.update({
        where: { id },
        data: approve
          ? {
              approvedVersion: draft.version,
              approvedAt: new Date(),
              approvedBy: actor.userId,
            }
          : {
              content: json(input.content ?? draft.content),
              version: { increment: 1 },
              approvedVersion: null,
              approvedAt: null,
              approvedBy: null,
            },
      });
      if (!approve)
        await tx.sequence.updateMany({
          where: {
            workspaceId: actor.workspaceId,
            draftId: id,
            state: { notIn: ["cancelled", "completed", "failed"] },
          },
          data: { state: "cancelled" },
        });
      await tx.audit.create({
        data: {
          workspaceId: actor.workspaceId,
          userId: actor.userId,
          action: approve ? "draft.approved" : "draft.edited",
          targetId: id,
          details: json({ version: updated.version }),
        },
      });
      return updated;
    });
  }
  async suppress(actor: Actor, identity: string, reason: string) {
    assertRole(actor, "write");
    const normalized = z
      .string()
      .min(3)
      .max(300)
      .parse(identity)
      .trim()
      .toLowerCase();
    return serializable(async (tx) => {
      const item = await tx.suppression.upsert({
        where: {
          workspaceId_identity: {
            workspaceId: actor.workspaceId,
            identity: normalized,
          },
        },
        create: {
          workspaceId: actor.workspaceId,
          identity: normalized,
          reason,
        },
        update: { reason },
      });
      const prospects = await tx.prospect.findMany({
        where: { workspaceId: actor.workspaceId, sourceKey: normalized },
        select: { id: true },
      });
      await tx.sequence.updateMany({
        where: {
          workspaceId: actor.workspaceId,
          prospectId: { in: prospects.map((p) => p.id) },
        },
        data: { state: "cancelled" },
      });
      await tx.audit.create({
        data: {
          workspaceId: actor.workspaceId,
          userId: actor.userId,
          action: "suppression.added",
          details: json({ identity: normalized, reason }),
        },
      });
      return item;
    });
  }
}

// Bound decompressed input before ExcelJS allocates its workbook.
function validateXlsxArchive(buffer: Buffer) {
  let end = -1;
  for (
    let at = buffer.length - 22;
    at >= Math.max(0, buffer.length - 65557);
    at--
  )
    if (buffer.readUInt32LE(at) === 0x06054b50) {
      end = at;
      break;
    }
  if (end < 0 || buffer.readUInt16LE(end + 4) || buffer.readUInt16LE(end + 6))
    throw new BadRequestException("Use a standard XLSX workbook.");
  const count = buffer.readUInt16LE(end + 10);
  let cursor = buffer.readUInt32LE(end + 16),
    expanded = 0;
  if (count > 500)
    throw new BadRequestException(
      "XLSX contains too many entries. Export only the lead worksheet.",
    );
  for (let index = 0; index < count; index++) {
    if (
      cursor + 46 > end ||
      buffer.readUInt32LE(cursor) !== 0x02014b50 ||
      buffer.readUInt16LE(cursor + 8) & 1
    )
      throw new BadRequestException(
        "Use a standard unencrypted XLSX workbook.",
      );
    expanded += buffer.readUInt32LE(cursor + 24);
    if (expanded > 20 * 1024 * 1024)
      throw new BadRequestException(
        "XLSX expands beyond 20 MB. Export a smaller lead worksheet.",
      );
    cursor +=
      46 +
      buffer.readUInt16LE(cursor + 28) +
      buffer.readUInt16LE(cursor + 30) +
      buffer.readUInt16LE(cursor + 32);
  }
}
