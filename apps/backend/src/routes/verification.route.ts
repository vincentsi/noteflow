import { FastifyInstance } from 'fastify'
import { env } from '@/config/env'
import { VerificationController } from '../controllers/verification.controller'
import { verifyEmailSchema, resendVerificationSchema } from '@/schemas/openapi.schema'

/**
 * Email verification routes
 * Prefix: /api/verification
 */
export async function verificationRoutes(fastify: FastifyInstance) {
  const controller = new VerificationController()

  // GET /api/verification/verify-email?token=xxx
  fastify.get('/verify-email', { schema: verifyEmailSchema }, controller.verifyEmail.bind(controller))

  // POST /api/verification/resend-verification
  // Rate limit: 3 requests per hour (prevent spam) (disabled in dev/test)
  // Key generator: IP (prevent email spam)
  fastify.post(
    '/resend-verification',
    {
      schema: resendVerificationSchema,
      config:
        env.NODE_ENV === 'production'
          ? {
              rateLimit: {
                max: 3,
                timeWindow: '1 hour',
                keyGenerator: (request) => {
                  // Rate limit by IP to prevent email spam
                  return `verification:resend:${request.ip}`
                },
                errorResponseBuilder: () => ({
                  statusCode: 429,
                  error: 'Too Many Requests',
                  message: 'Too many verification email requests. Try again in 1 hour.',
                }),
              },
            }
          : {},
    },
    controller.resendVerification.bind(controller)
  )
}
