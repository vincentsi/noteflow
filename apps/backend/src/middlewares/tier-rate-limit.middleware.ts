import type { FastifyRequest, FastifyReply } from 'fastify'
import { PlanType } from '@prisma/client'
import { checkRateLimit } from '@/utils/rate-limiter'
import { RateLimitError } from '@/utils/custom-errors'

/**
 * Tier-Based Rate Limiting Middleware (SCALE-005)
 *
 * Implements different rate limits based on user's subscription tier:
 * - FREE: Stricter limits (prevent abuse)
 * - STARTER: Moderate limits
 * - PRO: Generous limits
 *
 * Used for protecting expensive endpoints:
 * - AI summary generation
 * - PDF processing
 * - Data exports
 *
 * @example
 * ```typescript
 * // In route definition
 * fastify.post('/api/summaries', {
 *   preHandler: [authMiddleware, createTierRateLimit('summary', {
 *     FREE: { max: 5, window: '1 hour' },
 *     STARTER: { max: 20, window: '1 hour' },
 *     PRO: { max: 100, window: '1 hour' },
 *   })],
 *   handler: summaryController.create
 * })
 * ```
 */

export interface TierLimits {
  FREE: { max: number; window: string }
  STARTER: { max: number; window: string }
  PRO: { max: number; window: string }
}

/**
 * Parse window string to milliseconds
 * @param window - Time window (e.g., "1 hour", "15 minutes", "1 day")
 */
function parseWindow(window: string): number {
  const match = window.match(/^(\d+)\s*(second|minute|hour|day)s?$/)
  if (!match || !match[1] || !match[2]) {
    throw new Error(`Invalid window format: ${window}`)
  }

  const value = parseInt(match[1], 10)
  const unit = match[2] as 'second' | 'minute' | 'hour' | 'day'

  const multipliers: Record<'second' | 'minute' | 'hour' | 'day', number> = {
    second: 1000,
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
  }

  return value * multipliers[unit]
}

/**
 * Create tier-based rate limit middleware
 *
 * @param resource - Resource name (for rate limit key, e.g., "summary", "export")
 * @param limits - Rate limits per tier
 * @returns Fastify preHandler function
 */
export function createTierRateLimit(
  resource: string,
  limits: TierLimits
) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Require authentication
    if (!request.user) {
      throw new RateLimitError('Authentication required')
    }

    const { userId } = request.user

    // Get user's plan type from subscription or default to FREE
    const planType: PlanType = request.user.planType || (request.subscription?.planType as PlanType) || 'FREE'

    // Get limits for user's tier
    const tierLimit = limits[planType as keyof TierLimits]
    if (!tierLimit) {
      throw new Error(`No rate limit configured for plan: ${planType}`)
    }

    // Check rate limit
    const windowMs = parseWindow(tierLimit.window)
    const key = `${resource}:${userId}`

    const result = await checkRateLimit(key, tierLimit.max, windowMs)

    // Set rate limit headers
    reply.header('X-RateLimit-Limit', tierLimit.max)
    reply.header('X-RateLimit-Remaining', result.remaining)
    reply.header('X-RateLimit-Reset', result.resetAt.toISOString())

    if (!result.allowed) {
      throw new RateLimitError(
        `Rate limit exceeded. Your ${planType} plan allows ${tierLimit.max} ${resource} requests per ${tierLimit.window}. Try again at ${result.resetAt.toISOString()}`
      )
    }
  }
}

/**
 * Predefined tier limits for common resources
 */
export const TIER_LIMITS = {
  /**
   * AI summary generation
   * - FREE: 5/hour (prevent abuse)
   * - STARTER: 20/hour (reasonable usage)
   * - PRO: 100/hour (power users)
   */
  SUMMARY: {
    FREE: { max: 5, window: '1 hour' },
    STARTER: { max: 20, window: '1 hour' },
    PRO: { max: 100, window: '1 hour' },
  } as TierLimits,

  /**
   * Data export (GDPR, backups)
   * - FREE: 3/day (occasional use)
   * - STARTER: 10/day
   * - PRO: 50/day
   */
  EXPORT: {
    FREE: { max: 3, window: '1 day' },
    STARTER: { max: 10, window: '1 day' },
    PRO: { max: 50, window: '1 day' },
  } as TierLimits,

  /**
   * Article save operations
   * - FREE: 50/hour
   * - STARTER: 200/hour
   * - PRO: Unlimited (1000/hour effectively unlimited)
   */
  ARTICLE_SAVE: {
    FREE: { max: 50, window: '1 hour' },
    STARTER: { max: 200, window: '1 hour' },
    PRO: { max: 1000, window: '1 hour' },
  } as TierLimits,
}
