import { z } from "zod";
import { BadRequestException } from "@nestjs/common";
import type { Actor } from "@revenue/contracts";
import { Prisma } from "@revenue/database";
import { db, json } from "./database.js";
import { assertRole } from "./policy.js";
import { resolveRubric, rubricSchema } from "./rubric-core.js";

const rubricView = (workspace: { rubric?: unknown; pack: string }) => ({
  pack: workspace.pack,
  rubric: resolveRubric(workspace),
  isPackDefault: workspace.rubric === null || workspace.rubric === undefined,
});

export class RubricService {
  async get(actor: Actor) {
    assertRole(actor, "read");
    const workspace = await db.workspace.findUniqueOrThrow({
      where: { id: actor.workspaceId },
    });
    return rubricView(workspace);
  }
  // Owner only. `{ rubric: null }` resets to the pack default. Existing prospects keep their
  // stored score until they are scored again.
  async update(actor: Actor, body: unknown) {
    assertRole(actor, "admin");
    const parsed = z
      .object({ rubric: rubricSchema.nullable() })
      .strict()
      .safeParse(body);
    if (!parsed.success)
      throw new BadRequestException(
        parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      );
    const { rubric } = parsed.data;
    return db.$transaction(async (tx) => {
      const updated = await tx.workspace.update({
        where: { id: actor.workspaceId },
        data: { rubric: rubric === null ? Prisma.DbNull : json(rubric) },
      });
      await tx.audit.create({
        data: {
          workspaceId: actor.workspaceId,
          userId: actor.userId,
          action: "rubric.updated",
          details: json({ reset: rubric === null, rubric }),
        },
      });
      return rubricView(updated);
    });
  }
}
