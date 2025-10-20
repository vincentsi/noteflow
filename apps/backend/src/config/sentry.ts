import { logger } from '@/utils/logger'
import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'
import { env } from './env'

/**
 * Configure Sentry for error tracking and performance monitoring
 *
 * Features:
 * - Automatic error capture
 * - Performance monitoring
 * - Release tracking
 * - Environment tracking
 * - User context
 *
 * Usage:
 * 1. Get your DSN from https://sentry.io/
 * 2. Add SENTRY_DSN to .env
 * 3. Errors are automatically tracked
 */
export function initializeSentry() {
  // Only initialize in production or if explicitly enabled
  const sentryDsn = env.SENTRY_DSN

  if (!sentryDsn) {
    logger.info('⚠️  Sentry DSN not configured - error tracking disabled')
    return
  }

  Sentry.init({
    dsn: sentryDsn,

    // Environment tracking
    environment: env.NODE_ENV,

    // Release tracking (useful for identifying which version has bugs)
    release: process.env.APP_VERSION || '1.0.0',

    // Performance Monitoring
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Profiling (CPU/Memory usage)
    profilesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,

    integrations: [
      // Enable profiling
      nodeProfilingIntegration(),
    ],

    // Filter out sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.authorization
        delete event.request.headers.cookie
      }

      // Remove sensitive query params
      if (
        event.request?.query_string &&
        typeof event.request.query_string === 'string'
      ) {
        const sensitiveParams = ['token', 'password', 'secret', 'apikey']
        const queryString = event.request.query_string

        sensitiveParams.forEach(param => {
          if (queryString.includes(param)) {
            event.request!.query_string = queryString.replace(
              new RegExp(`${param}=[^&]*`, 'gi'),
              `${param}=***REDACTED***`
            )
          }
        })
      }

      // Remove sensitive data from request body
      if (event.request?.data) {
        const sensitiveFields = [
          'password',
          'newPassword',
          'oldPassword',
          'currentPassword',
          'token',
          'refreshToken',
          'accessToken',
          'secret',
          'apiKey',
          'apikey',
          'creditCard',
          'cardNumber',
          'cvv',
          'ssn',
        ]

        // Handle JSON object body
        if (typeof event.request.data === 'object' && event.request.data !== null) {
          const filteredData = { ...event.request.data }

          // Recursively redact sensitive fields
          const redactSensitiveFields = (obj: unknown): unknown => {
            if (typeof obj !== 'object' || obj === null) return obj

            if (Array.isArray(obj)) {
              return obj.map(item => redactSensitiveFields(item))
            }

            const result: Record<string, unknown> = {}
            const record = obj as Record<string, unknown>

            for (const key in record) {
              const lowerKey = key.toLowerCase()
              const isSensitive = sensitiveFields.some(field =>
                lowerKey.includes(field.toLowerCase())
              )

              if (isSensitive) {
                result[key] = '***REDACTED***'
              } else if (typeof record[key] === 'object' && record[key] !== null) {
                result[key] = redactSensitiveFields(record[key])
              } else {
                result[key] = record[key]
              }
            }

            return result
          }

          event.request.data = redactSensitiveFields(filteredData)
        }

        // Handle string body (JSON stringified)
        if (typeof event.request.data === 'string') {
          try {
            const parsed = JSON.parse(event.request.data) as Record<string, unknown>
            const redacted: Record<string, unknown> = {}

            for (const key in parsed) {
              const lowerKey = key.toLowerCase()
              const isSensitive = sensitiveFields.some(field =>
                lowerKey.includes(field.toLowerCase())
              )
              redacted[key] = isSensitive ? '***REDACTED***' : parsed[key]
            }

            event.request.data = JSON.stringify(redacted)
          } catch {
            // If not JSON, leave as is
          }
        }
      }

      return event
    },

    // Ignore common non-critical errors
    ignoreErrors: [
      // Browser errors
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',

      // Network errors
      'NetworkError',
      'Network request failed',

      // Common user errors (not server bugs)
      'Invalid credentials',
      'User not found',
    ],
  })

  logger.info('✅ Sentry initialized - error tracking enabled')
}

/**
 * Capture exception manually
 * Use this for caught errors you still want to track
 *
 * Sends to Sentry in production and staging environments
 */
export function captureException(
  error: Error,
  context?: Record<string, unknown>
) {
  if (env.NODE_ENV === 'production' || env.NODE_ENV === 'staging') {
    Sentry.captureException(error, {
      extra: context,
    })
  } else {
    logger.error({ error, context }, 'Sentry (dev mode)')
  }
}

/**
 * Set user context for error tracking
 * Call this after user authentication
 */
export function setUserContext(user: {
  id: string
  email: string
  role?: string
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
  })
}

/**
 * Clear user context (e.g., on logout)
 */
export function clearUserContext() {
  Sentry.setUser(null)
}

/**
 * Add breadcrumb for debugging
 * Breadcrumbs help understand what led to an error
 */
export function addBreadcrumb(message: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    message,
    data,
    level: 'info',
  })
}

export { Sentry }
