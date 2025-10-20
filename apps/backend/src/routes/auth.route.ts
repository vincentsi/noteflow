import { env } from '@/config/env'
import { authController } from '@/controllers/auth.controller'
import { authMiddleware } from '@/middlewares/auth.middleware'
import {
  loginSchema,
  meSchema,
  refreshTokenSchema,
  registerSchema,
} from '@/schemas/openapi.schema'
import type { FastifyInstance } from 'fastify'

/**
 * Authentication Routes
 *
 * Base path: /api/auth
 *
 * Endpoints with security features:
 * - POST /register - Create account (2 req/hour per IP+email)
 * - POST /login - Authenticate (5 req/15min per IP+email)
 * - POST /refresh - Refresh token (10 req/15min)
 * - POST /logout - Invalidate session
 * - GET /me - Current user (requires authMiddleware)
 *
 * @ai-prompt When modifying auth routes:
 * - NEVER reduce rate limits (security critical: 2 register/hour, 5 login/15min)
 * - ALWAYS use IP+email for keyGenerator (prevents bypass via IP rotation)
 * - Rate limit keys must be namespaced (auth:login, auth:register)
 * - .bind(authController) required for controller methods (preserves 'this' context)
 * - OpenAPI schemas required for all routes (documentation + validation)
 * - /me endpoint MUST have authMiddleware (protected route)
 * - /register and /login are PUBLIC (no authMiddleware)
 * - errorResponseBuilder provides user-friendly rate limit messages
 * - Consider adding captcha for /register if spam becomes issue
 *
 * @example
 * ```typescript
 * // In app.ts
 * app.register(authRoutes, { prefix: '/api/auth' })
 *
 * // Custom rate limit for new endpoint
 * app.post('/verify-email', {
 *   config: {
 *     rateLimit: {
 *       max: 3,
 *       timeWindow: '1 hour',
 *       keyGenerator: (req) => `auth:verify:${req.ip}:${req.body.email}`
 *     }
 *   }
 * }, handler)
 * ```
 */
export async function authRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/auth/register
   * Create new user account
   *
   * Rate limit: 2 requests/hour per IP+email (disabled in dev/test)
   * Prevents: Account spam, email enumeration
   */
  app.post(
    '/register',
    {
      schema: registerSchema,
      config:
        env.NODE_ENV !== 'test'
          ? {
              rateLimit: {
                max: env.NODE_ENV === 'production' ? 2 : 100,
                timeWindow: env.NODE_ENV === 'production' ? '1 hour' : '15 minutes',
                keyGenerator: request => {
                  const body = request.body as { email?: string }
                  const email = body?.email || 'unknown'
                  return `auth:register:${request.ip}:${email}`
                },
                errorResponseBuilder: () => ({
                  statusCode: 429,
                  error: 'Too Many Requests',
                  message: 'Too many registration attempts. Try again later.',
                }),
              },
            }
          : {},
    },
    authController.register.bind(authController)
  )

  /**
   * POST /api/auth/login
   * Authenticate user with email + password
   *
   * Rate limit: 5 requests/15min per IP+email (disabled in dev/test)
   * Prevents: Brute force attacks, credential stuffing
   */
  app.post(
    '/login',
    {
      schema: loginSchema,
      config:
        env.NODE_ENV !== 'test'
          ? {
              rateLimit: {
                max: env.NODE_ENV === 'production' ? 5 : 100,
                timeWindow: '15 minutes',
                keyGenerator: request => {
                  const body = request.body as { email?: string }
                  const email = body?.email || 'unknown'
                  return `auth:login:${request.ip}:${email}`
                },
                errorResponseBuilder: () => ({
                  statusCode: 429,
                  error: 'Too Many Requests',
                  message: 'Too many login attempts. Try again in 15 minutes.',
                }),
              },
            }
          : {},
    },
    authController.login.bind(authController)
  )

  /**
   * POST /api/auth/refresh
   * Refresh access token using refresh token
   *
   * Rate limit: 10 requests/15min (disabled in dev/test)
   * Cookie: refreshToken (httpOnly, secure)
   */
  app.post(
    '/refresh',
    {
      schema: refreshTokenSchema,
      config:
        env.NODE_ENV !== 'test'
          ? {
              rateLimit: {
                max: env.NODE_ENV === 'production' ? 10 : 100,
                timeWindow: '15 minutes',
              },
            }
          : {},
    },
    authController.refresh.bind(authController)
  )

  /**
   * POST /api/auth/logout
   * Invalidate user session (client-side token deletion)
   */
  app.post('/logout', authController.logout.bind(authController))

  /**
   * GET /api/auth/me
   * Get authenticated user profile
   *
   * Requires: Authorization header with Bearer token
   */
  app.get(
    '/me',
    {
      schema: meSchema,
      preHandler: authMiddleware,
    },
    authController.me.bind(authController)
  )

  /**
   * PATCH /api/auth/profile
   * Update user profile (name, email)
   *
   * Requires: Authorization header with Bearer token
   */
  app.patch<{
    Body: { name?: string; email?: string }
  }>(
    '/profile',
    {
      preHandler: authMiddleware,
    },
    authController.updateProfile.bind(authController)
  )
}
