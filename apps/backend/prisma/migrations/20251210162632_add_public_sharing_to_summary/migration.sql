-- AlterTable
ALTER TABLE "summaries" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "summaries" ADD COLUMN "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "summaries_shareToken_key" ON "summaries"("shareToken");

-- CreateIndex
CREATE INDEX "summaries_shareToken_idx" ON "summaries"("shareToken");
