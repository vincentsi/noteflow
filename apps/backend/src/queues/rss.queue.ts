import { logger } from '@/utils/logger'
import { Queue, Worker } from 'bullmq'
import { isRedisAvailable } from '@/config/redis'
import { env } from '@/config/env'
import { processRSSFeeds } from './rss.worker'

/**
 * Queue for processing RSS feeds asynchronously
 *
 * Why use a queue?
 * - RSS feeds can take time to fetch and parse
 * - Schedule periodic updates (cron)
 * - Retry mechanism for failed fetches
 * - Prevents blocking the main thread
 */

const QUEUE_NAME = 'rss-feeds'

/**
 * Job types for RSS feed processing
 */
export interface RSSFeedJob {
  type: 'fetch-all-feeds'
}

/**
 * Create RSS feed queue
 * Returns null if Redis not available
 */
export function createRSSQueue(): Queue<RSSFeedJob> | null {
  if (!isRedisAvailable() || !env.REDIS_URL) {
    logger.warn('⚠️  Redis not available, RSS feeds will not be processed in queue')
    return null
  }

  // Parse Redis URL for BullMQ connection
  const url = new URL(env.REDIS_URL)

  return new Queue<RSSFeedJob>(QUEUE_NAME, {
    connection: {
      host: url.hostname,
      port: parseInt(url.port || '6379'),
      password: url.password || undefined,
      username: url.username || undefined,
    },
    defaultJobOptions: {
      attempts: 3, // Retry up to 3 times
      backoff: {
        type: 'exponential',
        delay: 5000, // Start with 5s delay, then 10s, 20s...
      },
      removeOnComplete: {
        count: 50, // Keep last 50 successful jobs
        age: 7 * 24 * 3600, // Remove after 7 days
      },
      removeOnFail: {
        count: 100, // Keep last 100 failed jobs
        age: 14 * 24 * 3600, // Remove after 14 days
      },
    },
  })
}

// Global queue instance
let queue: Queue<RSSFeedJob> | null = null

/**
 * Get or create queue instance
 */
export function getRSSQueue(): Queue<RSSFeedJob> | null {
  if (!queue && isRedisAvailable()) {
    queue = createRSSQueue()
  }
  return queue
}

/**
 * Add RSS feed fetch job to queue
 */
export async function queueRSSFetch(): Promise<void> {
  const rssQueue = getRSSQueue()

  if (!rssQueue) {
    logger.warn('⚠️  RSS queue not available, skipping fetch')
    return
  }

  // Add job with deduplication to prevent multiple concurrent fetches
  await rssQueue.add('fetch-all-feeds', { type: 'fetch-all-feeds' }, {
    jobId: 'fetch-all-feeds', // Only one job at a time
  })

  logger.info('✅ Queued RSS feed fetch job')
}

/**
 * Setup automatic RSS feed fetching with cron schedule
 * Runs every hour to fetch new articles
 */
export async function setupRSSCron(): Promise<void> {
  const rssQueue = getRSSQueue()

  if (!rssQueue) {
    logger.warn('⚠️  RSS queue not available, skipping cron setup')
    return
  }

  // Remove any existing repeatable jobs first to avoid duplicates
  const repeatableJobs = await rssQueue.getRepeatableJobs()
  for (const job of repeatableJobs) {
    await rssQueue.removeRepeatableByKey(job.key)
  }

  // Add repeatable job - runs every hour
  await rssQueue.add(
    'fetch-all-feeds',
    { type: 'fetch-all-feeds' },
    {
      repeat: {
        pattern: '0 * * * *', // Cron: Every hour at minute 0 (e.g., 10:00, 11:00, 12:00)
        // Alternative patterns:
        // '0 */2 * * *' - Every 2 hours
        // '0 */6 * * *' - Every 6 hours
        // '0 0 * * *'   - Every day at midnight
      },
      jobId: 'rss-cron', // Unique ID for the cron job
    }
  )

  logger.info('✅ RSS cron job scheduled: runs every hour')
}

/**
 * Start RSS feed worker
 * Processes jobs from the queue
 */
export function startRSSWorker(): Worker<RSSFeedJob> | null {
  if (!isRedisAvailable() || !env.REDIS_URL) {
    logger.warn('⚠️  Redis not available, RSS worker not started')
    return null
  }

  // Parse Redis URL for BullMQ connection
  const url = new URL(env.REDIS_URL)

  try {
    const worker = new Worker<RSSFeedJob>(
      QUEUE_NAME,
      async (job) => {
        logger.info(`📰 Processing RSS job: ${job.data.type} (${job.id})`)

        try {
          await processRSSFeeds()
        } catch (error) {
          logger.error({ error }, 'Failed to process RSS feeds')
          throw error // Will trigger retry
        }
      },
      {
        connection: {
          host: url.hostname,
          port: parseInt(url.port || '6379'),
          password: url.password || undefined,
          username: url.username || undefined,
        },
        concurrency: 1, // Process one RSS fetch job at a time
      }
    )

    // Event listeners
    worker.on('completed', (job) => {
      logger.info(`✅ RSS job ${job.id} completed`)
    })

    worker.on('failed', (job, error) => {
      logger.error({ error: error.message, jobId: job?.id }, 'RSS job failed')
    })

    worker.on('error', (error) => {
      logger.error({ error }, '❌ RSS worker error')
    })

    logger.info('✅ RSS feed worker started')

    return worker
  } catch (error) {
    logger.error({ error }, '❌ Failed to start RSS worker')
    return null
  }
}
