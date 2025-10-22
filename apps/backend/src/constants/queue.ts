/**
 * BullMQ queue configuration constants
 *
 * These values are tuned based on:
 * - External API rate limits (OpenAI, RSS feeds)
 * - System resource constraints
 * - Job processing time estimates
 */

/**
 * Summary queue worker configuration
 */
export const SUMMARY_QUEUE_CONFIG = {
  /**
   * Number of jobs processed concurrently
   * - Based on OpenAI API rate limits: 450 req/min for gpt-4o-mini
   * - Average job duration: 2-5 seconds
   * - 5 concurrent workers = ~60-150 jobs/min (well under 450 limit)
   */
  CONCURRENCY: 5,

  /**
   * Rate limiter configuration
   * - Matches OpenAI gpt-4o-mini tier limits
   * - Prevents 429 (Too Many Requests) errors
   */
  RATE_LIMITER: {
    /** Maximum jobs per duration */
    MAX_JOBS: 450,
    /** Duration in milliseconds (60 seconds) */
    DURATION_MS: 60000,
  },

  /**
   * Job retry configuration
   */
  RETRY: {
    /** Number of retry attempts for failed jobs */
    ATTEMPTS: 3,
    /** Exponential backoff delay base (ms) */
    BACKOFF_DELAY_MS: 2000,
    /** Backoff type */
    BACKOFF_TYPE: 'exponential' as const,
  },

  /**
   * Job timeout (ms)
   * - OpenAI typically responds in 2-5s
   * - 30s timeout allows for slow responses
   */
  TIMEOUT_MS: 30000,
} as const

/**
 * RSS queue worker configuration
 */
export const RSS_QUEUE_CONFIG = {
  /**
   * Number of jobs processed concurrently
   * - Set to 1 to avoid duplicate article detection race conditions
   * - RSS fetching is not time-critical
   */
  CONCURRENCY: 1,

  /**
   * Job retry configuration
   */
  RETRY: {
    /** Number of retry attempts for failed jobs */
    ATTEMPTS: 2,
    /** Delay between retries (ms) */
    BACKOFF_DELAY_MS: 5000,
    /** Backoff type */
    BACKOFF_TYPE: 'exponential' as const,
  },

  /**
   * Job timeout (ms)
   * - RSS feeds can be slow to respond
   * - 60s timeout for remote fetches
   */
  TIMEOUT_MS: 60000,

  /**
   * Cron schedule for periodic RSS fetching
   * - Every 30 minutes: '0,30 * * * *'
   * - Every hour: '0 * * * *'
   */
  CRON_SCHEDULE: '0,30 * * * *', // Every 30 minutes
} as const

/**
 * Email queue worker configuration
 */
export const EMAIL_QUEUE_CONFIG = {
  /**
   * Number of jobs processed concurrently
   * - Resend has generous rate limits
   * - 3 concurrent workers for responsive email sending
   */
  CONCURRENCY: 3,

  /**
   * Job retry configuration
   */
  RETRY: {
    /** Number of retry attempts for failed jobs */
    ATTEMPTS: 3,
    /** Delay between retries (ms) */
    BACKOFF_DELAY_MS: 1000,
    /** Backoff type */
    BACKOFF_TYPE: 'exponential' as const,
  },

  /**
   * Job timeout (ms)
   * - Email sending usually fast (<1s)
   * - 10s timeout for network issues
   */
  TIMEOUT_MS: 10000,
} as const
