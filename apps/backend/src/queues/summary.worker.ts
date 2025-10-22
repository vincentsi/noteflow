import { logger } from '@/utils/logger'
import { AIService } from '@/services/ai.service'
import { CacheService } from '@/services/cache.service'
import { prisma as defaultPrisma } from '@/config/prisma'
import type { PrismaClient } from '@prisma/client'
import type { SummaryJob } from './summary.queue'

/**
 * Process summary generation job
 * This function is exported separately for testing
 */
export async function processSummary(
  data: SummaryJob,
  prisma: PrismaClient = defaultPrisma
): Promise<void> {
  const { userId, text, style, language } = data

  const aiService = new AIService()

  logger.info(`Generating ${style} summary for user ${userId}`)

  // Generate summary with AI
  const summaryText = await aiService.generateSummary(text, style, language)

  // Save to database
  await prisma.summary.create({
    data: {
      userId,
      originalText: text,
      summaryText,
      style,
      language,
    },
  })

  // Increment cache counter for monthly usage
  const now = new Date()
  const cacheKey = `summary-usage:${userId}:${now.getFullYear()}-${now.getMonth()}`
  await CacheService.increment(cacheKey)

  logger.info(`✅ Summary generated and saved for user ${userId}`)
}
