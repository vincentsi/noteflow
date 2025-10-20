import { FastifyRequest, FastifyReply } from 'fastify'
import { PasswordResetService } from '../services/password-reset.service'
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
   */
  async resetPassword(
    request: FastifyRequest<{ Body: ResetPasswordDTO }>,
    reply: FastifyReply
  ) {
    try {
      // Validate data with Zod (strict password validation included)
      const data = resetPasswordSchema.parse(request.body)

      await PasswordResetService.resetPassword(data.token, data.password)

      reply.send({
        success: true,
        message: 'Password reset successfully',
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
