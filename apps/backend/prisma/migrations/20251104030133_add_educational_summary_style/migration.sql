-- AlterEnum
ALTER TYPE "SummaryStyle" ADD VALUE 'EDUCATIONAL';

-- CreateIndex
CREATE INDEX "users_lastLoginAt_role_idx" ON "users"("lastLoginAt", "role");

-- CreateIndex
CREATE INDEX "users_loginCount_idx" ON "users"("loginCount" DESC);
