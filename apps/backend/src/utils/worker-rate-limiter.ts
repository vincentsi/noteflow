import { CacheService } from '@/services/cache.service'
import { logger } from '@/utils/logger'

/**
 * Worker Rate Limiter
 *
 * Prevents workers from overwhelming external APIs (OpenAI, Resend, RSS feeds)
 * Uses Redis to track request rates across multiple worker instances
 *
 * Features:
 * - Sliding window rate limiting
 * - Distributed (works with multiple worker instances)
 * - Graceful degradation (allows requests if Redis is down)
 * - Per-service rate limits
 *
 * Usage:
 * ```typescript
 * // In worker before external API call
 * const allowed = await WorkerRateLimiter.checkRateLimit('openai', userId)
 * if (!allowed) {
 *   throw new Error('Rate limit exceeded for OpenAI API')
 * }
 * ```
 */

/**
 * Rate limit configuration per service
 */
export const WORKER_RATE_LIMITS = {
  // OpenAI API limits (conservative to avoid hitting their rate limits)
  openai: {
    maxRequests: 50, // 50 requests
    windowSeconds: 60, // per minute
  },
  // RSS feed fetching (be nice to external servers)
  rss: {
    maxRequests: 100, // 100 feeds
    windowSeconds: 300, // per 5 minutes
  },
  // Email sending via Resend
  email: {
    maxRequests: 100, // 100 emails
    windowSeconds: 3600, // per hour
  },
  // PDF processing (CPU intensive)
  pdf: {
    maxRequests: 20, // 20 PDFs
    windowSeconds: 60, // per minute
  },
} as const

export type ServiceType = keyof typeof WORKER_RATE_LIMITS

/**
 * Check if a worker operation is allowed based on rate limits
 *
 * @param service - Service type ('openai', 'rss', 'email', 'pdf')
 * @param identifier - Unique identifier (userId, feedId, etc.)
 * @returns true if allowed, false if rate limit exceeded
 */
export async function checkRateLimit(service: ServiceType, identifier: string): Promise<boolean> {
  const config = WORKER_RATE_LIMITS[service]
  const key = `worker:ratelimit:${service}:${identifier}`

  try {
    // Increment counter with TTL
    const count = await CacheService.increment(key, config.windowSeconds)

    if (count === null) {
      // Redis unavailable - allow request (graceful degradation)
      logger.warn({ service, identifier }, 'Rate limiter unavailable, allowing request')
      return true
    }

    const allowed = count <= config.maxRequests

    if (!allowed) {
      logger.warn(
        {
          service,
          identifier,
          count,
          maxRequests: config.maxRequests,
          windowSeconds: config.windowSeconds,
        },
        `Worker rate limit exceeded for ${service}`
      )
    }

    return allowed
  } catch (error) {
    // On error, allow request (don't block workers on rate limiter failures)
    logger.error({ error, service, identifier }, 'Rate limiter error, allowing request')
    return true
  }
}

/**
 * Get current rate limit count for a service
 *
 * @param service - Service type
 * @param identifier - Unique identifier
 * @returns Current count or null if unavailable
 */
export async function getRateLimitCount(
  service: ServiceType,
  identifier: string
): Promise<number | null> {
  const key = `worker:ratelimit:${service}:${identifier}`

  try {
    const count = await CacheService.get<number>(key)
    return count ?? 0
  } catch (error) {
    logger.error({ error, service, identifier }, 'Failed to get rate limit count')
    return null
  }
}

/**
 * Reset rate limit for a service (admin/debugging use)
 *
 * @param service - Service type
 * @param identifier - Unique identifier
 */
export async function resetRateLimit(service: ServiceType, identifier: string): Promise<void> {
  const key = `worker:ratelimit:${service}:${identifier}`

  try {
    await CacheService.delete(key)
    logger.info({ service, identifier }, 'Rate limit reset')
  } catch (error) {
    logger.error({ error, service, identifier }, 'Failed to reset rate limit')
  }
}

/**
 * Wait until rate limit allows the request (with exponential backoff)
 *
 * @param service - Service type
 * @param identifier - Unique identifier
 * @param maxRetries - Maximum number of retries (default: 5)
 * @returns true if allowed after waiting, false if max retries exceeded
 */
export async function waitForRateLimit(
  service: ServiceType,
  identifier: string,
  maxRetries: number = 5
): Promise<boolean> {
  let retries = 0
  let delay = 1000 // Start with 1 second

  while (retries < maxRetries) {
    const allowed = await checkRateLimit(service, identifier)

    if (allowed) {
      return true
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    logger.info(
      { service, identifier, delay, retry: retries + 1, maxRetries },
      `Rate limit exceeded, waiting ${delay}ms before retry`
    )

    await new Promise(resolve => setTimeout(resolve, delay))
    delay *= 2
    retries++
  }

  logger.error({ service, identifier, maxRetries }, 'Rate limit still exceeded after max retries')
  return false
}

/**
 * Decorator function to automatically rate limit worker functions
 *
 * @example
 * ```typescript
 * const generateSummary = withRateLimit('openai', async (userId, text) => {
 *   // This function will only execute if rate limit allows
 *   return await AIService.generateSummary(text)
 * })
 * ```
 */
export function withRateLimit<T extends unknown[], R>(
  service: ServiceType,
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    // Use first argument as identifier (usually userId)
    const identifier = String(args[0])

    const allowed = await checkRateLimit(service, identifier)

    if (!allowed) {
      throw new Error(`Rate limit exceeded for ${service}. Please wait before retrying.`)
    }

    return fn(...args)
  }
}

export const WorkerRateLimiter = {
  checkRateLimit,
  getRateLimitCount,
  resetRateLimit,
  waitForRateLimit,
  withRateLimit,
}
