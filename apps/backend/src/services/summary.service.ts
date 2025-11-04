import { prisma } from '@/config/prisma'
import { SummaryStyle, type Summary } from '@prisma/client'
import { queueSummary } from '@/queues/summary.queue'
import { CacheService, CacheKeys } from './cache.service'
import { CACHE_TTL } from '@/constants/performance'
import { PlanLimiter } from '@/utils/plan-limiter'
import { buildSoftDeleteFilter, buildMonthRange, buildCacheKey } from '@/utils/query-builders'
import { BaseCrudService } from './base-crud.service'

export class SummaryService extends BaseCrudService<Summary> {
  protected modelName = 'Summary'
  protected prismaModel = prisma.summary
  /**
   * Create a summary generation job
   * Checks plan limits before queueing
   */
  async createSummary(
    userId: string,
    text: string,
    style: SummaryStyle,
    language: 'fr' | 'en'
  ): Promise<{ jobId: string }> {
    // Check plan limits using centralized utility
    await PlanLimiter.checkLimit(userId, 'summary')

    // Queue the summary generation job
    const job = await queueSummary({
      userId,
      text,
      style,
      language,
    })

    return { jobId: job.id }
  }

  /**
   * Get user summaries with pagination
   * Returns summaries ordered by createdAt DESC (most recent first)
   */
  async getUserSummaries(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    summaries: Array<{
      id: string
      title: string | null
      originalText: string
      summaryText: string
      style: SummaryStyle
      source: string | null
      language: string
      createdAt: Date
    }>
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      totalThisMonth: number
    }
  }> {
    // Calculate pagination
    const skip = (page - 1) * limit

    // Build WHERE clause for active summaries (non-deleted)
    const activeWhere = {
      userId,
      ...buildSoftDeleteFilter(),
    }

    // Build WHERE clause for monthly count (includes deleted for quota)
    const monthlyWhere = {
      userId,
      ...buildMonthRange('createdAt'),
    }

    // Get total count for pagination (only non-deleted)
    const total = await prisma.summary.count({
      where: activeWhere,
    })

    // PERFORMANCE: Cache monthly count with month-specific TTL
    // Get count for current month (includes deleted - for usage quota)
    const now = new Date()
    const cacheKey = CacheKeys.summaryUsage(userId, now.getFullYear(), now.getMonth())
    let totalThisMonth = await CacheService.get<number>(cacheKey)

    if (totalThisMonth === null) {
      totalThisMonth = await prisma.summary.count({
        where: monthlyWhere,
      })

      // Cache until end of month
      const ttl = CACHE_TTL.PLAN_LIMITS_MONTHLY(now.getFullYear(), now.getMonth())
      await CacheService.set(cacheKey, totalThisMonth, ttl)
    }

    // Get summaries (only non-deleted)
    const summaries = await prisma.summary.findMany({
      where: activeWhere,
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        originalText: true,
        summaryText: true,
        style: true,
        source: true,
        language: true,
        createdAt: true,
      },
    })

    return {
      summaries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        totalThisMonth: totalThisMonth ?? 0,
      },
    }
  }

  /**
   * Delete a summary (soft delete)
   * Only the owner can delete their summary
   * Note: Uses soft delete to preserve monthly usage count
   */
  async deleteSummary(summaryId: string, userId: string): Promise<void> {
    // Use base class method for soft delete with ownership verification
    await this.softDelete(summaryId, userId)

    // Invalidate cache for this summary
    await CacheService.delete(`summary:${summaryId}`)
  }

  async getSummaryById(summaryId: string, userId: string) {
    const cacheKey = buildCacheKey('summary', { id: summaryId })

    const cached = await CacheService.get(cacheKey)
    if (cached) {
      return cached
    }

    const summary = await prisma.summary.findFirst({
      where: {
        id: summaryId,
        userId,
      },
    })

    if (!summary) {
      return null
    }

    const summaryData = {
      id: summary.id,
      title: summary.title,
      coverImage: summary.coverImage,
      originalText: summary.originalText,
      summaryText: summary.summaryText,
      style: summary.style,
      source: summary.source,
      language: summary.language,
      createdAt: summary.createdAt,
    }

    await CacheService.set(cacheKey, summaryData, CACHE_TTL.SUMMARY)

    return summaryData
  }
}

// Export singleton instance
export const summaryService = new SummaryService()
