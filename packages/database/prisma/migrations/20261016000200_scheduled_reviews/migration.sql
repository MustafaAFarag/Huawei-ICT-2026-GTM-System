ALTER TABLE "Schedule"
  ADD COLUMN "name" TEXT NOT NULL DEFAULT 'Scheduled play',
  ADD COLUMN "queueName" TEXT NOT NULL DEFAULT 'revenue-runs',
  ADD COLUMN "lastError" TEXT,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "Schedule_queueName_enabled_nextAt_idx" ON "Schedule"("queueName", "enabled", "nextAt");
CREATE INDEX "Schedule_workspaceId_idx" ON "Schedule"("workspaceId");

CREATE TABLE "ScheduledReview" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "scheduleId" TEXT NOT NULL,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "input" JSONB NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'pending',
  "quoteId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScheduledReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ScheduledReview_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ScheduledReview_scheduleId_dueAt_key" ON "ScheduledReview"("scheduleId", "dueAt");
CREATE INDEX "ScheduledReview_workspaceId_state_createdAt_idx" ON "ScheduledReview"("workspaceId", "state", "createdAt");
