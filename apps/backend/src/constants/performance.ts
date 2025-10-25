/**
 * Performance-related configuration constants
 *
 * These values are tuned for optimal performance based on:
 * - Redis best practices
 * - Database connection pooling limits
 * - System resource constraints
 */

/**
 * Redis cache operation constants
 */
export const CACHE_CONFIG = {
  /**
   * Batch size for Redis SCAN operations
   * - Optimal value recommended by Redis documentation
   * - Balances between memory usage and number of round trips
   * - Too high: risk of blocking Redis
   * - Too low: too many network round trips
   */
  SCAN_BATCH_SIZE: 100,

  /**
   * Batch size for Redis pipeline DELETE operations
   * - Max recommended for Redis pipeline to avoid blocking
   * - Prevents command queue overflow
   * - Allows other clients to interleave commands
   */
  DELETE_BATCH_SIZE: 1000,
} as const

/**
 * Database cleanup operation constants
 */
export const CLEANUP_CONFIG = {
  /**
   * Pause duration (ms) between batches during cleanup
   * - Prevents database lock contention
   * - Allows other queries to execute between batches
   * - Default: 100ms (can be overridden via CLEANUP_PAUSE_MS env var)
   */
  PAUSE_MS: Number(process.env.CLEANUP_PAUSE_MS) || 100,

  /**
   * Batch size for token deletion
   * - Prevents transaction timeouts
   * - Balances speed vs database load
   */
  TOKEN_BATCH_SIZE: 1000,
} as const

/**
 * Cache TTL (Time To Live) constants in seconds
 */
export const CACHE_TTL = {
  /** Article count cache: 1 hour - articles don't change frequently */
  ARTICLE_COUNT: 3600,

  /** Summary data cache: 1 hour - summaries are immutable after creation */
  SUMMARY: 3600,

  /** Summary status cache: 1 minute - jobs complete quickly */
  SUMMARY_STATUS: 60,

  /** Plan limits cache: Until end of month - reset monthly */
  PLAN_LIMITS_MONTHLY: (year: number, month: number): number => {
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59)
    return Math.floor((endOfMonth.getTime() - Date.now()) / 1000)
  },

  /** User session cache: 15 minutes - balance security vs performance */
  USER_SESSION: 900,

  /** RSS feed cache: 30 minutes - feeds update periodically */
  RSS_FEED: 1800,

  /** Articles list cache: 5 minutes - articles change slowly (RSS fetched hourly) */
  ARTICLES_LIST: 300,
} as const
