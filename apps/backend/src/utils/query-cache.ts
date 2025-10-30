import { CacheService } from '@/services/cache.service'
import { logger } from '@/utils/logger'

/**
 * Query Result Caching Utility
 *
 * Wraps database queries with Redis caching to reduce database load
 * Target: 80% cache hit rate for frequently accessed queries
 *
 * Features:
 * - Automatic cache-aside pattern (check cache → query DB → cache result)
 * - Configurable TTL per query type
 * - Cache invalidation helpers
 * - Metrics tracking (hits/misses via CacheService)
 *
 * Usage:
 * ```typescript
 * const user = await cachedQuery(
 *   `user:${userId}`,
 *   () => prisma.user.findUnique({ where: { id: userId } }),
 *   300 // 5 minutes TTL
 * )
 * ```
 */

/**
 * Cache TTL Configuration (in seconds)
 */
export const QUERY_CACHE_TTL = {
  USER: 300, // 5 minutes - users change infrequently
  ARTICLE: 600, // 10 minutes - articles rarely change after creation
  SUMMARY: 300, // 5 minutes
  NOTE: 180, // 3 minutes - notes updated more frequently
  RSS_FEED: 1800, // 30 minutes - RSS feeds change slowly
  SUBSCRIPTION: 300, // 5 minutes
  SAVED_ARTICLES_COUNT: 60, // 1 minute - count changes frequently
  SUMMARIES_COUNT: 60, // 1 minute
  NOTES_COUNT: 60, // 1 minute
} as const

/**
 * Execute query with caching (cache-aside pattern)
 *
 * @param cacheKey - Unique cache key for this query
 * @param queryFn - Function that executes the database query
 * @param ttl - Time to live in seconds (default: 5 minutes)
 * @returns Query result (from cache or database)
 *
 * @example
 * ```typescript
 * // Cache user query
 * const user = await cachedQuery(
 *   `user:${userId}`,
 *   () => prisma.user.findUnique({ where: { id: userId } }),
 *   QUERY_CACHE_TTL.USER
 * )
 *
 * // Cache aggregation query
 * const count = await cachedQuery(
 *   `user:${userId}:articles:count`,
 *   () => prisma.savedArticle.count({ where: { userId } }),
 *   QUERY_CACHE_TTL.SAVED_ARTICLES_COUNT
 * )
 * ```
 */
export async function cachedQuery<T>(
  cacheKey: string,
  queryFn: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  try {
    // Try cache first
    const cached = await CacheService.get<T>(cacheKey)
    if (cached !== null) {
      return cached
    }

    // Cache miss - execute query
    const result = await queryFn()

    // Cache the result (fire and forget - don't block)
    CacheService.set(cacheKey, result, ttl).catch(error => {
      logger.warn({ error, cacheKey }, 'Failed to cache query result')
    })

    return result
  } catch (error) {
    logger.error({ error, cacheKey }, 'Cached query execution failed')
    throw error
  }
}

/**
 * Invalidate cache for a specific key
 *
 * @example
 * ```typescript
 * // User updated - invalidate user cache
 * await invalidateCache(`user:${userId}`)
 * ```
 */
export async function invalidateCache(cacheKey: string): Promise<void> {
  try {
    await CacheService.delete(cacheKey)
  } catch (error) {
    logger.warn({ error, cacheKey }, 'Failed to invalidate cache')
  }
}

/**
 * Invalidate all cache entries matching a pattern
 *
 * @example
 * ```typescript
 * // User deleted - invalidate all user-related caches
 * await invalidateCachePattern(`user:${userId}:*`)
 * ```
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  try {
    await CacheService.deletePattern(pattern)
  } catch (error) {
    logger.warn({ error, pattern }, 'Failed to invalidate cache pattern')
  }
}

/**
 * Helper functions for common cache operations
 */
export const QueryCache = {
  /**
   * Cache user data
   */
  user: {
    get: <T>(userId: string, queryFn: () => Promise<T>) =>
      cachedQuery(`user:${userId}`, queryFn, QUERY_CACHE_TTL.USER),
    invalidate: (userId: string) => invalidateCache(`user:${userId}`),
    invalidateAll: (userId: string) => invalidateCachePattern(`user:${userId}:*`),
  },

  /**
   * Cache article data
   */
  article: {
    get: <T>(articleId: string, queryFn: () => Promise<T>) =>
      cachedQuery(`article:${articleId}`, queryFn, QUERY_CACHE_TTL.ARTICLE),
    invalidate: (articleId: string) => invalidateCache(`article:${articleId}`),
  },

  /**
   * Cache summary data
   */
  summary: {
    get: <T>(summaryId: string, queryFn: () => Promise<T>) =>
      cachedQuery(`summary:${summaryId}`, queryFn, QUERY_CACHE_TTL.SUMMARY),
    invalidate: (summaryId: string) => invalidateCache(`summary:${summaryId}`),
    invalidateUserSummaries: (userId: string) =>
      invalidateCachePattern(`user:${userId}:summaries:*`),
  },

  /**
   * Cache note data
   */
  note: {
    get: <T>(noteId: string, queryFn: () => Promise<T>) =>
      cachedQuery(`note:${noteId}`, queryFn, QUERY_CACHE_TTL.NOTE),
    invalidate: (noteId: string) => invalidateCache(`note:${noteId}`),
    invalidateUserNotes: (userId: string) => invalidateCachePattern(`user:${userId}:notes:*`),
  },

  /**
   * Cache count queries (frequently accessed, short TTL)
   */
  counts: {
    savedArticles: (userId: string, queryFn: () => Promise<number>) =>
      cachedQuery(`user:${userId}:articles:count`, queryFn, QUERY_CACHE_TTL.SAVED_ARTICLES_COUNT),
    summaries: (userId: string, queryFn: () => Promise<number>) =>
      cachedQuery(`user:${userId}:summaries:count`, queryFn, QUERY_CACHE_TTL.SUMMARIES_COUNT),
    notes: (userId: string, queryFn: () => Promise<number>) =>
      cachedQuery(`user:${userId}:notes:count`, queryFn, QUERY_CACHE_TTL.NOTES_COUNT),
    invalidate: (userId: string) => invalidateCachePattern(`user:${userId}:*:count`),
  },
}
