import { logger } from '@/utils/logger'
import { env } from '@/config/env'
import { disconnectPrisma } from '@/config/prisma'
import {
  disconnectRedis,
  initializeRedis,
  isRedisAvailable,
} from '@/config/redis'
import { captureException, initializeSentry } from '@/config/sentry'
import { startStripeWebhookWorker } from '@/queues/stripe-webhook.queue'
import { startRSSWorker, queueRSSFetch } from '@/queues/rss.queue'
import { BackupService } from '@/services/backup.service'
import { CleanupService } from '@/services/cleanup.service'
import type { FastifyInstance } from 'fastify'
import cron from 'node-cron'
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

// Initialize Redis (optional, app works without it)
initializeRedis()

let app: FastifyInstance | null = null

async function start() {
  try {
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

      // Schedule RSS feed fetching every hour
      cron.schedule('0 * * * *', async () => {
        try {
          await queueRSSFetch()
          logger.info('📰 RSS feed fetch job queued (hourly)')
        } catch (error) {
          logger.error({ error }, '❌ Failed to queue RSS fetch job')
        }
      })
      logger.info('⏰ RSS feed cron job scheduled (every hour)')

      // Fetch feeds immediately on startup
      try {
        await queueRSSFetch()
        logger.info('📰 Initial RSS feed fetch job queued')
      } catch (error) {
        logger.error({ error }, '❌ Failed to queue initial RSS fetch')
      }
    } else {
      logger.warn('⚠️  Redis not available, RSS feeds will not be auto-fetched')
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
