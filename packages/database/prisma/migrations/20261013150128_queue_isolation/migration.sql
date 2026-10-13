-- AlterTable
ALTER TABLE "Outbox" ADD COLUMN     "queueName" TEXT NOT NULL DEFAULT 'revenue-runs';

-- AlterTable
ALTER TABLE "Run" ADD COLUMN     "queueName" TEXT NOT NULL DEFAULT 'revenue-runs';
