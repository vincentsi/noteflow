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
   * Export all user data in machine-readable format (JSON)
   *
   * GDPR Article 20: Right to data portability
   * Users have the right to receive their personal data in a structured,
   * commonly used and machine-readable format.
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
    }
  }> {
    // Fetch user with all related data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        refreshTokens: {
          select: {
            createdAt: true,
            expiresAt: true,
            revoked: true,
          },
          take: 1000, // Limit to last 1000 tokens
          orderBy: { createdAt: 'desc' },
        },
        verificationTokens: {
          select: {
            createdAt: true,
            expiresAt: true,
          },
          take: 100,
          orderBy: { createdAt: 'desc' },
        },
        resetTokens: {
          select: {
            createdAt: true,
            expiresAt: true,
          },
          take: 100,
          orderBy: { createdAt: 'desc' },
        },
        csrfTokens: {
          select: {
            createdAt: true,
            expiresAt: true,
          },
          take: 100,
          orderBy: { createdAt: 'desc' },
        },
        subscriptions: {
          select: {
            status: true,
            planType: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
            createdAt: true,
          },
          take: 100,
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

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
        refreshTokens: user.refreshTokens.map((t) => ({
          createdAt: t.createdAt,
          expiresAt: t.expiresAt,
        })),
        verificationTokens: user.verificationTokens.map((t) => ({
          createdAt: t.createdAt,
          expiresAt: t.expiresAt,
        })),
        resetTokens: user.resetTokens.map((t) => ({
          createdAt: t.createdAt,
          expiresAt: t.expiresAt,
        })),
        csrfTokens: user.csrfTokens.map((t) => ({
          createdAt: t.createdAt,
          expiresAt: t.expiresAt,
        })),
        subscriptions: user.subscriptions.map((s) => ({
          status: s.status,
          planType: s.planType,
          currentPeriodStart: s.currentPeriodStart,
          currentPeriodEnd: s.currentPeriodEnd,
          createdAt: s.createdAt,
        })),
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

    const [refreshTokenCount, verificationTokenCount, resetTokenCount, csrfTokenCount, subscriptionCount] = counts

    // Delete Stripe customer BEFORE deleting user (GDPR compliance)
    let stripeCustomerDeleted = false
    if (user.stripeCustomerId) {
      try {
        await stripeService.deleteCustomer(user.stripeCustomerId)
        stripeCustomerDeleted = true
        logger.info({ stripeCustomerId: user.stripeCustomerId, userId }, 'Stripe customer deleted')
      } catch (error) {
        logger.error({ error, stripeCustomerId: user.stripeCustomerId, userId }, 'Failed to delete Stripe customer')
        throw new Error('Failed to delete payment data. Aborting user deletion for GDPR compliance.')
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
