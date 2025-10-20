import { FastifyRequest, FastifyReply } from 'fastify'
import { VerificationService } from '../services/verification.service'

/**
 * Controller for email verification
 */
export class VerificationController {
  /**
   * Verify email with token
   * GET /api/verification/verify-email?token=xxx
   */
  async verifyEmail(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { token } = request.query as { token: string }

      if (!token) {
        return reply.status(400).send({
          success: false,
          error: 'Token required',
        })
      }

      const user = await VerificationService.verifyEmail(token)

      reply.send({
        success: true,
        message: 'Email verified successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            emailVerified: user.emailVerified,
          },
        },
      })
    } catch (error) {
      reply.status(400).send({
        success: false,
        error: (error as Error).message,
      })
    }
  }

  /**
   * Resend verification email
   * POST /api/verification/resend-verification
   * Body: { email: string }
   */
  async resendVerification(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email } = request.body as { email: string }

      if (!email) {
        return reply.status(400).send({
          success: false,
          error: 'Email required',
        })
      }

      await VerificationService.resendVerification(email)

      reply.send({
        success: true,
        message: 'Verification email sent',
      })
    } catch (error) {
      reply.status(400).send({
        success: false,
        error: (error as Error).message,
      })
    }
  }
}
