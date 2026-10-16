import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  db,
  runAgentTurn,
  ThreadService,
  threadTitle,
  type AgentEvent,
} from "@revenue/backend";
import type { Actor } from "@revenue/contracts";

// Nabil conversations: each turn is scoped to one thread, history never crosses threads,
// and members only see their own threads.
const workspaceId = randomUUID(),
  userId = randomUUID(),
  otherId = randomUUID();
const actor: Actor = { workspaceId, userId, role: "owner" };
const other: Actor = { workspaceId, userId: otherId, role: "owner" };
const threads = new ThreadService();

beforeAll(async () => {
  await db.workspace.create({
    data: { id: workspaceId, name: "Thread test", crmBinding: "A", assetBinding: "A" },
  });
  for (const id of [userId, otherId]) {
    await db.user.create({
      data: { id, name: "Thread tester", email: `${id}@example.test`, emailVerified: true },
    });
    await db.membership.create({ data: { workspaceId, userId: id, role: "owner" } });
  }
});
afterAll(async () => {
  for (const model of [db.spendApproval, db.chatMessage, db.chatThread, db.usage, db.audit])
    await (model.deleteMany as (args: object) => Promise<unknown>)({
      where: { workspaceId },
    });
  await db.workspace.delete({ where: { id: workspaceId } });
  await db.user.deleteMany({ where: { id: { in: [userId, otherId] } } });
  await db.$disconnect();
});

describe("chat threads", () => {
  it("titles a thread from the first message", () => {
    expect(threadTitle("  Open   Settings ")).toBe("Open Settings");
    expect(threadTitle("x".repeat(80))).toHaveLength(60);
    expect(threadTitle("")).toBe("New chat");
  });

  it("scopes turns and history to one thread", async () => {
    const first = await threads.forTurn(actor, "Open Settings");
    const second = await threads.create(actor, "Second");
    const events: AgentEvent[] = [];
    await runAgentTurn(actor, "Open Settings", { play: "P1", prospectIds: [] }, (e) => events.push(e), undefined, {
      threadId: first.id,
    });
    expect(events.find((e) => e.type === "done")).toMatchObject({ threadId: first.id });
    expect((await threads.messages(actor, first.id)).map((m) => m.role)).toEqual([
      "user",
      "assistant",
    ]);
    expect(await threads.messages(actor, second.id)).toHaveLength(0);
    expect((await threads.list(actor)).map((t) => t.id)).toContain(first.id);
  });

  it("hides threads from other members and after archiving", async () => {
    const mine = await threads.create(actor, "Private");
    await expect(threads.messages(other, mine.id)).rejects.toThrow("Conversation not found.");
    expect((await threads.list(other)).some((t) => t.id === mine.id)).toBe(false);
    await threads.update(actor, mine.id, { archived: true });
    expect((await threads.list(actor)).some((t) => t.id === mine.id)).toBe(false);
  });

  it("stores feedback only on the member's assistant messages", async () => {
    const thread = await threads.create(actor, "Feedback");
    const message = await db.chatMessage.create({
      data: { workspaceId, userId, threadId: thread.id, role: "assistant", content: "Hi" },
    });
    const updated = await threads.feedback(actor, message.id, "up");
    expect((updated.context as { feedback: string }).feedback).toBe("up");
    await expect(threads.feedback(other, message.id, "down")).rejects.toThrow("Message not found.");
  });
});
