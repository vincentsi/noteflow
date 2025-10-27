import { CacheKeys } from '@/services/cache.service'

/**
 * Cache Key Helpers
 *
 * Centralized functions for building cache keys consistently across services.
 * Prevents race conditions at month boundaries by ensuring the same key generation logic.
 *
 * @ai-prompt When modifying cache keys:
 * - ALWAYS use these centralized functions instead of building keys directly
 * - Ensures consistency between service and worker code
 * - Prevents month boundary race conditions
 */

/**
 * Gets cache key for summary usage count (monthly)
 * Uses a specific date to calculate year and month
 *
 * @param userId - User ID
 * @param date - Date to use for year/month calculation (defaults to now)
 * @returns Cache key for summary usage
 *
 * @example
 * ```typescript
 * // In service - use current date
 * const key = getSummaryUsageCacheKey(userId, new Date())
 *
 * // In worker - use summary creation date for consistency
 * const key = getSummaryUsageCacheKey(userId, summary.createdAt)
 * ```
 */
export function getSummaryUsageCacheKey(userId: string, date: Date = new Date()): string {
  return CacheKeys.summaryUsage(userId, date.getFullYear(), date.getMonth())
}
