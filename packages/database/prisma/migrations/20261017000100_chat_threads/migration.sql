CREATE TABLE "ChatThread" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ChatThread_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ChatThread_workspaceId_userId_updatedAt_idx" ON "ChatThread"("workspaceId", "userId", "updatedAt");

ALTER TABLE "ChatMessage" ADD COLUMN "threadId" TEXT;
CREATE INDEX "ChatMessage_threadId_createdAt_idx" ON "ChatMessage"("threadId", "createdAt");

ALTER TABLE "Asset" ADD COLUMN "threadId" TEXT, ADD COLUMN "playId" TEXT;

-- Existing flat histories become one "Earlier conversation" thread per member and workspace.
INSERT INTO "ChatThread" ("id", "workspaceId", "userId", "title", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "workspaceId", "userId", 'Earlier conversation', MIN("createdAt"), MAX("createdAt")
FROM "ChatMessage"
GROUP BY "workspaceId", "userId";

UPDATE "ChatMessage" m
SET "threadId" = t."id"
FROM "ChatThread" t
WHERE m."workspaceId" = t."workspaceId" AND m."userId" = t."userId" AND m."threadId" IS NULL;
