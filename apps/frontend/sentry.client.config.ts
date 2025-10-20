import * as Sentry from '@sentry/nextjs'

/**
 * Sentry Client-Side Configuration
 *
 * This file configures Sentry for the browser/client-side.
 * It captures errors that happen in the user's browser.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

Sentry.init({
  // Get DSN from environment variable
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment tracking
  environment: process.env.NODE_ENV,

  // Release tracking (for identifying which version has bugs)
  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',

  // Performance Monitoring
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session Replay
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // If the entire session is not sampled, use the below sample rate to sample
  // sessions when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      // Mask all text and input content
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter out sensitive data before sending to Sentry
  beforeSend(event) {
    // Remove sensitive data from request
    if (event.request) {
      // Remove auth headers
      if (event.request.headers) {
        delete event.request.headers.authorization
        delete event.request.headers.Authorization
        delete event.request.headers.cookie
        delete event.request.headers.Cookie
      }

      // Redact sensitive query parameters
      if (event.request.query_string && typeof event.request.query_string === 'string') {
        const sensitiveParams = ['token', 'password', 'secret', 'apikey', 'api_key']
        let queryString = event.request.query_string

        sensitiveParams.forEach(param => {
          const regex = new RegExp(`${param}=[^&]*`, 'gi')
          queryString = queryString.replace(regex, `${param}=***REDACTED***`)
        })

        event.request.query_string = queryString
      }
    }

    // Remove sensitive form data
    if (event.contexts?.trace?.data) {
      const data = event.contexts.trace.data as Record<string, unknown>
      const sensitiveFields = ['password', 'token', 'apiKey', 'creditCard']

      sensitiveFields.forEach(field => {
        if (data[field]) {
          data[field] = '***REDACTED***'
        }
      })
    }

    return event
  },

  // Ignore common non-critical errors
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    'canvas.contentDocument',
    'MyApp_RemoveAllHighlights',
    'atomicFindClose',

    // Random plugins/extensions
    'Can\'t find variable: ZiteReader',
    'jigsaw is not defined',
    'ComboSearch is not defined',
    'http://loading.retry.widdit.com/',
    'atomicFindClose',

    // Facebook errors
    'fb_xd_fragment',

    // Network errors that are expected
    'NetworkError',
    'Network request failed',
    'Failed to fetch',

    // ResizeObserver errors (common, harmless)
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',

    // Non-error promise rejections
    'Non-Error promise rejection captured',

    // Aborted requests (user navigated away)
    'AbortError',
    'The user aborted a request',
  ],

  // Don't send errors in development (optional - remove if you want dev errors tracked)
  enabled: process.env.NODE_ENV !== 'development',
})
