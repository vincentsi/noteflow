import { logger } from '@/utils/logger'
import { randomBytes } from 'crypto'
import { prisma } from '../config/prisma'
import { TokenHasher } from '../utils/token-hasher'
import { authService } from './auth.service'
import { EmailService } from './email.service'

/**
 * Password Reset Service
 *
 * Manages password reset flow with advanced security measures:
 * - Token hashing via SHA-256 (tokens stored as hashes in database)
 * - 1-hour token expiration (prevents stale reset links)
 * - Timing attack protection (constant delay prevents email enumeration)
 * - One-time use tokens (deleted after successful password reset)
 * - Session revocation (invalidates all refresh tokens after reset)
 * - Generic success messages (always return success to prevent enumeration)
 *
 * @ai-prompt When modifying this service:
 * - NEVER reveal if email exists (always return success: true)
 * - ALWAYS add constant delay even on errors (timing attack protection)
 * - NEVER store tokens in plaintext (always use TokenHasher.hash())
 * - Token expiration is 1 hour (security vs UX balance)
 * - resetPassword() MUST revoke all refresh tokens (force re-login)
 * - resetPassword() MUST delete token after use (prevent replay attacks)
 * - addConstantDelay() simulates email send time (200-300ms random)
 * - Generic error messages prevent email enumeration
 * - Rate limiting on reset requests prevents abuse (see password-reset.route.ts)
 * - Database cleanup of expired tokens handled by cleanup.service.ts
 *
 * @example
 * ```typescript
 * // User requests password reset
 * await PasswordResetService.requestReset('user@example.com')
 * // Always returns { success: true } even if email doesn't exist
 *
 * // Verify token before showing reset form
 * const token = await PasswordResetService.verifyResetToken(resetToken)
 *
 * // User submits new password
 * await PasswordResetService.resetPassword(resetToken, newPassword)
 * // Password updated, all sessions invalidated, token deleted
 * ```
 */
export class PasswordResetService {
  /**
   * Constant delay for timing attack protection
   * Simulates email send time even if user doesn't exist
   * Adds random delay between 200-300ms
   */
  private static async addConstantDelay(): Promise<void> {
    const delay = 200 + Math.random() * 100
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  /**
   * Creates a password reset request
   * @param email - User email
   * @returns Success (even if email doesn't exist, for security)
   *
   * Timing attack protection:
   * - Constant delay whether email exists or not
   * - Prevents email enumeration via response time analysis
   */
  static async requestReset(email: string): Promise<{ success: boolean }> {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
      })

      if (!user) {
        await this.addConstantDelay()
        return { success: true }
      }

      const token = randomBytes(32).toString('hex')
      const hashedToken = TokenHasher.hash(token)

      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 1)

      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      })

      await prisma.passwordResetToken.create({
        data: {
          token: hashedToken,
          userId: user.id,
          expiresAt,
        },
      })

      await EmailService.sendPasswordResetEmail(email, token)

      return { success: true }
    } catch (error) {
      logger.error({ error: error }, 'Password reset request error:')
      await this.addConstantDelay()
      return { success: true }
    }
  }

  /**
   * Verifies reset token validity
   * @param token - Token to verify (plain text)
   * @returns Token if valid
   * @throws Error if token is invalid or expired
   */
  static async verifyResetToken(token: string) {
    const hashedToken = TokenHasher.hash(token)

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
    })

    if (!resetToken) {
      throw new Error('Invalid token')
    }

    if (resetToken.expiresAt < new Date()) {
      throw new Error('Token expired')
    }

    return resetToken
  }

  /**
   * Resets user password
   * @param token - Reset token
   * @param newPassword - New password
   * @returns Success
   */
  static async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean }> {
    const resetToken = await this.verifyResetToken(token)

    const hashedPassword = await authService.hashPassword(newPassword)

    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    })

    await prisma.passwordResetToken.deleteMany({
      where: { userId: resetToken.userId },
    })

    await prisma.refreshToken.updateMany({
      where: { userId: resetToken.userId },
      data: { revoked: true },
    })

    return { success: true }
  }
}
