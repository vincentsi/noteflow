import { prisma } from '@/config/prisma'
import { SummaryStyle } from '@prisma/client'
import { queueSummary } from '@/queues/summary.queue'
import { CacheService, CacheKeys } from './cache.service'
import { PlanLimiter } from '@/utils/plan-limiter'
import {
  buildSoftDeleteFilter,
  buildMonthRange,
} from '@/utils/query-builders'

export class SummaryService {
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

    // Get count for current month (includes deleted - for usage quota)
    const totalThisMonth = await prisma.summary.count({
      where: monthlyWhere,
    })

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
        totalThisMonth,
      },
    }
  }

  /**
   * Delete a summary (soft delete)
   * Only the owner can delete their summary
   * Note: Uses soft delete to preserve monthly usage count
   */
  async deleteSummary(summaryId: string, userId: string): Promise<void> {
    // Check if summary exists and belongs to user (only active summaries)
    const where = {
      id: summaryId,
      userId,
      ...buildSoftDeleteFilter(),
    }

    const summary = await prisma.summary.findFirst({
      where,
    })

    if (!summary) {
      throw new Error('Summary not found or you do not have permission to delete it')
    }

    // Soft delete the summary (set deletedAt timestamp)
    await prisma.summary.update({
      where: { id: summaryId },
      data: { deletedAt: new Date() },
    })

    // Invalidate cache for this summary
    await CacheService.delete(`summary:${summaryId}`)
  }
}

// Export singleton instance
export const summaryService = new SummaryService()
