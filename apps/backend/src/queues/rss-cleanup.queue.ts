import { Queue } from 'bullmq'
import { logger } from '@/utils/logger'
import { env } from '@/config/env'
import { isRedisAvailable } from '@/config/redis'
import type { RSSCleanupJobData } from './rss-cleanup.worker'

/**
 * Create RSS cleanup queue
 * Returns null if Redis not available
 */
function createCleanupQueue(): Queue<RSSCleanupJobData> | null {
  if (!isRedisAvailable() || !env.REDIS_URL) {
    logger.warn('⚠️  Redis not available, RSS cleanup will not be scheduled')
    return null
  }

  // Parse Redis URL for BullMQ connection
  const url = new URL(env.REDIS_URL)

  return new Queue<RSSCleanupJobData>('rss-cleanup', {
    connection: {
      host: url.hostname,
      port: parseInt(url.port || '6379'),
      password: url.password || undefined,
      username: url.username || undefined,
    },
  })
}

/**
 * BullMQ Queue for RSS cleanup
 * Schedules periodic cleanup of old articles
 */
export const rssCleanupQueue = createCleanupQueue()

/**
 * Schedule RSS cleanup job
 * @param data - Cleanup configuration
 * @returns Job instance or null if Redis not available
 */
export async function scheduleRSSCleanup(data: RSSCleanupJobData = {}) {
  if (!rssCleanupQueue) {
    logger.warn('⚠️  Cannot schedule RSS cleanup: Redis not available')
    return null
  }

  const job = await rssCleanupQueue.add('cleanup', data, {
    // Run daily at 2 AM
    repeat: {
      pattern: '0 2 * * *', // Cron: every day at 2:00 AM
    },
    // Don't retry on failure
    attempts: 1,
  })

  logger.info(`RSS cleanup job scheduled: ${job.id}`)

  return job
}

/**
 * Run RSS cleanup immediately (for manual triggers or testing)
 */
export async function runRSSCleanupNow(retentionDays: number = 30) {
  if (!rssCleanupQueue) {
    logger.warn('⚠️  Cannot run RSS cleanup: Redis not available')
    return null
  }

  const job = await rssCleanupQueue.add('cleanup-now', { retentionDays })

  logger.info(`RSS cleanup job queued for immediate execution: ${job.id}`)

  return job
}
