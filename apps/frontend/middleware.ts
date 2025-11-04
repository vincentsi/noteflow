import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/notes',
  '/veille',
  '/summaries',
  '/profile',
  '/settings',
]

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
 *
 */
export function middleware(request: NextRequest) {
  if (request.headers.get('x-middleware-subrequest')) {
    return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  // Check for access token cookie
  const accessToken = request.cookies.get('accessToken')

  // Redirect to login if accessing protected route without token
  if (isProtectedRoute && !accessToken) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

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

  // CSP disabled: Next.js 15 has compatibility issues with strict CSP nonce-based policies
  // Next.js provides its own built-in security protections
  // For production apps requiring strict CSP, consider using next.config.js headers instead
  // or wait for Next.js 15 to fully support nonce injection in all inline scripts

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
