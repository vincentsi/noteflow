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
 * Get cookie domain restriction for production environments
 * Prevents cookies from being sent to arbitrary domains
 *
 * @returns Domain restriction string (e.g., ".noteflow.com") or undefined for dev
 */
function getCookieDomain(): string | undefined {
  const isProduction = env.NODE_ENV === 'production'

  if (!isProduction) return undefined

  try {
    // Parse backend domain from FRONTEND_URL (first origin if comma-separated)
    const frontendOrigin = env.FRONTEND_URL?.split(',')[0]?.trim()
    if (!frontendOrigin) return undefined

    const hostname = new URL(frontendOrigin).hostname
    // Extract root domain (e.g., "noteflow.com" from "app.noteflow.com")
    const parts = hostname.split('.')
    return parts.length >= 2 ? `.${parts.slice(-2).join('.')}` : hostname
  } catch {
    return undefined
  }
}

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
  const domain = getCookieDomain()

  // Access Token - JWT for authentication
  reply.setCookie('accessToken', accessToken, {
    httpOnly: true, // Not accessible via JavaScript (XSS protection)
    secure: isProduction, // HTTPS in production, HTTP allowed in dev
    sameSite: isProduction ? 'none' : 'lax', // 'none' for cross-site (Vercel <-> Railway)
    ...(domain && { domain }), // Only set domain if it's defined
    maxAge: TOKEN_EXPIRY.ACCESS_TOKEN,
    path: '/',
  })

  // Refresh Token - JWT to renew access token
  reply.setCookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction, // HTTPS in production, HTTP allowed in dev
    sameSite: isProduction ? 'none' : 'lax', // 'none' for cross-site (Vercel <-> Railway)
    ...(domain && { domain }), // Only set domain if it's defined
    maxAge: TOKEN_EXPIRY.REFRESH_TOKEN,
    path: '/',
  })

  // CSRF Token - httpOnly prevents XSS, token also returned in response body
  reply.setCookie('csrfToken', csrfToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    ...(domain && { domain }), // Only set domain if it's defined
    maxAge: TOKEN_EXPIRY.CSRF_TOKEN,
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
  const domain = getCookieDomain()

  reply.clearCookie('accessToken', {
    path: '/',
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    ...(domain && { domain }),
  })
  reply.clearCookie('refreshToken', {
    path: '/',
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    ...(domain && { domain }),
  })
  reply.clearCookie('csrfToken', {
    path: '/',
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    ...(domain && { domain }),
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
  const domain = getCookieDomain()

  // Renew access token
  reply.setCookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    ...(domain && { domain }),
    maxAge: TOKEN_EXPIRY.ACCESS_TOKEN,
    path: '/',
  })

  // Renew CSRF token
  reply.setCookie('csrfToken', csrfToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    ...(domain && { domain }),
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
  const domain = getCookieDomain()

  reply.setCookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    ...(domain && { domain }),
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
  const domain = getCookieDomain()

  reply.setCookie('csrfToken', csrfToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    ...(domain && { domain }),
    maxAge: TOKEN_EXPIRY.CSRF_TOKEN,
    path: '/',
  })
}

/**
 * Export token expiry durations for external use
 */
export { TOKEN_EXPIRY }
