import { FastifyInstance } from 'fastify'
import { env } from '@/config/env'
import { PasswordResetController } from '../controllers/password-reset.controller'
import { requestPasswordResetSchema, resetPasswordSchema } from '@/schemas/openapi.schema'

/**
 * Password Reset Routes
 *
 * Handles the password reset flow with security measures:
 * 1. User requests reset → Email sent with token
 * 2. User clicks link → Token verified
 * 3. User sets new password → Token consumed
 *
 * Security features:
 * - Rate limiting per IP (prevent spam)
 * - Tokens hashed in DB (SHA-256)
 * - Timing attack protection (constant-time comparison)
 * - Token expiration (1 hour)
 * - Generic error messages (prevent email enumeration)
 *
 * @example
 * // Register routes
 * app.register(passwordResetRoutes, { prefix: '/api/auth' })
 *
 * @ai-prompt When modifying this file:
 * - Maintain rate limits (critical for security)
 * - Keep error messages generic (don't reveal if email exists)
 * - Token must be hashed before DB storage (see TokenHasher utility)
 * - Consider timing attacks when adding new endpoints
 */
export async function passwordResetRoutes(fastify: FastifyInstance) {
  const controller = new PasswordResetController()

  /**
   * POST /api/auth/forgot-password
   * Request password reset email
   *
   * Security: Rate limited by IP, generic responses to prevent enumeration
   */
  fastify.post(
    '/forgot-password',
    {
      schema: requestPasswordResetSchema,
      config: {
        rateLimit: {
          // Stricter in production, more permissive in dev
          max: env.NODE_ENV === 'production' ? 3 : 10,
          timeWindow: env.NODE_ENV === 'production' ? '1 hour' : '15 minutes',
          keyGenerator: (request) => {
            // Rate limit by IP to prevent spam
            return `password-reset:${request.ip}`
          },
          errorResponseBuilder: () => ({
            statusCode: 429,
            error: 'Too Many Requests',
            message: `Too many reset requests. Try again in ${env.NODE_ENV === 'production' ? '1 hour' : '15 minutes'}.`,
          }),
        },
      },
    },
    controller.requestReset.bind(controller)
  )

  /**
   * POST /api/auth/reset-password
   * Confirm password reset with token
   *
   * Security: Rate limited by IP + token to prevent brute force attacks
   */
  fastify.post(
    '/reset-password',
    {
      schema: resetPasswordSchema,
      config: {
        rateLimit: {
          // Stricter in production, more permissive in dev
          max: env.NODE_ENV === 'production' ? 5 : 20,
          timeWindow: '15 minutes',
          keyGenerator: (request) => {
            // Rate limit by IP + token to prevent brute force
            const body = request.body as { token?: string }
            const token = body?.token ? body.token.slice(0, 10) : 'unknown' // First 10 chars for identification
            return `password-reset-confirm:${request.ip}:${token}`
          },
          errorResponseBuilder: () => ({
            statusCode: 429,
            error: 'Too Many Requests',
            message: 'Too many reset attempts. Try again in 15 minutes.',
          }),
        },
      },
    },
    controller.resetPassword.bind(controller)
  )
}
