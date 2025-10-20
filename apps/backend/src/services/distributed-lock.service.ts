import { logger } from '@/utils/logger'
import Redlock from 'redlock'
import { getRedis, isRedisAvailable } from '@/config/redis'

/**
 * Distributed Lock Service (Redlock Algorithm)
 *
 * Coordinates operations across multiple backend instances with:
 * - Redlock algorithm for distributed locking (Redis-based)
 * - Automatic lock acquisition and release
 * - Graceful degradation (executes without lock if Redis unavailable)
 * - Retry mechanism (3 attempts with 200ms delay + jitter)
 * - Automatic lock extension for long-running operations
 * - Lock status checking (isLocked)
 *
 * **Critical use cases:**
 * - Cron jobs (token cleanup, backups) - prevent duplicate execution
 * - Webhook processing - ensure idempotency across instances
 * - Cache warming - prevent thundering herd
 *
 * @ai-prompt When modifying this service:
 * - NEVER remove graceful degradation (single-instance deployments need this)
 * - ALWAYS use meaningful lock keys (cleanup-tokens, database-backup, etc.)
 * - TTL should exceed expected execution time (add 50% buffer minimum)
 * - executeWithLock returns null if lock held by another instance (check return!)
 * - Lock keys prefixed with 'lock:' automatically (don't add in calling code)
 * - Retry count is 3 attempts (balance between resilience and speed)
 * - automaticExtensionThreshold (500ms) prevents lock expiry during execution
 * - finally block ALWAYS releases lock (even on errors)
 * - Use isLocked() to check lock status without acquiring
 * - Redlock uses single Redis instance (can use multiple for higher availability)
 *
 * @example
 * ```typescript
 * // Cron job with distributed lock (prevents duplicate runs)
 * const result = await DistributedLockService.executeWithLock(
 *   'cleanup-expired-tokens',
 *   10 * 60 * 1000,  // 10 minutes TTL
 *   async () => {
 *     await CleanupService.cleanupExpiredTokens()
 *     return { deleted: 150 }
 *   }
 * )
 *
 * if (result === null) {
 *   logger.info('Cleanup already running on another instance')
 * }
 *
 * // Check if operation is running
 * const isRunning = await DistributedLockService.isLocked('database-backup')
 * if (isRunning) {
 *   logger.info('Backup in progress, skipping manual trigger')
 * }
 * ```
 */
export class DistributedLockService {
  private static redlock: Redlock | null = null

  /**
   * Get or create Redlock instance
   */
  private static getRedlock(): Redlock | null {
    if (!isRedisAvailable()) {
      return null
    }

    if (!this.redlock) {
      const redis = getRedis()
      if (!redis) return null

      this.redlock = new Redlock([redis], {
        driftFactor: 0.01, // Expected clock drift
        retryCount: 3, // Number of times to retry before giving up
        retryDelay: 200, // Time in ms between retries
        retryJitter: 200, // Random time to add to retries
        automaticExtensionThreshold: 500, // Extend lock if TTL < 500ms
      })

      this.redlock.on('error', (error) => {
        logger.error({ error: error }, 'Redlock error:')
      })
    }

    return this.redlock
  }

  /**
   * Execute a function with distributed lock
   * Only one instance can execute at a time
   *
   * @param lockKey Unique key for the lock
   * @param ttl Lock TTL in milliseconds
   * @param fn Function to execute
   * @returns Result of function or null if lock couldn't be acquired
   */
  static async executeWithLock<T>(
    lockKey: string,
    ttl: number,
    fn: () => Promise<T>
  ): Promise<T | null> {
    const redlock = this.getRedlock()

    // If Redis not available, execute without lock (single instance assumed)
    if (!redlock) {
      logger.warn(
        `⚠️  Executing ${lockKey} without distributed lock (Redis unavailable)`
      )
      return await fn()
    }

    let lock
    try {
      // Acquire lock
      lock = await redlock.acquire([`lock:${lockKey}`], ttl)
      logger.info(`🔒 Lock acquired for ${lockKey}`)

      // Execute function
      const result = await fn()

      return result
    } catch (error) {
      // Lock already acquired by another instance
      if (error instanceof Error && error.message.includes('unable to acquire')) {
        logger.info(`⏭️  Skipping ${lockKey} (already running on another instance)`)
        return null
      }

      throw error
    } finally {
      // Release lock
      if (lock) {
        try {
          await lock.release()
          logger.info(`🔓 Lock released for ${lockKey}`)
        } catch (error) {
          logger.error({ error: error }, 'Failed to release lock:')
        }
      }
    }
  }

  /**
   * Check if a lock is currently held
   * @param lockKey Lock key to check
   * @returns true if lock is held, false otherwise
   */
  static async isLocked(lockKey: string): Promise<boolean> {
    const redis = getRedis()
    if (!redis) return false

    try {
      const exists = await redis.exists(`lock:${lockKey}`)
      return exists === 1
    } catch (error) {
      logger.error({ error, lockKey }, 'Error checking lock')
      return false
    }
  }
}
