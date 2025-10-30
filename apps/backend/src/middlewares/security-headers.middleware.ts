import type { FastifyRequest, FastifyReply } from 'fastify'
import { env } from '@/config/env'

/**
 * Security Headers Middleware
 *
 * Adds essential HTTP security headers to all responses:
 * - HSTS: Force HTTPS connections
 * - X-Content-Type-Options: Prevent MIME sniffing
 * - X-Frame-Options: Prevent clickjacking
 * - X-XSS-Protection: Enable browser XSS filter
 * - Referrer-Policy: Control referrer information
 * - Permissions-Policy: Restrict browser features
 */
export async function securityHeadersMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const isProduction = env.NODE_ENV === 'production'

  // Force HTTPS in production (31536000 = 1 year)
  if (isProduction) {
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }

  // Prevent MIME type sniffing
  reply.header('X-Content-Type-Options', 'nosniff')

  // Prevent clickjacking
  reply.header('X-Frame-Options', 'DENY')

  // Enable XSS filter in older browsers
  reply.header('X-XSS-Protection', '1; mode=block')

  // Control referrer information
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Restrict browser features
  reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()')

  // Remove X-Powered-By header to hide technology stack
  reply.removeHeader('X-Powered-By')
}

/**
 * Content Security Policy Middleware
 *
 * Defines which resources can be loaded and executed
 * Prevents XSS, data injection, and other code injection attacks
 */
export async function contentSecurityPolicyMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const isProduction = env.NODE_ENV === 'production'

  // Strict CSP for API (no scripts, no styles)
  const cspDirectives = [
    "default-src 'none'", // Block everything by default
    "connect-src 'self'", // Allow API calls to same origin
    "img-src 'self' data:", // Allow images from same origin and data URIs
    "font-src 'self'", // Allow fonts from same origin
    "frame-ancestors 'none'", // Prevent embedding in iframes
    "base-uri 'self'", // Restrict base URL
    "form-action 'self'", // Restrict form submissions
  ]

  // Add report-uri in production for CSP violations
  if (isProduction && env.SENTRY_DSN) {
    cspDirectives.push('report-uri /api/csp-report')
  }

  reply.header('Content-Security-Policy', cspDirectives.join('; '))
}

/**
 * CORS Configuration
 *
 * Controls which origins can access the API
 * Configures allowed methods, headers, and credentials
 */
export function getCorsOptions() {
  const isProduction = env.NODE_ENV === 'production'

  // In production, only allow specific origins
  const allowedOrigins = isProduction
    ? [env.FRONTEND_URL || 'https://noteflow.com', 'https://www.noteflow.com']
    : ['http://localhost:3000', 'http://localhost:3002'] // Dev: frontend + landing

  return {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allows requests without Origin only in development (for testing tools like Postman, curl)
      if (!origin) {
        if (env.NODE_ENV === 'production') {
          callback(new Error('Origin header required'), false)
        } else {
          // Allow in dev/test for local testing tools
          callback(null, true)
        }
        return
      }

      // Check if origin is allowed
      if (allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 86400, // Cache preflight for 24 hours
  }
}
