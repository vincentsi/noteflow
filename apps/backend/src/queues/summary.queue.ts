import { logger } from '@/utils/logger'
import { Queue, Worker } from 'bullmq'
import { isRedisAvailable } from '@/config/redis'
import { env } from '@/config/env'
import { processSummary } from './summary.worker'
import type { SummaryStyle } from '@prisma/client'

/**
 * Queue for processing AI summaries asynchronously
 *
 * Why use a queue?
 * - AI generation can take time (OpenAI API calls)
 * - Prevents blocking the API response
 * - Retry mechanism for failed generations
 * - Rate limiting capabilities
 */

const QUEUE_NAME = 'summaries'

/**
 * Job data for summary generation
 */
export interface SummaryJob {
  userId: string
  text: string
  style: SummaryStyle
  language: 'fr' | 'en'
}

/**
 * Create summary queue
 * Returns null if Redis not available
 */
export function createSummaryQueue(): Queue<SummaryJob> | null {
  if (!isRedisAvailable() || !env.REDIS_URL) {
    logger.warn('⚠️  Redis not available, summaries will not be processed in queue')
    return null
  }

  // Parse Redis URL for BullMQ connection
  const url = new URL(env.REDIS_URL)

  return new Queue<SummaryJob>(QUEUE_NAME, {
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
        delay: 2000, // Start with 2s delay
      },
      removeOnComplete: {
        count: 100, // Keep last 100 successful jobs
        age: 7 * 24 * 3600, // Remove after 7 days
      },
      removeOnFail: {
        count: 200, // Keep last 200 failed jobs
        age: 14 * 24 * 3600, // Remove after 14 days
      },
    },
  })
}

// Global queue instance
let queue: Queue<SummaryJob> | null = null

/**
 * Get or create queue instance
 */
export function getSummaryQueue(): Queue<SummaryJob> | null {
  if (!queue && isRedisAvailable()) {
    queue = createSummaryQueue()
  }
  return queue
}

/**
 * Add summary generation job to queue
 */
export async function queueSummary(data: SummaryJob): Promise<{ id: string }> {
  const summaryQueue = getSummaryQueue()

  if (!summaryQueue) {
    throw new Error('Summary queue not available')
  }

  const job = await summaryQueue.add('generate-summary', data)

  logger.info(`✅ Queued summary generation job: ${job.id}`)

  return { id: job.id || '' }
}

/**
 * Start summary worker
 * Processes jobs from the queue
 */
export function startSummaryWorker(): Worker<SummaryJob> | null {
  if (!isRedisAvailable() || !env.REDIS_URL) {
    logger.warn('⚠️  Redis not available, summary worker not started')
    return null
  }

  // Parse Redis URL for BullMQ connection
  const url = new URL(env.REDIS_URL)

  try {
    const worker = new Worker<SummaryJob>(
      QUEUE_NAME,
      async (job) => {
        logger.info(`🤖 Processing summary job: ${job.id}`)

        try {
          await processSummary(job.data)
        } catch (error) {
          logger.error({ error }, 'Failed to process summary')
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
        concurrency: 5, // Process 5 summaries at a time (OpenAI rate limit: 450 req/min)
        limiter: {
          max: 450, // Max 450 jobs per duration
          duration: 60000, // Per 60 seconds (OpenAI gpt-4o-mini rate limit)
        },
      }
    )

    // Event listeners
    worker.on('completed', (job) => {
      logger.info(`✅ Summary job ${job.id} completed`)
    })

    worker.on('failed', (job, error) => {
      logger.error({ error: error.message, jobId: job?.id }, 'Summary job failed')
    })

    worker.on('error', (error) => {
      logger.error({ error }, '❌ Summary worker error')
    })

    logger.info('✅ Summary worker started')

    return worker
  } catch (error) {
    logger.error({ error }, '❌ Failed to start summary worker')
    return null
  }
}
