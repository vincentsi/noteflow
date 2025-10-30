import type { FastifyReply } from 'fastify'
import { env } from '@/config/env'

/**
 * Token expiry durations (in seconds)
 * IMPORTANT: ACCESS_TOKEN and CSRF_TOKEN must match JWT expiry in auth.service.ts
 */
const TOKEN_EXPIRY = {
  ACCESS_TOKEN: 15 * 60, // 15 minutes (matches JWT expiry)
  REFRESH_TOKEN: 7 * 24 * 60 * 60, // 7 days
  CSRF_TOKEN: 15 * 60, // 15 minutes (synchronized with access token)
} as const

/**
 * Set all authentication cookies
 * Centralizes cookie configuration to avoid duplication
 *
 * ⚠️ SECURITY NOTE: SameSite Configuration
 * ========================================
 * Production uses `sameSite: 'none'` for cross-site deployment architecture:
 * - Frontend: Vercel (https://noteflow.vercel.app)
 * - Backend: Railway (https://api.noteflow.com)
 *
 * This requires HTTPS and exposes to CSRF if CORS is misconfigured.
 * Security measures in place:
 * 1. ✅ CORS whitelist strictly enforced (see env.ts FRONTEND_URL)
 * 2. ✅ Double-submit CSRF token pattern (cookie + header validation)
 * 3. ✅ CSRF token rotation on sensitive actions
 * 4. ✅ Secure flag enforced (HTTPS only)
 *
 * Alternative for same-domain deployment: Use `sameSite: 'strict'`
 * if frontend and backend share the same domain.
 *
 * @param reply - Fastify Reply instance
 * @param accessToken - JWT access token
 * @param refreshToken - JWT refresh token
 * @param csrfToken - CSRF protection token
 *
 * @example
 * ```typescript
 * // In auth.controller.ts
 * import { setAuthCookies } from '@/utils/cookie-helpers'
 *
 * setAuthCookies(reply, result.accessToken, result.refreshToken, csrfToken)
 * ```
 */
export function setAuthCookies(
  reply: FastifyReply,
  accessToken: string,
  refreshToken: string,
  csrfToken: string
): void {
  const isProduction = env.NODE_ENV === 'production'

  // Access Token - JWT for authentication
  reply.setCookie('accessToken', accessToken, {
    httpOnly: true, // Not accessible via JavaScript (XSS protection)
    secure: true, // Always HTTPS (required for sameSite: none)
    sameSite: isProduction ? 'none' : 'lax', // 'none' for cross-site (Vercel <-> Railway)
    maxAge: TOKEN_EXPIRY.ACCESS_TOKEN,
    path: '/',
  })

  // Refresh Token - JWT to renew access token
  reply.setCookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: true, // Always HTTPS (required for sameSite: none)
    sameSite: isProduction ? 'none' : 'lax', // 'none' for cross-site (Vercel <-> Railway)
    maxAge: TOKEN_EXPIRY.REFRESH_TOKEN,
    path: '/',
  })

  // CSRF Token - Protection against CSRF attacks
  // IMPORTANT: maxAge synchronized with access token to avoid desynchronization
  //
  // 🔒 SECURITY: Synchronizer Token Pattern with Server-Side Storage
  // ================================================================
  // CSRF tokens are stored server-side in Redis and validated against storage:
  // 1. Backend generates token and stores hash in Redis (CsrfService.createToken)
  // 2. Backend sets httpOnly cookie (prevents XSS access)
  // 3. Backend also returns token in response body for frontend to store
  // 4. Frontend sends token in X-CSRF-Token header with each request
  // 5. Backend validates header token against Redis storage
  //
  // This is more secure than double-submit pattern because:
  // - Token not accessible via JavaScript (XSS protection)
  // - Server-side validation prevents token forgery
  // - Redis storage enables token rotation and invalidation
  //
  // Defense-in-depth measures:
  // 1. ✅ httpOnly cookie (prevents XSS token theft)
  // 2. ✅ Short token lifetime (15 min, synchronized with access token)
  // 3. ✅ Token rotation on sensitive operations (password change, etc.)
  // 4. ✅ Server-side storage in Redis with hash verification
  // 5. ✅ Strict CORS policy (see env.ts FRONTEND_URL validation)
  reply.setCookie('csrfToken', csrfToken, {
    httpOnly: true, // NOT accessible via JS (XSS protection)
    secure: true, // Always HTTPS (required for sameSite: none)
    sameSite: isProduction ? 'none' : 'lax', // 'none' for cross-site (Vercel <-> Railway)
    maxAge: TOKEN_EXPIRY.CSRF_TOKEN, // Synchronized with access token
    path: '/',
  })
}

/**
 * Clear all authentication cookies
 * Used during logout
 *
 * @param reply - Fastify Reply instance
 *
 * @example
 * ```typescript
 * // In auth.controller.ts logout()
 * import { clearAuthCookies } from '@/utils/cookie-helpers'
 *
 * clearAuthCookies(reply)
 * ```
 */
export function clearAuthCookies(reply: FastifyReply): void {
  const isProduction = env.NODE_ENV === 'production'

  reply.clearCookie('accessToken', {
    path: '/',
    sameSite: isProduction ? 'none' : 'lax',
    secure: true,
  })
  reply.clearCookie('refreshToken', {
    path: '/',
    sameSite: isProduction ? 'none' : 'lax',
    secure: true,
  })
  reply.clearCookie('csrfToken', {
    path: '/',
    sameSite: isProduction ? 'none' : 'lax',
    secure: true,
  })
}

/**
 * Regenerate only session tokens (access + CSRF)
 * Used during token refresh to maintain synchronization
 *
 * @param reply - Fastify Reply instance
 * @param accessToken - New JWT access token
 * @param csrfToken - New CSRF token
 *
 * @example
 * ```typescript
 * // In auth.controller.ts refresh()
 * import { refreshSessionCookies } from '@/utils/cookie-helpers'
 *
 * refreshSessionCookies(reply, newAccessToken, newCsrfToken)
 * ```
 */
export function refreshSessionCookies(
  reply: FastifyReply,
  accessToken: string,
  csrfToken: string
): void {
  const isProduction = env.NODE_ENV === 'production'

  // Renew access token
  reply.setCookie('accessToken', accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: TOKEN_EXPIRY.ACCESS_TOKEN,
    path: '/',
  })

  // Renew CSRF token (synchronized with access token)
  // See setAuthCookies() for security explanation of httpOnly: true
  reply.setCookie('csrfToken', csrfToken, {
    httpOnly: true, // NOT accessible via JS (XSS protection)
    secure: true,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: TOKEN_EXPIRY.CSRF_TOKEN,
    path: '/',
  })
}

/**
 * Set only refresh token cookie
 * Used during token refresh when only refreshToken needs updating
 *
 * @param reply - Fastify Reply instance
 * @param refreshToken - JWT refresh token
 *
 * @example
 * ```typescript
 * // In auth.controller.ts refresh()
 * import { setRefreshTokenCookie } from '@/utils/cookie-helpers'
 *
 * setRefreshTokenCookie(reply, newRefreshToken)
 * ```
 */
export function setRefreshTokenCookie(reply: FastifyReply, refreshToken: string): void {
  const isProduction = env.NODE_ENV === 'production'

  reply.setCookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: TOKEN_EXPIRY.REFRESH_TOKEN,
    path: '/',
  })
}

/**
 * Set only CSRF token cookie
 * Used when rotating CSRF token after sensitive operations (SEC-006)
 *
 * @param reply - Fastify Reply instance
 * @param csrfToken - New CSRF token
 *
 * @example
 * ```typescript
 * // After password change
 * import { setCsrfTokenCookie } from '@/utils/cookie-helpers'
 *
 * const newCsrfToken = await CsrfService.rotateToken(userId)
 * setCsrfTokenCookie(reply, newCsrfToken)
 * ```
 */
export function setCsrfTokenCookie(reply: FastifyReply, csrfToken: string): void {
  const isProduction = env.NODE_ENV === 'production'

  // See setAuthCookies() for security explanation of httpOnly: true
  reply.setCookie('csrfToken', csrfToken, {
    httpOnly: true, // NOT accessible via JS (XSS protection)
    secure: true,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: TOKEN_EXPIRY.CSRF_TOKEN,
    path: '/',
  })
}

/**
 * Export token expiry durations for external use
 */
export { TOKEN_EXPIRY }
