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
    secure: isProduction, // HTTPS only in production
    sameSite: 'strict',
    maxAge: TOKEN_EXPIRY.ACCESS_TOKEN,
    path: '/',
  })

  // Refresh Token - JWT to renew access token
  reply.setCookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: TOKEN_EXPIRY.REFRESH_TOKEN,
    path: '/',
  })

  // CSRF Token - Protection against CSRF attacks
  // IMPORTANT: maxAge synchronized with access token to avoid desynchronization
  reply.setCookie('csrfToken', csrfToken, {
    httpOnly: false, // Accessible via JS to be sent in X-CSRF-Token header
    secure: isProduction,
    sameSite: 'strict',
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
  reply.clearCookie('accessToken', { path: '/' })
  reply.clearCookie('refreshToken', { path: '/' })
  reply.clearCookie('csrfToken', { path: '/' })
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
    secure: isProduction,
    sameSite: 'strict',
    maxAge: TOKEN_EXPIRY.ACCESS_TOKEN,
    path: '/',
  })

  // Renew CSRF token (synchronized with access token)
  reply.setCookie('csrfToken', csrfToken, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'strict',
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
export function setRefreshTokenCookie(
  reply: FastifyReply,
  refreshToken: string
): void {
  const isProduction = env.NODE_ENV === 'production'

  reply.setCookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: TOKEN_EXPIRY.REFRESH_TOKEN,
    path: '/',
  })
}

/**
 * Export token expiry durations for external use
 */
export { TOKEN_EXPIRY }
