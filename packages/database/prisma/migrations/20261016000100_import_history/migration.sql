ALTER TABLE "ImportBatch"
  ADD COLUMN "filename" TEXT,
  ADD COLUMN "seriesKey" TEXT,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "previousId" TEXT,
  ADD COLUMN "rowCount" INTEGER;

CREATE UNIQUE INDEX "ImportBatch_workspaceId_seriesKey_version_key" ON "ImportBatch"("workspaceId", "seriesKey", "version");
CREATE INDEX "ImportBatch_workspaceId_createdAt_idx" ON "ImportBatch"("workspaceId", "createdAt");
