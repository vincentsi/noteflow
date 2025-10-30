import type { FastifyRequest, FastifyReply } from 'fastify'
import { gdprService } from '@/services/gdpr.service'
import { asyncHandler } from '@/utils/controller-wrapper'
import { logUserAction } from '@/utils/logger'
import { securityLogger } from '@/utils/security-logger'
import { SuccessResponse, ErrorResponse } from '@/utils/response-builders'
import { requireAuth } from '@/utils/require-auth'

/**
 * GDPR Controller
 *
 * Handles GDPR/RGPD compliance requests:
 * - Data export (Article 20)
 * - Data deletion (Article 17)
 * - Data anonymization (alternative to deletion)
 */
export class GDPRController {
  /**
   * Export user data (GDPR Article 20 - Right to data portability)
   *
   * GET /api/gdpr/export-data
   * Headers: Authorization: Bearer <access_token>
   *
   * Returns all user data in JSON format
   */
  exportUserData = asyncHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = requireAuth(request)

    // Log the export request
    logUserAction(request, 'gdpr_data_export_requested', { userId })
    securityLogger.gdprDataExport({
      userId,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    })

    // Export data
    const userData = await gdprService.exportUserData(userId)

    // Log successful export
    logUserAction(request, 'gdpr_data_export_completed', { userId })

    return reply.status(200).send(SuccessResponse.ok(userData))
  })

  /**
   * Delete user data (GDPR Article 17 - Right to be forgotten)
   *
   * DELETE /api/gdpr/delete-data
   * Headers: Authorization: Bearer <access_token>
   * Body: { confirmEmail: string, reason?: string }
   *
   * ⚠️ WARNING: Permanently deletes all user data
   */
  deleteUserData = asyncHandler(
    async (
      request: FastifyRequest<{
        Body: {
          confirmEmail: string
          reason?: string
        }
      }>,
      reply: FastifyReply
    ) => {
      const userId = requireAuth(request)
      const userEmail = request.user?.email
      const { confirmEmail, reason } = request.body

      if (!userEmail) {
        return reply.status(401).send(ErrorResponse.unauthorized())
      }

      // Require email confirmation to prevent accidental deletion
      if (confirmEmail !== userEmail) {
        request.log.warn(
          { userId, providedEmail: confirmEmail },
          'GDPR deletion failed - wrong email'
        )
        return reply
          .status(400)
          .send(
            ErrorResponse.badRequest(
              'Email confirmation does not match. Please provide your correct email address.'
            )
          )
      }

      // Log the deletion request
      logUserAction(request, 'gdpr_data_deletion_requested', { userId, reason })
      securityLogger.gdprDataDeletion({
        userId,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        reason,
      })

      // Delete data
      const result = await gdprService.deleteUserData(userId, reason)

      // Log successful deletion
      request.log.warn(
        {
          event: 'gdpr_data_deleted',
          userId,
          email: userEmail,
          deletedAt: result.deletedAt,
          reason: reason || 'No reason provided',
          deletedData: result.deletedData,
        },
        'User data permanently deleted (GDPR)'
      )

      return reply.status(200).send(
        SuccessResponse.ok({
          message: result.message,
          data: {
            deletedAt: result.deletedAt,
            deletedData: result.deletedData,
          },
        })
      )
    }
  )

  /**
   * Anonymize user data (alternative to deletion)
   *
   * POST /api/gdpr/anonymize-data
   * Headers: Authorization: Bearer <access_token>
   * Body: { confirmEmail: string }
   *
   * Removes PII while keeping user ID for data integrity
   */
  anonymizeUserData = asyncHandler(
    async (
      request: FastifyRequest<{
        Body: {
          confirmEmail: string
        }
      }>,
      reply: FastifyReply
    ) => {
      const userId = requireAuth(request)
      const userEmail = request.user?.email
      const { confirmEmail } = request.body

      if (!userEmail) {
        return reply.status(401).send(ErrorResponse.unauthorized())
      }

      // Require email confirmation
      if (confirmEmail !== userEmail) {
        return reply.status(400).send(ErrorResponse.badRequest('Email confirmation does not match'))
      }

      // Log the anonymization request
      logUserAction(request, 'gdpr_data_anonymization_requested', { userId })
      securityLogger.gdprDataAnonymization({
        userId,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      })

      // Anonymize data
      const result = await gdprService.anonymizeUserData(userId)

      // Log successful anonymization
      request.log.warn(
        {
          event: 'gdpr_data_anonymized',
          userId,
          email: userEmail,
          anonymizedAt: result.anonymizedAt,
        },
        'User data anonymized (GDPR)'
      )

      return reply.status(200).send(
        SuccessResponse.ok({
          message: result.message,
          data: {
            anonymizedAt: result.anonymizedAt,
          },
        })
      )
    }
  )
}

export const gdprController = new GDPRController()
