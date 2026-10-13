-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "creditCap" INTEGER;

-- AlterTable
ALTER TABLE "ImportBatch" ADD COLUMN     "leaseUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "creditCap" INTEGER;
