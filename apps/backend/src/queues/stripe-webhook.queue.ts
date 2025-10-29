import { logger } from '@/utils/logger'
import { Queue, Worker } from 'bullmq'
import { getRedis, isRedisAvailable } from '@/config/redis'
import { stripeService } from '@/services/stripe.service'
import { env } from '@/config/env'
import type Stripe from 'stripe'

/**
 * Queue for processing Stripe webhooks asynchronously
 *
 * Why use a queue?
 * - Stripe requires webhook responses within 30 seconds
 * - Complex DB operations can timeout
 * - Retry mechanism for failed webhooks
 * - Graceful degradation if Redis unavailable
 */

const QUEUE_NAME = 'stripe-webhooks'

/**
 * Job types for Stripe webhooks
 */
export type StripeWebhookJob =
  | { type: 'checkout.session.completed'; data: Stripe.Checkout.Session }
  | { type: 'customer.subscription.updated'; data: Stripe.Subscription }
  | { type: 'customer.subscription.deleted'; data: Stripe.Subscription }
  | { type: 'invoice.payment_failed'; data: Stripe.Invoice }

/**
 * Create Stripe webhook queue
 * Returns null if Redis not available
 */
export function createStripeWebhookQueue(): Queue<StripeWebhookJob> | null {
  if (!isRedisAvailable()) {
    logger.warn('⚠️  Redis not available, webhooks will be processed synchronously')
    return null
  }

  const redis = getRedis()
  if (!redis) return null

  return new Queue<StripeWebhookJob>(QUEUE_NAME, {
    connection: redis,
    defaultJobOptions: {
      attempts: 3, // Retry up to 3 times
      backoff: {
        type: 'exponential',
        delay: 2000, // Start with 2s delay, then 4s, 8s...
      },
      removeOnComplete: {
        count: 100, // Keep last 100 successful jobs for debugging
        age: 24 * 3600, // Remove after 24 hours
      },
      removeOnFail: {
        count: 500, // Keep last 500 failed jobs
        age: 7 * 24 * 3600, // Remove after 7 days
      },
    },
  })
}

// Global queue instance
let queue: Queue<StripeWebhookJob> | null = null
let worker: Worker<StripeWebhookJob> | null = null

/**
 * Get or create queue instance
 */
export function getStripeWebhookQueue(): Queue<StripeWebhookJob> | null {
  if (!queue && isRedisAvailable()) {
    queue = createStripeWebhookQueue()
  }
  return queue
}

/**
 * Add webhook event to queue
 * @param event Stripe webhook event
 */
export async function queueStripeWebhook(event: Stripe.Event): Promise<void> {
  const webhookQueue = getStripeWebhookQueue()

  // Fallback to synchronous processing if queue not available
  if (!webhookQueue) {
    logger.warn('⚠️  Processing webhook synchronously (queue unavailable)')
    await processWebhookSync(event)
    return
  }

  const job: StripeWebhookJob = {
    type: event.type,
    data: event.data.object,
  } as StripeWebhookJob

  // Add to queue with deduplication by event ID
  await webhookQueue.add(event.type, job, {
    jobId: event.id, // Prevents duplicate processing
  })

  logger.info(`✅ Queued Stripe webhook: ${event.type} (${event.id})`)
}

/**
 * Process webhook synchronously (fallback when Redis unavailable)
 */
async function processWebhookSync(event: Stripe.Event): Promise<void> {
  logger.info(`Processing webhook synchronously: ${event.type}`)

  const eventObject = event.data.object

  switch (event.type) {
    case 'checkout.session.completed':
      await stripeService.handleCheckoutCompleted(
        eventObject as Stripe.Checkout.Session
      )
      break

    case 'customer.subscription.updated':
      await stripeService.handleSubscriptionUpdated(eventObject as Stripe.Subscription)
      break

    case 'customer.subscription.deleted':
      await stripeService.handleSubscriptionDeleted(eventObject as Stripe.Subscription)
      break

    case 'invoice.payment_failed':
      await stripeService.handlePaymentFailed(eventObject as Stripe.Invoice)
      break

    default:
      logger.info(`Unhandled webhook type: ${event.type}`)
  }
}

/**
 * Start Stripe webhook worker
 * Processes jobs from the queue
 */
export function startStripeWebhookWorker(): Worker<StripeWebhookJob> | null {
  // Prevent duplicate workers
  if (worker) {
    logger.warn('⚠️  Stripe webhook worker already running')
    return worker
  }

  if (!isRedisAvailable()) {
    logger.warn('⚠️  Redis not available, webhook worker not started')
    return null
  }

  const redis = getRedis()
  if (!redis) {
    logger.warn('⚠️  Redis client not available, webhook worker not started')
    return null
  }

  // Get Redis connection URL from environment
  if (!env.REDIS_URL) {
    logger.warn('⚠️  Redis URL not configured, webhook worker not started')
    return null
  }

  // Parse Redis URL for BullMQ connection options
  const url = new URL(env.REDIS_URL)

  try {
    worker = new Worker<StripeWebhookJob>(
      QUEUE_NAME,
      async (job) => {
        const startTime = Date.now()
        logger.info(`📨 Processing webhook: ${job.data.type} (${job.id})`)

        try {
          switch (job.data.type) {
            case 'checkout.session.completed':
              await stripeService.handleCheckoutCompleted(job.data.data)
              break

            case 'customer.subscription.updated':
              await stripeService.handleSubscriptionUpdated(job.data.data)
              break

            case 'customer.subscription.deleted':
              await stripeService.handleSubscriptionDeleted(job.data.data)
              break

            case 'invoice.payment_failed':
              await stripeService.handlePaymentFailed(job.data.data)
              break

            default: {
              const unknownType = (job.data as { type: string }).type
              logger.info(`Unhandled webhook type: ${unknownType}`)
              break
            }
          }

          const processingTimeMs = Date.now() - startTime
          const jobType = (job.data as { type: string }).type
          logger.info(
            { jobType, processingTimeMs, jobId: job.id },
            `✅ Processed webhook: ${jobType} in ${processingTimeMs}ms`
          )
        } catch (error) {
          const processingTimeMs = Date.now() - startTime
          const errorType = (job.data as { type: string }).type
          logger.error(
            { error, errorType, processingTimeMs, jobId: job.id },
            'Failed to process webhook'
          )
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
        concurrency: 5, // Process 5 webhooks simultaneously
      }
    )

    // Event listeners for debugging
    worker.on('completed', (job) => {
      logger.info(`✅ Job ${job.id} completed`)
    })

    worker.on('failed', (job, error) => {
      logger.error({ error: error.message, jobId: job?.id }, 'Job failed')
    })

    worker.on('error', (error) => {
      logger.error({ error: error }, '❌ Worker error:')
    })

    return worker
  } catch (error) {
    logger.error({ error }, '❌ Failed to start Stripe webhook worker')
    worker = null
    return null
  }
}
