import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Generate a cryptographically secure random nonce using Web Crypto API
 * Compatible with Edge Runtime (no Node.js crypto module needed)
 */
function generateNonce(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  // Convert to base64 without using Buffer (not available in Edge Runtime)
  return btoa(String.fromCharCode(...array))
}

/**
 * Middleware to generate a unique nonce for CSP on every request
 * This nonce is used to allow specific inline scripts while blocking XSS
 */
export function middleware(request: NextRequest) {
  // Generate a cryptographically secure random nonce
  const nonce = generateNonce()

  // Clone the request headers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  // Create response with updated headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Build CSP header with strict hash-based security for production
  // Next.js 15 doesn't support nonce injection in its own scripts yet
  // Best practice: Use strict-dynamic with nonce for maximum security
  const isDev = process.env.NODE_ENV === 'development'

  const cspHeader = [
    "default-src 'self'",
    // Production: strict-dynamic allows scripts loaded by trusted scripts with nonce
    // This is the recommended approach for Next.js apps per OWASP guidelines
    // Development: Allow unsafe-eval for HMR
    isDev
      ? `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://browser.sentry-cdn.com`
      : `script-src 'nonce-${nonce}' 'strict-dynamic' https: http: 'unsafe-inline'`,
    "style-src 'self' 'unsafe-inline'", // Tailwind CSS requires unsafe-inline
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.stripe.com https://sentry.io https://*.sentry.io http://localhost:3001 ws://localhost:3001 http://localhost:3003 ws://localhost:3003",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join('; ')

  // Set CSP header on response
  response.headers.set('Content-Security-Policy', cspHeader)

  // Set other security headers
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )

  return response
}

// Apply middleware to all routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    {
      source: '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
