import { randomUUID } from "node:crypto";
import { ForbiddenException } from "@nestjs/common";
import { PLANS, type Actor } from "@revenue/contracts";
import { db, json, serializable } from "../database.js";
import { assertRole, month } from "../policy.js";

// Assistant turns and transcriptions cost a fixed, published number of AI credits (BILL-02).
// The price is shown before the user sends; the charge respects the same workspace, member
// and plan caps as runs, and writes a usage and audit row.
export const AI_COSTS = { chat_turn: 1, transcription: 1 } as const;
export type MeteredAction = keyof typeof AI_COSTS;

export async function chargeCredits(
  actor: Actor,
  action: MeteredAction,
  details: Record<string, unknown> = {},
) {
  assertRole(actor, "write");
  const amount = AI_COSTS[action];
  const workspace = await db.workspace.findUniqueOrThrow({
    where: { id: actor.workspaceId },
  });
  const limits = {
    ...(PLANS[workspace.plan as keyof typeof PLANS] ?? PLANS.Free),
    ...(workspace.planLimits as object),
  } as { aiCredits: number };
  const m = month();
  const usageId = `${action}:${randomUUID()}`;
  await serializable(async (tx) => {
    const member = await tx.membership.findUniqueOrThrow({
      where: {
        workspaceId_userId: {
          workspaceId: actor.workspaceId,
          userId: actor.userId,
        },
      },
    });
    const budgets = [
      { id: `${actor.workspaceId}:${m}`, userId: null, cap: limits.aiCredits },
      {
        id: `${actor.workspaceId}:${actor.userId}:${m}`,
        userId: actor.userId,
        cap: member.creditCap ?? limits.aiCredits,
      },
    ];
    for (const budget of budgets) {
      await tx.budget.upsert({
        where: { id: budget.id },
        create: {
          id: budget.id,
          workspaceId: actor.workspaceId,
          userId: budget.userId,
          month: m,
          cap: budget.cap,
        },
        update: {},
      });
      const updated =
        await tx.$executeRaw`UPDATE "Budget" SET used = used + ${amount} WHERE id = ${budget.id} AND used + reserved + ${amount} <= cap`;
      if (updated !== 1)
        throw new ForbiddenException(
          "The workspace or member AI credit cap is reached. Ask the owner to review the cap.",
        );
    }
    const quotaId = `${actor.workspaceId}:${m}:aiCredits`;
    await tx.quota.upsert({
      where: { id: quotaId },
      create: {
        id: quotaId,
        workspaceId: actor.workspaceId,
        month: m,
        kind: "aiCredits",
        cap: limits.aiCredits,
      },
      update: {},
    });
    const quota =
      await tx.$executeRaw`UPDATE "Quota" SET used = used + ${amount} WHERE id = ${quotaId} AND used + reserved + ${amount} <= cap`;
    if (quota !== 1)
      throw new ForbiddenException(
        "The monthly AI credit quota for this plan is used up.",
      );
    await tx.usage.create({
      data: {
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        runId: usageId,
        action,
        reserved: amount,
        actual: amount,
        state: "settled",
        plan: workspace.plan,
      },
    });
    await tx.audit.create({
      data: {
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        action: `ai.${action}`,
        targetId: usageId,
        details: json({ credits: amount, ...details }),
      },
    });
  });
  return { usageId, credits: amount };
}

// Returns credits when the provider call fails, so users never pay for an error.
export async function refundCredits(actor: Actor, usageId: string) {
  const m = month();
  await serializable(async (tx) => {
    const usage = await tx.usage.findUnique({ where: { runId: usageId } });
    if (!usage || usage.state !== "settled") return;
    const amount = usage.actual ?? 0;
    for (const id of [
      `${actor.workspaceId}:${m}`,
      `${actor.workspaceId}:${actor.userId}:${m}`,
    ])
      await tx.$executeRaw`UPDATE "Budget" SET used = GREATEST(used - ${amount}, 0) WHERE id = ${id}`;
    const quotaId = `${actor.workspaceId}:${m}:aiCredits`;
    await tx.$executeRaw`UPDATE "Quota" SET used = GREATEST(used - ${amount}, 0) WHERE id = ${quotaId}`;
    await tx.usage.update({
      where: { runId: usageId },
      data: { state: "refunded", actual: 0 },
    });
  });
}
