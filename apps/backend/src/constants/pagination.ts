/**
 * Pagination configuration constants
 *
 * These values ensure consistent pagination behavior across all list endpoints
 */

/**
 * Default pagination settings
 */
export const PAGINATION_CONFIG = {
  /**
   * Default number of items per page
   * - Balances between performance and UX
   * - Prevents excessive data transfer
   */
  DEFAULT_PAGE_SIZE: 20,

  /**
   * Maximum number of items allowed per page
   * - Prevents abuse and performance issues
   * - Large pages can cause slow queries and memory issues
   */
  MAX_PAGE_SIZE: 100,

  /**
   * Minimum number of items per page
   * - Ensures reasonable pagination
   */
  MIN_PAGE_SIZE: 1,
} as const
