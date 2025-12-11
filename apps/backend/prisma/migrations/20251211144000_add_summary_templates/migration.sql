-- CreateTable
CREATE TABLE "summary_templates" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "prompt" TEXT NOT NULL,
    "icon" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "summary_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "summary_templates_userId_idx" ON "summary_templates"("userId");

-- CreateIndex
CREATE INDEX "summary_templates_userId_createdAt_idx" ON "summary_templates"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "summary_templates" ADD CONSTRAINT "summary_templates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
