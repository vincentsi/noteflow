-- AlterTable
ALTER TABLE "notes" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "notes_userId_deletedAt_idx" ON "notes"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "posts_userId_deletedAt_idx" ON "posts"("userId", "deletedAt");
