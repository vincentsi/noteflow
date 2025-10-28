import { FastifyRequest, FastifyReply } from 'fastify'
import { PasswordResetService } from '../services/password-reset.service'
import { CsrfService } from '@/services/csrf.service'
import { setCsrfTokenCookie } from '@/utils/cookie-helpers'
import { securityLogger } from '@/utils/security-logger'
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordDTO,
  type ResetPasswordDTO,
} from '@/schemas/auth.schema'

/**
 * Controller for password reset
 */
export class PasswordResetController {
  /**
   * Request password reset
   * POST /api/auth/forgot-password
   * Body: { email: string }
   */
  async requestReset(
    request: FastifyRequest<{ Body: ForgotPasswordDTO }>,
    reply: FastifyReply
  ) {
    try {
      // Validate data with Zod
      const data = forgotPasswordSchema.parse(request.body)

      await PasswordResetService.requestReset(data.email)

      // Intentionally vague message for security
      reply.send({
        success: true,
        message: 'If this email exists, a reset link has been sent',
      })
    } catch (error) {
      // Zod validation error
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.status(400).send({
          success: false,
          error: 'Validation error',
          details: error,
        })
      }

      // Don't reveal sensitive information
      reply.status(500).send({
        success: false,
        error: 'Server error',
      })
    }
  }

  /**
   * Reset password with token
   * POST /api/auth/reset-password
   * Body: { token: string, password: string }
   *
   * Security Enhancement (SEC-006):
   * - Rotates CSRF token after password reset
   * - Prevents leaked CSRF tokens from being used after password change
   */
  async resetPassword(
    request: FastifyRequest<{ Body: ResetPasswordDTO }>,
    reply: FastifyReply
  ) {
    try {
      // Validate data with Zod (strict password validation included)
      const data = resetPasswordSchema.parse(request.body)

      // Reset password and get userId
      const result = await PasswordResetService.resetPassword(data.token, data.password)

      // SEC-011: Log password change
      securityLogger.passwordChanged({
        userId: result.userId,
        ip: request.ip,
        metadata: { initiatedBy: 'reset' },
      })

      // SEC-006: Rotate CSRF token after sensitive operation (password reset)
      // This invalidates any potentially leaked CSRF tokens
      const newCsrfToken = await CsrfService.rotateToken(result.userId)
      setCsrfTokenCookie(reply, newCsrfToken)

      // SEC-011: Log CSRF rotation
      securityLogger.csrfTokenRotated({
        userId: result.userId,
        reason: 'Password reset',
      })

      reply.send({
        success: true,
        message: 'Password reset successfully. Please log in with your new password.',
      })
    } catch (error) {
      // Zod validation error (password too weak, etc.)
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.status(400).send({
          success: false,
          error: 'Validation error',
          details: error,
        })
      }

      // Invalid or expired token
      reply.status(400).send({
        success: false,
        error: (error as Error).message,
      })
    }
  }
}
