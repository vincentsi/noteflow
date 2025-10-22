/**
 * Production-safe logger
 *
 * In development: logs to console
 * In production: sends to Sentry (if configured) and suppresses console
 */

const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Log informational message
 * - Development: console.info
 * - Production: suppressed
 */
export function logInfo(message: string, meta?: Record<string, unknown>): void {
  if (isDevelopment) {
    console.info(message, meta)
  }
}

/**
 * Log warning message
 * - Development: console.warn
 * - Production: sent to Sentry (if Sentry is configured)
 */
export function logWarn(message: string, meta?: Record<string, unknown>): void {
  if (isDevelopment) {
    console.warn(message, meta)
  } else {
    // In production, warnings should be sent to monitoring (Sentry, etc.)
    // For now, suppress in production
    // TODO: Integrate with Sentry when configured
    // Sentry.captureMessage(message, { level: 'warning', extra: meta })
  }
}

/**
 * Log error
 * - Development: console.error
 * - Production: sent to Sentry (if Sentry is configured)
 */
export function logError(error: Error | unknown, context?: string): void {
  if (isDevelopment) {
    console.error(context || 'Error:', error)
  } else {
    // In production, errors should be sent to monitoring (Sentry, etc.)
    // For now, suppress in production
    // TODO: Integrate with Sentry when configured
    // Sentry.captureException(error, { tags: { context } })
  }
}

/**
 * Legacy logger object for backward compatibility
 */
export const logger = {
  info: logInfo,
  warn: logWarn,
  error: logError,
}
