import { Queue, Worker } from "bullmq";
import { config } from "./config.js";
import { db } from "./database.js";
import { WorkflowService } from "./workflows.js";
import { prepareDueReviews } from "./schedules.js";
const redis = new URL(config.redis);
export const connection = {
  host: redis.hostname,
  port: Number(redis.port || 6379),
  username: redis.username || undefined,
  password: redis.password || undefined,
  tls: redis.protocol === "rediss:" ? {} : undefined,
  db: Number(redis.pathname.slice(1) || 0),
  maxRetriesPerRequest: null,
};
let queue: Queue | undefined;
function getQueue() {
  return (queue ??= new Queue(config.queueName, { connection }));
}
export async function dispatchOutbox() {
  // PostgreSQL is the durable source; reconstruct queued jobs after Redis loss.
  for (const run of await db.run.findMany({
    where: { queueName: config.queueName, state: "queued" },
    take: 100,
    orderBy: { createdAt: "asc" },
  })) {
    const existing = await getQueue().getJob(run.id);
    const state = existing ? await existing.getState() : null;
    if (existing && ["failed", "completed"].includes(state!))
      await existing.remove();
    if (!existing || ["failed", "completed"].includes(state!))
      await getQueue().add(
        "execute",
        { runId: run.id },
        {
          jobId: run.id,
          attempts: 1,
          removeOnComplete: 1000,
          removeOnFail: 1000,
        },
      );
  }

  for (const item of await db.outbox.findMany({
    where: { publishedAt: null, queueName: config.queueName },
    take: 100,
  })) {
    await getQueue().add(
      "execute",
      { runId: item.runId },
      {
        jobId: item.runId,
        attempts: 1,
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    );
    await db.outbox.update({
      where: { id: item.id },
      data: { publishedAt: new Date() },
    });
  }
}
export function startWorker() {
  const service = new WorkflowService();
  const worker = new Worker(
    config.queueName,
    (job) => service.execute(job.data.runId),
    { connection, concurrency: 2 },
  );
  worker.on("error", (error) =>
    console.error("Worker connection:", error.name),
  );
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      await service.recoverInterrupted();
      await prepareDueReviews();
      await dispatchOutbox();
    } catch (error) {
      console.error(
        "Worker maintenance:",
        error instanceof Error ? error.name : "Error",
      );
    } finally {
      busy = false;
    }
  };
  const interval = setInterval(tick, 2000);
  void tick();
  return async () => {
    clearInterval(interval);
    await worker.close();
    await closeQueue();
    await db.$disconnect();
  };
}
export async function workerHealth() {
  await db.$queryRaw`SELECT 1`;
  await getQueue().getJobCounts("waiting");
}

export async function closeQueue() {
  await queue?.close();
  queue = undefined;
}
