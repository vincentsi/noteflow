import { Worker, Job } from 'bullmq'
import { rssCleanupService } from '@/services/rss-cleanup.service'
import { logger } from '@/utils/logger'
import { env } from '@/config/env'
import { isRedisAvailable } from '@/config/redis'

export interface RSSCleanupJobData {
  retentionDays?: number
}

// Global worker instance
let rssCleanupWorker: Worker<RSSCleanupJobData> | null = null

/**
 * Start RSS cleanup worker
 * Returns null if Redis not available or worker already started
 */
export function startRSSCleanupWorker(): Worker<RSSCleanupJobData> | null {
  // Prevent duplicate workers
  if (rssCleanupWorker) {
    logger.warn('⚠️  RSS cleanup worker already running')
    return rssCleanupWorker
  }

  if (!isRedisAvailable() || !env.REDIS_URL) {
    logger.warn('⚠️  Redis not available, RSS cleanup worker not started')
    return null
  }

  // Parse Redis URL for BullMQ connection
  const url = new URL(env.REDIS_URL)

  try {
    rssCleanupWorker = new Worker<RSSCleanupJobData>(
      'rss-cleanup',
      async (job: Job<RSSCleanupJobData>) => {
        const { retentionDays = 30 } = job.data

        logger.info({ jobId: job.id }, `Processing RSS cleanup job`)

        const result = await rssCleanupService.runCleanup(retentionDays)

        logger.info({ jobId: job.id, ...result }, `RSS cleanup job completed`)

        return result
      },
      {
        connection: {
          host: url.hostname,
          port: parseInt(url.port || '6379'),
          password: url.password || undefined,
          username: url.username || undefined,
        },
        concurrency: 1, // Only one cleanup job at a time
      }
    )

    rssCleanupWorker.on('completed', (job) => {
      logger.info({ jobId: job.id }, `RSS cleanup job completed successfully`)
    })

    rssCleanupWorker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, error: err.message }, `RSS cleanup job failed`)
    })

    return rssCleanupWorker
  } catch (error) {
    logger.error({ error }, '❌ Failed to start RSS cleanup worker')
    rssCleanupWorker = null
    return null
  }
}
