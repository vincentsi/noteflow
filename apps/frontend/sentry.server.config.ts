import * as Sentry from '@sentry/nextjs'

/**
 * Sentry Server-Side Configuration
 *
 * This file configures Sentry for the server-side (Next.js API routes, SSR).
 * It captures errors that happen during server-side rendering and API routes.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

Sentry.init({
  // Get DSN from environment variable
  dsn: process.env.SENTRY_DSN,

  // Environment tracking
  environment: process.env.NODE_ENV,

  // Release tracking
  release: process.env.APP_VERSION || '1.0.0',

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Filter out sensitive data before sending to Sentry
  beforeSend(event) {
    // Remove sensitive headers
    if (event.request?.headers) {
      delete event.request.headers.authorization
      delete event.request.headers.cookie
    }

    // Remove sensitive data from request body
    if (event.request?.data && typeof event.request.data === 'object') {
      const sensitiveFields = [
        'password',
        'newPassword',
        'oldPassword',
        'token',
        'refreshToken',
        'accessToken',
        'secret',
        'apiKey',
        'creditCard',
        'cardNumber',
        'cvv',
      ]

      const data = event.request.data as Record<string, unknown>
      const filteredData = { ...data }

      sensitiveFields.forEach(field => {
        if (filteredData[field]) {
          filteredData[field] = '***REDACTED***'
        }
      })

      event.request.data = filteredData
    }

    return event
  },

  // Ignore common non-critical errors
  ignoreErrors: [
    'NetworkError',
    'Network request failed',
    'Failed to fetch',
    'AbortError',
  ],

  // Don't send errors in development
  enabled: process.env.NODE_ENV !== 'development',
})
