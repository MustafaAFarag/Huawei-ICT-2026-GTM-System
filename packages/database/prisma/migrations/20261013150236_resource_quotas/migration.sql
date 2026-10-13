-- CreateTable
CREATE TABLE "Quota" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "cap" INTEGER NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Quota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotaReservation" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "reserved" INTEGER NOT NULL,
    "actual" INTEGER,

    CONSTRAINT "QuotaReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Quota_workspaceId_month_idx" ON "Quota"("workspaceId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "QuotaReservation_runId_kind_key" ON "QuotaReservation"("runId", "kind");
