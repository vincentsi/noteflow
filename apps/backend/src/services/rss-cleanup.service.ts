import { prisma } from '@/config/prisma'
import { logger } from '@/utils/logger'

/**
 * RSS Cleanup Service
 * Handles automatic cleanup of old RSS articles to prevent database bloat
 */
export class RSSCleanupService {
  /**
   * Delete old articles that are not saved by any user
   * Keeps articles from the last N days only
   *
   * @param retentionDays - Number of days to keep articles (default: 90)
   * @returns Number of articles deleted
   */
  async cleanupOldArticles(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    logger.info(`Starting RSS cleanup: deleting articles older than ${cutoffDate.toISOString()}`)

    // Delete articles that:
    // 1. Are older than retention period
    // 2. Have not been saved by any user
    const result = await prisma.article.deleteMany({
      where: {
        publishedAt: {
          lt: cutoffDate,
        },
        savedBy: {
          none: {}, // Not saved by anyone
        },
      },
    })

    logger.info(`✅ RSS cleanup completed: ${result.count} articles deleted`)

    return result.count
  }

  /**
   * Delete orphaned articles (articles with no RSS feed source)
   * This can happen if an RSS feed is deleted
   *
   * @returns Number of orphaned articles deleted
   */
  async cleanupOrphanedArticles(): Promise<number> {
    const result = await prisma.article.deleteMany({
      where: {
        source: {
          notIn: await this.getActiveRSSFeedNames(),
        },
        savedBy: {
          none: {}, // Not saved by anyone
        },
      },
    })

    logger.info(`✅ Orphaned articles cleanup: ${result.count} articles deleted`)

    return result.count
  }

  /**
   * Get list of active RSS feed names
   */
  private async getActiveRSSFeedNames(): Promise<string[]> {
    const feeds = await prisma.rSSFeed.findMany({
      where: {
        active: true,
      },
      select: {
        name: true,
      },
    })

    return feeds.map((f) => f.name)
  }

  /**
   * Run complete cleanup process
   * - Removes old articles
   * - Removes orphaned articles
   *
   * @param retentionDays - Number of days to keep articles
   * @returns Object with cleanup statistics
   */
  async runCleanup(retentionDays: number = 90): Promise<{
    oldArticlesDeleted: number
    orphanedArticlesDeleted: number
    totalDeleted: number
  }> {
    logger.info('🧹 Starting RSS cleanup process')

    const oldArticlesDeleted = await this.cleanupOldArticles(retentionDays)
    const orphanedArticlesDeleted = await this.cleanupOrphanedArticles()

    const totalDeleted = oldArticlesDeleted + orphanedArticlesDeleted

    logger.info(`✅ RSS cleanup process completed: ${totalDeleted} total articles deleted`)

    return {
      oldArticlesDeleted,
      orphanedArticlesDeleted,
      totalDeleted,
    }
  }
}

// Export singleton instance
export const rssCleanupService = new RSSCleanupService()
