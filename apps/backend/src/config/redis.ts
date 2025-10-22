import { logger } from '@/utils/logger'
import { env } from '@/config/env'
import Redis from 'ioredis'

/**
 * Redis Client Configuration
 *
 * Redis is used for:
 * - Caching user data (reduce DB queries)
 * - Caching subscription status
 * - Rate limiting counters (optional, faster than DB)
 * - Session storage (optional)
 *
 * Features:
 * - Auto-reconnection
 * - Connection pooling
 * - Error handling
 * - Optional (app works without Redis)
 */

let redisClient: Redis | null = null

/**
 * Initialize Redis connection
 * Returns null if Redis not configured (app continues without cache)
 * Note: This starts the connection but doesn't wait for it to be ready
 */
export function initializeRedis(): Redis | null {
  const redisUrl = env.REDIS_URL

  // Redis is optional - app works without it
  if (!redisUrl) {
    logger.info('⚠️  Redis URL not configured - caching disabled')
    return null
  }

  try {
    redisClient = new Redis(redisUrl, {
      // Retry strategy
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000)
        return delay
      },

      // Reconnect on error
      reconnectOnError(err) {
        const targetError = 'READONLY'
        if (err.message.includes(targetError)) {
          // Only reconnect when the error contains "READONLY"
          return true
        }
        return false
      },

      // Timeout
      connectTimeout: 10000,
      commandTimeout: 5000,

      // Auto pipelining for better performance
      enableAutoPipelining: true,

      // Lazy connect - don't block startup
      lazyConnect: false,
    })

    // Connection success
    redisClient.on('connect', () => {
      logger.info('✅ Redis connected')
    })

    // Connection ready
    redisClient.on('ready', () => {
      logger.info('✅ Redis ready')
    })

    // Connection error (non-fatal, will retry)
    redisClient.on('error', (err) => {
      logger.warn({ err: err.message }, '⚠️  Redis connection error (will retry)')

      // Report to Sentry if available
      if (env.SENTRY_DSN) {
        import('@/config/sentry').then(({ captureException }) => {
          captureException(err, { context: 'redis-connection' })
        })
      }
    })

    // Disconnection
    redisClient.on('close', () => {
      logger.info('🔌 Redis disconnected')
    })

    return redisClient
  } catch (error) {
    logger.error({ error: error }, '❌ Failed to initialize Redis:')
    redisClient = null
    return null
  }
}

/**
 * Get Redis client
 * Returns null if Redis not available
 */
export function getRedis(): Redis | null {
  return redisClient
}

/**
 * Disconnect Redis
 * Call this on server shutdown
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
    logger.info('✅ Redis disconnected')
  }
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return redisClient !== null && redisClient.status === 'ready'
}

/**
 * Wait for Redis to be ready (with timeout)
 * Returns true if Redis is ready, false if timeout or not configured
 */
export async function waitForRedis(timeoutMs: number = 5000): Promise<boolean> {
  if (!redisClient) {
    return false
  }

  // Already ready
  if (redisClient.status === 'ready') {
    return true
  }

  // Wait for ready event
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(false)
    }, timeoutMs)

    redisClient!.once('ready', () => {
      clearTimeout(timeout)
      resolve(true)
    })

    // If client fails to connect
    redisClient!.once('close', () => {
      clearTimeout(timeout)
      resolve(false)
    })
  })
}

export { redisClient }
