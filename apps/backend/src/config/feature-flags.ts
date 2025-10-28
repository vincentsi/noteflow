import { env } from './env'
import { logger } from '@/utils/logger'

/**
 * Feature Flags Configuration
 *
 * Centralized feature flag management for gradual rollouts, A/B testing, and kill switches.
 *
 * Benefits:
 * - Deploy features disabled and enable them progressively
 * - Kill switch for problematic features without redeployment
 * - A/B testing and experimentation
 * - Per-user or per-plan feature access
 *
 * @example
 * ```typescript
 * if (FeatureFlags.isEnabled('ai_summary_v2')) {
 *   return await newSummaryService.generate()
 * }
 * return await legacySummaryService.generate()
 * ```
 */

/**
 * Available feature flags
 */
export enum FeatureFlag {
  // AI Features
  AI_SUMMARY_ENABLED = 'ai_summary_enabled',
  AI_SUMMARY_GPT4 = 'ai_summary_gpt4', // Use GPT-4 instead of GPT-3.5
  AI_CONTENT_MODERATION = 'ai_content_moderation',

  // RSS Features
  RSS_FEED_REFRESH_ENABLED = 'rss_feed_refresh_enabled',
  RSS_AUTO_CATEGORIZATION = 'rss_auto_categorization',

  // Premium Features
  STRIPE_SUBSCRIPTIONS_ENABLED = 'stripe_subscriptions_enabled',
  STRIPE_WEBHOOK_VALIDATION = 'stripe_webhook_validation',

  // Experimental
  EXPERIMENTAL_BULK_EXPORT = 'experimental_bulk_export',
  EXPERIMENTAL_COLLABORATIVE_NOTES = 'experimental_collaborative_notes',

  // Maintenance
  MAINTENANCE_MODE = 'maintenance_mode',
  READ_ONLY_MODE = 'read_only_mode',
}

/**
 * Feature flag configuration
 * true = enabled, false = disabled
 *
 * Can be overridden via environment variables:
 * FEATURE_FLAG_AI_SUMMARY_GPT4=true
 */
const defaultFlags: Record<FeatureFlag, boolean> = {
  // AI Features (enabled by default)
  [FeatureFlag.AI_SUMMARY_ENABLED]: true,
  [FeatureFlag.AI_SUMMARY_GPT4]: false, // Use GPT-3.5 by default (cheaper)
  [FeatureFlag.AI_CONTENT_MODERATION]: true,

  // RSS Features (enabled)
  [FeatureFlag.RSS_FEED_REFRESH_ENABLED]: true,
  [FeatureFlag.RSS_AUTO_CATEGORIZATION]: false, // Future feature

  // Premium Features (enabled)
  [FeatureFlag.STRIPE_SUBSCRIPTIONS_ENABLED]: true,
  [FeatureFlag.STRIPE_WEBHOOK_VALIDATION]: true,

  // Experimental (disabled by default)
  [FeatureFlag.EXPERIMENTAL_BULK_EXPORT]: false,
  [FeatureFlag.EXPERIMENTAL_COLLABORATIVE_NOTES]: false,

  // Maintenance (disabled - enable in emergencies)
  [FeatureFlag.MAINTENANCE_MODE]: false,
  [FeatureFlag.READ_ONLY_MODE]: false,
}

/**
 * Feature flags with environment variable overrides
 */
const flags: Record<FeatureFlag, boolean> = { ...defaultFlags }

/**
 * Load feature flags from environment variables
 * Format: FEATURE_FLAG_<NAME>=true|false
 */
function loadFlagsFromEnv(): void {
  Object.values(FeatureFlag).forEach(flag => {
    const envKey = `FEATURE_FLAG_${flag.toUpperCase()}`
    const envValue = process.env[envKey]

    if (envValue !== undefined) {
      flags[flag] = envValue === 'true' || envValue === '1'
    }
  })
}

// Load on module initialization
loadFlagsFromEnv()

/**
 * Feature Flags Manager
 */
export class FeatureFlags {
  /**
   * Check if a feature is enabled
   * @param flag - Feature flag to check
   * @returns true if enabled, false otherwise
   */
  static isEnabled(flag: FeatureFlag): boolean {
    return flags[flag] ?? false
  }

  /**
   * Check if a feature is disabled
   * @param flag - Feature flag to check
   * @returns true if disabled, false otherwise
   */
  static isDisabled(flag: FeatureFlag): boolean {
    return !this.isEnabled(flag)
  }

  /**
   * Enable a feature flag at runtime
   * @param flag - Feature flag to enable
   * @security Use with caution - only in admin endpoints
   */
  static enable(flag: FeatureFlag): void {
    flags[flag] = true
  }

  /**
   * Disable a feature flag at runtime (kill switch)
   * @param flag - Feature flag to disable
   * @security Use with caution - only in admin endpoints
   */
  static disable(flag: FeatureFlag): void {
    flags[flag] = false
  }

  /**
   * Get all feature flags and their states
   * @returns Object with all flags and their enabled/disabled state
   */
  static getAll(): Record<FeatureFlag, boolean> {
    return { ...flags }
  }

  /**
   * Reset all flags to default values
   * @security Use with caution - mainly for testing
   */
  static reset(): void {
    Object.assign(flags, defaultFlags)
  }

  /**
   * Check if maintenance mode is active
   * Utility method for common check
   */
  static isMaintenanceMode(): boolean {
    return this.isEnabled(FeatureFlag.MAINTENANCE_MODE)
  }

  /**
   * Check if read-only mode is active
   * Utility method for common check
   */
  static isReadOnlyMode(): boolean {
    return this.isEnabled(FeatureFlag.READ_ONLY_MODE)
  }
}

/**
 * Middleware helper to check feature flag before route execution
 * @param flag - Feature flag to check
 * @returns Fastify preHandler that checks the flag
 *
 * @example
 * ```typescript
 * fastify.get('/api/experimental', {
 *   preHandler: requireFeatureFlag(FeatureFlag.EXPERIMENTAL_BULK_EXPORT)
 * }, async (request, reply) => {
 *   // Route only accessible if flag is enabled
 * })
 * ```
 */
export function requireFeatureFlag(flag: FeatureFlag) {
  return async (_request: unknown, reply: { status: (code: number) => { send: (data: unknown) => unknown } }) => {
    if (FeatureFlags.isDisabled(flag)) {
      return reply.status(503).send({
        success: false,
        error: 'Feature unavailable',
        message: 'This feature is currently disabled',
      })
    }
  }
}

/**
 * Log feature flag state on startup (for debugging)
 */
if (env.NODE_ENV === 'development') {
  logger.debug({ flags: FeatureFlags.getAll() }, 'Feature flags loaded')
}
