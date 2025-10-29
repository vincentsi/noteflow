import { logger } from '@/utils/logger'
import { env } from '@/config/env'
import { disconnectPrisma } from '@/config/prisma'
import {
  disconnectRedis,
  initializeRedis,
  isRedisAvailable,
  waitForRedis,
} from '@/config/redis'
import { captureException, initializeSentry } from '@/config/sentry'
import { startStripeWebhookWorker } from '@/queues/stripe-webhook.queue'
import { startRSSWorker, queueRSSFetch, setupRSSCron } from '@/queues/rss.queue'
import { startSummaryWorker } from '@/queues/summary.queue'
import { scheduleRSSCleanup } from '@/queues/rss-cleanup.queue'
import { startRSSCleanupWorker } from '@/queues/rss-cleanup.worker'
import { BackupService } from '@/services/backup.service'
import { CleanupService } from '@/services/cleanup.service'
import type { FastifyInstance } from 'fastify'
import { createApp } from './app'

/**
 * Server entry point
 * 1. Initialize Sentry for error tracking
 * 2. Initialize Redis for caching (optional)
 * 3. Validate environment variables (via env import)
 * 4. Create Fastify app
 * 5. Start listening on PORT
 * 6. Handle graceful shutdown
 */

// Initialize Sentry as early as possible
initializeSentry()

let app: FastifyInstance | null = null

async function start() {
  try {
    // Initialize Redis (optional, app works without it)
    initializeRedis()

    // Wait for Redis to be ready BEFORE creating app
    const redisReady = await waitForRedis(5000)
    if (redisReady) {
      logger.info('✅ Redis ready, starting server with full features')
    } else {
      logger.warn('⚠️  Redis not available, starting with limited features')
    }

    // Create app
    app = await createApp()

    // Start server
    const port = Number(env.PORT)
    await app.listen({ port, host: '0.0.0.0' })

    // Start automated cleanup job
    CleanupService.startCleanupJob(app)

    // Start automated backup job
    BackupService.startBackupJob(app)

    // Start Stripe webhook worker (unless explicitly disabled)
    if (process.env.DISABLE_STRIPE_WORKER === 'true') {
      logger.info('⚠️  Stripe webhook worker disabled (DISABLE_STRIPE_WORKER=true)')
    } else if (isRedisAvailable()) {
      startStripeWebhookWorker()
      logger.info('✅ Stripe webhook worker started')
    } else {
      logger.warn(
        '⚠️  Redis not available, webhooks will be processed synchronously'
      )
    }

    // Start RSS feed worker (unless explicitly disabled)
    if (process.env.DISABLE_RSS_WORKER === 'true') {
      logger.info('⚠️  RSS worker disabled (DISABLE_RSS_WORKER=true)')
    } else if (isRedisAvailable()) {
      startRSSWorker()
      logger.info('✅ RSS feed worker started')

      // Setup automatic RSS feed fetching with BullMQ repeatable jobs
      try {
        await setupRSSCron()
        logger.info('⏰ RSS feed cron job scheduled (every hour via BullMQ)')
      } catch (error) {
        logger.error({ error }, '❌ Failed to setup RSS cron job')
      }

      // Fetch feeds immediately on startup
      try {
        await queueRSSFetch()
        logger.info('📰 Initial RSS feed fetch job queued')
      } catch (error) {
        logger.error({ error }, '❌ Failed to queue initial RSS fetch')
      }

      // Start RSS cleanup worker
      startRSSCleanupWorker()
      logger.info('✅ RSS cleanup worker started')

      // Schedule RSS cleanup (daily at 2 AM)
      try {
        await scheduleRSSCleanup()
        logger.info('🧹 RSS cleanup scheduled (daily at 2 AM via BullMQ)')
      } catch (error) {
        logger.error({ error }, '❌ Failed to schedule RSS cleanup')
      }
    } else {
      logger.warn('⚠️  Redis not available, RSS feeds will not be auto-fetched')
    }

    // Start Summary worker (unless explicitly disabled)
    if (process.env.DISABLE_SUMMARY_WORKER === 'true') {
      logger.info('⚠️  Summary worker disabled (DISABLE_SUMMARY_WORKER=true)')
    } else if (isRedisAvailable()) {
      startSummaryWorker()
      logger.info('✅ Summary worker started')
    } else {
      logger.warn('⚠️  Redis not available, summaries will not be processed')
    }

    logger.info(`🚀 Server ready at http://localhost:${port}`)
    logger.info(`📊 Health check: http://localhost:${port}/api/health`)
    logger.info(`📚 API Docs: http://localhost:${port}/docs`)
  } catch (error) {
    logger.error({ error: error }, '❌ Error starting server:')
    captureException(error as Error, { context: 'server-startup' })
    await cleanup()
    process.exit(1)
  }
}

/**
 * Cleanup resources before shutdown
 * Closes server, database, and Redis connections
 */
async function cleanup() {
  try {
    if (app) {
      logger.info('🔌 Closing server...')
      await app.close()
    }

    logger.info('🔌 Closing database connection...')
    await disconnectPrisma()

    logger.info('🔌 Closing Redis connection...')
    await disconnectRedis()

    logger.info('✅ Cleanup complete')
  } catch (error) {
    logger.error({ error: error }, '❌ Error during cleanup:')
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ error: promise }, '❌ Unhandled Promise Rejection at:')
  logger.error({ error: reason }, '❌ Reason:')

  // Send to Sentry
  captureException(reason as Error, {
    type: 'unhandledRejection',
    promise: String(promise),
  })

  // Don't crash the server, but log the error
  // In production, you might want to crash and restart via PM2/Docker
})

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  logger.error({ error: error }, '❌ Uncaught Exception:')

  // Send to Sentry
  captureException(error, { type: 'uncaughtException' })

  // Cleanup and exit because app state is uncertain
  cleanup().then(() => {
    logger.error('💥 Server crashed due to uncaught exception, exiting...')
    process.exit(1)
  })
})

// Handle graceful shutdown
const signals = ['SIGINT', 'SIGTERM'] as const
for (const signal of signals) {
  process.on(signal, async () => {
    logger.info(`\n⚠️  Received ${signal}, shutting down gracefully...`)
    await cleanup()
    process.exit(0)
  })
}

// Start server
start()
