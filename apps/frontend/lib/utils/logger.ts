/**
 * Production-safe logger
 *
 * In development: logs to console
 * In production: sends to Sentry and suppresses console
 */

import * as Sentry from '@sentry/nextjs'

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
 * - Production: sent to Sentry
 */
export function logWarn(message: string, meta?: Record<string, unknown>): void {
  if (isDevelopment) {
    console.warn(message, meta)
  } else {
    // Send warnings to Sentry in production
    Sentry.captureMessage(message, {
      level: 'warning',
      extra: meta,
    })
  }
}

/**
 * Log error
 * - Development: console.error
 * - Production: sent to Sentry
 */
export function logError(error: Error | unknown, context?: string): void {
  if (isDevelopment) {
    console.error(context || 'Error:', error)
  } else {
    // Send errors to Sentry in production
    if (error instanceof Error) {
      Sentry.captureException(error, {
        tags: context ? { context } : undefined,
      })
    } else {
      Sentry.captureMessage(String(error), {
        level: 'error',
        tags: context ? { context } : undefined,
      })
    }
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
