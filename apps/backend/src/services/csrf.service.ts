import { randomBytes } from 'crypto'
import { prisma } from '../config/prisma'
import { isRedisAvailable } from '../config/redis'
import { TokenHasher } from '../utils/token-hasher'
import { CacheService } from './cache.service'
import { TokenCleanup } from '../utils/token-cleanup.util'

/**
 * CSRF Token Management Service
 *
 * Provides protection against Cross-Site Request Forgery (CSRF) attacks with:
 * - Token hashing via SHA-256 (tokens stored as hashes, not plaintext)
 * - Redis caching for performance (~1ms validation vs ~100ms DB)
 * - Graceful degradation (falls back to database if Redis unavailable)
 * - 15-minute token expiration (configurable via TTL constant)
 * - Automatic cleanup of expired tokens
 *
 * @ai-prompt When modifying this service:
 * - NEVER store tokens in plaintext (always use TokenHasher.hash())
 * - ALWAYS check Redis first, then fallback to DB (graceful degradation)
 * - Token TTL is 15 minutes (balance between security and UX)
 * - verifyToken() must check expiration before returning true
 * - revokeUserTokens() must clear BOTH Redis and DB (logout scenario)
 * - Redis keys use pattern: `csrf:${userId}:${hashedToken}` (consistent naming)
 * - Database cleanup handled by cleanup.service.ts cron job
 *
 * @example
 * ```typescript
 * // Generate token at login
 * const csrfToken = await CsrfService.generateToken(userId)
 * // Set in cookie and send to client
 *
 * // Verify token in middleware
 * const isValid = await CsrfService.verifyToken(token, userId)
 * if (!isValid) {
 *   return reply.status(403).send({ error: 'Invalid CSRF token' })
 * }
 *
 * // Revoke all tokens on logout
 * await CsrfService.revokeUserTokens(userId)
 * ```
 */
export class CsrfService {
  private static readonly TTL = 15 * 60

  /**
   * Generates a new CSRF token for a user
   * Stored in Redis if available, otherwise database
   * @param userId - User ID
   * @returns Generated CSRF token (plain text)
   */
  static async generateToken(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex')
    const hashedToken = TokenHasher.hash(token)

    if (isRedisAvailable()) {
      const key = `csrf:${userId}:${hashedToken}`
      await CacheService.set(key, { userId, createdAt: Date.now() }, this.TTL)
      return token
    }

    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 15)

    await TokenCleanup.revokeUserCsrfTokens(userId)

    await prisma.csrfToken.create({
      data: {
        token: hashedToken,
        userId,
        expiresAt,
      },
    })

    return token
  }

  /**
   * Verifies CSRF token validity
   * Checks Redis first, then database as fallback
   * @param token - Token to verify (plain text)
   * @param userId - User ID
   * @returns true if valid, false otherwise
   */
  static async verifyToken(token: string, userId: string): Promise<boolean> {
    const hashedToken = TokenHasher.hash(token)

    if (isRedisAvailable()) {
      const key = `csrf:${userId}:${hashedToken}`
      const cached = await CacheService.get<{
        userId: string
        createdAt: number
      }>(key)

      if (!cached) {
        return false
      }

      return cached.userId === userId
    }

    const csrfToken = await prisma.csrfToken.findFirst({
      where: {
        token: hashedToken,
        userId,
      },
    })

    if (!csrfToken) {
      return false
    }

    if (csrfToken.expiresAt < new Date()) {
      await prisma.csrfToken.delete({
        where: { id: csrfToken.id },
      })
      return false
    }

    return true
  }

  /**
   * Revokes all CSRF tokens for a user
   * Deletes from both Redis and database
   * @param userId - User ID
   */
  static async revokeUserTokens(userId: string): Promise<void> {
    if (isRedisAvailable()) {
      await CacheService.deletePattern(`csrf:${userId}:*`)
    }

    await TokenCleanup.revokeUserCsrfTokens(userId)
  }
}
