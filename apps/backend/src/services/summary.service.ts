import { prisma } from '@/config/prisma'
import { SummaryStyle } from '@prisma/client'
import { queueSummary } from '@/queues/summary.queue'
import { CacheService, CacheKeys } from './cache.service'
import { PlanLimiter } from '@/utils/plan-limiter'

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

    // Get total count for pagination (only non-deleted)
    const total = await prisma.summary.count({
      where: {
        userId,
        deletedAt: null,
      },
    })

    // Get count for current month (includes deleted - for usage quota)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const totalThisMonth = await prisma.summary.count({
      where: {
        userId,
        createdAt: {
          gte: startOfMonth,
        },
        // Note: deletedAt is NOT filtered here - we count all created summaries
      },
    })

    // Get summaries (only non-deleted)
    const summaries = await prisma.summary.findMany({
      where: {
        userId,
        deletedAt: null,
      },
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
    // Check if summary exists and belongs to user
    const summary = await prisma.summary.findFirst({
      where: {
        id: summaryId,
        userId,
        deletedAt: null, // Only active summaries can be deleted
      },
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
