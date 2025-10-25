-- AlterTable
ALTER TABLE "summaries" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "summaries_userId_deletedAt_idx" ON "summaries"("userId", "deletedAt");
