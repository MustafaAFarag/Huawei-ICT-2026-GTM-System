import { NotFoundException } from "@nestjs/common";
import type {
  Actor,
  ImportHistoryEntry,
  ImportOutcome,
} from "@revenue/contracts";
import type { ImportBatch } from "@revenue/database";
import { db } from "./database.js";

function summary(batch: ImportBatch): ImportHistoryEntry {
  const outcomes = batch.outcomes as ImportOutcome[];
  const counts = {
    added: 0,
    changed: 0,
    unchanged: 0,
    duplicate: 0,
    invalid: 0,
    retry: 0,
  };
  for (const row of outcomes) {
    if (row.state === "imported") {
      const change =
        row.change ??
        (row.message === "Unchanged"
          ? "unchanged"
          : row.message === "Updated from the new file"
            ? "changed"
            : "added");
      counts[change]++;
    } else if (row.state in counts)
      counts[row.state as "duplicate" | "invalid" | "retry"]++;
  }
  return {
    id: batch.id,
    filename: batch.filename,
    version: batch.version,
    previousId: batch.previousId,
    rowCount: batch.rowCount,
    createdAt: batch.createdAt.toISOString(),
    legacy: !batch.seriesKey,
    status:
      batch.leaseUntil && batch.leaseUntil > new Date()
        ? "processing"
        : batch.rowCount !== null && outcomes.length < batch.rowCount
          ? "interrupted"
          : "completed",
    counts,
  };
}

export class ImportHistoryService {
  async list(actor: Actor, cursor?: string) {
    if (
      cursor &&
      !(await db.importBatch.findFirst({
        where: { id: cursor, workspaceId: actor.workspaceId },
        select: { id: true },
      }))
    )
      throw new NotFoundException("Import not found.");
    const batches = await db.importBatch.findMany({
      where: { workspaceId: actor.workspaceId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 21,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    return {
      batches: batches.slice(0, 20).map(summary),
      nextCursor: batches.length > 20 ? batches[19]!.id : null,
    };
  }
  async detail(actor: Actor, id: string) {
    const batch = await db.importBatch.findFirst({
      where: { id, workspaceId: actor.workspaceId },
    });
    if (!batch) throw new NotFoundException("Import not found.");
    return { ...summary(batch), outcomes: batch.outcomes as ImportOutcome[] };
  }
}
