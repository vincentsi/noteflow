import type { FastifyInstance } from 'fastify'
import { gdprController } from '@/controllers/gdpr.controller'
import { createProtectedRoutes } from '@/utils/protected-routes'

/**
 * GDPR Compliance Routes
 *
 * All routes require authentication (authMiddleware)
 *
 * Endpoints:
 * - GET /export-data - Export all user data (GDPR Article 20)
 * - DELETE /delete-data - Permanently delete all user data (GDPR Article 17)
 * - POST /anonymize-data - Anonymize user data (alternative to deletion)
 *
 * @see https://gdpr.eu/
 */
export const gdprRoutes = createProtectedRoutes(async (fastify: FastifyInstance) => {
  /**
   * Export user data (GDPR Article 20 - Right to data portability)
   *
   * GET /api/gdpr/export-data
   *
   * Security: Rate limited to 2 exports per day
   * - Prevents DoS attacks via expensive database queries
   * - Mitigates data exfiltration attempts
   * - Allows legitimate use (verification + re-verification)
   */
  fastify.get(
    '/export-data',
    {
      config: {
        rateLimit: {
          max: 2,
          timeWindow: '24 hours',
          keyGenerator: req => `gdpr:export:${req.user?.userId || req.ip}`,
          errorResponseBuilder: () => {
            const error = new Error(
              'Limite de taux dépassée. Vous pouvez exporter vos données 2 fois par jour. Veuillez réessayer demain.'
            ) as Error & { statusCode: number }
            error.statusCode = 429
            throw error
          },
        },
      },
      schema: {
        description: 'Export all personal data associated with your account (GDPR Article 20)',
        tags: ['gdpr'],
        security: [{ bearerAuth: [] }],
        // Response validation disabled for GDPR export to allow all user data
        // response: { ... }
      },
    },
    gdprController.exportUserData
  )

  /**
   * Delete user data (GDPR Article 17 - Right to be forgotten)
   *
   * DELETE /api/gdpr/delete-data
   *
   * Rate limited to 1 deletion request per day to prevent abuse
   */
  fastify.delete(
    '/delete-data',
    {
      config: {
        rateLimit: {
          max: 1,
          timeWindow: '24 hours',
          keyGenerator: req => `gdpr:delete:${req.user?.userId || req.ip}`,
          errorResponseBuilder: () => ({
            success: false,
            error: 'Rate limit exceeded. You can request account deletion once per day.',
          }),
        },
      },
      schema: {
        description:
          'Permanently delete your account and all associated data (GDPR Article 17). ⚠️ This action is IRREVERSIBLE.',
        tags: ['gdpr'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['confirmEmail'],
          properties: {
            confirmEmail: {
              type: 'string',
              format: 'email',
              description: 'Your email address to confirm deletion',
            },
            reason: {
              type: 'string',
              description: 'Optional reason for deletion',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  deletedAt: { type: 'string' },
                  deletedData: { type: 'object' },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
          401: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    gdprController.deleteUserData
  )

  /**
   * Anonymize user data (alternative to deletion)
   *
   * POST /api/gdpr/anonymize-data
   *
   * Rate limited to 1 anonymization request per day to prevent abuse
   */
  fastify.post(
    '/anonymize-data',
    {
      config: {
        rateLimit: {
          max: 1,
          timeWindow: '24 hours',
          keyGenerator: req => `gdpr:anonymize:${req.user?.userId || req.ip}`,
          errorResponseBuilder: () => ({
            success: false,
            error: 'Rate limit exceeded. You can request anonymization once per day.',
          }),
        },
      },
      schema: {
        description: 'Anonymize your personal data while keeping account for data integrity',
        tags: ['gdpr'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['confirmEmail'],
          properties: {
            confirmEmail: {
              type: 'string',
              format: 'email',
              description: 'Your email address to confirm anonymization',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  anonymizedAt: { type: 'string' },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
          401: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    gdprController.anonymizeUserData
  )
})
