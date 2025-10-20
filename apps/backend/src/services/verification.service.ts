import { randomBytes } from 'crypto'
import { prisma } from '../config/prisma'
import { TokenHasher } from '../utils/token-hasher'
import { EmailService } from './email.service'

/**
 * Email Verification Service
 *
 * Manages email verification tokens with security best practices:
 * - Token hashing via SHA-256 (tokens stored as hashes in database)
 * - 24-hour token expiration (prevents stale verification links)
 * - One-time use tokens (deleted after successful verification)
 * - Automatic old token cleanup (only one active token per user)
 * - Email sending via EmailService (Resend API)
 *
 * @ai-prompt When modifying this service:
 * - NEVER store tokens in plaintext (always use TokenHasher.hash())
 * - ALWAYS delete old tokens before creating new ones (one token per user)
 * - Token expiration is 24 hours (balance between security and UX)
 * - verifyEmail() MUST delete token after use (prevent replay attacks)
 * - resendVerification() should check if email already verified (prevent spam)
 * - Generic error messages prevent email enumeration attacks
 * - Consider rate limiting on resend to prevent abuse
 * - Database cleanup of expired tokens handled by cleanup.service.ts
 *
 * @example
 * ```typescript
 * // Create token at registration
 * const token = await VerificationService.createVerificationToken(userId, email)
 * // Token sent via email automatically
 *
 * // User clicks link with token
 * const user = await VerificationService.verifyEmail(token)
 * logger.info(user.emailVerified)  // true
 *
 * // Resend verification if expired
 * await VerificationService.resendVerification(email)
 * ```
 */
export class VerificationService {
  /**
   * Creates a verification token and sends email
   * @param userId - User ID
   * @param email - User email
   * @returns Generated token (plain text, for email)
   */
  static async createVerificationToken(
    userId: string,
    email: string
  ): Promise<string> {
    const token = randomBytes(32).toString('hex')
    const hashedToken = TokenHasher.hash(token)

    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    await prisma.verificationToken.deleteMany({
      where: { userId },
    })

    await prisma.verificationToken.create({
      data: {
        token: hashedToken,
        userId,
        expiresAt,
      },
    })

    await EmailService.sendVerificationEmail(email, token)

    return token
  }

  /**
   * Verifies a token and marks email as verified
   * @param token - Token to verify (plain text)
   * @returns Verified user
   */
  static async verifyEmail(token: string) {
    const hashedToken = TokenHasher.hash(token)

    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    })

    if (!verificationToken) {
      throw new Error('Invalid token')
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new Error('Token expired')
    }

    await prisma.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: true },
    })

    await prisma.verificationToken.delete({
      where: { id: verificationToken.id },
    })

    return verificationToken.user
  }

  /**
   * Resends verification email
   * @param email - User email
   */
  static async resendVerification(email: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      throw new Error('User not found')
    }

    if (user.emailVerified) {
      throw new Error('Email already verified')
    }

    return this.createVerificationToken(user.id, user.email)
  }
}
