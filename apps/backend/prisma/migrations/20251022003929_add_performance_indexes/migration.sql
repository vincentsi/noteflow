-- CreateIndex
CREATE INDEX "saved_articles_userId_createdAt_idx" ON "saved_articles"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "summaries_userId_style_createdAt_idx" ON "summaries"("userId", "style", "createdAt" DESC);
