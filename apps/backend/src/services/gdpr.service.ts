import { prisma } from '@/config/prisma'
import type { User } from '@prisma/client'
import { TokenCleanup } from '@/utils/token-cleanup.util'
import { stripeService } from './stripe.service'
import { logger } from '@/utils/logger'

/**
 * GDPR Compliance Service
 *
 * Implements GDPR/RGPD requirements:
 * - Right to data portability (Article 20)
 * - Right to erasure / "Right to be forgotten" (Article 17)
 *
 * @see https://gdpr.eu/
 */
export class GDPRService {
  /**
   * Helper method to fetch data in batches to prevent OOM for power users
   * @param fetchFn - Function that fetches data with skip parameter
   * @param batchSize - Size of each batch
   * @returns All fetched data
   */
  private async fetchInBatches<T>(
    fetchFn: (skip: number) => Promise<T[]>,
    batchSize: number
  ): Promise<T[]> {
    const allData: T[] = []
    let skip = 0

    while (true) {
      const batch = await fetchFn(skip)
      if (batch.length === 0) break
      allData.push(...batch)
      skip += batchSize
      // If we got less than batchSize, we've reached the end
      if (batch.length < batchSize) break
    }

    return allData
  }

  /**
   * Export all user data in machine-readable format (JSON)
   *
   * GDPR Article 20: Right to data portability
   * Users have the right to receive their personal data in a structured,
   * commonly used and machine-readable format.
   *
   * PERFORMANCE: Uses batching for large collections to prevent OOM
   *
   * @param userId - ID of user requesting data export
   * @returns Complete user data package
   *
   * @example
   * ```typescript
   * const userData = await gdprService.exportUserData(userId)
   * // Returns JSON with all user data
   * ```
   */
  async exportUserData(userId: string): Promise<{
    user: Omit<User, 'password'>
    metadata: {
      exportDate: string
      dataRetentionNotice: string
    }
    personalData: {
      refreshTokens: Array<{ createdAt: Date; expiresAt: Date }>
      verificationTokens: Array<{ createdAt: Date; expiresAt: Date }>
      resetTokens: Array<{ createdAt: Date; expiresAt: Date }>
      csrfTokens: Array<{ createdAt: Date; expiresAt: Date }>
      subscriptions: Array<{
        status: string
        planType: string
        currentPeriodStart: Date
        currentPeriodEnd: Date
        createdAt: Date
      }>
      savedArticles: Array<{
        articleId: string
        createdAt: Date
        article: {
          title: string
          url: string
          source: string
          publishedAt: Date | null
        }
      }>
      summaries: Array<{
        id: string
        summaryText: string
        originalText: string
        style: string
        title: string | null
        createdAt: Date
      }>
      notes: Array<{
        id: string
        title: string
        content: string
        tags: string[]
        createdAt: Date
        updatedAt: Date
      }>
      posts: Array<{
        id: string
        title: string
        content: string
        slug: string
        isPublic: boolean
        createdAt: Date
      }>
    }
  }> {
    // PERFORMANCE: Fetch user and relations separately with batching
    // GDPR compliance: Must export ALL data, but can do it in chunks for memory efficiency
    const BATCH_SIZE = 100

    // Fetch user basic data first
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Fetch all relations in parallel using Promise.all for speed
    // Small relations fetched all at once, large relations use batching
    const [
      refreshTokens,
      verificationTokens,
      resetTokens,
      csrfTokens,
      subscriptions,
      savedArticles,
      summaries,
      notes,
      posts,
    ] = await Promise.all([
      // Small relations - fetch all at once (users typically have <10)
      prisma.refreshToken.findMany({
        where: { userId },
        select: { createdAt: true, expiresAt: true, revoked: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.verificationToken.findMany({
        where: { userId },
        select: { createdAt: true, expiresAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.passwordResetToken.findMany({
        where: { userId },
        select: { createdAt: true, expiresAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.csrfToken.findMany({
        where: { userId },
        select: { createdAt: true, expiresAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.subscription.findMany({
        where: { userId },
        select: {
          status: true,
          planType: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      // Large relations - batch fetch to prevent OOM for power users
      this.fetchInBatches(
        (skip: number) =>
          prisma.savedArticle.findMany({
            where: { userId },
            select: {
              articleId: true,
              createdAt: true,
              article: {
                select: {
                  title: true,
                  url: true,
                  source: true,
                  publishedAt: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: BATCH_SIZE,
            skip,
          }),
        BATCH_SIZE
      ),
      this.fetchInBatches(
        (skip: number) =>
          prisma.summary.findMany({
            where: { userId },
            select: {
              id: true,
              summaryText: true,
              originalText: true,
              style: true,
              title: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: BATCH_SIZE,
            skip,
          }),
        BATCH_SIZE
      ),
      this.fetchInBatches(
        (skip: number) =>
          prisma.note.findMany({
            where: { userId },
            select: {
              id: true,
              title: true,
              content: true,
              tags: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: BATCH_SIZE,
            skip,
          }),
        BATCH_SIZE
      ),
      this.fetchInBatches(
        (skip: number) =>
          prisma.post.findMany({
            where: { userId },
            select: {
              id: true,
              title: true,
              content: true,
              slug: true,
              isPublic: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: BATCH_SIZE,
            skip,
          }),
        BATCH_SIZE
      ),
    ])

    // Remove password from export
    const { password: _password, ...userWithoutPassword } = user

    return {
      user: userWithoutPassword,
      metadata: {
        exportDate: new Date().toISOString(),
        dataRetentionNotice:
          'This data export contains all personal information we store about you. ' +
          'You have the right to request deletion of this data at any time.',
      },
      personalData: {
        refreshTokens,
        verificationTokens,
        resetTokens,
        csrfTokens,
        subscriptions,
        savedArticles,
        summaries,
        notes,
        posts,
      },
    }
  }

  /**
   * Permanently delete all user data (GDPR "Right to be forgotten")
   *
   * GDPR Article 17: Right to erasure
   * Users have the right to have their personal data erased without undue delay.
   *
   * ⚠️ WARNING: This action is IRREVERSIBLE. All user data will be permanently deleted:
   * - User account
   * - All tokens (refresh, verification, reset, CSRF)
   * - Subscription history
   * - Related data in other tables (via CASCADE)
   *
   * Note: Stripe customer data must be deleted separately via Stripe API
   *
   * @param userId - ID of user requesting data deletion
   * @param reason - Optional reason for deletion (for audit log)
   * @returns Deletion confirmation with timestamp
   *
   * @example
   * ```typescript
   * await gdprService.deleteUserData(userId, 'User requested account deletion')
   * // User and all related data permanently deleted
   * ```
   */
  async deleteUserData(
    userId: string,
    _reason?: string
  ): Promise<{
    success: boolean
    deletedAt: string
    message: string
    deletedData: {
      user: boolean
      refreshTokens: number
      verificationTokens: number
      resetTokens: number
      csrfTokens: number
      subscriptions: number
      stripeCustomer: boolean
    }
  }> {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        stripeCustomerId: true,
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Count related data before deletion (for confirmation)
    const counts = await Promise.all([
      prisma.refreshToken.count({ where: { userId } }),
      prisma.verificationToken.count({ where: { userId } }),
      prisma.passwordResetToken.count({ where: { userId } }),
      prisma.csrfToken.count({ where: { userId } }),
      prisma.subscription.count({ where: { userId } }),
    ])

    const [
      refreshTokenCount,
      verificationTokenCount,
      resetTokenCount,
      csrfTokenCount,
      subscriptionCount,
    ] = counts

    // Delete Stripe customer BEFORE deleting user (GDPR compliance)
    let stripeCustomerDeleted = false
    if (user.stripeCustomerId) {
      try {
        await stripeService.deleteCustomer(user.stripeCustomerId)
        stripeCustomerDeleted = true
        logger.info({ stripeCustomerId: user.stripeCustomerId, userId }, 'Stripe customer deleted')
      } catch (error) {
        logger.error(
          { error, stripeCustomerId: user.stripeCustomerId, userId },
          'Failed to delete Stripe customer'
        )
        throw new Error(
          'Failed to delete payment data. Aborting user deletion for GDPR compliance.'
        )
      }
    }

    // Delete user (CASCADE will handle related data)
    await prisma.user.delete({
      where: { id: userId },
    })

    return {
      success: true,
      deletedAt: new Date().toISOString(),
      message: 'User account and all associated data permanently deleted.',
      deletedData: {
        user: true,
        refreshTokens: refreshTokenCount,
        verificationTokens: verificationTokenCount,
        resetTokens: resetTokenCount,
        csrfTokens: csrfTokenCount,
        subscriptions: subscriptionCount,
        stripeCustomer: stripeCustomerDeleted,
      },
    }
  }

  /**
   * Anonymize user data (alternative to deletion)
   *
   * For cases where complete deletion is not possible due to legal/accounting requirements,
   * but personal identifiable information (PII) must be removed.
   *
   * This method:
   * - Replaces email with anonymized version
   * - Removes name
   * - Invalidates all tokens
   * - Keeps user ID for referential integrity
   *
   * @param userId - ID of user to anonymize
   * @returns Anonymization confirmation
   *
   * @example
   * ```typescript
   * await gdprService.anonymizeUserData(userId)
   * // Email becomes: "deleted-user-clxxx@anonymous.local"
   * // Name removed
   * // All tokens revoked
   * ```
   */
  async anonymizeUserData(userId: string): Promise<{
    success: boolean
    anonymizedAt: string
    message: string
  }> {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Anonymize user data
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted-user-${userId}@anonymous.local`,
        name: null,
        emailVerified: false,
      },
    })

    // Revoke all refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true },
    })

    // Delete all other tokens using TokenCleanup utility
    await TokenCleanup.deleteAllUserTokens(userId)

    return {
      success: true,
      anonymizedAt: new Date().toISOString(),
      message: 'User data anonymized successfully. Personal identifiable information removed.',
    }
  }
}

export const gdprService = new GDPRService()
