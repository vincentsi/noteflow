import { prisma } from '@/config/prisma'

/**
 * Token Cleanup Utility
 *
 * Centralizes token deletion logic to avoid duplication across:
 * - GDPR service (user data deletion)
 * - Cleanup service (expired token cleanup)
 * - Auth service (logout all devices)
 * - CSRF service (token revocation)
 *
 * @example
 * ```typescript
 * // Delete all tokens for a user
 * await TokenCleanup.deleteAllUserTokens('user_123')
 *
 * // Delete expired tokens with batching
 * const deletedCount = await TokenCleanup.deleteExpiredTokens(
 *   prisma.refreshToken,
 *   new Date(),
 *   1000
 * )
 * ```
 */
export class TokenCleanup {
  /**
   * Delete all tokens for a specific user
   * Used in: GDPR deletion, account deletion, logout all devices
   *
   * @param userId - User ID to delete tokens for
   * @returns Promise that resolves when all tokens are deleted
   */
  static async deleteAllUserTokens(userId: string): Promise<void> {
    await Promise.all([
      prisma.refreshToken.deleteMany({ where: { userId } }),
      prisma.verificationToken.deleteMany({ where: { userId } }),
      prisma.passwordResetToken.deleteMany({ where: { userId } }),
      prisma.csrfToken.deleteMany({ where: { userId } }),
    ])
  }

  /**
   * Delete expired tokens with batching (for performance)
   * Used in: Cleanup service cron job
   *
   * @param model - Prisma model with findMany/deleteMany
   * @param now - Current timestamp to compare against
   * @param batchSize - Number of tokens to delete per batch
   * @returns Total number of tokens deleted
   */
  static async deleteExpiredTokens(
    model: {
      findMany: (args: {
        where: { expiresAt: { lt: Date } }
        select: { id: true }
        take: number
      }) => Promise<Array<{ id: string }>>
      deleteMany: (args: { where: { id: { in: string[] } } }) => Promise<{ count: number }>
    },
    now: Date,
    batchSize: number
  ): Promise<number> {
    let totalDeleted = 0

    while (true) {
      // Find batch of expired tokens
      const tokensToDelete = await model.findMany({
        where: { expiresAt: { lt: now } },
        select: { id: true },
        take: batchSize,
      })

      // No more tokens to delete
      if (tokensToDelete.length === 0) {
        break
      }

      // Delete batch
      const result = await model.deleteMany({
        where: {
          id: { in: tokensToDelete.map(t => t.id) },
        },
      })

      totalDeleted += result.count

      // If batch is smaller than batchSize, we're done
      if (tokensToDelete.length < batchSize) {
        break
      }

      // Pause between batches to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return totalDeleted
  }

  /**
   * Revoke all CSRF tokens for a user
   * Used in: Password change, security events
   *
   * @param userId - User ID to revoke CSRF tokens for
   */
  static async revokeUserCsrfTokens(userId: string): Promise<void> {
    await prisma.csrfToken.deleteMany({ where: { userId } })
  }

  /**
   * Revoke all refresh tokens for a user
   * Used in: Password change, logout all devices
   *
   * @param userId - User ID to revoke refresh tokens for
   */
  static async revokeUserRefreshTokens(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { userId } })
  }

  /**
   * Delete all verification tokens for a user
   * Used in: Email verified, user deleted
   *
   * @param userId - User ID to delete verification tokens for
   */
  static async deleteVerificationTokens(userId: string): Promise<void> {
    await prisma.verificationToken.deleteMany({ where: { userId } })
  }

  /**
   * Delete all password reset tokens for a user
   * Used in: Password reset completed, user deleted
   *
   * @param userId - User ID to delete password reset tokens for
   */
  static async deletePasswordResetTokens(userId: string): Promise<void> {
    await prisma.passwordResetToken.deleteMany({ where: { userId } })
  }
}
