import { Worker, Job } from 'bullmq'
import { rssCleanupService } from '@/services/rss-cleanup.service'
import { logger } from '@/utils/logger'
import { env } from '@/config/env'
import { isRedisAvailable } from '@/config/redis'

export interface RSSCleanupJobData {
  retentionDays?: number
}

/**
 * Create RSS cleanup worker
 * Returns null if Redis not available
 */
function createCleanupWorker(): Worker<RSSCleanupJobData> | null {
  if (!isRedisAvailable() || !env.REDIS_URL) {
    return null
  }

  // Parse Redis URL for BullMQ connection
  const url = new URL(env.REDIS_URL)

  const worker = new Worker<RSSCleanupJobData>(
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

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, `RSS cleanup job completed successfully`)
  })

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, `RSS cleanup job failed`)
  })

  return worker
}

/**
 * BullMQ Worker for RSS cleanup
 * Runs periodically to clean up old articles
 */
const rssCleanupWorker = createCleanupWorker()

export default rssCleanupWorker
