-- CreateIndex
CREATE INDEX "notes_userId_createdAt_idx" ON "notes"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notes_userId_deletedAt_createdAt_idx" ON "notes"("userId", "deletedAt", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "posts_userId_isPublic_createdAt_idx" ON "posts"("userId", "isPublic", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "posts_isPublic_createdAt_idx" ON "posts"("isPublic", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "summaries_userId_deletedAt_createdAt_idx" ON "summaries"("userId", "deletedAt", "createdAt" DESC);
