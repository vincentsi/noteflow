/*
  Warnings:

  - You are about to drop the column `description` on the `articles` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `articles` table. All the data in the column will be lost.
  - You are about to drop the column `content` on the `summaries` table. All the data in the column will be lost.
  - You are about to drop the column `contentType` on the `summaries` table. All the data in the column will be lost.
  - You are about to drop the column `summary` on the `summaries` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `summaries` table. All the data in the column will be lost.
  - Added the required column `excerpt` to the `articles` table without a default value. This is not possible if the table is not empty.
  - Made the column `publishedAt` on table `articles` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `originalText` to the `summaries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `summaryText` to the `summaries` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."summaries_createdAt_idx";

-- AlterTable
ALTER TABLE "articles" DROP COLUMN "description",
DROP COLUMN "updatedAt",
ADD COLUMN     "excerpt" TEXT NOT NULL,
ADD COLUMN     "tags" TEXT[],
ALTER COLUMN "publishedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "summaries" DROP COLUMN "content",
DROP COLUMN "contentType",
DROP COLUMN "summary",
DROP COLUMN "updatedAt",
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'fr',
ADD COLUMN     "originalText" TEXT NOT NULL,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "summaryText" TEXT NOT NULL,
ADD COLUMN     "title" TEXT;

-- DropEnum
DROP TYPE "public"."ContentType";

-- CreateTable
CREATE TABLE "rss_feeds" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastFetchAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rss_feeds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rss_feeds_name_key" ON "rss_feeds"("name");

-- CreateIndex
CREATE UNIQUE INDEX "rss_feeds_url_key" ON "rss_feeds"("url");

-- CreateIndex
CREATE INDEX "rss_feeds_active_idx" ON "rss_feeds"("active");

-- CreateIndex
CREATE INDEX "rss_feeds_lastFetchAt_idx" ON "rss_feeds"("lastFetchAt");

-- CreateIndex
CREATE INDEX "summaries_createdAt_idx" ON "summaries"("createdAt" DESC);
