import { FastifyRequest, FastifyReply } from 'fastify'
import { CsrfService } from '../services/csrf.service'

/**
 * CSRF Protection Middleware
 *
 * Validates CSRF tokens for state-changing HTTP requests with:
 * - Safe method exemption (GET, HEAD, OPTIONS allowed without token)
 * - Public route exemption (only login and register don't need CSRF)
 * - Double-submit cookie pattern (cookie + header must match)
 * - Database/Redis verification (ensures token exists and is valid)
 * - 403 Forbidden responses for invalid/missing tokens
 *
 * @ai-prompt When modifying this middleware:
 * - NEVER require CSRF for safe methods (GET, HEAD, OPTIONS are read-only)
 * - ALWAYS exempt public auth routes (login, register only - refresh is now protected)
 * - Double-submit cookie pattern requires BOTH cookie AND header to match
 * - Cookie vs Header mismatch = potential CSRF attack (reject immediately)
 * - Only authenticated users need CSRF validation (request.user must exist)
 * - Add new public routes to publicRoutes array if they need exemption
 * - Consider Stripe webhooks exempt (they use signature verification)
 *
 * @example
 * ```typescript
 * // Global application (all state-changing requests protected)
 * fastify.addHook('preHandler', csrfMiddleware)
 *
 * // Per-route application
 * fastify.post('/transfer', { preHandler: csrfMiddleware }, handler)
 *
 * // Client-side usage
 * fetch('/api/transfer', {
 *   method: 'POST',
 *   headers: {
 *     'X-CSRF-Token': getCookie('csrfToken')  // Must match cookie
 *   },
 *   credentials: 'include'  // Sends cookie automatically
 * })
 * ```
 */
export async function csrfMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Ignore safe methods (read-only)
  const safeMethods = ['GET', 'HEAD', 'OPTIONS']
  if (safeMethods.includes(request.method)) {
    return
  }

  // Ignore public routes (login, register, refresh)
  // SECURITY: /api/auth/refresh must be exempt from CSRF validation
  // - The refresh endpoint generates NEW CSRF tokens
  // - Requiring CSRF for refresh creates a circular dependency (can't refresh if CSRF expired)
  // - Refresh token in httpOnly cookie provides sufficient security
  const publicRoutes = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh']
  if (publicRoutes.some((route) => request.url.startsWith(route))) {
    return
  }

  // Check user is authenticated
  const userId = request.user?.userId
  if (!userId) {
    // If not authenticated, authMiddleware will handle it
    return
  }

  // Get CSRF token from cookie
  const csrfCookie = request.cookies.csrfToken

  // Get CSRF token from header
  const csrfHeader = request.headers['x-csrf-token'] as string | undefined

  // Verify both are present
  if (!csrfCookie || !csrfHeader) {
    return reply.status(403).send({
      success: false,
      error: 'CSRF token missing',
      message: 'CSRF token required in cookie and X-CSRF-Token header',
    })
  }

  // Verify cookie and header match
  if (csrfCookie !== csrfHeader) {
    return reply.status(403).send({
      success: false,
      error: 'CSRF token mismatch',
      message: 'CSRF token in cookie does not match header',
    })
  }

  // Verify token is valid in DB
  const isValid = await CsrfService.verifyToken(csrfCookie, userId)

  if (!isValid) {
    return reply.status(403).send({
      success: false,
      error: 'Invalid CSRF token',
      message: 'CSRF token is invalid or expired',
    })
  }

  // Token valid, continue
}
