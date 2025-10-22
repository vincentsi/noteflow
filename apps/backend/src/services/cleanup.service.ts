import { logger } from '@/utils/logger'
import { prisma } from '@/config/prisma'
import type { FastifyInstance } from 'fastify'
import cron from 'node-cron'
import { DistributedLockService } from './distributed-lock.service'
import { CLEANUP_CONFIG } from '@/constants/performance'

// Type for Prisma models that have token-like structure (id, expiresAt)
type TokenModel = {
  findMany: (args: {
    where: { expiresAt: { lt: Date } }
    select: { id: true }
    take: number
  }) => Promise<Array<{ id: string }>>
  deleteMany: (args: {
    where: { id: { in: string[] } }
  }) => Promise<{ count: number }>
}

/**
 * Token Cleanup Service (Cron Job)
 *
 * Automated cleanup of expired tokens with production-grade features:
 * - Daily cron job (3 AM default, configurable)
 * - Distributed locks (prevents duplicate cleanup in multi-instance setup)
 * - Batched deletion (configurable batch size, prevents long DB locks)
 * - Pause between batches (configurable, prevents CPU/DB overload)
 * - Find-then-delete pattern (Prisma limitation workaround)
 * - Cleans 4 token types: Refresh, Verification, PasswordReset, CSRF
 *
 * @ai-prompt When modifying this service:
 * - NEVER remove distributed lock (multi-instance deployments need this)
 * - ALWAYS use batching (prevents long-running transactions)
 * - Default batch size: 1000 tokens (tune based on DB performance)
 * - Default pause: 100ms between batches (prevents CPU spike)
 * - Find-then-delete pattern required (Prisma doesn't support take on deleteMany)
 * - Cron schedule: '0 3 * * *' = daily at 3 AM (configurable via env)
 * - Lock TTL: 10 minutes (should exceed expected cleanup duration)
 * - Add new token models to cleanupExpiredTokens() method
 * - Consider table partitioning if tokens grow to millions
 * - Monitor cleanup duration (should complete within lock TTL)
 *
 * @example
 * ```typescript
 * // Start cleanup job in server.ts
 * CleanupService.startCleanupJob(app)
 *
 * // Manual cleanup (admin endpoint)
 * await CleanupService.runManualCleanup(app)
 *
 * // Environment configuration
 * CLEANUP_BATCH_SIZE=1000        // Tokens per batch
 * CLEANUP_PAUSE_MS=100           // Pause between batches (ms)
 * ```
 */
export class CleanupService {
  /**
   * Batch size configurable via environment
   * Default: 1000 tokens per batch
   */
  private static readonly BATCH_SIZE =
    Number(process.env.CLEANUP_BATCH_SIZE) || CLEANUP_CONFIG.TOKEN_BATCH_SIZE

  /**
   * Pause between batches configurable via environment (in ms)
   * Default: 100ms
   */
  private static readonly PAUSE_BETWEEN_BATCHES = CLEANUP_CONFIG.PAUSE_MS

  /**
   * Deletes all expired tokens from database
   * - Expired RefreshTokens
   * - Expired VerificationTokens
   * - Expired PasswordResetTokens
   * - Expired CsrfTokens
   *
   * Optimized with configurable batching to avoid prolonged database locks
   */
  static async cleanupExpiredTokens(): Promise<void> {
    const now = new Date()

    try {
      const deletedRefreshTokens = await this.cleanupModelWithBatching(
        'refresh tokens',
        prisma.refreshToken,
        now,
        this.BATCH_SIZE
      )

      const deletedVerificationTokens = await this.cleanupModelWithBatching(
        'verification tokens',
        prisma.verificationToken,
        now,
        this.BATCH_SIZE
      )

      const deletedResetTokens = await this.cleanupModelWithBatching(
        'password reset tokens',
        prisma.passwordResetToken,
        now,
        this.BATCH_SIZE
      )

      const deletedCsrfTokens = await this.cleanupModelWithBatching(
        'CSRF tokens',
        prisma.csrfToken,
        now,
        this.BATCH_SIZE
      )

      logger.info(
        `✅ Cleanup completed: ${deletedRefreshTokens} refresh tokens, ${deletedVerificationTokens} verification tokens, ${deletedResetTokens} reset tokens, ${deletedCsrfTokens} CSRF tokens deleted`
      )
    } catch (error) {
      logger.error({ error: error }, '❌ Error during token cleanup:')
    }
  }

  /**
   * Cleans up a specific model in batches
   * Solution: Find IDs first, then delete by IDs (Prisma doesn't support `take` on deleteMany)
   *
   * @param _modelName - Model name for logging (currently unused)
   * @param model - Prisma model to clean up
   * @param now - Current date
   * @param batchSize - Batch size
   * @returns Total number of tokens deleted
   */
  private static async cleanupModelWithBatching(
    _modelName: string,
    model: TokenModel,
    now: Date,
    batchSize: number
  ): Promise<number> {
    let totalDeleted = 0
    let hasMore = true

    while (hasMore) {
      const tokensToDelete = await model.findMany({
        where: {
          expiresAt: { lt: now },
        },
        select: { id: true },
        take: batchSize,
      })

      if (tokensToDelete.length === 0) {
        hasMore = false
        break
      }

      const result = await model.deleteMany({
        where: {
          id: { in: tokensToDelete.map(t => t.id) },
        },
      })

      totalDeleted += result.count

      if (tokensToDelete.length < batchSize) {
        hasMore = false
      }

      if (hasMore) {
        await new Promise(resolve =>
          setTimeout(resolve, CleanupService.PAUSE_BETWEEN_BATCHES)
        )
      }
    }

    return totalDeleted
  }

  /**
   * Starts the cleanup cron job
   * Runs daily at 3 AM
   * Uses distributed locks to prevent duplication in multi-instance deployments
   * @param app - Fastify instance for logging
   */
  static startCleanupJob(app: FastifyInstance): void {
    cron.schedule('0 3 * * *', async () => {
      app.log.info('Starting scheduled token cleanup...')

      await DistributedLockService.executeWithLock(
        'cleanup-tokens',
        10 * 60 * 1000,
        async () => {
          await CleanupService.cleanupExpiredTokens()
        }
      )
    })

    app.log.info('✅ Token cleanup job scheduled (daily at 3:00 AM)')
  }

  /**
   * Runs an immediate manual cleanup
   * Useful for testing or one-off cleanup
   */
  static async runManualCleanup(app: FastifyInstance): Promise<void> {
    app.log.info('Running manual token cleanup...')
    await CleanupService.cleanupExpiredTokens()
  }
}
