-- CreateIndex
CREATE INDEX "summaries_userId_deletedAt_style_createdAt_idx" ON "summaries"("userId", "deletedAt", "style", "createdAt" DESC);
