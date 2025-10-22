/**
 * API client configuration constants
 *
 * These values control timeout, retry behavior, and request handling
 */

/**
 * HTTP client configuration
 */
export const API_CONFIG = {
  /**
   * Request timeout in milliseconds
   * - 10 seconds allows for slow API responses
   * - Prevents hanging requests
   * - Long enough for summary generation jobs (~2-5s typical)
   */
  TIMEOUT_MS: 10_000,

  /**
   * Maximum number of retry attempts for failed requests
   * - Network errors: retry
   * - 5xx server errors: retry
   * - 4xx client errors: don't retry
   */
  MAX_RETRIES: 3,

  /**
   * Base delay between retry attempts (ms)
   * - Uses exponential backoff: 1s, 2s, 4s
   */
  RETRY_DELAY_MS: 1_000,

  /**
   * Token refresh settings
   */
  TOKEN_REFRESH: {
    /**
     * How long before expiry to refresh access token (ms)
     * - 5 minutes buffer to prevent mid-request expiration
     */
    REFRESH_BEFORE_EXPIRY_MS: 5 * 60 * 1000,

    /**
     * Interval to check for stale refresh subscribers (ms)
     * - Cleanup orphaned subscribers every 30 seconds
     */
    SUBSCRIBER_CLEANUP_INTERVAL_MS: 30_000,
  },
} as const

/**
 * Polling configuration for async jobs (summaries, etc.)
 */
export const POLLING_CONFIG = {
  /**
   * Initial polling interval (ms)
   * - Start at 1 second for quick jobs
   */
  INITIAL_INTERVAL_MS: 1_000,

  /**
   * Maximum polling interval (ms)
   * - Cap at 10 seconds for long-running jobs
   * - Prevents excessive delay
   */
  MAX_INTERVAL_MS: 10_000,

  /**
   * Exponential backoff multiplier
   * - Each attempt: interval = previous * 2
   * - 1s → 2s → 4s → 8s → 10s (capped)
   */
  BACKOFF_MULTIPLIER: 2,
} as const

/**
 * Pagination defaults
 */
export const PAGINATION_CONFIG = {
  /** Default page size for lists */
  DEFAULT_PAGE_SIZE: 20,

  /** Maximum page size to prevent performance issues */
  MAX_PAGE_SIZE: 100,

  /** Minimum page size */
  MIN_PAGE_SIZE: 10,
} as const
