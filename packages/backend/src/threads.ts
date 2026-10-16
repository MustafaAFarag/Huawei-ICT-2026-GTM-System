import { NotFoundException } from "@nestjs/common";
import type { Actor } from "@revenue/contracts";
import { db, json } from "./database.js";
import { assertRole } from "./policy.js";

// Chat threads (Nabil conversations). Each member sees only their own threads in a workspace.
// Archiving hides a thread; messages stay for the audit trail.

export function threadTitle(content: string) {
  const line = content.replace(/\s+/g, " ").trim();
  return line.length > 60 ? `${line.slice(0, 59).trimEnd()}…` : line || "New chat";
}

export class ThreadService {
  list(actor: Actor) {
    return db.chatThread.findMany({
      where: {
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        archivedAt: null,
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });
  }

  async create(actor: Actor, title?: string) {
    assertRole(actor, "write");
    return db.chatThread.create({
      data: {
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        title: threadTitle(title ?? ""),
      },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });
  }

  async get(actor: Actor, id: string) {
    const thread = await db.chatThread.findFirst({
      where: {
        id,
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        archivedAt: null,
      },
    });
    if (!thread) throw new NotFoundException("Conversation not found.");
    return thread;
  }

  async messages(actor: Actor, id: string) {
    await this.get(actor, id);
    return db.chatMessage.findMany({
      where: { threadId: id, workspaceId: actor.workspaceId, userId: actor.userId },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
  }

  async update(actor: Actor, id: string, input: { title?: string; archived?: boolean }) {
    await this.get(actor, id);
    return db.chatThread.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: threadTitle(input.title) } : {}),
        ...(input.archived ? { archivedAt: new Date() } : {}),
      },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });
  }

  // Resolves the stream's thread: the requested one, or a new one titled from the first message.
  async forTurn(actor: Actor, content: string, id?: string) {
    if (id) return this.get(actor, id);
    return db.chatThread.create({
      data: {
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        title: threadTitle(content),
      },
    });
  }

  touch(id: string) {
    return db.chatThread.update({ where: { id }, data: { updatedAt: new Date() } });
  }

  // Feedback on one assistant message, stored in its context (thumbs up/down).
  async feedback(actor: Actor, messageId: string, value: "up" | "down" | null) {
    const message = await db.chatMessage.findFirst({
      where: {
        id: messageId,
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        role: "assistant",
      },
    });
    if (!message) throw new NotFoundException("Message not found.");
    const context = { ...(message.context as Record<string, unknown>), feedback: value };
    return db.chatMessage.update({
      where: { id: messageId },
      data: { context: json(context) },
      select: { id: true, context: true },
    });
  }
}
