-- AlterTable
ALTER TABLE "notes" ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "notes_userId_pinned_updatedAt_idx" ON "notes"("userId", "pinned", "updatedAt");
