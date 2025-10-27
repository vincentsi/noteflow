import { prisma } from '@/config/prisma'
import { CacheService, CacheKeys } from '@/services/cache.service'
import { PlanType } from '@prisma/client'
import {
  ARTICLE_LIMITS,
  SUMMARY_LIMITS,
  NOTE_LIMITS,
} from '@/constants/plan-limits'
import { CACHE_TTL } from '@/constants/performance'
import { PlanLimitError, NotFoundError } from './custom-errors'

/**
 * Plan Limiter Utility
 *
 * Centralized utility for checking and enforcing plan limits across features.
 * Eliminates duplication of limit-checking logic in services.
 *
 * @ai-prompt When using this utility:
 * - ALWAYS call checkLimit() before creating new resources
 * - PRO plan has Infinity limit (always passes)
 * - Uses Redis cache to reduce DB queries
 * - Throws Error with user-friendly message when limit exceeded
 *
 * @example
 * ```typescript
 * // In article.service.ts
 * await PlanLimiter.checkLimit(userId, 'article')
 * // If limit exceeded, throws: "Article save limit reached..."
 *
 * // In summary.service.ts
 * await PlanLimiter.checkLimit(userId, 'summary')
 * // If limit exceeded, throws: "Summary generation limit reached..."
 * ```
 */

export type ResourceType = 'article' | 'summary' | 'note'

interface LimitConfig {
  limits: Record<PlanType, number>
  cacheKeyFn: (userId: string) => string
  countFn: (userId: string) => Promise<number>
  cacheTTL: number
  resourceName: string
}

/**
 * Resource configuration for each feature
 * Maps resource type to its limit logic
 */
const RESOURCE_CONFIG: Record<ResourceType, LimitConfig> = {
  article: {
    limits: ARTICLE_LIMITS,
    cacheKeyFn: (userId) => CacheKeys.articleCount(userId),
    countFn: async (userId) =>
      await prisma.savedArticle.count({ where: { userId } }),
    cacheTTL: CACHE_TTL.ARTICLE_COUNT,
    resourceName: 'saved articles',
  },
  summary: {
    limits: SUMMARY_LIMITS,
    cacheKeyFn: (userId) => {
      const now = new Date()
      return CacheKeys.summaryUsage(userId, now.getFullYear(), now.getMonth())
    },
    countFn: async (userId) => {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      return await prisma.summary.count({
        where: {
          userId,
          createdAt: { gte: startOfMonth },
        },
      })
    },
    cacheTTL: CACHE_TTL.PLAN_LIMITS_MONTHLY(
      new Date().getFullYear(),
      new Date().getMonth()
    ),
    resourceName: 'summaries this month',
  },
  note: {
    limits: NOTE_LIMITS,
    cacheKeyFn: (userId) => `note-count:${userId}`,
    countFn: async (userId) => await prisma.note.count({ where: { userId } }),
    cacheTTL: CACHE_TTL.ARTICLE_COUNT,
    resourceName: 'notes',
  },
}

/**
 * Plan Limiter Class
 * Static methods for limit checking
 */
export class PlanLimiter {
  /**
   * Checks if user can create a new resource based on their plan
   *
   * @param userId - User ID
   * @param resourceType - Type of resource (article, summary, note)
   * @throws Error if limit exceeded with user-friendly message
   *
   * @example
   * ```typescript
   * // Check before saving article
   * await PlanLimiter.checkLimit(userId, 'article')
   * // If FREE user has 10 articles: throws "Article save limit reached. Your FREE plan allows 10 saved articles."
   *
   * // Check before creating summary
   * await PlanLimiter.checkLimit(userId, 'summary')
   * // If STARTER user has 20 summaries this month: throws "Summary generation limit reached..."
   * ```
   */
  static async checkLimit(
    userId: string,
    resourceType: ResourceType
  ): Promise<void> {
    // Get user plan type
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { planType: true },
    })

    if (!user) {
      throw new NotFoundError('User not found')
    }

    const config = RESOURCE_CONFIG[resourceType]
    const limit = config.limits[user.planType]

    // PRO plan has unlimited access (Infinity)
    if (limit === Infinity) {
      return
    }

    // Get current count (with cache)
    const currentCount = await this.getCurrentCount(userId, config)

    // Check if limit exceeded
    if (currentCount >= limit) {
      const resourceName =
        resourceType === 'summary' ? 'summaries/month' : config.resourceName
      throw new PlanLimitError(
        `${this.capitalize(resourceType)} limit reached. Your ${user.planType} plan allows ${limit} ${resourceName}.`
      )
    }
  }

  /**
   * Gets current resource count with caching
   * @private
   */
  private static async getCurrentCount(
    userId: string,
    config: LimitConfig
  ): Promise<number> {
    const cacheKey = config.cacheKeyFn(userId)

    // Try cache first
    let currentCount = await CacheService.get<number>(cacheKey)

    if (currentCount !== null) {
      return currentCount
    }

    // Cache miss - query database
    currentCount = await config.countFn(userId)

    // Cache for future requests
    await CacheService.set(cacheKey, currentCount, config.cacheTTL)

    return currentCount
  }

  /**
   * Invalidates cache for a resource type
   * Call after creating/deleting a resource
   *
   * @param userId - User ID
   * @param resourceType - Type of resource
   *
   * @example
   * ```typescript
   * // After creating an article
   * await PlanLimiter.invalidateCache(userId, 'article')
   *
   * // After deleting a note
   * await PlanLimiter.invalidateCache(userId, 'note')
   * ```
   */
  static async invalidateCache(
    userId: string,
    resourceType: ResourceType
  ): Promise<void> {
    const config = RESOURCE_CONFIG[resourceType]
    const cacheKey = config.cacheKeyFn(userId)
    await CacheService.delete(cacheKey)
  }

  /**
   * Helper to capitalize first letter
   * @private
   */
  private static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  /**
   * Gets remaining quota for a resource
   * Useful for displaying to users
   *
   * @param userId - User ID
   * @param resourceType - Type of resource
   * @returns { used: number, limit: number, remaining: number }
   *
   * @example
   * ```typescript
   * const quota = await PlanLimiter.getQuota(userId, 'summary')
   * // => { used: 3, limit: 5, remaining: 2 }
   * ```
   */
  static async getQuota(userId: string, resourceType: ResourceType) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { planType: true },
    })

    if (!user) {
      throw new NotFoundError('User not found')
    }

    const config = RESOURCE_CONFIG[resourceType]
    const limit = config.limits[user.planType]
    const used = await this.getCurrentCount(userId, config)

    return {
      used,
      limit: limit === Infinity ? 'unlimited' : limit,
      remaining: limit === Infinity ? 'unlimited' : Math.max(0, limit - used),
    }
  }
}
