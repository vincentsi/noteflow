import * as Sentry from '@sentry/nextjs'

/**
 * Sentry Edge Configuration
 *
 * This file configures Sentry for Edge Runtime (Middleware, Edge API routes).
 * It captures errors in Next.js middleware that runs on edge functions.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

Sentry.init({
  // Get DSN from environment variable
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment tracking
  environment: process.env.NODE_ENV,

  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',

  // Performance Monitoring (lower sample rate for edge due to cost)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

  // Don't send errors in development
  enabled: process.env.NODE_ENV !== 'development',
})
