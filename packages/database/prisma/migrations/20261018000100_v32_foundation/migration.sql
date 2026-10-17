-- PRD v3.2 foundation: workflow pack and rubric (A1/A2), explicit country and basis evidence (A3),
-- batch and provenance (A4), approved-batch export (A5).
ALTER TABLE "Workspace" ADD COLUMN "pack" TEXT NOT NULL DEFAULT 'hr-services', ADD COLUMN "rubric" JSONB;

-- Country must be set explicitly; existing values are kept.
ALTER TABLE "Prospect" ALTER COLUMN "country" DROP DEFAULT, ALTER COLUMN "country" DROP NOT NULL;
ALTER TABLE "Prospect" ADD COLUMN "basisEvidence" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "Sequence" ADD COLUMN "batchId" TEXT, ADD COLUMN "playVersionId" TEXT;
CREATE INDEX "Sequence_workspaceId_batchId_idx" ON "Sequence"("workspaceId", "batchId");

-- The only event writer so far is the fixture simulator, so existing rows are simulated.
ALTER TABLE "ProviderEvent" ADD COLUMN "provenance" TEXT NOT NULL DEFAULT 'simulated';
CREATE INDEX "ProviderEvent_workspaceId_provenance_idx" ON "ProviderEvent"("workspaceId", "provenance");

CREATE TABLE "ExportBatch" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "digest" TEXT NOT NULL,
  "items" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExportBatch_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ExportBatch_workspaceId_createdAt_idx" ON "ExportBatch"("workspaceId", "createdAt");
