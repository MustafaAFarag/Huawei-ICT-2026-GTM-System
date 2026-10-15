import { BadRequestException, NotFoundException } from "@nestjs/common";
import { z } from "zod";
import {
  scheduleRequest,
  toolRequest,
  type Actor,
  type ToolRequest,
} from "@revenue/contracts";
import { config } from "./config.js";
import { db, json, serializable } from "./database.js";
import { assertRole } from "./policy.js";
import { WorkflowService } from "./workflows.js";

const day = 86400000;
const occurrenceKey = (id: string) => `scheduled-review:${id}`;
export class ScheduleService {
  async list(actor: Actor) {
    return db.schedule.findMany({
      where: { workspaceId: actor.workspaceId, queueName: config.queueName },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
  async create(actor: Actor, value: unknown) {
    assertRole(actor, "write");
    const input = scheduleRequest.parse(value);
    const nextAt = new Date(input.nextAt);
    if (
      nextAt < new Date(Date.now() - 60000) ||
      nextAt > new Date(Date.now() + 366 * day)
    )
      throw new BadRequestException(
        "Choose a first review time within the next year.",
      );
    const prospectIds = [...new Set(input.prospectIds)];
    if (input.tool !== "preflight" && !prospectIds.length)
      throw new BadRequestException(
        "Select accounts before scheduling this play.",
      );
    if (input.tool === "preflight" && prospectIds.length)
      throw new BadRequestException(
        "Mailbox pre-flight does not take accounts.",
      );
    return serializable(async (tx) => {
      const count = await tx.schedule.count({
        where: { workspaceId: actor.workspaceId, enabled: true },
      });
      if (count >= 20)
        throw new BadRequestException(
          "Pause an existing schedule before adding more than 20 active schedules.",
        );
      if (
        (await tx.prospect.count({
          where: { workspaceId: actor.workspaceId, id: { in: prospectIds } },
        })) !== prospectIds.length
      )
        throw new NotFoundException(
          "Some selected accounts are not in this workspace.",
        );
      const schedule = await tx.schedule.create({
        data: {
          workspaceId: actor.workspaceId,
          userId: actor.userId,
          name: input.name,
          play: input.play,
          intervalDays: input.intervalDays,
          nextAt,
          queueName: config.queueName,
          input: json({
            tool: input.tool,
            prospectIds,
            language: input.language,
          }),
        },
      });
      await tx.audit.create({
        data: {
          workspaceId: actor.workspaceId,
          userId: actor.userId,
          action: "schedule.created",
          targetId: schedule.id,
          details: json({
            tool: input.tool,
            audience: prospectIds.length,
            intervalDays: input.intervalDays,
            nextAt: input.nextAt,
          }),
        },
      });
      return schedule;
    });
  }
  async update(actor: Actor, id: string, value: unknown) {
    assertRole(actor, "write");
    const input = z.object({ enabled: z.boolean() }).parse(value);
    const schedule = await db.schedule.findFirst({
      where: {
        id,
        workspaceId: actor.workspaceId,
        queueName: config.queueName,
      },
    });
    if (!schedule) throw new NotFoundException("Schedule not found.");
    if (schedule.userId !== actor.userId && actor.role !== "owner")
      throw new BadRequestException(
        "Only the schedule creator or workspace owner can change it.",
      );
    return serializable(async (tx) => {
      if (
        input.enabled &&
        !schedule.enabled &&
        (await tx.schedule.count({
          where: { workspaceId: actor.workspaceId, enabled: true },
        })) >= 20
      )
        throw new BadRequestException(
          "The workspace already has 20 active schedules.",
        );
      const updated = await tx.schedule.update({
        where: { id },
        data: { enabled: input.enabled, lastError: null },
      });
      await tx.audit.create({
        data: {
          workspaceId: actor.workspaceId,
          userId: actor.userId,
          action: input.enabled ? "schedule.resumed" : "schedule.paused",
          targetId: id,
          details: {},
        },
      });
      return updated;
    });
  }
  async reviews(actor: Actor) {
    const rows = await db.scheduledReview.findMany({
      where: {
        workspaceId: actor.workspaceId,
        state: "pending",
        schedule: { queueName: config.queueName },
      },
      include: { schedule: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const runs = await db.run.findMany({
      where: {
        workspaceId: actor.workspaceId,
        requestKey: { in: rows.map((r) => occurrenceKey(r.id)) },
      },
      select: { id: true, state: true, requestKey: true },
    });
    return rows.map((row) => {
      const input = row.input as { tool: string; prospectIds: string[] };
      const run = runs.find((r) => r.requestKey === occurrenceKey(row.id));
      const runId = run?.id ?? null;
      return {
        id: row.id,
        name: row.schedule.name,
        scheduleId: row.scheduleId,
        dueAt: row.dueAt.toISOString(),
        play: row.schedule.play,
        tool: input.tool,
        audience: input.prospectIds.length,
        state: row.state,
        runId,
        runState: run?.state ?? null,
      };
    });
  }
  async dismiss(actor: Actor, id: string) {
    assertRole(actor, "write");
    const updated = await db.scheduledReview.updateMany({
      where: {
        id,
        workspaceId: actor.workspaceId,
        schedule: { queueName: config.queueName },
      },
      data: { state: "dismissed" },
    });
    if (!updated.count)
      throw new NotFoundException("Scheduled review not found.");
    await db.audit.create({
      data: {
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        action: "schedule.review_dismissed",
        targetId: id,
        details: {},
      },
    });
    return { dismissed: true };
  }
  async quote(actor: Actor, id: string) {
    assertRole(actor, "write");
    const row = await db.scheduledReview.findFirst({
      where: {
        id,
        workspaceId: actor.workspaceId,
        state: "pending",
        schedule: { queueName: config.queueName },
      },
      include: { schedule: true },
    });
    if (!row) throw new NotFoundException("Scheduled review not found.");
    const existing = await db.run.findUnique({
      where: {
        workspaceId_requestKey: {
          workspaceId: actor.workspaceId,
          requestKey: occurrenceKey(row.id),
        },
      },
    });
    if (existing)
      throw new BadRequestException(
        "This scheduled occurrence already started. Inspect its run before preparing another action.",
      );
    const input: ToolRequest = toolRequest.parse({
      ...(row.input as object),
      tool: (row.input as { tool: string }).tool,
      play: row.schedule.play,
      requestKey: occurrenceKey(row.id),
      approvedSpend: false,
    });
    const quote = await new WorkflowService().quote(actor, input);
    await db.scheduledReview.update({
      where: { id },
      data: { quoteId: quote.id },
    });
    return { input, quote };
  }
}

// A tick creates only a durable review item. Quotes and runs still need a person's
// current authorization. One pending occurrence per schedule avoids catch-up floods.
export async function prepareDueReviews(now = new Date()) {
  const due = await db.schedule.findMany({
    where: { queueName: config.queueName, enabled: true, nextAt: { lte: now } },
    orderBy: { nextAt: "asc" },
    take: 20,
    select: { id: true },
  });
  let created = 0;
  for (const item of due) {
    const made = await serializable(async (tx) => {
      const schedule = await tx.schedule.findUniqueOrThrow({
        where: { id: item.id },
      });
      if (!schedule.enabled || schedule.nextAt > now) return false;
      const membership = await tx.membership.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: schedule.workspaceId,
            userId: schedule.userId,
          },
        },
      });
      if (!membership || !["owner", "operator"].includes(membership.role)) {
        await tx.schedule.update({
          where: { id: schedule.id },
          data: {
            enabled: false,
            lastError:
              "The creator no longer has permission to prepare this play. Ask an owner to review it.",
          },
        });
        return false;
      }
      if (
        schedule.intervalDays < 1 ||
        schedule.intervalDays > 90 ||
        !scheduleRequest
          .pick({ tool: true, prospectIds: true, language: true })
          .safeParse(schedule.input).success
      ) {
        await tx.schedule.update({
          where: { id: schedule.id },
          data: {
            enabled: false,
            lastError: "The saved schedule is invalid. Recreate it from Plays.",
          },
        });
        return false;
      }
      const pending = await tx.scheduledReview.findFirst({
        where: { scheduleId: schedule.id, state: "pending" },
        orderBy: { createdAt: "desc" },
      });
      const priorRun = pending
        ? await tx.run.findUnique({
            where: {
              workspaceId_requestKey: {
                workspaceId: schedule.workspaceId,
                requestKey: occurrenceKey(pending.id),
              },
            },
            select: { id: true },
          })
        : null;
      const needsReview = !pending || Boolean(priorRun);
      if (needsReview) {
        await tx.scheduledReview.create({
          data: {
            workspaceId: schedule.workspaceId,
            scheduleId: schedule.id,
            dueAt: schedule.nextAt,
            input: json(schedule.input),
          },
        });
        await tx.audit.create({
          data: {
            workspaceId: schedule.workspaceId,
            userId: schedule.userId,
            action: "schedule.review_prepared",
            targetId: schedule.id,
            details: json({ dueAt: schedule.nextAt.toISOString() }),
          },
        });
      }
      const nextAt = new Date(
        schedule.nextAt.getTime() +
          (Math.floor(
            (now.getTime() - schedule.nextAt.getTime()) /
              (schedule.intervalDays * day),
          ) +
            1) *
            schedule.intervalDays *
            day,
      );
      await tx.schedule.update({
        where: { id: schedule.id },
        data: { nextAt, lastError: null },
      });
      return needsReview;
    });
    if (made) created++;
  }
  return { created };
}
