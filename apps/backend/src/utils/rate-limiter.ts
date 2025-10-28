import { isRedisAvailable } from '@/config/redis'
import { CacheService } from '@/services/cache.service'

/**
 * Custom Rate Limiter Utility (SEC-010)
 *
 * Provides flexible rate limiting beyond Fastify's built-in rate limiter
 * Useful for:
 * - Rate limiting by email (prevent email bombing)
 * - Rate limiting by token (prevent brute force)
 * - Complex rate limiting scenarios
 *
 * Uses Redis for distributed rate limiting across multiple instances
 * Falls back to in-memory if Redis unavailable (not distributed)
 */

// In-memory fallback storage (not distributed)
const inMemoryStore = new Map<string, { count: number; resetAt: number }>()

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
}

/**
 * Check if action is rate limited
 *
 * @param key - Unique identifier for rate limit (e.g., "password-reset-email:user@example.com")
 * @param maxAttempts - Maximum attempts allowed
 * @param windowMs - Time window in milliseconds
 * @returns Rate limit result
 *
 * @example
 * ```typescript
 * const result = await checkRateLimit(
 *   `password-reset-email:${email}`,
 *   3,
 *   60 * 60 * 1000 // 1 hour
 * )
 *
 * if (!result.allowed) {
 *   throw new Error(`Too many attempts. Try again at ${result.resetAt.toISOString()}`)
 * }
 * ```
 */
export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now()
  const resetAt = now + windowMs

  if (isRedisAvailable()) {
    // Use Redis for distributed rate limiting
    const count = await CacheService.get<number>(`ratelimit:${key}`)

    if (count === null) {
      // First attempt - set counter
      await CacheService.set(`ratelimit:${key}`, 1, Math.ceil(windowMs / 1000))
      return {
        allowed: true,
        remaining: maxAttempts - 1,
        resetAt: new Date(resetAt),
      }
    }

    if (count >= maxAttempts) {
      // Rate limit exceeded
      const ttl = await CacheService.getTTL(`ratelimit:${key}`)
      const actualResetAt = ttl ? now + ttl * 1000 : resetAt
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(actualResetAt),
      }
    }

    // Increment counter
    await CacheService.increment(`ratelimit:${key}`)

    return {
      allowed: true,
      remaining: maxAttempts - count - 1,
      resetAt: new Date(resetAt),
    }
  } else {
    // Fallback to in-memory (not distributed - dev only)
    const entry = inMemoryStore.get(key)

    if (!entry || entry.resetAt < now) {
      // First attempt or window expired
      inMemoryStore.set(key, { count: 1, resetAt })
      return {
        allowed: true,
        remaining: maxAttempts - 1,
        resetAt: new Date(resetAt),
      }
    }

    if (entry.count >= maxAttempts) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(entry.resetAt),
      }
    }

    // Increment counter
    entry.count++
    inMemoryStore.set(key, entry)

    return {
      allowed: true,
      remaining: maxAttempts - entry.count,
      resetAt: new Date(entry.resetAt),
    }
  }
}

/**
 * Reset rate limit for a key
 * Useful after successful operation or for admin override
 *
 * @param key - Rate limit key to reset
 *
 * @example
 * ```typescript
 * // Reset after successful password reset
 * await resetRateLimit(`password-reset-email:${email}`)
 * ```
 */
export async function resetRateLimit(key: string): Promise<void> {
  if (isRedisAvailable()) {
    await CacheService.delete(`ratelimit:${key}`)
  } else {
    inMemoryStore.delete(key)
  }
}

/**
 * Get remaining attempts for a key
 * Useful for informing users how many attempts they have left
 *
 * @param key - Rate limit key
 * @param maxAttempts - Maximum attempts allowed
 * @returns Remaining attempts or null if no limit active
 */
export async function getRemainingAttempts(
  key: string,
  maxAttempts: number
): Promise<number | null> {
  if (isRedisAvailable()) {
    const count = await CacheService.get<number>(`ratelimit:${key}`)
    if (count === null) return maxAttempts
    return Math.max(0, maxAttempts - count)
  } else {
    const entry = inMemoryStore.get(key)
    if (!entry || entry.resetAt < Date.now()) return maxAttempts
    return Math.max(0, maxAttempts - entry.count)
  }
}
