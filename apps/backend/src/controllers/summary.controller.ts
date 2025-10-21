import type { FastifyRequest, FastifyReply } from 'fastify'
import { SummaryService } from '@/services/summary.service'
import {
  createSummarySchema,
  type CreateSummaryDTO,
} from '@/schemas/summary.schema'
import { handleControllerError } from '@/utils/error-response'
import { prisma } from '@/config/prisma'

const summaryService = new SummaryService()

/**
 * Summary controller
 * Handles summary-related routes
 */
export class SummaryController {
  /**
   * POST /api/summaries
   * Create a new summary generation job
   */
  async createSummary(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.user?.userId

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        })
      }

      // Validate request body
      const body = createSummarySchema.parse(request.body)

      // Get user language if not provided
      let language = body.language
      if (!language) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { language: true },
        })
        language = (user?.language as 'fr' | 'en') || 'fr'
      }

      // Create summary job
      const result = await summaryService.createSummary(
        userId,
        body.text,
        body.style,
        language
      )

      return reply.status(202).send({
        success: true,
        data: {
          jobId: result.jobId,
          message: 'Summary generation job created',
        },
      })
    } catch (error) {
      return handleControllerError(error, request, reply, {
        'Summary limit reached': (err, reply) => {
          return reply.status(403).send({
            success: false,
            error: 'Plan limit reached',
            message: err.message,
          })
        },
      })
    }
  }
}

export const summaryController = new SummaryController()
