import { it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { Queue } from "bullmq";
import {
  db,
  WorkflowService,
  dispatchOutbox,
  connection,
  config,
  closeQueue,
} from "../src/index.js";
it("reconstructs a lost Redis job from the durable PostgreSQL run without another reservation", async () => {
  const workspaceId = randomUUID(),
    userId = randomUUID();
  const queue = new Queue(config.queueName, { connection });
  let runId: string | undefined;
  try {
    await db.workspace.create({
      data: {
        id: workspaceId,
        name: "Queue recovery test",
        crmBinding: "A",
        assetBinding: "A",
      },
    });
    await db.user.create({
      data: {
        id: userId,
        email: `${userId}@synthetic-demo.example`,
        name: "Queue tester",
        emailVerified: true,
      },
    });
    await db.membership.create({
      data: { workspaceId, userId, role: "owner" },
    });
    const run = await new WorkflowService().start(
      { workspaceId, userId, role: "owner" },
      { tool: "preflight", requestKey: randomUUID() },
    );
    runId = run.id;
    await dispatchOutbox();
    const first = await queue.getJob(run.id);
    expect(first).toBeTruthy();
    expect(
      (await db.outbox.findUniqueOrThrow({ where: { runId: run.id } }))
        .publishedAt,
    ).not.toBeNull();
    await first!.remove(); // Remove only this owned fixture job, never flush shared Redis.
    expect(await queue.getJob(run.id)).toBeUndefined();
    await dispatchOutbox();
    expect(await queue.getJob(run.id)).toBeTruthy();
    expect(await db.usage.count({ where: { runId: run.id } })).toBe(1);
    expect(
      (await db.run.findUniqueOrThrow({ where: { id: run.id } })).state,
    ).toBe("queued");
  } finally {
    if (runId) {
      await (await queue.getJob(runId))?.remove();
      await db.outbox.deleteMany({ where: { runId } });
    }
    await queue.close();
    await closeQueue();
    for (const model of [
      db.run,
      db.usage,
      db.audit,
      db.budget,
      db.quotaReservation,
      db.quota,
    ])
      await (model.deleteMany as (arg: object) => Promise<unknown>)({
        where: { workspaceId },
      });
    await db.workspace.deleteMany({ where: { id: workspaceId } });
    await db.user.deleteMany({ where: { id: userId } });
    await db.$disconnect();
  }
});
